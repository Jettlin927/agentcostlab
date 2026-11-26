# Store Listing Copy — Chrome Web Store & Microsoft Edge Add-ons

## Basic Info
- **Name (<= 45 chars):** `AgentCostLab — Prompt & MCP Linter` *(34 chars; or full `AgentCostLab — CLAUDE.md & MCP Token Linter` = 45 chars)*
- **Short Description (<= 132 chars):**
  `Live token counter, 1,000-run prompt-cache cost estimator, cache-buster detector & secret leak linter for CLAUDE.md and mcp.json.` *(129 chars)*
- **Category:** `Developer Tools`
- **Language:** `English`
- **Homepage URL:** `https://jettlin927.github.io/agentcostlab/`
- **Support URL:** `https://github.com/Jettlin927/agentcostlab/issues`
- **Privacy Policy URL:** `https://github.com/Jettlin927/agentcostlab/blob/main/chrome-extension/PRIVACY.md`

## Detailed Description
Stop burning AI coding agent budgets on bloated `CLAUDE.md` files, noisy `mcp.json` tool lists, and accidental prompt cache-busters.

AgentCostLab runs 100% locally in your browser with zero telemetry and zero external API calls:

1. **GitHub File Badge (Zero Setup):** Open any `CLAUDE.md`, `AGENTS.md`, `SKILL.md`, `GEMINI.md`, `CODEX.md`, `.cursorrules`, `.windsurfrules`, `.clinerules`, `copilot-instructions.md`, `.claude/settings.json`, `opencode.json`, or `mcp.json` blob on GitHub to see a dismissible floating badge with estimated prefix tokens, 1,000-run cached cost, and instant lint warnings.
2. **Popup Linter & Markdown Export:** Click the toolbar icon to auto-load the active GitHub file, paste any system prompt / MCP config, or click **Sample** for an instant demo. Compare **1,000-run cached vs. uncached cost** and copy a formatted Markdown report straight into your PR review.
3. **Cache-Buster & Secret Detection:** Flags dynamic tokens (`current_time`, `timestamp`, `Date.now`, `new Date`, `uuid`, `random`) that silently invalidate LLM prefix caches and multiply multi-turn bills by 5x–10x, plus hardcoded `sk-...`, `ghp_...`, `AIza...`, and `xoxb-` keys.
4. **22 Nov-2026 Models across 10 Providers:** Includes Claude 5.5/Fable 5.2, GPT-6.2/6.1/Luna, Gemini 4 Carbon/Neon/Argon/Hydrogen, DeepSeek V4/V4.1, Qwen4-Max, Kimi K3.1 Pro, Grok 4.7, GLM-5.3/5.3-Flash, MiniMax-M3, and Mistral Large 4 / Small 4.

## Chrome Web Store Privacy & Permissions Declarations
- **Single Purpose Description:**
  `Locally estimate token counts, 1,000-run prompt caching costs, cache-busters, and leaked API keys in AI agent instruction files (CLAUDE.md, AGENTS.md, SKILL.md, mcp.json) on GitHub or pasted into the popup.`
- **`activeTab` Justification:**
  `Used only when the user opens the popup to request raw file text from the extension's content script on an active GitHub blob tab.`
- **`storage` Justification:**
  `Stores only the user's selected LLM pricing profile ID and turn-count preference in chrome.storage.local.`
- **Host Permission (`https://github.com/*`) Justification:**
  `Displays an on-page token cost & lint badge exclusively on GitHub blob URLs for AI agent instruction and MCP configuration files.`
- **Remote Code:** `No, I am not using Remote code.`
- **Data Collection:** `We do not collect or transmit any user data.`

## Store Visual Assets (`chrome-extension/store-assets/`, 24-bit RGB, No Alpha)
- `screenshot-1-github-badge-1280x800.png` (`1280×800` — GitHub `CLAUDE.md` blob view with live floating cost & cache-buster badge)
- `screenshot-2-popup-linter-1280x800.png` (`1280×800` — Browser toolbar popup analyzing `CLAUDE.md` with 1,000-run cached vs. uncached savings)
- `promo-small-440x280.png` (`440×280` — Chrome Web Store & Edge Add-ons small promotional tile)
- `promo-marquee-1400x560.png` (`1400×560` — Chrome Web Store marquee promotional tile)
- `edge-logo-300x300.png` (`300×300` — Microsoft Edge Partner Center store logo)

## Submission Steps
1. Build upload ZIP: `node chrome-extension/scripts/package.mjs` -> `chrome-extension/dist/agentcostlab-chrome-v0.1.0.zip`
2. Upload `chrome-extension/dist/agentcostlab-chrome-v0.1.0.zip` plus the pre-rendered PNG assets from `chrome-extension/store-assets/` to Chrome Web Store Developer Dashboard & Microsoft Edge Partner Center.
