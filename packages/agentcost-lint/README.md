# agentcost-lint

Zero-dependency CLI & **SARIF 2.1.0** linter for AI agent instruction files (`CLAUDE.md`, `AGENTS.md`, `SKILL.md`, `.cursorrules`, `COPILOT_INSTRUCTIONS.md`) and MCP configs (`mcp.json`, `.mcp.json`).

Catch **prompt-cache-busting timestamps**, **hardcoded API keys**, **malformed JSON**, and **bloated static prefixes** before they multiply across $O(N^2)$ multi-turn agent loops.

- **Web Simulator & 24-Model Pareto Leaderboard**: https://jettlin927.github.io/agentcostlab/
- **GitHub Action & Source**: https://github.com/Jettlin927/agentcostlab
- **x402 Pay-Per-Call MCP Server**: https://x402-mcp-agentcost.jettlin666.workers.dev

## Quick Start (`npx`)

```bash
# Auto-discover CLAUDE.md, AGENTS.md, .cursorrules, mcp.json in current repo
npx agentcost-lint

# Enforce budget & fail CI on cache-busters or leaked secrets
npx agentcost-lint --model claude-sonnet-5-5 --turns 24 --max-tokens 8000 --fail-on-high

# Emit SARIF 2.1.0 for GitHub Code Scanning
npx agentcost-lint --format sarif --sarif-file agentcost-lint.sarif

# Start zero-dependency local stdio MCP server (Claude Code / Cursor / Codex)
npx -y agentcost-lint --mcp
```

## Local MCP Server (`mcp.json`)

Use `agentcost-lint` offline as a local stdio MCP server (`lint_prompt_text`, `lint_workspace_prompts`, `list_lint_models`):

```json
{
  "mcpServers": {
    "agentcost-lint": {
      "command": "npx",
      "args": ["-y", "agentcost-lint", "--mcp"]
    }
  }
}
```

## `pre-commit` Hook

Add to `.pre-commit-config.yaml`:

```yaml
repos:
  - repo: https://github.com/Jettlin927/agentcostlab
    rev: main
    hooks:
      - id: agentcost-lint
```

## Options

| Flag | Description | Default |
|---|---|---|
| `[paths...]` | Files or directories to scan | Auto-discovers standard agent/MCP files |
| `--model <id>` | Pricing model (`--list-models` for all 20 built-in profiles) | `claude-sonnet-5-5` |
| `--turns <n>` | Simulated multi-turn agent loop turns | `24` |
| `--max-tokens <n>` | Exit `1` if total static prefix exceeds `<n>` tokens | Unset |
| `--fail-on-high` | Exit `1` on high-severity findings (cache-busters, secret leaks) | `false` |
| `--fail-on-medium` | Exit `1` on medium-severity findings (heavy prefix, malformed JSON) | `false` |
| `--format <fmt>` | `text` \| `json` \| `github` \| `sarif` | `auto` (`github` in Actions) |
| `--sarif-file <path>` | Write SARIF 2.1.0 JSON report to `<path>` | Unset |
| `--summary-file <path>` | Append Markdown table to `<path>` (or `GITHUB_STEP_SUMMARY`) | `GITHUB_STEP_SUMMARY` |
| `--mcp` | Start zero-dependency JSON-RPC 2.0 stdio MCP server | `false` |
| `--list-models` | List all built-in Nov 2026 model IDs | — |

## Built-In Pricing Profiles (22 Models)

Includes **Claude Sonnet 5.5 / Opus 5.5 / Fable 5.2 / Haiku 5.5**, **GPT-6.2 Sol / Astra / 6.1 Terra / 6 Luna**, **Gemini 4 Carbon / Neon / Argon / Hydrogen**, **DeepSeek V4 Pro / V4.1 Flash**, **Qwen4-Max**, **Kimi K3.1 Pro**, **Grok 4.7**, **GLM-5.3 / 5.3-Flash**, **MiniMax-M3**, and **Mistral Large 4 / Small 4**.

## License

MIT — [Jett Lin (Jettlin927)](https://github.com/Jettlin927/agentcostlab)
