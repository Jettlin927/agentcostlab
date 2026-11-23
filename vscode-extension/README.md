# AgentCostLab — CLAUDE.md & MCP Token Linter

Real-time token tax estimator, prompt cache-buster detector, and API key leak linter inside VS Code, Cursor, Windsurf, and Antigravity.

## Features

- **Live Status Bar Tax Meter**: Displays estimated static prefix tokens and **1,000-run cached cost** whenever you open `CLAUDE.md`, `AGENTS.md`, `SKILL.md`, `.cursorrules`, `COPILOT_INSTRUCTIONS.md`, `mcp.json`, or `.mcp.json`.
- **Cache-Buster Squiggles**: Flags dynamic patterns (`current_time`, `timestamp`, `Date.now`, `new Date`, `uuid`, `random`) inside static prefixes that silently break prompt caching and multiply multi-turn bills by 5x–10x.
- **Hardcoded Secret Detection**: Highlights leaked `sk-...`, `ghp_...`, `AIza...`, and `xoxb-` tokens before they get committed or sent to model providers.
- **MCP Tool Bloat & JSON Guardrail**: Counts MCP tool definitions, catches malformed JSON, and warns when static prefixes exceed 8,000 tokens.
- **Zero-Telemetry & Offline**: 100% local static analysis powered by the same engine behind [AgentCostLab](https://jettlin927.github.io/agentcostlab/), `agentcost-lint` CLI/GitHub Action, and [x402-mcp-agentcost](https://x402-mcp-agentcost.jettlin666.workers.dev/).

## Commands

- `AgentCostLab: Inspect Prompt / MCP Token Tax` — Force-inspect any open file (even outside default filenames).
- `AgentCostLab: Select Pricing Model` — Switch between Claude 5.5/Fable 5.2, GPT-6.2/Luna, Gemini 4 Carbon/Neon/Argon, and DeepSeek V4/V4.1.
- `AgentCostLab: Open Web Cost Simulator` — Launch the full multi-turn $O(N^2)$ Pareto simulator.

## Packaging

```bash
npm run sync-core
npx @vscode/vsce package
```
