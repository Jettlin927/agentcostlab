# Privacy Policy — AgentCostLab VS Code & Open VSX Extension

**Effective Date:** November 26, 2026
**Publisher:** Jett Lin (`jettlin927`)
**Support:** https://github.com/Jettlin927/agentcostlab/issues

## 1. Zero Data Collection

**AgentCostLab — CLAUDE.md & MCP Token Linter** (`agentcost-lint`) runs **100% locally** inside your editor's extension host.

- **No Telemetry:** We collect zero usage metrics, error reports, or file contents.
- **No Network Requests:** Token estimation, prompt cache-buster detection, secret-leak scanning, and 1,000-run cost calculations use bundled static pricing tables with zero outbound HTTP calls.
- **Local Settings Only:** Your chosen `agentcostlab.modelId`, `agentcostlab.turns`, and `agentcostlab.lintAllMarkdownAndJson` preferences are stored solely in your standard VS Code user/workspace settings.
- **Optional External Link:** Running `AgentCostLab: Open Web Cost Simulator` opens `https://jettlin927.github.io/agentcostlab/` in your default browser only when explicitly triggered by you.
