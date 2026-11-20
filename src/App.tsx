import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Copy,
  Download,
  ExternalLink,
  FileCode2,
  GitBranch,
  Github,
  Globe,
  Layers,
  Share2,
  Sliders,
  Sparkles,
  TrendingUp,
  Zap,
} from 'lucide-react';
import { MODELS } from './data/models';
import { AGENT_PRESETS, SEO_COMPARISONS } from './data/presets';
import { OPTIMIZATION_PARTNERS, SITE_META } from './data/monetization';
import {
  compareAllModels,
  DEFAULT_CONFIG,
  formatUsd,
  generateMarkdownReport,
  parseConfigFromQuery,
  serializeConfigToQuery,
  simulateAgentCost,
  type SimulationConfig,
} from './engine/simulator';
import { TurnChart } from './components/TurnChart';
import { ModelLeaderboard } from './components/ModelLeaderboard';
import { PromptInspector } from './components/PromptInspector';

function getInitialConfig(): SimulationConfig {
  const fromQuery = parseConfigFromQuery(window.location.search);
  const path = window.location.pathname;

  // Support pre-rendered pSEO preset routes (/presets/<slug>)
  const matchedPreset = AGENT_PRESETS.find((p) => path.includes(`/presets/${p.slug}`));
  if (matchedPreset && Object.keys(fromQuery).length === 0) {
    return { ...DEFAULT_CONFIG, ...matchedPreset.config };
  }

  // Support pre-rendered pSEO comparison routes (/compare/<slug>)
  const matchedCompare = SEO_COMPARISONS.find((c) => path.includes(`/compare/${c.slug}`));
  if (matchedCompare && Object.keys(fromQuery).length === 0) {
    return {
      ...DEFAULT_CONFIG,
      modelId: matchedCompare.modelA,
      workerModelId: matchedCompare.modelB,
    };
  }

  return { ...DEFAULT_CONFIG, ...fromQuery };
}

