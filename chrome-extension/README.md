# AgentCostLab — Chrome & Edge Extension

Zero-telemetry Manifest V3 browser extension that surfaces live token counts, 1,000-run prompt-caching costs, cache-buster warnings, and leaked API key detection directly on GitHub (`CLAUDE.md`, `AGENTS.md`, `SKILL.md`, `GEMINI.md`, `CODEX.md`, `.cursorrules`, `.windsurfrules`, `.clinerules`, `copilot-instructions.md`, `opencode.json`, and `mcp.json`) as well as in an interactive popup linter with 1-click Sample & Markdown report export.

## Features

- **Automatic GitHub File Badge**: Displays a dismissible floating bottom-right cost & lint badge on GitHub blob pages for agent instruction files and MCP configs, updating live when you change models or turns.
- **Instant Popup Linter**: Auto-loads the active GitHub file or lets you paste any prompt / `mcp.json`, compare 1,000-run cached vs. uncached cost across 22 Nov-2026 LLM pricing profiles across 10 providers, and copy a Markdown audit report in one click.
- **100% Client-Side & Private**: Zero telemetry, zero external API calls, zero remote code, and minimal permissions (`activeTab`, `storage`). See [PRIVACY.md](PRIVACY.md).

## Load Unpacked (Chrome / Edge / Brave)

1. Sync the shared lint engine and license from the repository root:
   ```bash
   node chrome-extension/scripts/sync-core.mjs
   ```
2. Open `chrome://extensions` (or `edge://extensions`) and enable **Developer mode**.
3. Click **Load unpacked** and select `D:\agentcostlab\chrome-extension`.

## Test & Package (`.zip` for Chrome Web Store / Edge Add-ons)

```bash
node chrome-extension/scripts/sync-core.mjs
node --test chrome-extension/extension.node-test.mjs
node chrome-extension/scripts/package.mjs
```

Produces `chrome-extension/dist/agentcostlab-chrome-v0.1.0.zip`.
