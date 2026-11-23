import React, { useState } from 'react';
import { Award } from 'lucide-react';
import type { ProviderId } from '../data/models';
import { formatUsd, type ModelComparisonRow } from '../engine/simulator';

interface ParetoScatterChartProps {
  rows: ModelComparisonRow[];
  selectedModelId: string;
  onSelectModel: (modelId: string) => void;
  lang: 'en' | 'zh';
}

const PROVIDER_COLORS: Record<ProviderId, string> = {
  anthropic: '#f59e0b', // amber
  openai: '#38bdf8', // sky
  google: '#a855f7', // purple
  deepseek: '#10b981', // emerald
  qwen: '#fb7185', // rose
  moonshot: '#22d3ee', // cyan
  custom: '#94a3b8',
};

export const ParetoScatterChart: React.FC<ParetoScatterChartProps> = ({
  rows,
  selectedModelId,
  onSelectModel,
  lang,
}) => {
  const [yMetric, setYMetric] = useState<'intelligence' | 'swe'>('intelligence');
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  if (rows.length === 0) return null;

  const width = 760;
  const height = 320;
  const pad = { top: 24, right: 32, bottom: 44, left: 58 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const logCosts = rows.map((r) => Math.log10(Math.max(0.0005, r.perRunCost)));
  const minLogX = Math.min(...logCosts) - 0.15;
  const maxLogX = Math.max(...logCosts) + 0.15;
  const spanX = Math.max(0.2, maxLogX - minLogX);

  const yVals = rows.map((r) =>
    yMetric === 'intelligence' ? r.model.intelligenceIndex : r.model.sweBenchPct
  );
  const minY = Math.floor(Math.min(...yVals) - 4);
  const maxY = Math.ceil(Math.max(...yVals) + 3);
  const spanY = Math.max(5, maxY - minY);

  const xOf = (cost: number) =>
    pad.left + ((Math.log10(Math.max(0.0005, cost)) - minLogX) / spanX) * plotW;
  const yOf = (val: number) => pad.top + plotH - ((val - minY) / spanY) * plotH;

  // Compute Pareto frontier line for the active Y metric
  const validRows = rows.filter((r) => !r.contextOverflow);
  const getY = (r: ModelComparisonRow) =>
    yMetric === 'intelligence' ? r.model.intelligenceIndex : r.model.sweBenchPct;

  const paretoPoints = validRows
    .filter((row) => {
      const y = getY(row);
      return !validRows.some(
        (other) =>
          other.model.id !== row.model.id &&
          getY(other) >= y &&
          other.perRunCost <= row.perRunCost &&
          (getY(other) > y || other.perRunCost < row.perRunCost)
      );
    })
    .sort((a, b) => a.perRunCost - b.perRunCost);

  const paretoPath = paretoPoints
    .map((r, i) => `${i === 0 ? 'M' : 'L'} ${xOf(r.perRunCost).toFixed(1)} ${yOf(getY(r)).toFixed(1)}`)
    .join(' ');

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const v = minY + spanY * f;
    return { val: v, y: yOf(v) };
  });

  const xTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => {
    const logV = minLogX + spanX * f;
    return { val: Math.pow(10, logV), x: pad.left + f * plotW };
  });

  const activeRow =
    rows.find((r) => r.model.id === hoveredId) ??
    rows.find((r) => r.model.id === selectedModelId) ??
    rows[0];

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Award className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-slate-100">
              {lang === 'zh'
                ? '实力 vs 真实多轮成本 · 帕累托最优前沿 (Pareto Frontier)'
                : 'Capability vs. Real Multi-Turn Cost — Pareto Frontier'}
            </h3>
          </div>
          <p className="mt-0.5 text-xs text-slate-400">
            {lang === 'zh'
              ? '越靠左上角 = 实力越强且越便宜。绿线上的模型为当前 Agent 场景下的帕累托最优解（点击圆点可切换模型）'
              : 'Top-left = smarter AND cheaper. Models on the dashed green frontier are Pareto-optimal for your exact loop'}
          </p>
        </div>

        <div className="flex rounded-xl border border-slate-800 bg-slate-950 p-1 text-xs">
          <button
            type="button"
            onClick={() => setYMetric('intelligence')}
            className={`rounded-lg px-2.5 py-1 transition ${
              yMetric === 'intelligence'
                ? 'bg-slate-800 font-medium text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {lang === 'zh' ? '综合智商指数 (AA)' : 'Intelligence Index'}
          </button>
          <button
            type="button"
            onClick={() => setYMetric('swe')}
            className={`rounded-lg px-2.5 py-1 transition ${
              yMetric === 'swe'
                ? 'bg-slate-800 font-medium text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {lang === 'zh' ? '编程 Agent (SWE-bench)' : 'SWE-bench Verified'}
          </button>
        </div>
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full min-w-[540px]">
          {/* Horizontal grid */}
          {yTicks.map((t, i) => (
            <g key={i}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={t.y}
                y2={t.y}
                stroke="#1e293b"
                strokeWidth="1"
              />
              <text
                x={pad.left - 10}
                y={t.y + 4}
                textAnchor="end"
                className="fill-slate-400 text-[11px] tabular-nums"
              >
                {yMetric === 'swe' ? `${t.val.toFixed(0)}%` : t.val.toFixed(0)}
              </text>
            </g>
          ))}

          {/* Vertical grid (Log cost) */}
          {xTicks.map((t, i) => (
            <g key={i}>
              <line
                x1={t.x}
                x2={t.x}
                y1={pad.top}
                y2={pad.top + plotH}
                stroke="#1e293b"
                strokeDasharray="2 4"
                strokeWidth="1"
              />
              <text
                x={t.x}
                y={height - 20}
                textAnchor="middle"
                className="fill-slate-400 text-[11px] tabular-nums"
              >
                {formatUsd(t.val)}
              </text>
            </g>
          ))}

          {/* Axis title */}
          <text
            x={pad.left + plotW / 2}
            y={height - 4}
            textAnchor="middle"
            className="fill-slate-500 text-[10px]"
          >
            {lang === 'zh'
              ? '单次多轮任务成本 (对数坐标，越左越便宜) →'
              : 'Cost per Multi-Turn Run (Log Scale, Left = Cheaper) →'}
          </text>

          {/* Pareto Frontier Line */}
          {paretoPoints.length > 1 && (
            <path
              d={paretoPath}
              fill="none"
              stroke="#10b981"
              strokeWidth="2"
              strokeDasharray="5 4"
              opacity="0.75"
            />
          )}

          {/* Model scatter dots */}
          {rows.map((r) => {
            const cx = xOf(r.perRunCost);
            const cy = yOf(getY(r));
            const color = PROVIDER_COLORS[r.model.provider];
            const isSelected = r.model.id === selectedModelId;
            const isHovered = r.model.id === hoveredId;
            const isPareto = paretoPoints.some((p) => p.model.id === r.model.id);

            return (
              <g
                key={r.model.id}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredId(r.model.id)}
                onMouseLeave={() => setHoveredId(null)}
                onClick={() => onSelectModel(r.model.id)}
              >
                {isPareto && (
                  <circle
                    cx={cx}
                    cy={cy}
                    r={isHovered || isSelected ? 12 : 9}
                    fill="#10b981"
                    opacity="0.16"
                  />
                )}
                <circle
                  cx={cx}
                  cy={cy}
                  r={isSelected ? 7 : isHovered ? 6.5 : 5}
                  fill={color}
                  stroke={isSelected ? '#ffffff' : '#0f172a'}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                />
                {(isPareto || isSelected || isHovered) && (
                  <text
                    x={cx + 8}
                    y={cy - 6}
                    className={`pointer-events-none text-[10px] font-medium ${
                      isSelected || isHovered ? 'fill-white' : 'fill-slate-300'
                    }`}
                  >
                    {r.model.name.replace(' (Off-Peak)', ' OP').replace(' (Peak)', '')}
                  </text>
                )}
              </g>
            );
          })}
        </svg>
      </div>

      {/* Legend + Active Model Readout */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-950/70 px-3.5 py-2.5 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <span className="font-semibold text-white">{activeRow.model.name}</span>
          <span className="text-slate-400">
            AA: <strong className="text-sky-300 tabular-nums">{activeRow.model.intelligenceIndex}</strong>
          </span>
          <span className="text-slate-400">
            SWE: <strong className="text-purple-300 tabular-nums">{activeRow.model.sweBenchPct}%</strong>
          </span>
          <span className="text-slate-400">
            {lang === 'zh' ? '单次' : 'Run'}:{' '}
            <strong className="text-slate-100 tabular-nums">{formatUsd(activeRow.perRunCost)}</strong>
          </span>
          <span className="text-slate-400">
            {lang === 'zh' ? '单次成功成本' : 'Cost/Solved'}:{' '}
            <strong className="text-emerald-300 tabular-nums">
              {formatUsd(activeRow.costPerSolvedTask)}
            </strong>
          </span>
          {activeRow.isParetoOptimal && (
            <span className="rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-300">
              ★ {lang === 'zh' ? '帕累托最优' : 'Pareto Optimal'}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px] text-slate-400">
          {(['anthropic', 'openai', 'google', 'deepseek', 'qwen', 'moonshot'] as const).map((p) => (
            <span key={p} className="inline-flex items-center gap-1 capitalize">
              <span
                className="inline-block h-2 w-2 rounded-full"
                style={{ backgroundColor: PROVIDER_COLORS[p] }}
              />
              {p}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};