export function App() {
  const [config, setConfig] = useState<SimulationConfig>(getInitialConfig);
  const [activePresetId, setActivePresetId] = useState<string>('coding-agent');
  const [activeTab, setActiveTab] = useState<'simulator' | 'inspector'>('simulator');
  const [lang, setLang] = useState<'en' | 'zh'>(() =>
    typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('zh')
      ? 'zh'
      : 'en'
  );
  const [copiedState, setCopiedState] = useState<'none' | 'url' | 'md'>('none');

  // Keep URL query synced for instant sharing
  useEffect(() => {
    const qs = serializeConfigToQuery(config);
    const newUrl = `${window.location.pathname}?${qs}`;
    window.history.replaceState(null, '', newUrl);
  }, [config]);

  const result = useMemo(() => simulateAgentCost(config), [config]);
  const uncachedResult = useMemo(
    () => simulateAgentCost({ ...config, enableCaching: false }),
    [config]
  );
  const leaderboard = useMemo(() => compareAllModels(config), [config]);

  const update = <K extends keyof SimulationConfig>(key: K, value: SimulationConfig[K]) => {
    setActivePresetId('custom');
    setConfig((prev) => ({ ...prev, [key]: value }));
  };

  const applyPreset = (presetId: string) => {
    const preset = AGENT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    setActivePresetId(preset.id);
    setConfig((prev) => ({ ...prev, ...preset.config }));
  };

  const handleCopyShareUrl = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopiedState('url');
      setTimeout(() => setCopiedState('none'), 2000);
    } catch {
      // Fallback ignored
    }
  };

  const handleCopyMarkdown = async () => {
    const md = generateMarkdownReport(config, result, leaderboard);
    try {
      await navigator.clipboard.writeText(md);
      setCopiedState('md');
      setTimeout(() => setCopiedState('none'), 2000);
    } catch {
      // Fallback ignored
    }
  };

  const handleExportCsv = () => {
    const header = 'Model,Provider,Tier,CostPerRunUSD,MonthlySpendUSD,CacheSavingsPct\n';
    const body = leaderboard
      .map(
        (r) =>
          `"${r.model.name}","${r.model.providerLabel}","${r.model.tier}",${r.perRunCost.toFixed(6)},${r.monthlyCost.toFixed(2)},${r.cacheSavingsPct.toFixed(1)}`
      )
      .join('\n');
    const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agentcostlab-${config.modelId}-${config.turns}turns.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalBreakdown = Math.max(
    0.000001,
    result.breakdown.freshInputCost +
      result.breakdown.cachedInputCost +
      result.breakdown.cacheWriteCost +
      result.breakdown.outputCost
  );

  const pct = (part: number) => `${Math.max(0, (part / totalBreakdown) * 100).toFixed(1)}%`;

  return (
    <div className="min-h-screen text-slate-100">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-sky-400 to-emerald-400 text-slate-950 shadow-lg shadow-sky-500/20">
              <TrendingUp className="h-4 w-4 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold tracking-tight text-white">
                  {SITE_META.brandName}
                </span>
                <span className="hidden rounded-full border border-sky-500/30 bg-sky-500/10 px-2 py-0.5 text-[10px] font-medium text-sky-300 sm:inline-block">
                  Nov 2026 Pricing
                </span>
              </div>
              <p className="hidden text-[11px] text-slate-400 sm:block">
                {lang === 'zh'
                  ? '多轮 AI Agent 循环 · Prompt Caching · MCP Token 成本模拟器'
                  : 'Multi-Turn AI Agent Loop, Prompt Caching & MCP Cost Simulator'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyShareUrl}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-sky-500/60 hover:text-white"
            >
              {copiedState === 'url' ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Share2 className="h-3.5 w-3.5 text-sky-400" />
              )}
              <span className="hidden sm:inline">
                {copiedState === 'url'
                  ? lang === 'zh'
                    ? '已复制链接'
                    : 'Link Copied'
                  : lang === 'zh'
                    ? '分享配置'
                    : 'Share'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleCopyMarkdown}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-sky-500/60 hover:text-white"
            >
              {copiedState === 'md' ? (
                <Check className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <Copy className="h-3.5 w-3.5 text-slate-400" />
              )}
              <span className="hidden md:inline">
                {copiedState === 'md'
                  ? lang === 'zh'
                    ? '已复制 MD'
                    : 'Copied MD'
                  : lang === 'zh'
                    ? '复制 Markdown 报表'
                    : 'Copy RFC Table'}
              </span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              title="Export CSV"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-200 transition hover:border-sky-500/60 hover:text-white"
            >
              <Download className="h-3.5 w-3.5 text-slate-400" />
              <span className="hidden lg:inline">CSV</span>
            </button>

            <button
              type="button"
              onClick={() => setLang((l) => (l === 'en' ? 'zh' : 'en'))}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-600"
            >
              <Globe className="h-3.5 w-3.5 text-slate-400" />
              {lang === 'en' ? '中文' : 'EN'}
            </button>

            <a
              href={SITE_META.githubUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-950 transition hover:bg-white"
            >
              <Github className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Star</span>
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">
        {/* Hero */}
        <section className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div className="max-w-3xl">
            <h1 className="text-2xl font-bold tracking-tight text-white sm:text-3xl">
              {lang === 'zh'
                ? '别再用单轮乘法估算 AI Agent 账单了'
                : 'Stop Guessing AI Agent Bills With Single-Turn Math'}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-400">
              {lang === 'zh'
                ? 'AI Agent 每执行一轮工具调用，都会把历史上下文重新发送一遍，导致 Token 呈 O(N²) 平方级膨胀。实时模拟 Prompt Caching 缓存折扣、MCP 工具定义开销、长上下文阶梯涨价与“旗舰规划 + 经济执行”混合路由省钱方案。'
                : 'Autonomous agents resend growing history + MCP tool schemas on every turn, creating O(N²) quadratic token growth. Simulate prompt caching, long-context step-ups, retries, and hybrid Planner/Worker model routing across 15 models.'}
            </p>
          </div>

          {/* Mode Tabs */}
          <div className="inline-flex self-start rounded-xl border border-slate-800 bg-slate-900 p-1 text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('simulator')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 font-medium transition ${
                activeTab === 'simulator'
                  ? 'bg-sky-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <Sliders className="h-3.5 w-3.5" />
              {lang === 'zh' ? 'Agent 循环模拟器' : 'Agent Loop Simulator'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('inspector')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3.5 py-2 font-medium transition ${
                activeTab === 'inspector'
                  ? 'bg-sky-500 text-slate-950 shadow'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              <FileCode2 className="h-3.5 w-3.5" />
              {lang === 'zh' ? 'CLAUDE.md / MCP 体检' : 'Prompt & MCP Inspector'}
            </button>
          </div>
        </section>

        {/* Preset Scenario Bar */}
        <section className="mb-6">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {lang === 'zh' ? '一键加载真实 Agent 场景预设' : 'One-Click Real-World Agent Presets'}
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {AGENT_PRESETS.map((preset) => {
              const isActive = activePresetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  className={`group rounded-xl border p-3 text-left transition ${
                    isActive
                      ? 'border-sky-500/70 bg-sky-500/10 shadow-sm shadow-sky-500/10'
                      : 'border-slate-800/90 bg-slate-900/50 hover:border-slate-700 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-100">
                      {lang === 'zh' ? preset.nameZh : preset.name}
                    </span>
                    <span
                      className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${
                        preset.id === 'uncached-disaster'
                          ? 'bg-rose-500/20 text-rose-300'
                          : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {preset.badge}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-1 text-[11px] text-slate-400">
                    {lang === 'zh' ? preset.taglineZh : preset.tagline}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        {activeTab === 'inspector' ? (
          <PromptInspector
            model={result.primaryModel}
            turns={config.turns}
            lang={lang}
            onApplyPrefixTokens={(tokens) => {
              update('staticPrefixTokens', tokens);
              setActiveTab('simulator');
            }}
          />
        ) : (
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left Controls Column */}
            <aside className="space-y-5 lg:col-span-4">
              {/* Model & Hybrid Routing Card */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-white">
                  <Sparkles className="h-4 w-4 text-sky-400" />
                  {lang === 'zh' ? '模型与混合路由策略' : 'Model & Hybrid Routing'}
                </div>

                <label className="block text-xs font-medium text-slate-300">
                  {lang === 'zh' ? '主模型 (Planner / 默认)' : 'Primary Model (Planner)'}
                </label>
                <select
                  value={config.modelId}
                  onChange={(e) => update('modelId', e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-xs text-slate-100 focus:border-sky-500 focus:outline-none"
                >
                  {MODELS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.providerLabel}) — ${m.inputPerM}/${m.outputPerM}
                    </option>
                  ))}
                </select>
                <p className="mt-1.5 text-[11px] text-slate-400">
                  {lang === 'zh' ? result.primaryModel.noteZh : result.primaryModel.note}
                </p>

                {/* Hybrid Routing Toggle */}
                <div className="mt-4 rounded-xl border border-slate-800 bg-slate-950/70 p-3.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <GitBranch className="h-3.5 w-3.5 text-emerald-400" />
                      <span className="text-xs font-semibold text-slate-100">
                        {lang === 'zh' ? '开启混合模型路由' : 'Hybrid Planner / Worker Routing'}
                      </span>
                    </div>
                    <input
                      type="checkbox"
                      checked={config.enableHybridRouting}
                      onChange={(e) => update('enableHybridRouting', e.target.checked)}
                      className="h-4 w-4 cursor-pointer rounded accent-emerald-400"
                    />
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {lang === 'zh'
                      ? '第 1 轮与每 N 轮用旗舰模型规划，其余工具执行轮次路由给低价 Worker 模型。'
                      : 'Use primary model for Turn 1 + periodic planning; route tool-execution turns to a fast economy worker.'}
                  </p>

                  {config.enableHybridRouting && (
                    <div className="mt-3 space-y-3 border-t border-slate-800 pt-3">
                      <div>
                        <label className="block text-[11px] text-slate-300">
                          {lang === 'zh' ? '执行层模型 (Worker)' : 'Worker Model'}
                        </label>
                        <select
                          value={config.workerModelId}
                          onChange={(e) => update('workerModelId', e.target.value)}
                          className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-900 px-2.5 py-1.5 text-xs text-slate-100"
                        >
                          {MODELS.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.name} (${m.inputPerM}/${m.outputPerM})
                            </option>
                          ))}
                        </select>
                      </div>
                      <SliderField
                        label={lang === 'zh' ? '规划频率 (每 N 轮调用一次主模型)' : 'Planner Interval (every N turns)'}
                        value={config.plannerInterval}
                        min={2}
                        max={15}
                        step={1}
                        display={`1 / ${config.plannerInterval} turns`}
                        onChange={(v) => update('plannerInterval', v)}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Loop Mechanics Card */}
              <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <Layers className="h-4 w-4 text-sky-400" />
                  {lang === 'zh' ? 'Agent 循环与 Token 参数' : 'Loop & Context Parameters'}
                </div>

                <SliderField
                  label={lang === 'zh' ? '单次任务循环轮数 (Turns)' : 'Agent Loop Turns (N)'}
                  value={config.turns}
                  min={1}
                  max={60}
                  step={1}
                  display={`${config.turns} turns`}
                  onChange={(v) => update('turns', v)}
                />

                <SliderField
                  label={
                    lang === 'zh'
                      ? '静态前缀 (System + CLAUDE.md + MCP 工具)'
                      : 'Static Prefix (System + MCP Schemas)'
                  }
                  value={config.staticPrefixTokens}
                  min={500}
                  max={60000}
                  step={500}
                  display={`${(config.staticPrefixTokens / 1000).toFixed(1)}k tok`}
                  onChange={(v) => update('staticPrefixTokens', v)}
                />

                <SliderField
                  label={
                    lang === 'zh'
                      ? '每轮工具返回 / 文件读取 Token'
                      : 'Tool Outputs / File Reads per Turn'
                  }
                  value={config.toolOutputTokensPerTurn}
                  min={0}
                  max={12000}
                  step={100}
                  display={`${config.toolOutputTokensPerTurn.toLocaleString()} tok`}
                  onChange={(v) => update('toolOutputTokensPerTurn', v)}
                />

                <SliderField
                  label={lang === 'zh' ? '每轮可见输出 Token' : 'Visible Output per Turn'}
                  value={config.outputTokensPerTurn}
                  min={100}
                  max={6000}
                  step={50}
                  display={`${config.outputTokensPerTurn.toLocaleString()} tok`}
                  onChange={(v) => update('outputTokensPerTurn', v)}
                />

                <SliderField
                  label={lang === 'zh' ? '每轮隐藏思考 (Reasoning) Token' : 'Hidden Reasoning Tokens / Turn'}
                  value={config.reasoningTokensPerTurn}
                  min={0}
                  max={8000}
                  step={100}
                  display={`${config.reasoningTokensPerTurn.toLocaleString()} tok`}
                  onChange={(v) => update('reasoningTokensPerTurn', v)}
                />

                <SliderField
                  label={lang === 'zh' ? '工具报错 / 重试膨胀率' : 'Error & Retry Inflation'}
                  value={Math.round(config.retryRate * 100)}
                  min={0}
                  max={40}
                  step={1}
                  display={`+${Math.round(config.retryRate * 100)}%`}
                  onChange={(v) => update('retryRate', v / 100)}
                />
              </div>

              {/* Caching & Volume Card */}
              <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-semibold text-white">
                    <Zap className="h-4 w-4 text-amber-400" />
                    {lang === 'zh' ? 'Prompt Caching & 业务规模' : 'Prompt Caching & Scale'}
                  </div>
                  <label className="inline-flex cursor-pointer items-center gap-2 text-xs text-slate-300">
                    <span>{lang === 'zh' ? '启用缓存' : 'Caching'}</span>
                    <input
                      type="checkbox"
                      checked={config.enableCaching}
                      onChange={(e) => update('enableCaching', e.target.checked)}
                      className="h-4 w-4 accent-sky-400"
                    />
                  </label>
                </div>

                {config.enableCaching && (
                  <SliderField
                    label={lang === 'zh' ? '缓存命中率 (Cache Hit Rate)' : 'Cache Hit Rate'}
                    value={Math.round(config.cacheHitRate * 100)}
                    min={10}
                    max={98}
                    step={1}
                    display={`${Math.round(config.cacheHitRate * 100)}%`}
                    onChange={(v) => update('cacheHitRate', v / 100)}
                  />
                )}

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] text-slate-400">
                      {lang === 'zh' ? '每日运行次数' : 'Runs / Day'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={100000}
                      value={config.runsPerDay}
                      onChange={(e) => update('runsPerDay', Math.max(1, Number(e.target.value) || 1))}
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 font-mono text-xs text-white focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400">
                      {lang === 'zh' ? '每月活跃天数' : 'Active Days / Mo'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      value={config.activeDaysPerMonth}
                      onChange={(e) =>
                        update('activeDaysPerMonth', Math.min(31, Math.max(1, Number(e.target.value) || 1)))
                      }
                      className="mt-1 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-1.5 font-mono text-xs text-white focus:border-sky-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </aside>

            {/* Right Analytics Column */}
            <div className="space-y-6 lg:col-span-8">
              {/* Context Overflow Alert */}
              {result.contextOverflow && (
                <div className="flex items-start gap-3 rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-xs text-rose-200">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                  <div>
                    <span className="font-semibold text-rose-100">
                      {lang === 'zh' ? '上下文窗口溢出警告：' : 'Context Window Overflow Warning: '}
                    </span>
                    {lang === 'zh'
                      ? `第 ${result.effectiveTurns} 轮峰值上下文达到 ${(result.peakContextTokens / 1000).toFixed(1)}k tokens，超出所选模型上限。请引入历史摘要压缩（Compaction）或切换长上下文模型。`
                      : `Peak context reaches ${(result.peakContextTokens / 1000).toFixed(1)}k tokens by Turn ${result.effectiveTurns}, exceeding the model window. Add history compaction or switch to a 1M+ context model.`}
                  </div>
                </div>
              )}

              {/* KPI Strip */}
              <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <div className="text-[11px] text-slate-400">
                    {lang === 'zh' ? '单次运行成本' : 'Cost / Agent Run'}
                  </div>
                  <div className="mt-1.5 font-mono text-2xl font-bold text-white tabular-nums">
                    {formatUsd(result.perRunCost)}
                  </div>
                  <div className="mt-1.5 inline-flex items-center rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-300 tabular-nums">
                    {result.quadraticMultiplier.toFixed(1)}x{' '}
                    {lang === 'zh' ? '于单轮线性估算' : 'vs naive linear'}
                  </div>
                </div>

                <div className="rounded-2xl border border-sky-500/30 bg-sky-500/10 p-4">
                  <div className="text-[11px] text-sky-200/80">
                    {lang === 'zh'
                      ? `月度预估 (${result.monthlyRuns.toLocaleString()} 次)`
                      : `Monthly (${result.monthlyRuns.toLocaleString()} runs)`}
                  </div>
                  <div className="mt-1.5 font-mono text-2xl font-bold text-sky-300 tabular-nums">
                    {formatUsd(result.monthlyCost)}
                  </div>
                  <div className="mt-1.5 text-[10px] text-slate-400 tabular-nums">
                    {lang === 'zh' ? '无缓存原价：' : 'Uncached: '}
                    <span className="line-through">{formatUsd(result.monthlyUncachedCost)}</span>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <div className="text-[11px] text-slate-400">
                    {lang === 'zh' ? '缓存每月省下' : 'Cache Savings / Mo'}
                  </div>
                  <div className="mt-1.5 font-mono text-2xl font-bold text-emerald-400 tabular-nums">
                    {formatUsd(result.monthlyUncachedCost - result.monthlyCost)}
                  </div>
                  <div className="mt-1.5 text-[10px] text-emerald-300/80 tabular-nums">
                    {result.cacheSavingsPct > 0
                      ? `-${result.cacheSavingsPct.toFixed(1)}% ${lang === 'zh' ? '总账单' : 'total bill'}`
                      : lang === 'zh'
                        ? '缓存已关闭'
                        : 'Caching disabled'}
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <div className="text-[11px] text-slate-400">
                    {config.enableHybridRouting
                      ? lang === 'zh'
                        ? '混合路由额外省'
                        : 'Hybrid Routing Saved'
                      : lang === 'zh'
                        ? '峰值上下文窗口'
                        : 'Peak Context Used'}
                  </div>
                  <div className="mt-1.5 font-mono text-2xl font-bold text-slate-100 tabular-nums">
                    {config.enableHybridRouting
                      ? `-${result.hybridSavingsPct.toFixed(0)}%`
                      : `${(result.peakContextTokens / 1000).toFixed(1)}k`}
                  </div>
                  <div className="mt-1.5 text-[10px] text-slate-400 tabular-nums">
                    {config.enableHybridRouting
                      ? `${formatUsd(result.hybridSavingsPerRun * result.monthlyRuns)}/mo`
                      : `${result.effectiveTurns} ${lang === 'zh' ? '有效轮次' : 'effective turns'}`}
                  </div>
                </div>
              </div>

              {/* Turn-by-Turn Chart */}
              <TurnChart
                cachedTurns={result.turns}
                uncachedTurns={uncachedResult.turns}
                lang={lang}
              />

              {/* Cost Anatomy Bar */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                <div className="mb-3 flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-100">
                    {lang === 'zh' ? '单次运行成本解剖' : 'Per-Run Cost Anatomy'}
                  </span>
                  <span className="font-mono text-slate-400 tabular-nums">
                    {((result.totalFreshInputTokens + result.totalCachedInputTokens + result.totalCacheWriteTokens) / 1000).toFixed(1)}k in /{' '}
                    {(result.totalOutputTokens / 1000).toFixed(1)}k out
                  </span>
                </div>
                <div className="flex h-3.5 w-full overflow-hidden rounded-full bg-slate-950">
                  <div
                    style={{ width: pct(result.breakdown.freshInputCost) }}
                    className="bg-rose-400 transition-all"
                    title="Fresh Input"
                  />
                  <div
                    style={{ width: pct(result.breakdown.cacheWriteCost) }}
                    className="bg-amber-400 transition-all"
                    title="Cache Write"
                  />
                  <div
                    style={{ width: pct(result.breakdown.cachedInputCost) }}
                    className="bg-emerald-400 transition-all"
                    title="Cached Input"
                  />
                  <div
                    style={{ width: pct(result.breakdown.outputCost) }}
                    className="bg-sky-400 transition-all"
                    title="Output + Reasoning"
                  />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-[11px] sm:grid-cols-4">
                  <LegendItem
                    color="bg-rose-400"
                    label={lang === 'zh' ? '未缓存输入' : 'Fresh Input'}
                    value={formatUsd(result.breakdown.freshInputCost)}
                  />
                  <LegendItem
                    color="bg-amber-400"
                    label={lang === 'zh' ? '缓存写入' : 'Cache Write'}
                    value={formatUsd(result.breakdown.cacheWriteCost)}
                  />
                  <LegendItem
                    color="bg-emerald-400"
                    label={lang === 'zh' ? '缓存读取' : 'Cached Read'}
                    value={formatUsd(result.breakdown.cachedInputCost)}
                  />
                  <LegendItem
                    color="bg-sky-400"
                    label={lang === 'zh' ? '输出 + 思考' : 'Output + Reason'}
                    value={formatUsd(result.breakdown.outputCost)}
                  />
                </div>
              </div>

              {/* 15-Model Live Leaderboard */}
              <ModelLeaderboard
                rows={leaderboard}
                selectedModelId={config.modelId}
                onSelectModel={(id) => update('modelId', id)}
                lang={lang}
              />
            </div>
          </div>
        )}

        {/* Contextual Optimization Partners (Monetization Hook) */}
        <section className="mt-10 rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-sm font-semibold text-white">
                {lang === 'zh'
                  ? '如何把这份模拟账单再砍掉 60%？'
                  : 'Cut This Simulated Bill by Another 60%'}
              </h2>
              <p className="text-xs text-slate-400">
                {lang === 'zh'
                  ? '生产级 Agent 降本增效的 3 个核心基础设施组合'
                  : 'Production-tested infrastructure patterns for taming multi-turn agent spend'}
              </p>
            </div>
            <a
              href={SITE_META.sponsorUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs font-medium text-sky-400 hover:text-sky-300"
            >
              {lang === 'zh' ? '赞助或商务合作 →' : 'Sponsor this tool →'}
            </a>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {OPTIMIZATION_PARTNERS.map((p) => (
              <a
                key={p.id}
                href={p.url}
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-950/70 p-4 transition hover:border-sky-500/50"
              >
                <div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-100 group-hover:text-sky-300">
                      {p.name}
                    </span>
                    <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] text-slate-300">
                      {lang === 'zh' ? p.badgeZh : p.badge}
                    </span>
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-slate-400">
                    {lang === 'zh' ? p.descriptionZh : p.description}
                  </p>
                </div>
                <div className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-sky-400">
                  {lang === 'zh' ? p.ctaLabelZh : p.ctaLabel}
                  <ExternalLink className="h-3 w-3" />
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* pSEO Quick Comparison Directory (Crawlable internal links) */}
        <section className="mt-8 border-t border-slate-800/80 pt-8">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-slate-400">
            {lang === 'zh' ? '热门模型对比与场景速查' : 'Popular Head-to-Head Comparisons & Presets'}
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {SEO_COMPARISONS.map((c) => (
              <button
                key={c.slug}
                type="button"
                onClick={() => {
                  setConfig((prev) => ({
                    ...prev,
                    modelId: c.modelA,
                    workerModelId: c.modelB,
                    enableHybridRouting: true,
                  }));
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className="rounded-xl border border-slate-800/80 bg-slate-900/40 px-3.5 py-2.5 text-left text-xs text-slate-300 transition hover:border-sky-500/40 hover:text-white"
              >
                {c.title.split(' — ')[0]}
              </button>
            ))}
          </div>
        </section>
      </main>

      <footer className="mt-10 border-t border-slate-800/80 py-6 text-center text-xs text-slate-500">
        <div className="mx-auto max-w-7xl px-4">
          {SITE_META.brandName} — Open-source Multi-Turn Agent Economics Simulator by{' '}
          <a
            href={SITE_META.githubUrl}
            target="_blank"
            rel="noreferrer"
            className="text-slate-300 hover:text-sky-400"
          >
            {SITE_META.authorHandle}
          </a>
          . 100% client-side; zero tracking, zero prompt uploads.
        </div>
      </footer>
    </div>
  );
}

const SliderField: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (val: number) => void;
}> = ({ label, value, min, max, step, display, onChange }) => (
  <div>
    <div className="mb-1 flex items-center justify-between text-xs">
      <span className="text-slate-300">{label}</span>
      <span className="font-mono font-semibold text-sky-300 tabular-nums">{display}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      className="h-1.5 w-full cursor-pointer rounded-lg bg-slate-800"
    />
  </div>
);

const LegendItem: React.FC<{ color: string; label: string; value: string }> = ({
  color,
  label,
  value,
}) => (
  <div className="flex items-center justify-between rounded-lg bg-slate-950/60 px-2.5 py-1.5">
    <span className="flex items-center gap-1.5 text-slate-400">
      <span className={`inline-block h-2 w-2 rounded-full ${color}`} />
      {label}
    </span>
    <span className="font-mono font-medium text-slate-200 tabular-nums">{value}</span>
  </div>
);

export default App;
