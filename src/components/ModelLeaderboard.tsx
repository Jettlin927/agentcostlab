import React, { useMemo, useState } from 'react';
import { AlertCircle, Award, Check } from 'lucide-react';
import type { ModelTier } from '../data/models';
import { formatUsd, type ModelComparisonRow } from '../engine/simulator';

interface ModelLeaderboardProps {
  rows: ModelComparisonRow[];
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  lang: 'en' | 'zh';
}

type SortKey = 'value' | 'solved' | 'intelligence' | 'cheapest';

const TIER_BADGE: Record<ModelTier, string> = {
  frontier: 'bg-purple-500/15 text-purple-300 border-purple-500/30',
  balanced: 'bg-sky-500/15 text-sky-300 border-sky-500/30',
  economy: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
};

export const ModelLeaderboard: React.FC<ModelLeaderboardProps> = ({
  rows,
  selectedModelId,
  onSelectModel,
  lang,
}) => {
  const [tierFilter, setTierFilter] = useState<'all' | ModelTier>('all');
  const [sortBy, setSortBy] = useState<SortKey>('value');

  const sortedAndFiltered = useMemo(() => {
    const base = tierFilter === 'all' ? [...rows] : rows.filter((r) => r.model.tier === tierFilter);
    switch (sortBy) {
      case 'value':
        return base.sort((a, b) => b.valueScore - a.valueScore);
      case 'solved':
        return base.sort((a, b) => a.costPerSolvedTask - b.costPerSolvedTask);
      case 'intelligence':
        return base.sort(
          (a, b) =>
            b.model.intelligenceIndex - a.model.intelligenceIndex ||
            b.model.sweBenchPct - a.model.sweBenchPct
        );
      case 'cheapest':
        return base.sort((a, b) => a.monthlyCost - b.monthlyCost);
    }
  }, [rows, tierFilter, sortBy]);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">
            {lang === 'zh'
              ? '实力 × 成本 综合性价比排行榜 (2026.11)'
              : 'Capability × Cost Value Leaderboard (Nov 2026)'}
          </h3>
          <p className="text-xs text-slate-400">
            {lang === 'zh'
              ? '结合 Artificial Analysis 智商指数、SWE-bench 通过率与你的多轮真实成本，动态计算帕累托最优解'
              : 'Combines AA Intelligence Index, SWE-bench Verified pass rate & your exact multi-turn loop cost'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Sort Mode Selector */}
          <div className="flex rounded-xl border border-slate-800 bg-slate-950 p-1 text-xs">
            {(
              [
                ['value', lang === 'zh' ? '性价比榜' : 'Best Value'],
                ['intelligence', lang === 'zh' ? '实力榜' : 'Smartest'],
                ['solved', lang === 'zh' ? '成功成本' : 'Cost/Solved'],
                ['cheapest', lang === 'zh' ? '最低月费' : 'Cheapest'],
              ] as const
            ).map(([key, label]) => (
              <button
                key={key}
                type="button"
                onClick={() => setSortBy(key)}
                className={`rounded-lg px-2.5 py-1 transition ${
                  sortBy === key
                    ? 'bg-sky-500 font-semibold text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Tier Filter */}
          <div className="flex rounded-xl border border-slate-800 bg-slate-950 p-1 text-xs">
            {(['all', 'frontier', 'balanced', 'economy'] as const).map((tier) => (
              <button
                key={tier}
                type="button"
                onClick={() => setTierFilter(tier)}
                className={`rounded-lg px-2 py-1 capitalize transition ${
                  tierFilter === tier
                    ? 'bg-slate-800 font-medium text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tier === 'all'
                  ? lang === 'zh'
                    ? '全部'
                    : 'All'
                  : tier === 'frontier'
                    ? lang === 'zh'
                      ? '旗舰'
                      : 'Frontier'
                    : tier === 'balanced'
                      ? lang === 'zh'
                        ? '均衡'
                        : 'Balanced'
                      : lang === 'zh'
                        ? '经济'
                        : 'Economy'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400">
              <th className="pb-2.5 font-medium">#</th>
              <th className="pb-2.5 font-medium">{lang === 'zh' ? '模型' : 'Model'}</th>
              <th className="pb-2.5 font-medium">{lang === 'zh' ? '综合实力 (AA / SWE)' : 'Capability (AA / SWE)'}</th>
              <th className="pb-2.5 text-right font-medium">
                {lang === 'zh' ? '性价比分' : 'Value'}
              </th>
              <th className="pb-2.5 text-right font-medium">
                {lang === 'zh' ? '单次成功成本' : 'Cost / Solved'}
              </th>
              <th className="pb-2.5 text-right font-medium">
                {lang === 'zh' ? '月度总花费' : 'Monthly Spend'}
              </th>
              <th className="pb-2.5 text-right font-medium">
                {lang === 'zh' ? '缓存省' : 'Cache'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {sortedAndFiltered.map((row, idx) => {
              const isSelected = row.model.id === selectedModelId;
              return (
                <tr
                  key={row.model.id}
                  onClick={() => onSelectModel(row.model.id)}
                  className={`cursor-pointer transition ${
                    isSelected ? 'bg-sky-500/10 hover:bg-sky-500/15' : 'hover:bg-slate-800/40'
                  }`}
                >
                  <td className="py-2.5 pr-2 font-mono text-slate-500 tabular-nums">{idx + 1}</td>
                  <td className="py-2.5 pr-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                          isSelected
                            ? 'border-sky-400 bg-sky-400 text-slate-950'
                            : 'border-slate-700'
                        }`}
                      >
                        {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                      </span>
                      <div>
                        <div className="flex flex-wrap items-center gap-1.5 font-medium text-slate-100">
                          {row.model.name}
                          {row.isParetoOptimal && (
                            <span
                              title="Pareto-Optimal: no other model is both smarter and cheaper for this loop"
                              className="inline-flex items-center gap-0.5 rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300"
                            >
                              <Award className="h-2.5 w-2.5" />
                              {lang === 'zh' ? '帕累托最优' : 'Pareto'}
                            </span>
                          )}
                          {row.contextOverflow && (
                            <span className="inline-flex items-center gap-0.5 rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] text-rose-300">
                              <AlertCircle className="h-2.5 w-2.5" />
                              Overflow
                            </span>
                          )}
                        </div>
                        <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-slate-500">
                          <span>{row.model.providerLabel}</span>
                          <span>·</span>
                          <span
                            className={`rounded border px-1.5 py-0 text-[9px] capitalize ${
                              TIER_BADGE[row.model.tier]
                            }`}
                          >
                            {row.model.tier}
                          </span>
                          <span>·</span>
                          <span className="tabular-nums">{row.model.speedTokPerSec} tok/s</span>
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Capability bars */}
                  <td className="py-2.5 pr-4">
                    <div className="flex items-center gap-2">
                      <div className="w-24">
                        <div className="flex justify-between text-[10px] tabular-nums">
                          <span className="text-sky-300">AA {row.model.intelligenceIndex}</span>
                          <span className="text-purple-300">{row.model.sweBenchPct}%</span>
                        </div>
                        <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-sky-400 to-purple-400"
                            style={{ width: `${Math.min(100, (row.model.intelligenceIndex / 70) * 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Composite Value Score */}
                  <td className="py-2.5 text-right font-mono tabular-nums">
                    <span
                      className={`inline-block rounded-md px-2 py-0.5 font-bold ${
                        row.valueScore >= 80
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : row.valueScore >= 65
                            ? 'bg-sky-500/15 text-sky-300'
                            : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {row.valueScore}
                    </span>
                  </td>

                  {/* Cost per Solved Task */}
                  <td className="py-2.5 text-right font-mono text-slate-200 tabular-nums">
                    {formatUsd(row.costPerSolvedTask)}
                  </td>

                  {/* Monthly Spend */}
                  <td className="py-2.5 text-right font-mono font-semibold text-white tabular-nums">
                    {formatUsd(row.monthlyCost)}
                  </td>

                  {/* Cache Savings */}
                  <td className="py-2.5 text-right font-mono text-emerald-300 tabular-nums">
                    {row.cacheSavingsPct > 0 ? `-${row.cacheSavingsPct.toFixed(0)}%` : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-[11px] text-slate-500">
        {lang === 'zh'
          ? '注：AA 智商指数参考 Artificial Analysis Intelligence Index；SWE-bench 为 Verified 公开参考通过率；单次成功成本 = 单次运行成本 ÷ SWE-bench 通过率（反映失败重试后的真实交付成本）。'
          : 'Note: AA Intelligence Index references Artificial Analysis composite benchmarks; Cost / Solved = Per-Run Cost ÷ SWE-bench pass rate to capture real retry-adjusted delivery cost.'}
      </p>
    </div>
  );
};
