import { describe, expect, it } from 'vitest';
import {
  compareAllModels,
  DEFAULT_CONFIG,
  estimateTokens,
  inspectPromptOverhead,
  parseConfigFromQuery,
  serializeConfigToQuery,
  simulateAgentCost,
} from './simulator';
import { getModelById } from '../data/models';

describe('AgentCostLab Simulation Engine', () => {
  it('models O(N^2) quadratic growth where multi-turn cost exceeds naive linear estimate', () => {
    const res = simulateAgentCost({
      ...DEFAULT_CONFIG,
      turns: 25,
      enableCaching: false,
      retryRate: 0,
    });

    expect(res.effectiveTurns).toBe(25);
    expect(res.perRunCost).toBeGreaterThan(res.naiveLinearCost);
    expect(res.quadraticMultiplier).toBeGreaterThan(3);
    expect(res.turns).toHaveLength(25);
    expect(res.turns[24].contextWindowUsed).toBeGreaterThan(res.turns[0].contextWindowUsed * 4);
  });

  it('reduces per-run cost substantially when prompt caching is enabled', () => {
    const uncached = simulateAgentCost({
      ...DEFAULT_CONFIG,
      enableCaching: false,
    });
    const cached = simulateAgentCost({
      ...DEFAULT_CONFIG,
      enableCaching: true,
      cacheHitRate: 0.85,
    });

    expect(cached.perRunCost).toBeLessThan(uncached.perRunCost);
    expect(cached.cacheSavingsPct).toBeGreaterThan(40);
    expect(cached.cacheSavingsPerRun).toBeCloseTo(uncached.perRunCost - cached.perRunCost, 6);
  });

  it('applies hybrid planner/worker routing savings', () => {
    const single = simulateAgentCost({
      ...DEFAULT_CONFIG,
      modelId: 'claude-opus-5-5',
      workerModelId: 'claude-haiku-5-5',
      enableHybridRouting: false,
    });
    const hybrid = simulateAgentCost({
      ...DEFAULT_CONFIG,
      modelId: 'claude-opus-5-5',
      workerModelId: 'claude-haiku-5-5',
      enableHybridRouting: true,
      plannerInterval: 5,
    });

    expect(hybrid.perRunCost).toBeLessThan(single.perRunCost);
    expect(hybrid.hybridSavingsPct).toBeGreaterThan(40);
    expect(hybrid.turns[0].role).toBe('planner');
    expect(hybrid.turns[1].role).toBe('worker');
    expect(hybrid.turns[5].role).toBe('planner');
  });

  it('triggers long-context pricing step-up when context exceeds model threshold', () => {
    const res = simulateAgentCost({
      ...DEFAULT_CONFIG,
      modelId: 'claude-sonnet-5-5', // threshold 200k
      turns: 40,
      staticPrefixTokens: 50000,
      toolOutputTokensPerTurn: 6000,
      retryRate: 0,
    });

    expect(res.peakContextTokens).toBeGreaterThan(200_000);
    expect(res.turns.some((t) => t.longContextTriggered)).toBe(true);
  });

  it('ranks all models by composite valueScore and identifies Pareto-optimal frontier', () => {
    const rows = compareAllModels(DEFAULT_CONFIG);
    expect(rows.length).toBeGreaterThanOrEqual(24);
    expect(rows.some((r) => r.model.id === 'gpt-6-1-terra')).toBe(true);
    expect(rows.some((r) => r.model.id === 'gemini-4-neon')).toBe(true);
    expect(rows.some((r) => r.model.id === 'gemini-4-hydrogen')).toBe(true);
    expect(rows.some((r) => r.model.id === 'qwen4-max')).toBe(true);
    expect(rows.some((r) => r.model.id === 'kimi-k3-1-pro')).toBe(true);
    expect(rows.some((r) => r.model.id === 'grok-4-7')).toBe(true);
    expect(rows.some((r) => r.model.id === 'glm-5-3')).toBe(true);
    expect(rows.some((r) => r.model.id === 'glm-5-3-flash')).toBe(true);
    expect(rows.some((r) => r.model.id === 'minimax-m3')).toBe(true);
    expect(getModelById('gpt-6-luna').inputPerM).toBe(0.1);
    expect(getModelById('claude-sonnet-5-5').cachedInputPerM).toBe(0.1);
    expect(getModelById('claude-opus-5-5').cachedInputPerM).toBe(0.2);
    expect(getModelById('claude-fable-5-2').cachedInputPerM).toBe(0.2);
    expect(getModelById('claude-haiku-5-5').longContextMultiplier).toBe(5.0);
    for (let i = 1; i < rows.length; i++) {
      expect(rows[i].valueScore).toBeLessThanOrEqual(rows[i - 1].valueScore);
    }
    const paretoModels = rows.filter((r) => r.isParetoOptimal);
    expect(paretoModels.length).toBeGreaterThanOrEqual(3);
    // Every model's costPerSolvedTask should exceed its raw perRunCost since SWE-bench < 100%
    for (const r of rows) {
      expect(r.costPerSolvedTask).toBeGreaterThan(r.perRunCost);
    }
  });

  it('detects cache-busting timestamps and leaked API keys in prompt inspector', () => {
    const model = getModelById('claude-sonnet-5-5');
    const sample = `{
      "mcpServers": {
        "github": { "command": "npx", "env": { "TOKEN": "ghp_1234567890abcdefghij123456" } }
      },
      "note": "current_time: Date.now()"
    }`;
    const inspection = inspectPromptOverhead(sample, 20, model);
    expect(inspection.isJson).toBe(true);
    expect(inspection.detectedToolCount).toBe(1);
    expect(inspection.warnings.length).toBeGreaterThanOrEqual(2);
    expect(inspection.costPer1kRunsCached).toBeLessThan(inspection.costPer1kRunsUncached);
    expect(estimateTokens('你好世界 hello world')).toBeGreaterThan(4);
  });

  it('round-trips simulation config via URL query string', () => {
    const custom = {
      ...DEFAULT_CONFIG,
      modelId: 'deepseek-v4-pro-peak',
      turns: 33,
      enableHybridRouting: true,
      cacheHitRate: 0.72,
    };
    const qs = serializeConfigToQuery(custom);
    const parsed = parseConfigFromQuery(`?${qs}`);
    expect(parsed.modelId).toBe('deepseek-v4-pro-peak');
    expect(parsed.turns).toBe(33);
    expect(parsed.enableHybridRouting).toBe(true);
    expect(parsed.cacheHitRate).toBeCloseTo(0.72, 2);
  });
});
