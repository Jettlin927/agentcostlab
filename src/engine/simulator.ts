import { getModelById, MODELS, type LLMModel } from '../data/models';

export interface SimulationConfig {
  modelId: string;
  workerModelId: string;
  turns: number;
  /** Fixed system prompt + AGENTS.md + MCP tool definitions */
  staticPrefixTokens: number;
  /** New user/orchestrator prompt tokens added each turn */
  newInputTokensPerTurn: number;
  /** Tool execution outputs / file reads appended each turn */
  toolOutputTokensPerTurn: number;
  /** Visible assistant output tokens per turn */
  outputTokensPerTurn: number;
  /** Hidden chain-of-thought / reasoning tokens per turn (billed as output) */
  reasoningTokensPerTurn: number;
  enableCaching: boolean;
  /** Fraction of reusable context (prefix + prior turns) that hits prompt cache (0..0.98) */
  cacheHitRate: number;
  /** Extra turn inflation from tool errors / API retries (0..0.5) */
  retryRate: number;
  runsPerDay: number;
  activeDaysPerMonth: number;
  /** Route Turn 1 + every plannerInterval-th turn to primary model; others to workerModel */
  enableHybridRouting: boolean;
  plannerInterval: number;
}

export const DEFAULT_CONFIG: SimulationConfig = {
  modelId: 'claude-sonnet-5-5',
  workerModelId: 'claude-haiku-5-5',
  turns: 24,
  staticPrefixTokens: 12000,
  newInputTokensPerTurn: 350,
  toolOutputTokensPerTurn: 2600,
  outputTokensPerTurn: 900,
  reasoningTokensPerTurn: 600,
  enableCaching: true,
  cacheHitRate: 0.85,
  retryRate: 0.12,
  runsPerDay: 40,
  activeDaysPerMonth: 22,
  enableHybridRouting: false,
  plannerInterval: 5,
};

export interface TurnBreakdown {
  turn: number;
  modelUsed: string;
  role: 'planner' | 'worker';
  contextWindowUsed: number;
  longContextTriggered: boolean;
  freshInputTokens: number;
  cachedInputTokens: number;
  cacheWriteTokens: number;
  outputTokens: number;
  freshInputCost: number;
  cachedInputCost: number;
  cacheWriteCost: number;
  outputCost: number;
  turnCost: number;
  cumulativeCost: number;
}

export interface SimulationResult {
  primaryModel: LLMModel;
  workerModel: LLMModel;
  effectiveTurns: number;
  perRunCost: number;
  /** What the same run would cost with caching disabled */
  uncachedPerRunCost: number;
  /** What a naive single-turn linear calculation (sum of new tokens * price) would estimate */
  naiveLinearCost: number;
  /** perRunCost / naiveLinearCost */
  quadraticMultiplier: number;
  cacheSavingsPerRun: number;
  cacheSavingsPct: number;
  /** Savings vs running all turns on primaryModel without hybrid routing */
  hybridSavingsPerRun: number;
  hybridSavingsPct: number;
  monthlyRuns: number;
  monthlyCost: number;
  monthlyUncachedCost: number;
  peakContextTokens: number;
  contextOverflow: boolean;
  totalFreshInputTokens: number;
  totalCachedInputTokens: number;
  totalCacheWriteTokens: number;
  totalOutputTokens: number;
  breakdown: {
    freshInputCost: number;
    cachedInputCost: number;
    cacheWriteCost: number;
    outputCost: number;
  };
  turns: TurnBreakdown[];
}

function getEffectiveRateMultiplier(model: LLMModel, contextTokens: number): number {
  if (
    model.longContextThreshold &&
    model.longContextMultiplier &&
    contextTokens > model.longContextThreshold
  ) {
    return model.longContextMultiplier;
  }
  return 1;
}

