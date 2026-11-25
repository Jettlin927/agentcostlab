# AgentCostLab — Chrome & Edge Extension

Zero-telemetry Manifest V3 browser extension that surfaces live token counts, 1,000-run prompt-caching costs, cache-buster warnings, and leaked API key detection directly on GitHub (`CLAUDE.md`, `AGENTS.md`, `SKILL.md`, `.cursorrules`, `copilot-instructions.md`, and `mcp.json`) as well as in a pasteboard popup.

## Features

- **Automatic GitHub File Badge**: Displays a floating bottom-right cost & lint badge on GitHub blob pages for agent instruction files and MCP configs.
- **Instant Popup Linter**: Auto-loads the active GitHub file or lets you paste any prompt / `mcp.json` and compare 1,000-run cached vs. uncached cost across 22 Nov-2026 LLM pricing profiles (`Claude Sonnet 5.5`, `GPT-6.2 Sol`, `Gemini 4 Neon`, `DeepSeek V4 Pro`, `Qwen4-Max`, `Kimi K3.1 Pro`, `MiniMax-M3`, `Mistral Large 4`, etc.).
- **100% Client-Side & Private**: No telemetry, no external API calls, and minimal permissions (`activeTab`, `storage`).

## Load Unpacked (Chrome / Edge / Brave)

1. Sync the shared lint engine from the repository root:
   ```bash
   node chrome-extension/scripts/sync-core.mjs
   ```
2. Open `chrome://extensions` (or `edge://extensions`) and enable **Developer mode**.
3. Click **Load unpacked** and select `D:\agentcostlab\chrome-extension`.

## Test

```bash
node chrome-extension/scripts/sync-core.mjs
node --test chrome-extension/extension.node-test.mjs
```
