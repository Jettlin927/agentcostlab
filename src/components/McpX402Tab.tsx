import React, { useState } from 'react';
import { Check, Coins, Copy, Play, ShieldCheck, Terminal, Zap } from 'lucide-react';
import { compareAllModels, simulateAgentCost, type SimulationConfig } from '../engine/simulator';

interface McpX402TabProps {
  config: SimulationConfig;
  lang: 'en' | 'zh';
}

const TOOL_CATALOG = [
  {
    name: 'list_models_pricing',
    price: 'FREE',
    descEn: 'Discovery tool: returns 15 models with Nov 2026 pricing, AA Intelligence & SWE-bench scores.',
    descZh: '免费发现工具：返回 15 款主流模型 2026.11 定价、AA 智商指数与 SWE-bench 通过率。',
  },
  {
    name: 'recommend_pareto_route',
    price: '$0.005 USDC',
    descEn: 'Computes Pareto-optimal single model + Hybrid Planner/Worker route for any workload & budget.',
    descZh: '按任务轮数、SWE-bench 门槛与预算，返回帕累托最优模型及混合路由组合。',
  },
  {
    name: 'simulate_agent_cost',
    price: '$0.005 USDC',
    descEn: 'Runs full O(N²) multi-turn loop simulation with prompt caching, retries & long-context step-ups.',
    descZh: '执行完整 O(N²) 多轮循环、缓存折扣、重试膨胀与长上下文阶梯成本仿真。',
  },
  {
    name: 'audit_prompt_cache_tax',
    price: '$0.010 USDC',
    descEn: 'Audits CLAUDE.md / AGENTS.md / mcp.json for token tax, leaked secrets, and cache-busters.',
    descZh: '体检 CLAUDE.md / AGENTS.md / mcp.json 的千次 Token 税、硬编码密钥与缓存破坏点。',
  },
];