function runLoopMath(
  config: SimulationConfig,
  primaryModel: LLMModel,
  workerModel: LLMModel,
  overrideCaching?: boolean,
  overrideHybrid?: boolean
): {
  turns: TurnBreakdown[];
  perRunCost: number;
  peakContextTokens: number;
  contextOverflow: boolean;
  totalFreshInputTokens: number;
  totalCachedInputTokens: number;
  totalCacheWriteTokens: number;
  totalOutputTokens: number;
  freshInputCost: number;
  cachedInputCost: number;
  cacheWriteCost: number;
  outputCost: number;
} {
  const enableCaching = overrideCaching ?? config.enableCaching;
  const enableHybrid = overrideHybrid ?? config.enableHybridRouting;
  const effectiveTurns = Math.max(1, Math.round(config.turns * (1 + Math.max(0, config.retryRate))));
  const hitRate = enableCaching ? Math.min(0.98, Math.max(0, config.cacheHitRate)) : 0;
  const plannerInterval = Math.max(2, Math.round(config.plannerInterval));

  let accumulatedHistory = 0;
  let cumulativeCost = 0;
  let peakContextTokens = 0;
  let contextOverflow = false;

  let totalFreshInputTokens = 0;
  let totalCachedInputTokens = 0;
  let totalCacheWriteTokens = 0;
  let totalOutputTokens = 0;

  let totalFreshCost = 0;
  let totalCachedCost = 0;
  let totalCacheWriteCost = 0;
  let totalOutputCost = 0;

  const turnRows: TurnBreakdown[] = [];

  for (let t = 1; t <= effectiveTurns; t++) {
    const isPlannerTurn = !enableHybrid || t === 1 || (t - 1) % plannerInterval === 0;
    const activeModel = isPlannerTurn ? primaryModel : workerModel;

    const newTurnDelta =
      t === 1
        ? config.newInputTokensPerTurn
        : config.newInputTokensPerTurn + config.toolOutputTokensPerTurn;

    const reusablePrefix = config.staticPrefixTokens + accumulatedHistory;
    const contextWindowUsed = reusablePrefix + newTurnDelta;
    peakContextTokens = Math.max(peakContextTokens, contextWindowUsed);
    if (contextWindowUsed > activeModel.contextWindow) {
      contextOverflow = true;
    }

    const rateMult = getEffectiveRateMultiplier(activeModel, contextWindowUsed);
    const inputRate = (activeModel.inputPerM * rateMult) / 1_000_000;
    const cachedRate = (activeModel.cachedInputPerM * rateMult) / 1_000_000;
    const cacheWriteRate = inputRate * activeModel.cacheWriteMultiplier;
    const outputRate = (activeModel.outputPerM * rateMult) / 1_000_000;

    let cachedInputTokens = 0;
    let cacheWriteTokens = 0;
    let freshInputTokens = 0;

    if (!enableCaching) {
      freshInputTokens = contextWindowUsed;
    } else if (t === 1) {
      // Turn 1 writes the static prefix to cache; new input is fresh
      cacheWriteTokens = config.staticPrefixTokens;
      freshInputTokens = newTurnDelta;
    } else {
      // Subsequent turns hit cache on reusablePrefix * hitRate; new delta + cache misses are fresh/written
      cachedInputTokens = Math.round(reusablePrefix * hitRate);
      const cacheMissPrefix = reusablePrefix - cachedInputTokens;
      // Newly appended turn history gets written into cache on providers with write multipliers
      cacheWriteTokens = newTurnDelta;
      freshInputTokens = cacheMissPrefix;
    }

    const outputTokens = config.outputTokensPerTurn + config.reasoningTokensPerTurn;

    const freshInputCost = freshInputTokens * inputRate;
    const cachedInputCost = cachedInputTokens * cachedRate;
    const cacheWriteCost = cacheWriteTokens * cacheWriteRate;
    const outputCost = outputTokens * outputRate;
    const turnCost = freshInputCost + cachedInputCost + cacheWriteCost + outputCost;

    cumulativeCost += turnCost;

    totalFreshInputTokens += freshInputTokens;
    totalCachedInputTokens += cachedInputTokens;
    totalCacheWriteTokens += cacheWriteTokens;
    totalOutputTokens += outputTokens;

    totalFreshCost += freshInputCost;
    totalCachedCost += cachedInputCost;
    totalCacheWriteCost += cacheWriteCost;
    totalOutputCost += outputCost;

    turnRows.push({
      turn: t,
      modelUsed: activeModel.name,
      role: isPlannerTurn ? 'planner' : 'worker',
      contextWindowUsed,
      longContextTriggered: rateMult > 1,
      freshInputTokens,
      cachedInputTokens,
      cacheWriteTokens,
      outputTokens,
      freshInputCost,
      cachedInputCost,
      cacheWriteCost,
      outputCost,
      turnCost,
      cumulativeCost,
    });

    // Next turn carries forward the new delta + visible assistant output (reasoning is typically stripped from history)
    accumulatedHistory += newTurnDelta + config.outputTokensPerTurn;
  }

  return {
    turns: turnRows,
    perRunCost: cumulativeCost,
    peakContextTokens,
    contextOverflow,
    totalFreshInputTokens,
    totalCachedInputTokens,
    totalCacheWriteTokens,
    totalOutputTokens,
    freshInputCost: totalFreshCost,
    cachedInputCost: totalCachedCost,
    cacheWriteCost: totalCacheWriteCost,
    outputCost: totalOutputCost,
  };
}

