import { describe, expect, it } from 'vitest';
import {
  findPromptDiagnosticSpans,
  formatLintOutput,
  renderMarkdownSummary,
  resolveLintModel,
  runLintBatch,
} from './promptLint.mjs';

describe('promptLint batch engine', () => {
  it('flags cache-busters, leaked keys, and enforces maxTokens budget', () => {
    const report = runLintBatch(
      [
        {
          path: 'CLAUDE.md',
          content: 'System date: Date.now()\nBackup key: sk-1234567890abcdefghij',
        },
        {
          path: 'mcp.json',
          content: '{"mcpServers":{"github":{"command":"npx"},"fs":{"command":"npx"}}}',
        },
      ],
      {
        modelId: 'claude-sonnet-5-5',
        turns: 24,
        maxTokens: 10,
        failOnHigh: true,
      }
    );

    expect(report.totals.files).toBe(2);
    expect(report.totals.highWarnings).toBe(2);
    expect(report.results[1].detectedToolCount).toBe(2);
    expect(report.budgetExceeded).toBe(true);
    expect(report.passed).toBe(false);

    const ghOut = formatLintOutput(report, 'github');
    expect(ghOut).toContain('::error file=CLAUDE.md');
    expect(ghOut).toContain('::error title=agentcost-lint (token-budget)');

    const md = renderMarkdownSummary(report);
    expect(md).toContain('| `CLAUDE.md` |');
    expect(md).toContain('| `mcp.json` |');
  });

  it('passes cleanly when no warnings or budget violations exist', () => {
    const report = runLintBatch(
      [{ path: 'AGENTS.md', content: '# Repo Rules\nRun tests before commit.' }],
      { modelId: 'gemini-4-neon', turns: 24, maxTokens: 500, failOnHigh: true }
    );

    expect(report.passed).toBe(true);
    expect(report.model.name).toBe('Gemini 4 Neon');
    expect(report.totals.highWarnings).toBe(0);

    const hydrogenModel = resolveLintModel('gemini-4-hydrogen');
    expect(hydrogenModel.id).toBe('gemini-4-hydrogen');
    expect(hydrogenModel.cachedInputPerM).toBe(0.075);

    const terraModel = resolveLintModel('gpt-6-1-terra');
    expect(terraModel.id).toBe('gpt-6-1-terra');
    expect(terraModel.inputPerM).toBe(1.0);
    expect(terraModel.cachedInputPerM).toBe(0.05);

    const kimiModel = resolveLintModel('kimi-k3-1-pro');
    expect(kimiModel.id).toBe('kimi-k3-1-pro');
    expect(kimiModel.inputPerM).toBe(2.0);
    expect(kimiModel.cachedInputPerM).toBe(0.2);

    const minimaxModel = resolveLintModel('minimax-m3');
    expect(minimaxModel.id).toBe('minimax-m3');
    expect(minimaxModel.inputPerM).toBe(0.3);
    expect(minimaxModel.cachedInputPerM).toBe(0.06);

    const grokModel = resolveLintModel('grok-4-7');
    expect(grokModel.id).toBe('grok-4-7');
    expect(grokModel.inputPerM).toBe(2.0);

    const glmModel = resolveLintModel('glm-5-3');
    expect(glmModel.id).toBe('glm-5-3');
    expect(glmModel.inputPerM).toBe(1.4);

    const glmFlashModel = resolveLintModel('glm-5-3-flash');
    expect(glmFlashModel.id).toBe('glm-5-3-flash');
    expect(glmFlashModel.inputPerM).toBe(0.15);
    expect(glmFlashModel.cachedInputPerM).toBe(0.03);
  });

  it('computes exact line and column spans for IDE diagnostics', () => {
    const sample = [
      '# Agent Instructions',
      'Always inject current_time and uuid before replying.',
      'Backup token: ghp_1234567890abcdefghij1234',
    ].join('\n');

    const res = findPromptDiagnosticSpans(sample, 24, resolveLintModel('claude-sonnet-5-5'));
    expect(res.spans.length).toBe(3);
    expect(res.spans[0]).toMatchObject({
      ruleId: 'cache-buster',
      line: 1,
      startCol: 14,
      endCol: 26,
    });
    expect(res.spans[1]).toMatchObject({
      ruleId: 'cache-buster',
      line: 1,
      startCol: 31,
      endCol: 35,
    });
    expect(res.spans[2]).toMatchObject({
      ruleId: 'secret-leak',
      line: 2,
      startCol: 14,
      endCol: 42,
    });
  });
});
