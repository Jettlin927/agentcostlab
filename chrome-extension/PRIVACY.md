# Privacy Policy — AgentCostLab Chrome & Edge Extension

**Effective Date:** November 26, 2026
**Developer:** Jett Lin (`Jettlin927`)
**Contact / Support:** https://github.com/Jettlin927/agentcostlab/issues

## 1. Data Collection & Processing

**AgentCostLab — CLAUDE.md & MCP Token Linter** processes all text **100% locally inside your browser**.

- **Zero Telemetry & Analytics:** We do not collect, log, sell, or transmit usage analytics, browsing history, IP addresses, or personal identifiers.
- **Zero External Code or API Calls:** All token estimation, prompt cache-buster checks, secret-leak regexes, and pricing tables are bundled inside the extension package. File contents from GitHub pages or the popup textarea never leave your browser.

## 2. Permissions Justification

- **`storage` (`chrome.storage.local`):** Stores only your selected pricing model ID (e.g., `claude-sonnet-5-5`) and turn-count preference (`1–100`) locally on your device.
- **`activeTab`:** Used only when you click the extension popup icon to request the currently displayed file text from our GitHub content script on the active tab so you can inspect it without manual copy-paste.
- **Host Match (`https://github.com/*`):** Injects the lightweight badge script solely on GitHub file blob URLs matching agent instructions or MCP configs (`CLAUDE.md`, `AGENTS.md`, `SKILL.md`, `.cursorrules`, `copilot-instructions.md`, `mcp.json`, `.claude/settings.json`). It does not read cookies, credentials, or unrelated websites.

## 3. External Links

Clicking the optional `"Simulator →"` link opens `https://jettlin927.github.io/agentcostlab/` in a new browser tab. No prompt text is sent in query parameters or URL fragments.
