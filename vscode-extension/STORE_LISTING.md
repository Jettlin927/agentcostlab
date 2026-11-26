# Store Listing Copy — VS Code Marketplace & Open VSX

## Package Metadata (`package.json`)
- **Publisher:** `jettlin927`
- **Extension Name:** `agentcost-lint`
- **Display Name:** `AgentCostLab — CLAUDE.md & MCP Token Linter`
- **Categories:** `Linters`, `Other`
- **Tags / Keywords:** `claude`, `agents`, `mcp`, `prompt-caching`, `llm-cost`, `token-counter`, `cursorrules`, `ai`
- **Icon:** `images/icon.png` (`128x128` PNG)
- **Gallery Banner:** `#0b1120` (`dark`)
- **Privacy Policy:** `https://github.com/Jettlin927/agentcostlab/blob/main/vscode-extension/PRIVACY.md`

## Marketplace Short Summary
Live token counter, 1,000-run prompt-cache cost estimator, cache-buster detector, and API key leak linter for `CLAUDE.md`, `AGENTS.md`, `SKILL.md`, `.cursorrules`, and `mcp.json`.

## Publish Commands
1. Build & verify `.vsix`:
   ```bash
   cd vscode-extension
   npm run test
   npm run package
   ```
   Output: `vscode-extension/dist/agentcost-lint-0.1.0.vsix`
2. Publish to Visual Studio Marketplace (requires `VSCE_PAT`):
   ```bash
   npx @vscode/vsce publish --packagePath dist/agentcost-lint-0.1.0.vsix
   ```
3. Publish to Open VSX Registry (Cursor / Windsurf / VSCodium / Antigravity, requires `OVSX_PAT`):
   ```bash
   npx ovsx publish dist/agentcost-lint-0.1.0.vsix
   ```
