import React, { useState } from 'react';
import { AlertCircle, Check } from 'lucide-react';
import type { ModelTier } from '../data/models';
import { formatUsd, type ModelComparisonRow } from '../engine/simulator';

interface ModelLeaderboardProps {
  rows: ModelComparisonRow[];
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  lang: 'en' | 'zh';
}

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

  const filtered = tierFilter === 'all' ? rows : rows.filter((r) => r.model.tier === tierFilter);

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">
            {lang === 'zh'
              ? '全网主流模型实时对比榜 (2026.11 最新 API 定价)'
              : 'Live 15-Model Leaderboard (Nov 2026 API Pricing)'}
          </h3>
          <p className="text-xs text-slate-400">
            {lang === 'zh'
              ? '点击任意一行即可切换为主模型；自动计算缓存折扣与长上下文阶梯涨价'
              : 'Click any row to switch primary model; includes cache discounts & long-context tier step-ups'}
          </p>
        </div>

        <div className="flex rounded-xl border border-slate-800 bg-slate-950 p-1 text-xs">
          {(['all', 'frontier', 'balanced', 'economy'] as const).map((tier) => (
            <button
              key={tier}
              type="button"
              onClick={() => setTierFilter(tier)}
              className={`rounded-lg px-2.5 py-1 capitalize transition ${
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

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400">
              <th className="pb-2.5 font-medium">{lang === 'zh' ? '模型' : 'Model'}</th>
              <th className="pb-2.5 font-medium">{lang === 'zh' ? '档位' : 'Tier'}</th>
              <th className="pb-2.5 text-right font-medium">
                {lang === 'zh' ? '单次运行' : 'Cost / Run'}
              </th>
              <th className="pb-2.5 text-right font-medium">
                {lang === 'zh' ? '月度总花费' : 'Monthly Spend'}
              </th>
              <th className="pb-2.5 text-right font-medium">
                {lang === 'zh' ? '缓存省下' : 'Cache Saved'}
              </th>
              <th className="pb-2.5 text-right font-medium">
                {lang === 'zh' ? '对比当前' : 'vs Selected'}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60">
            {filtered.map((row) => {
              const isSelected = row.model.id === selectedModelId;
              return (
                <tr
                  key={row.model.id}
                  onClick={() => onSelectModel(row.model.id)}
                  className={`cursor-pointer transition ${
                    isSelected
                      ? 'bg-sky-500/10 hover:bg-sky-500/15'
                      : 'hover:bg-slate-800/40'
                  }`}
                >
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
                        <div className="flex items-center gap-1.5 font-medium text-slate-100">
                          {row.model.name}
                          {row.contextOverflow && (
                            <span
                              title="Peak context exceeds model context window"
                              className="inline-flex items-center gap-0.5 rounded bg-rose-500/20 px-1.5 py-0.5 text-[10px] text-rose-300"
                            >
                              <AlertCircle className="h-2.5 w-2.5" />
                              Ctx Overflow
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-500">{row.model.providerLabel}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5">
                    <span
                      className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-medium capitalize ${
                        TIER_BADGE[row.model.tier]
                      }`}
                    >
                      {row.model.tier}
                    </span>
                  </td>
                  <td className="py-2.5 text-right font-mono text-slate-200 tabular-nums">
                    {formatUsd(row.perRunCost)}
                  </td>
                  <td className="py-2.5 text-right font-mono font-semibold text-white tabular-nums">
                    {formatUsd(row.monthlyCost)}
                  </td>
                  <td className="py-2.5 text-right font-mono text-emerald-300 tabular-nums">
                    {row.cacheSavingsPct > 0 ? `-${row.cacheSavingsPct.toFixed(0)}%` : '—'}
                  </td>
                  <td className="py-2.5 text-right font-mono tabular-nums">
                    {isSelected ? (
                      <span className="text-sky-400">{lang === 'zh' ? '当前' : 'Selected'}</span>
                    ) : row.deltaVsSelectedPct < 0 ? (
                      <span className="text-emerald-400">
                        {row.deltaVsSelectedPct.toFixed(0)}%
                      </span>
                    ) : (
                      <span className="text-rose-400">
                        +{row.deltaVsSelectedPct.toFixed(0)}%
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