export const McpX402Tab: React.FC<McpX402TabProps> = ({ config, lang }) => {
  const [step, setStep] = useState<'idle' | '402' | '200'>('idle');
  const [copiedConfig, setCopiedConfig] = useState(false);

  const workerOrigin =
    typeof window !== 'undefined' && window.location.hostname.endsWith('workers.dev')
      ? window.location.origin
      : 'https://agentcostlab.<your-subdomain>.workers.dev';

  const mcpClientSnippet = `{
  "mcpServers": {
    "agentcostlab": {
      "type": "http",
      "url": "${workerOrigin}/mcp"
    }
  }
}`;

  // Build real live simulation output for the interactive 402 -> 200 demo
  const all = compareAllModels(config);
  const best = all.find((r) => !r.contextOverflow) ?? all[0];
  const worker =
    all.find((r) => r.model.tier === 'economy' && !r.contextOverflow) ?? all[all.length - 1];
  const hybrid = simulateAgentCost({
    ...config,
    modelId: best.model.id,
    workerModelId: worker.model.id,
    enableHybridRouting: true,
    plannerInterval: 5,
  });

  const challengeJson = {
    x402Version: 2,
    error: `Payment required: $0.0050 USDC via x402 to invoke ${workerOrigin}/mcp#recommend_pareto_route`,
    accepts: [
      {
        scheme: 'exact',
        network: 'eip155:8453',
        asset: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        amount: '5000',
        payTo: '0xYOUR_BASE_WALLET_ADDRESS',
        maxTimeoutSeconds: 60,
        extra: { name: 'USD Coin', version: '2', priceUsd: '$0.0050' },
      },
    ],
  };

  const settledJson = {
    jsonrpc: '2.0',
    id: 42,
    result: {
      recommendedSingleModel: {
        name: best.model.name,
        valueScore: best.valueScore,
        isParetoOptimal: best.isParetoOptimal,
        monthlyCostUsd: Number(best.monthlyCost.toFixed(2)),
      },
      recommendedHybridRoute: {
        planner: best.model.name,
        worker: worker.model.name,
        monthlyCostUsd: Number(hybrid.monthlyCost.toFixed(2)),
        extraSavingsPct: Number(hybrid.hybridSavingsPct.toFixed(1)),
      },
    },
  };

  const copySnippet = async () => {
    try {
      await navigator.clipboard.writeText(mcpClientSnippet);
      setCopiedConfig(true);
      setTimeout(() => setCopiedConfig(false), 2000);
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-sm font-semibold text-emerald-200">
              <Coins className="h-4 w-4 text-emerald-400" />
              {lang === 'zh'
                ? 'x402 按次收费 MCP Server（Cloudflare Workers 边缘架构）'
                : 'Pay-Per-Call x402 MCP Server (Cloudflare Workers Edge)'}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-emerald-100/80">
              {lang === 'zh'
                ? '面向自主 AI Agent 的零销售变现架构：tools/list 免费被市场索引，调用付费工具时返回标准 HTTP 402 Payment Required（x402 v2 / Base USDC），Agent 钱包自动签名微支付并秒级结算。'
                : 'Zero-sales machine-to-machine monetization: free discovery via tools/list, HTTP 402 Payment Required (x402 v2 / Base USDC) on premium tools, instant facilitator verify & settle.'}
            </p>
          </div>
          <span className="rounded-full border border-emerald-400/40 bg-emerald-500/20 px-3 py-1 font-mono text-[11px] font-semibold text-emerald-200">
            x402 v2 · Streamable HTTP MCP
          </span>
        </div>
      </div>

      {/* Interactive 402 Handshake Playground */}
      <div className="grid gap-6 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-6">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-white">
              <Zap className="h-4 w-4 text-sky-400" />
              {lang === 'zh' ? 'MCP 工具定价清单（/mcp）' : 'MCP Tool Catalog (/mcp)'}
            </h3>
            <div className="space-y-2.5">
              {TOOL_CATALOG.map((t) => (
                <div
                  key={t.name}
                  className="rounded-xl border border-slate-800 bg-slate-950/80 p-3 text-xs"
                >
                  <div className="flex items-center justify-between gap-2">
                    <code className="font-mono font-semibold text-sky-300">{t.name}</code>
                    <span
                      className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold ${
                        t.price === 'FREE'
                          ? 'bg-slate-800 text-slate-300'
                          : 'bg-emerald-500/20 text-emerald-300'
                      }`}
                    >
                      {t.price}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-400">
                    {lang === 'zh' ? t.descZh : t.descEn}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-white">
                <Terminal className="h-4 w-4 text-amber-400" />
                {lang === 'zh' ? '3 行命令部署到 Cloudflare 开始收款' : 'Deploy to Cloudflare Workers in 3 Commands'}
              </h3>
              <button
                type="button"
                onClick={copySnippet}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] text-slate-200 hover:border-sky-500"
              >
                {copiedConfig ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                {copiedConfig ? 'Copied' : 'Copy mcp.json'}
              </button>
            </div>
            <pre className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950 p-3.5 font-mono text-[11px] leading-relaxed text-slate-300">
{`# Standalone MCP repo: github.com/Jettlin927/x402-mcp-agentcost
git clone https://github.com/Jettlin927/x402-mcp-agentcost.git
cd x402-mcp-agentcost && npm install

# Login, set Base USDC wallet, and deploy to Cloudflare Workers
npx wrangler login
npx wrangler secret put X402_PAY_TO
npm run deploy`}
            </pre>
            <p className="mt-2.5 text-[11px] text-slate-400">
              {lang === 'zh'
                ? '部署后自动暴露 /.well-known/mcp.json 与 /mcp，可直接提交到 PayAPI Market / MCP 目录供全球 Agent 自动发现并按次付费调用。'
                : 'Exposes /.well-known/mcp.json and /mcp automatically — ready to register on MCP & x402 tool marketplaces.'}
            </p>
          </div>
        </div>

        {/* Live HTTP 402 Handshake Demo */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5 lg:col-span-6">
          <div className="mb-3 flex items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-semibold text-white">
                {lang === 'zh'
                  ? '交互式 HTTP 402 → x402 结算演示'
                  : 'Interactive HTTP 402 → x402 Settlement Demo'}
              </h3>
              <p className="text-xs text-slate-400">
                {lang === 'zh'
                  ? '模拟外部 Agent 调用 recommend_pareto_route 的完整机器微支付握手'
                  : 'Simulate an autonomous agent calling recommend_pareto_route end-to-end'}
              </p>
            </div>
          </div>

          <div className="mb-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setStep('402')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                step === '402'
                  ? 'bg-amber-400 text-slate-950'
                  : 'border border-amber-500/40 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25'
              }`}
            >
              <Play className="h-3.5 w-3.5" />
              {lang === 'zh' ? '1. 未付费调用 (触发 402)' : '1. Call Unpaid (Trigger 402)'}
            </button>
            <button
              type="button"
              onClick={() => setStep('200')}
              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
                step === '200'
                  ? 'bg-emerald-400 text-slate-950'
                  : 'border border-emerald-500/40 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25'
              }`}
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {lang === 'zh' ? '2. 附带 PAYMENT-SIGNATURE 重试 (200)' : '2. Retry w/ PAYMENT-SIGNATURE (200)'}
            </button>
          </div>

          {step === 'idle' && (
            <div className="rounded-xl border border-dashed border-slate-700 bg-slate-950/60 p-6 text-center text-xs text-slate-400">
              {lang === 'zh'
                ? '点击上方「1. 未付费调用」查看标准 HTTP 402 响应头与 Base USDC 账单，再点击「2. 附带签名重试」查看结算回执与实时帕累托路由返回。'
                : 'Click "1. Call Unpaid" to inspect the HTTP 402 PAYMENT-REQUIRED challenge, then click "2. Retry" to see facilitator settlement and live Pareto output.'}
            </div>
          )}

          {step === '402' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 font-mono text-xs text-amber-200">
                <span>HTTP/1.1 402 Payment Required</span>
                <span className="text-[10px]">Header: PAYMENT-REQUIRED (Base64)</span>
              </div>
              <pre className="max-h-80 overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-3.5 font-mono text-[11px] leading-relaxed text-amber-100/90">
                {JSON.stringify(challengeJson, null, 2)}
              </pre>
            </div>
          )}

          {step === '200' && (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 font-mono text-xs text-emerald-200">
                <span>HTTP/1.1 200 OK · Settled ($0.005 USDC)</span>
                <span className="text-[10px]">Header: PAYMENT-RESPONSE</span>
              </div>
              <pre className="max-h-80 overflow-auto rounded-xl border border-slate-800 bg-slate-950 p-3.5 font-mono text-[11px] leading-relaxed text-emerald-100/90">
                {JSON.stringify(settledJson, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