export function simulateAgentCost(
  config: SimulationConfig,
  customModels?: LLMModel[]
): SimulationResult {
  const pool = customModels ? [...MODELS, ...customModels] : MODELS;
  const primaryModel = pool.find((m) => m.id === config.modelId) ?? getModelById(config.modelId);
  const workerModel = pool.find((m) => m.id === config.workerModelId) ?? getModelById(config.workerModelId);

  const actual = runLoopMath(config, primaryModel, workerModel);
  const uncached = runLoopMath(config, primaryModel, workerModel, false, config.enableHybridRouting);
  const nonHybrid = config.enableHybridRouting
    ? runLoopMath(config, primaryModel, workerModel, config.enableCaching, false)
    : actual;

  // Naive single-turn estimate: user mistakenly multiplies total unique tokens once instead of O(N^2) re-sends
  const effectiveTurns = actual.turns.length;
  const naiveUniqueInput =
    config.staticPrefixTokens +
    effectiveTurns * config.newInputTokensPerTurn +
    Math.max(0, effectiveTurns - 1) * config.toolOutputTokensPerTurn;
  const naiveUniqueOutput =
    effectiveTurns * (config.outputTokensPerTurn + config.reasoningTokensPerTurn);
  const naiveLinearCost =
    (naiveUniqueInput * primaryModel.inputPerM + naiveUniqueOutput * primaryModel.outputPerM) /
    1_000_000;

  const quadraticMultiplier = naiveLinearCost > 0 ? actual.perRunCost / naiveLinearCost : 1;
  const cacheSavingsPerRun = Math.max(0, uncached.perRunCost - actual.perRunCost);
  const cacheSavingsPct =
    uncached.perRunCost > 0 ? (cacheSavingsPerRun / uncached.perRunCost) * 100 : 0;

  const hybridSavingsPerRun = Math.max(0, nonHybrid.perRunCost - actual.perRunCost);
  const hybridSavingsPct =
    nonHybrid.perRunCost > 0 ? (hybridSavingsPerRun / nonHybrid.perRunCost) * 100 : 0;

  const monthlyRuns = Math.max(0, config.runsPerDay) * Math.max(0, config.activeDaysPerMonth);

  return {
    primaryModel,
    workerModel,
    effectiveTurns,
    perRunCost: actual.perRunCost,
    uncachedPerRunCost: uncached.perRunCost,
    naiveLinearCost,
    quadraticMultiplier,
    cacheSavingsPerRun,
    cacheSavingsPct,
    hybridSavingsPerRun,
    hybridSavingsPct,
    monthlyRuns,
    monthlyCost: actual.perRunCost * monthlyRuns,
    monthlyUncachedCost: uncached.perRunCost * monthlyRuns,
    peakContextTokens: actual.peakContextTokens,
    contextOverflow: actual.contextOverflow,
    totalFreshInputTokens: actual.totalFreshInputTokens,
    totalCachedInputTokens: actual.totalCachedInputTokens,
    totalCacheWriteTokens: actual.totalCacheWriteTokens,
    totalOutputTokens: actual.totalOutputTokens,
    breakdown: {
      freshInputCost: actual.freshInputCost,
      cachedInputCost: actual.cachedInputCost,
      cacheWriteCost: actual.cacheWriteCost,
      outputCost: actual.outputCost,
    },
    turns: actual.turns,
  };
}

export interface ModelComparisonRow {
  model: LLMModel;
  perRunCost: number;
  /** Expected USD per successfully solved task = perRunCost / (sweBenchPct / 100) */
  costPerSolvedTask: number;
  monthlyCost: number;
  uncachedMonthlyCost: number;
  cacheSavingsPct: number;
  deltaVsSelectedPct: number;
  contextOverflow: boolean;
  /** True if no other non-overflowing model is simultaneously smarter AND cheaper */
  isParetoOptimal: boolean;
  /** Composite Value Score (0-100) balancing Intelligence + SWE-bench vs log-scaled cost */
  valueScore: number;
}

