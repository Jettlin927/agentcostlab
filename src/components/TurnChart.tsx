import React, { useState } from 'react';
import { formatUsd, type TurnBreakdown } from '../engine/simulator';

interface TurnChartProps {
  cachedTurns: TurnBreakdown[];
  uncachedTurns: TurnBreakdown[];
  lang: 'en' | 'zh';
}

export const TurnChart: React.FC<TurnChartProps> = ({ cachedTurns, uncachedTurns, lang }) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (cachedTurns.length === 0) return null;

  const width = 760;
  const height = 270;
  const pad = { top: 20, right: 24, bottom: 36, left: 62 };
  const plotW = width - pad.left - pad.right;
  const plotH = height - pad.top - pad.bottom;

  const n = cachedTurns.length;
  const maxCost = Math.max(
    0.0001,
    ...cachedTurns.map((t) => t.cumulativeCost),
    ...uncachedTurns.map((t) => t.cumulativeCost)
  );

  const xOf = (i: number) => (n === 1 ? pad.left + plotW / 2 : pad.left + (i / (n - 1)) * plotW);
  const yOf = (val: number) => pad.top + plotH - (val / maxCost) * plotH;

  const buildPath = (arr: TurnBreakdown[]) =>
    arr
      .map((t, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i).toFixed(1)} ${yOf(t.cumulativeCost).toFixed(1)}`)
      .join(' ');

  const cachedPath = buildPath(cachedTurns);
  const uncachedPath = buildPath(uncachedTurns);

  const cachedArea = `${cachedPath} L ${xOf(n - 1).toFixed(1)} ${(pad.top + plotH).toFixed(1)} L ${xOf(0).toFixed(1)} ${(pad.top + plotH).toFixed(1)} Z`;

  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((f) => ({
    val: maxCost * f,
    y: yOf(maxCost * f),
  }));

  const activeTurn = hoveredIdx !== null ? cachedTurns[hoveredIdx] : cachedTurns[n - 1];
  const activeUncached = hoveredIdx !== null ? uncachedTurns[hoveredIdx] : uncachedTurns[n - 1];

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-semibold text-slate-100">
            {lang === 'zh'
              ? '逐轮累计成本曲线 — O(N²) 膨胀 vs 缓存削峰'
              : 'Cumulative Cost Curve — O(N²) Context Growth vs. Prompt Caching'}
          </h3>
          <p className="text-xs text-slate-400">
            {lang === 'zh'
              ? '悬停查看每一轮的上下文窗口占用、路由模型与累计花费'
              : 'Hover any turn to inspect context window growth, active model, and cumulative spend'}
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-rose-300">
            <span className="inline-block h-2 w-4 rounded-sm border-b-2 border-dashed border-rose-400" />
            {lang === 'zh' ? '无缓存累计' : 'Uncached'}
          </span>
          <span className="flex items-center gap-1.5 text-sky-300">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-400" />
            {lang === 'zh' ? '当前策略累计' : 'Active Strategy'}
          </span>
        </div>
      </div>

      <div className="relative w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="h-auto w-full min-w-[520px]"
          onMouseLeave={() => setHoveredIdx(null)}
        >
          <defs>
            <linearGradient id="cachedGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.32" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid */}
          {yTicks.map((tick, idx) => (
            <g key={idx}>
              <line
                x1={pad.left}
                x2={width - pad.right}
                y1={tick.y}
                y2={tick.y}
                stroke="#1e293b"
                strokeWidth="1"
              />
              <text
                x={pad.left - 10}
                y={tick.y + 4}
                textAnchor="end"
                className="fill-slate-400 text-[11px] tabular-nums"
              >
                {formatUsd(tick.val)}
              </text>
            </g>
          ))}

          {/* X-axis labels */}
          {[0, Math.floor((n - 1) * 0.25), Math.floor((n - 1) * 0.5), Math.floor((n - 1) * 0.75), n - 1]
            .filter((v, i, a) => a.indexOf(v) === i)
            .map((idx) => (
              <text
                key={idx}
                x={xOf(idx)}
                y={height - 10}
                textAnchor="middle"
                className="fill-slate-400 text-[11px] tabular-nums"
              >
                T{cachedTurns[idx].turn}
              </text>
            ))}

          {/* Uncached dashed curve */}
          <path
            d={uncachedPath}
            fill="none"
            stroke="#fb7185"
            strokeWidth="2"
            strokeDasharray="6 4"
            opacity="0.85"
          />

          {/* Cached area + line */}
          <path d={cachedArea} fill="url(#cachedGrad)" />
          <path d={cachedPath} fill="none" stroke="#38bdf8" strokeWidth="2.5" />

          {/* Hover vertical guide & points */}
          {hoveredIdx !== null && (
            <g>
              <line
                x1={xOf(hoveredIdx)}
                x2={xOf(hoveredIdx)}
                y1={pad.top}
                y2={pad.top + plotH}
                stroke="#475569"
                strokeDasharray="3 3"
              />
              <circle
                cx={xOf(hoveredIdx)}
                cy={yOf(uncachedTurns[hoveredIdx].cumulativeCost)}
                r="4"
                fill="#fb7185"
              />
              <circle
                cx={xOf(hoveredIdx)}
                cy={yOf(cachedTurns[hoveredIdx].cumulativeCost)}
                r="5"
                fill="#38bdf8"
                stroke="#0f172a"
                strokeWidth="2"
              />
            </g>
          )}

          {/* Invisible hover columns */}
          {cachedTurns.map((t, i) => {
            const colW = n === 1 ? plotW : plotW / (n - 1);
            return (
              <rect
                key={t.turn}
                x={xOf(i) - colW / 2}
                y={pad.top}
                width={colW}
                height={plotH}
                fill="transparent"
                onMouseEnter={() => setHoveredIdx(i)}
              />
            );
          })}
        </svg>
      </div>

      {/* Live readout footer */}
      <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl border border-slate-800/80 bg-slate-950/70 px-3.5 py-2.5 text-xs sm:grid-cols-4">
        <div>
          <span className="text-slate-400">{lang === 'zh' ? '当前轮次' : 'Turn'}: </span>
          <span className="font-semibold text-slate-100 tabular-nums">
            #{activeTurn.turn} ({activeTurn.role === 'planner' ? 'Planner' : 'Worker'})
          </span>
        </div>
        <div>
          <span className="text-slate-400">{lang === 'zh' ? '上下文占用' : 'Context'}: </span>
          <span className="font-semibold text-amber-300 tabular-nums">
            {(activeTurn.contextWindowUsed / 1000).toFixed(1)}k tok
          </span>
        </div>
        <div>
          <span className="text-slate-400">{lang === 'zh' ? '当前策略累计' : 'Active Cumul.'}: </span>
          <span className="font-semibold text-sky-300 tabular-nums">
            {formatUsd(activeTurn.cumulativeCost)}
          </span>
        </div>
        <div>
          <span className="text-slate-400">{lang === 'zh' ? '无缓存累计' : 'Uncached Cumul.'}: </span>
          <span className="font-semibold text-rose-300 tabular-nums">
            {formatUsd(activeUncached.cumulativeCost)}
          </span>
        </div>
      </div>
    </div>
  );
};
