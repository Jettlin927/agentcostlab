# AgentCostLab

**Multi-Turn AI Agent Loop, Prompt Caching & MCP Tool Schema Cost Simulator**

Live Demo: **https://jettlin927.github.io/agentcostlab/**

> Naive LLM calculators (`input × price + output × price`) drastically underestimate autonomous agent bills. Every tool-calling turn resends growing conversation history and MCP tool schemas, producing **$O(N^2)$ quadratic token growth**.

## Key Features

- **Quadratic Multi-Turn Loop Engine**: Simulates Turn 1 through Turn $N$ context accumulation, retry inflation, hidden reasoning tokens, and model-specific long-context pricing step-ups.
- **Prompt Caching Economics**: Models first-turn cache write multipliers (e.g., 1.25× on Anthropic vs 1.0× on OpenAI/DeepSeek) and subsequent cache-read discounts (up to 98% off).
- **Hybrid Planner / Worker Routing**: Compare running every turn on a Frontier model vs routing Turn 1 + periodic planning turns to a Frontier model and tool-execution turns to an Economy worker.
- **CLAUDE.md / AGENTS.md / MCP Schema Inspector**: 100% client-side token estimator + static linter that catches hardcoded API keys and cache-busting timestamps, then calculates the 1,000-run "token tax" of your file.
- **Capability × Cost Pareto Leaderboard**: Combines Artificial Analysis Intelligence Index, SWE-bench Verified pass rates, and your exact multi-turn loop cost to plot the live **Pareto Frontier**, compute **Cost per Solved Task** (`perRunCost / passRate`), and rank models by composite **Value Score**.
- **24 Models (Nov 2026 API Pricing)**: OpenAI (GPT-6.2 Astra / Sol / 6.1 Terra / 6 Luna), Anthropic (Claude Fable 5.2 / Opus 5.5 / Sonnet 5.5 / Haiku 5.5), Google (Gemini 4 Neon / Carbon / Argon / Hydrogen / 3.8 Flash / 3.5 Flash-Lite), DeepSeek (V4 Pro & V4.1 Flash Peak/Off-Peak), Alibaba Qwen (Qwen4-Max), Moonshot AI (Kimi K3.1 Pro), xAI (Grok 4.7), Z.ai (GLM-5.3 / 5.3-Flash), and MiniMax (MiniMax-M3).
- **Pay-Per-Call x402 MCP Server (`worker/`)**: Cloudflare Workers Streamable HTTP MCP server (`/mcp` + `/.well-known/mcp.json`) with free `tools/list` discovery and **x402 v2 (`HTTP 402 Payment Required` / Base USDC)** micropayment gating on `simulate_agent_cost`, `recommend_pareto_route`, and `audit_prompt_cache_tax`.
- **Programmatic SEO (pSEO) Built-In**: Post-build script emits static crawlable HTML routes for preset scenarios and head-to-head comparisons, plus `sitemap.xml`, `robots.txt`, and `404.html`.
- **Shareable URLs & RFC Exports**: Every slider syncs to URL query parameters; one-click copy Markdown budget table or export CSV.

## Local Development

```bash
npm install
npm test
npm run dev
```

## CI Guardrail: `agentcost-lint` CLI & GitHub Action

Catch bloated `CLAUDE.md` / `AGENTS.md` / `mcp.json` static prefixes, prompt-cache-busting timestamps, and leaked API keys directly in pull requests before they multiply your $O(N^2)$ agent bills:

```bash
# Auto-discover CLAUDE.md, AGENTS.md, .cursorrules, mcp.json in current repo
node bin/agentcost-lint.mjs --model claude-sonnet-5-5 --turns 24 --fail-on-high --max-tokens 8000
```

Or drop the zero-dependency composite GitHub Action into `.github/workflows/agentcost-lint.yml`:

```yaml
- uses: Jettlin927/agentcostlab@main
  with:
    model: claude-sonnet-5-5
    turns: 24
    max-tokens: 8000
    fail-on-high: true
```

## Browser & IDE Extensions

- **Chrome / Edge Extension (`chrome-extension/`)**: Manifest V3 extension that adds a live token & 1,000-run cost badge on GitHub `CLAUDE.md` / `AGENTS.md` / `mcp.json` pages plus a zero-telemetry pasteboard popup.
- **VS Code / Open VSX Extension (`vscode-extension/`)**: Inline cache-buster & secret-leak diagnostics plus live status-bar 1,000-run cost meter.

## Build & Deploy

### GitHub Pages (Automatic)
Push to `main` — `.github/workflows/deploy-pages.yml` runs tests, builds static pSEO pages, and deploys automatically.

### Cloudflare Workers / Pages
```bash
npx wrangler login
npm run deploy:cf
```
Or deploy an instant preview without logging in:
```bash
npm run deploy:cf:preview
```

## Monetization Configuration
Edit `src/data/monetization.ts` to plug in your own Affiliate / Referral URLs (Cloudflare AI Gateway, OpenRouter, DeepSeek, etc.) and GitHub Sponsors link.