export function compareAllModels(
  config: SimulationConfig,
  customModels?: LLMModel[]
): ModelComparisonRow[] {
  const pool = customModels ? [...MODELS, ...customModels] : MODELS;
  const selectedResult = simulateAgentCost({ ...config, enableHybridRouting: false }, customModels);

  const rawRows = pool.map((model) => {
    const res = simulateAgentCost(
      { ...config, modelId: model.id, enableHybridRouting: false },
      customModels
    );
    const deltaVsSelectedPct =
      selectedResult.monthlyCost > 0
        ? ((res.monthlyCost - selectedResult.monthlyCost) / selectedResult.monthlyCost) * 100
        : 0;
    const passRate = Math.max(0.1, model.sweBenchPct / 100);
    const costPerSolvedTask = res.perRunCost / passRate;

    return {
      model,
      perRunCost: res.perRunCost,
      costPerSolvedTask,
      monthlyCost: res.monthlyCost,
      uncachedMonthlyCost: res.monthlyUncachedCost,
      cacheSavingsPct: res.cacheSavingsPct,
      deltaVsSelectedPct,
      contextOverflow: res.contextOverflow,
      isParetoOptimal: false,
      valueScore: 0,
    };
  });

  // Compute Pareto frontier on (perRunCost ASC, intelligenceIndex DESC) among valid models
  const validRows = rawRows.filter((r) => !r.contextOverflow);
  for (const row of validRows) {
    const dominated = validRows.some(
      (other) =>
        other.model.id !== row.model.id &&
        other.model.intelligenceIndex >= row.model.intelligenceIndex &&
        other.perRunCost <= row.perRunCost &&
        (other.model.intelligenceIndex > row.model.intelligenceIndex ||
          other.perRunCost < row.perRunCost)
    );
    row.isParetoOptimal = !dominated;
  }

  // Compute normalized Value Score (0-100): 60% capability + 40% log-cost efficiency
  const minLogCost = Math.min(...rawRows.map((r) => Math.log10(Math.max(1e-6, r.perRunCost))));
  const maxLogCost = Math.max(...rawRows.map((r) => Math.log10(Math.max(1e-6, r.perRunCost))));
  const logSpan = Math.max(0.001, maxLogCost - minLogCost);

  const minCap = Math.min(
    ...rawRows.map((r) => r.model.intelligenceIndex * 0.6 + r.model.sweBenchPct * 0.4)
  );
  const maxCap = Math.max(
    ...rawRows.map((r) => r.model.intelligenceIndex * 0.6 + r.model.sweBenchPct * 0.4)
  );
  const capSpan = Math.max(0.001, maxCap - minCap);

  for (const row of rawRows) {
    const cap = row.model.intelligenceIndex * 0.6 + row.model.sweBenchPct * 0.4;
    const capNorm = (cap - minCap) / capSpan; // 0..1
    const costNorm =
      1 - (Math.log10(Math.max(1e-6, row.perRunCost)) - minLogCost) / logSpan; // 1 = cheapest, 0 = priciest
    const paretoBonus = row.isParetoOptimal ? 6 : 0;
    const overflowPenalty = row.contextOverflow ? 25 : 0;
    row.valueScore = Math.max(
      1,
      Math.min(100, Math.round((capNorm * 58 + costNorm * 36 + paretoBonus) - overflowPenalty))
    );
  }

  return rawRows.sort((a, b) => b.valueScore - a.valueScore);
}

export {
  estimateTokens,
  inspectPromptOverhead,
  type PromptInspectionResult,
} from './promptLint.mjs';

export function serializeConfigToQuery(config: SimulationConfig): string {
  const params = new URLSearchParams();
  params.set('m', config.modelId);
  params.set('w', config.workerModelId);
  params.set('t', String(config.turns));
  params.set('p', String(config.staticPrefixTokens));
  params.set('ni', String(config.newInputTokensPerTurn));
  params.set('to', String(config.toolOutputTokensPerTurn));
  params.set('o', String(config.outputTokensPerTurn));
  params.set('r', String(config.reasoningTokensPerTurn));
  params.set('c', config.enableCaching ? '1' : '0');
  params.set('ch', String(Math.round(config.cacheHitRate * 100)));
  params.set('rt', String(Math.round(config.retryRate * 100)));
  params.set('rd', String(config.runsPerDay));
  params.set('ad', String(config.activeDaysPerMonth));
  params.set('hy', config.enableHybridRouting ? '1' : '0');
  params.set('pi', String(config.plannerInterval));
  return params.toString();
}

