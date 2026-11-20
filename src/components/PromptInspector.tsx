import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowRight, FileCode2, ShieldAlert, Sparkles } from 'lucide-react';
import type { LLMModel } from '../data/models';
import { formatUsd, inspectPromptOverhead } from '../engine/simulator';

interface PromptInspectorProps {
  model: LLMModel;
  turns: number;
  lang: 'en' | 'zh';
  onApplyPrefixTokens: (tokens: number) => void;
}

const SAMPLE_MCP_JSON = `{
  "mcpServers": {
    "github": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": { "GITHUB_PERSONAL_ACCESS_TOKEN": "YOUR_TOKEN_HERE" }
    },
    "postgres": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-postgres", "postgresql://localhost/app"]
    },
    "filesystem": {
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"]
    }
  },
  "tools": [
    {
      "name": "search_codebase",
      "description": "Search repository files using ripgrep regex patterns and return matching lines with context.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "query": { "type": "string", "description": "Regex or literal search pattern" },
          "glob": { "type": "string", "description": "Optional file glob filter" },
          "maxResults": { "type": "number", "default": 50 }
        },
        "required": ["query"]
      }
    },
    {
      "name": "run_sql_query",
      "description": "Execute a read-only PostgreSQL query and return rows as JSON.",
      "inputSchema": {
        "type": "object",
        "properties": {
          "sql": { "type": "string" },
          "limit": { "type": "number", "default": 100 }
        },
        "required": ["sql"]
      }
    }
  ]
}`;

const SAMPLE_CLAUDE_MD = `# CLAUDE.md — Engineering Rules

## Architecture & Build Commands
- Stack: TypeScript, React 19, Vite, Tailwind CSS, FastAPI backend.
- Run tests before any commit: \`npm test && pytest\`
- Never modify production migrations without explicit approval.

## Coding Standards
- Prefer pure functions and strict TypeScript types (no \`any\`).
- Keep API handlers thin; place business logic inside \`src/services/\`.
- Current session timestamp: current_time (WARNING: example cache-buster!)
`;

export const PromptInspector: React.FC<PromptInspectorProps> = ({
  model,
  turns,
  lang,
  onApplyPrefixTokens,
}) => {
  const [text, setText] = useState(SAMPLE_MCP_JSON);

  const inspection = useMemo(() => inspectPromptOverhead(text, turns, model), [text, turns, model]);

  return (
    <div className="grid gap-6 lg:grid-cols-12">
      <div className="space-y-4 lg:col-span-7">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <FileCode2 className="h-4 w-4 text-sky-400" />
              <h2 className="text-sm font-semibold text-slate-100">
                {lang === 'zh'
                  ? '粘贴你的 CLAUDE.md / AGENTS.md / MCP JSON 工具定义'
                  : 'Paste your CLAUDE.md, AGENTS.md, SKILL.md, or MCP JSON Schema'}
              </h2>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setText(SAMPLE_MCP_JSON)}
                className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs text-slate-300 hover:border-sky-500/60 hover:text-white"
              >
                {lang === 'zh' ? '加载 MCP 示例' : 'Sample MCP JSON'}
              </button>
              <button
                type="button"
                onClick={() => setText(SAMPLE_CLAUDE_MD)}
                className="rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-xs text-slate-300 hover:border-sky-500/60 hover:text-white"
              >
                {lang === 'zh' ? '加载 CLAUDE.md 示例' : 'Sample CLAUDE.md'}
              </button>
            </div>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={15}
            spellCheck={false}
            placeholder={
              lang === 'zh'
                ? '所有分析 100% 在本地浏览器运行，绝不上传任何内容...'
                : '100% client-side analysis — your prompts and schemas never leave your browser...'
            }
            className="w-full rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs leading-relaxed text-slate-200 placeholder-slate-500 focus:border-sky-500 focus:outline-none"
          />

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
            <span>
              {lang === 'zh'
                ? '100% 纯前端本地计算，不会向任何服务器发送你的提示词或配置。'
                : '100% client-side computation. Zero data leaves your browser.'}
            </span>
            <button
              type="button"
              onClick={() => onApplyPrefixTokens(Math.max(500, inspection.estimatedTokens))}
              className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3.5 py-2 text-xs font-semibold text-slate-950 transition hover:bg-sky-400"
            >
              <Sparkles className="h-3.5 w-3.5" />
              {lang === 'zh'
                ? `一键导入 ${inspection.estimatedTokens.toLocaleString()} tokens 到模拟器`
                : `Load ${inspection.estimatedTokens.toLocaleString()} tokens into Simulator`}
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4 lg:col-span-5">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
          <h3 className="mb-4 text-sm font-semibold text-slate-100">
            {lang === 'zh' ? '静态前缀“Token 税”体检报告' : 'Static Prefix "Token Tax" Audit'}
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5">
              <div className="text-xs text-slate-400">
                {lang === 'zh' ? '预估 Token 数' : 'Estimated Tokens'}
              </div>
              <div className="mt-1 text-2xl font-bold text-sky-300 tabular-nums">
                {inspection.estimatedTokens.toLocaleString()}
              </div>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/80 p-3.5">
              <div className="text-xs text-slate-400">
                {lang === 'zh' ? '检测到的工具/行数' : 'Detected Tools / Lines'}
              </div>
              <div className="mt-1 text-2xl font-bold text-slate-100 tabular-nums">
                {inspection.isJson ? `${inspection.detectedToolCount} tools` : `${inspection.lineCount} lines`}
              </div>
            </div>
          </div>

          <div className="mt-4 space-y-2.5 rounded-xl border border-slate-800 bg-slate-950/80 p-4 text-xs">
            <div className="font-medium text-slate-300">
              {lang === 'zh'
                ? `在 ${model.name} 上运行 1,000 次 (${turns} 轮/次)，仅此文件本身花费：`
                : `Cost of this file alone across 1,000 runs (${turns} turns/run) on ${model.name}:`}
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-slate-400">
                {lang === 'zh' ? '未开启 Prompt Caching：' : 'Without Prompt Caching:'}
              </span>
              <span className="text-sm font-bold text-rose-300 tabular-nums">
                {formatUsd(inspection.costPer1kRunsUncached)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-400">
                {lang === 'zh' ? '开启 Prompt Caching 后：' : 'With Prompt Caching:'}
              </span>
              <span className="text-sm font-bold text-emerald-300 tabular-nums">
                {formatUsd(inspection.costPer1kRunsCached)}
              </span>
            </div>
          </div>

          <div className="mt-4 space-y-2.5">
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {lang === 'zh' ? '安全与缓存静态检查' : 'Cache & Security Lint Warnings'}
            </div>
            {inspection.warnings.length === 0 ? (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-300">
                {lang === 'zh'
                  ? '✓ 未检测到硬编码密钥或破坏 Prompt Caching 的动态时间戳。'
                  : '✓ Clean! No hardcoded secrets or cache-busting dynamic variables detected.'}
              </div>
            ) : (
              inspection.warnings.map((w, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2.5 rounded-xl border p-3 text-xs ${
                    w.severity === 'high'
                      ? 'border-rose-500/30 bg-rose-500/10 text-rose-200'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-200'
                  }`}
                >
                  {w.severity === 'high' ? (
                    <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0 text-rose-400" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
                  )}
                  <span>{lang === 'zh' ? w.messageZh : w.message}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