export function parseConfigFromQuery(search: string): Partial<SimulationConfig> {
  const params = new URLSearchParams(search);
  const out: Partial<SimulationConfig> = {};
  const num = (key: string, min: number, max: number) => {
    const raw = params.get(key);
    if (raw === null) return undefined;
    const val = Number(raw);
    if (!Number.isFinite(val)) return undefined;
    return Math.min(max, Math.max(min, val));
  };

  const m = params.get('m');
  if (m && MODELS.some((x) => x.id === m)) out.modelId = m;
  const w = params.get('w');
  if (w && MODELS.some((x) => x.id === w)) out.workerModelId = w;

  const t = num('t', 1, 100);
  if (t !== undefined) out.turns = Math.round(t);
  const p = num('p', 0, 200000);
  if (p !== undefined) out.staticPrefixTokens = Math.round(p);
  const ni = num('ni', 0, 50000);
  if (ni !== undefined) out.newInputTokensPerTurn = Math.round(ni);
  const to = num('to', 0, 50000);
  if (to !== undefined) out.toolOutputTokensPerTurn = Math.round(to);
  const o = num('o', 10, 32000);
  if (o !== undefined) out.outputTokensPerTurn = Math.round(o);
  const r = num('r', 0, 32000);
  if (r !== undefined) out.reasoningTokensPerTurn = Math.round(r);

  if (params.get('c') !== null) out.enableCaching = params.get('c') === '1';
  const ch = num('ch', 0, 98);
  if (ch !== undefined) out.cacheHitRate = ch / 100;
  const rt = num('rt', 0, 50);
  if (rt !== undefined) out.retryRate = rt / 100;
  const rd = num('rd', 1, 100000);
  if (rd !== undefined) out.runsPerDay = Math.round(rd);
  const ad = num('ad', 1, 31);
  if (ad !== undefined) out.activeDaysPerMonth = Math.round(ad);
  if (params.get('hy') !== null) out.enableHybridRouting = params.get('hy') === '1';
  const pi = num('pi', 2, 20);
  if (pi !== undefined) out.plannerInterval = Math.round(pi);

  return out;
}

export function formatUsd(amount: number): string {
  if (!Number.isFinite(amount)) return '$0.00';
  if (amount === 0) return '$0.00';
  if (amount < 0.001) return `$${amount.toFixed(5)}`;
  if (amount < 0.1) return `$${amount.toFixed(4)}`;
  if (amount < 10) return `$${amount.toFixed(3)}`;
  if (amount < 1000) return `$${amount.toFixed(2)}`;
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export function generateMarkdownReport(
  config: SimulationConfig,
  result: SimulationResult,
  rows: ModelComparisonRow[]
): string {
  const lines = [
    `### AgentCostLab — Multi-Turn Agent Budget Report`,
    ``,
    `- **Primary Model:** ${result.primaryModel.name}${config.enableHybridRouting ? ` (Hybrid Worker: ${result.workerModel.name})` : ''}`,
    `- **Loop Profile:** ${config.turns} turns (+${Math.round(config.retryRate * 100)}% retries = ${result.effectiveTurns} effective turns), ${config.staticPrefixTokens.toLocaleString()} static prefix tokens, ${config.toolOutputTokensPerTurn.toLocaleString()} tool output/turn`,
    `- **Prompt Caching:** ${config.enableCaching ? `Enabled (${Math.round(config.cacheHitRate * 100)}% hit rate, saves ${result.cacheSavingsPct.toFixed(1)}%)` : 'Disabled'}`,
    `- **Per-Run Cost:** **${formatUsd(result.perRunCost)}** (${result.quadraticMultiplier.toFixed(1)}x vs naive single-turn estimate)`,
    `- **Monthly Projection:** **${formatUsd(result.monthlyCost)}** (${result.monthlyRuns.toLocaleString()} runs/mo)`,
    ``,
    `| Model | Provider | Tier | Cost / Run | Monthly Spend | Cache Savings |`,
    `| --- | --- | --- | ---: | ---: | ---: |`,
    ...rows.slice(0, 10).map(
      (r) =>
        `| ${r.model.name} | ${r.model.providerLabel} | ${r.model.tier} | ${formatUsd(r.perRunCost)} | ${formatUsd(r.monthlyCost)} | ${r.cacheSavingsPct.toFixed(0)}% |`
    ),
    ``,
    `_Generated with [AgentCostLab](https://jettlin927.github.io/agentcostlab/)_`,
  ];
  return lines.join('\n');
}
