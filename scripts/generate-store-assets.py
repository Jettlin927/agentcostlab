#!/usr/bin/env python3
"""Render Chrome Web Store, Edge Add-ons, and VS Code Marketplace visual assets via headless Edge/Chrome + Pillow."""

from __future__ import annotations

import pathlib
import shutil
import subprocess
import tempfile
from PIL import Image

REPO_ROOT = pathlib.Path(__file__).resolve().parent.parent
WORKSPACE_ROOT = REPO_ROOT.parent
CHROME_ASSETS_DIR = REPO_ROOT / "chrome-extension" / "store-assets"
VSCODE_AGENTCOST_SCREENSHOT = REPO_ROOT / "vscode-extension" / "images" / "screenshot.png"
CONTEXTPACK_SCREENSHOT = WORKSPACE_ROOT / "contextpack-vscode" / "images" / "screenshot.png"

BROWSER_CANDIDATES = [
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    shutil.which("msedge") or "",
    shutil.which("chrome") or "",
    shutil.which("chromium") or "",
]


def find_browser() -> str:
    for candidate in BROWSER_CANDIDATES:
        if candidate and pathlib.Path(candidate).exists():
            return candidate
    raise FileNotFoundError("No Chrome or Edge executable found for headless screenshot rendering.")


def render_html_to_rgb_png(browser: str, html: str, out_path: pathlib.Path, width: int, height: int) -> None:
    out_path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix="acl_assets_") as tmpdir:
        tmp_path = pathlib.Path(tmpdir)
        html_file = tmp_path / "render.html"
        raw_png = tmp_path / "raw.png"
        html_file.write_text(html, encoding="utf-8")

        cmd = [
            browser,
            "--headless=new",
            "--disable-gpu",
            "--hide-scrollbars",
            "--no-first-run",
            "--no-default-browser-check",
            f"--window-size={width},{height}",
            "--force-device-scale-factor=1",
            f"--screenshot={raw_png}",
            html_file.as_uri(),
        ]
        subprocess.run(cmd, check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

        with Image.open(raw_png) as img:
            rgb = img.convert("RGB")
            if rgb.size != (width, height):
                rgb = rgb.resize((width, height), Image.Resampling.LANCZOS)
            rgb.save(out_path, format="PNG", optimize=True)


def chrome_github_badge_html() -> str:
    return """<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; width: 1280px; height: 800px; overflow: hidden; background: #0d1117; color: #e6edf3; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  .browser-bar { height: 48px; background: #161b22; border-bottom: 1px solid #30363d; display: flex; align-items: center; padding: 0 18px; gap: 14px; }
  .dots { display: flex; gap: 7px; }
  .dot { width: 11px; height: 11px; border-radius: 50%; }
  .url-bar { flex: 1; background: #0d1117; border: 1px solid #30363d; border-radius: 8px; padding: 6px 14px; font-size: 13px; color: #8b949e; display: flex; justify-content: space-between; align-items: center; }
  .url-bar strong { color: #e6edf3; font-weight: 500; }
  .ext-pill { background: #0ea5e9; color: #082f49; font-weight: 700; font-size: 11px; padding: 4px 10px; border-radius: 999px; }
  .gh-header { padding: 18px 36px 14px; border-bottom: 1px solid #21262d; display: flex; justify-content: space-between; align-items: center; background: #0d1117; }
  .gh-crumb { font-size: 16px; color: #58a6ff; font-weight: 600; }
  .gh-crumb span { color: #8b949e; font-weight: 400; }
  .gh-meta { font-size: 12px; color: #8b949e; background: #161b22; border: 1px solid #30363d; padding: 5px 11px; border-radius: 6px; }
  .main { display: grid; grid-template-columns: 1fr 410px; gap: 28px; padding: 26px 36px; height: 672px; position: relative; }
  .code-card { background: #161b22; border: 1px solid #30363d; border-radius: 10px; overflow: hidden; }
  .code-head { padding: 12px 16px; border-bottom: 1px solid #30363d; display: flex; justify-content: space-between; font-size: 13px; color: #c9d1d9; background: #1c2128; }
  .code-body { padding: 18px 20px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13.5px; line-height: 1.7; color: #e6edf3; }
  .ln { color: #6e7681; display: inline-block; width: 28px; user-select: none; }
  .hl-warn { background: rgba(251, 191, 36, 0.14); border-left: 3px solid #fbbf24; padding-left: 8px; display: block; margin: 2px -20px; padding-right: 20px; }
  .hl-err { background: rgba(248, 113, 113, 0.14); border-left: 3px solid #f87171; padding-left: 8px; display: block; margin: 2px -20px; padding-right: 20px; }
  .callout-panel { display: flex; flex-direction: column; gap: 16px; }
  .hero-box { background: linear-gradient(135deg, #0f172a, #172554); border: 1px solid #38bdf8; border-radius: 14px; padding: 20px; }
  .hero-kicker { font-size: 11px; text-transform: uppercase; letter-spacing: 0.08em; color: #38bdf8; font-weight: 700; margin-bottom: 6px; }
  .hero-title { font-size: 23px; font-weight: 800; line-height: 1.25; color: #f8fafc; margin: 0 0 8px; }
  .hero-sub { font-size: 13.5px; color: #cbd5e1; line-height: 1.5; margin: 0; }
  .metric-row { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 14px; }
  .metric { background: rgba(15, 23, 42, 0.75); border: 1px solid #334155; border-radius: 8px; padding: 10px 12px; }
  .metric small { display: block; font-size: 10px; color: #94a3b8; text-transform: uppercase; }
  .metric b { font-size: 18px; color: #34d399; font-family: ui-monospace, monospace; }
  .metric b.amber { color: #fbbf24; }
  .badge-float { background: #0f172a; border: 1px solid #38bdf8; border-radius: 12px; padding: 14px 16px; box-shadow: 0 20px 45px rgba(0, 0, 0, 0.55); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 12.5px; }
  .badge-top { display: flex; justify-content: space-between; align-items: center; font-weight: 700; color: #fbbf24; padding-bottom: 10px; border-bottom: 1px solid #1e293b; }
  .badge-meta { color: #cbd5e1; margin: 10px 0 8px; font-size: 12px; }
  .warn-line { color: #fcd34d; margin: 5px 0; font-size: 11.8px; }
  .err-line { color: #fca5a5; margin: 5px 0; font-size: 11.8px; }
  .badge-link { color: #38bdf8; margin-top: 8px; font-weight: 600; font-size: 12px; }
</style>
</head>
<body>
  <div class="browser-bar">
    <div class="dots">
      <div class="dot" style="background:#ef4444"></div>
      <div class="dot" style="background:#f59e0b"></div>
      <div class="dot" style="background:#10b981"></div>
    </div>
    <div class="url-bar">
      <span>https://github.com/acme-ai/agent-repo/blob/main/<strong>CLAUDE.md</strong></span>
      <span>Zero Telemetry · Local Only</span>
    </div>
    <div class="ext-pill">AgentCostLab</div>
  </div>
  <div class="gh-header">
    <div class="gh-crumb">acme-ai / agent-repo <span>/</span> CLAUDE.md</div>
    <div class="gh-meta">100% Client-Side Static Linter · 22 Nov-2026 Models</div>
  </div>
  <div class="main">
    <div class="code-card">
      <div class="code-head">
        <span>CLAUDE.md · 2.4 KB · UTF-8</span>
        <span>Detected by AgentCostLab Content Script</span>
      </div>
      <div class="code-body">
        <div><span class="ln">1</span> # Workspace Coding Agent Instructions</div>
        <div><span class="ln">2</span></div>
        <div><span class="ln">3</span> Always inspect package.json and run unit tests before commit.</div>
        <div><span class="ln">4</span> Follow strict TypeScript types; avoid duplicate helpers.</div>
        <div><span class="ln">5</span></div>
        <div><span class="ln">6</span> ## Dynamic Session Context (Breaks Prompt Cache!)</div>
        <span class="hl-warn"><span class="ln">7</span> Current UTC time: {{current_time}} | Request UUID: {{uuid}}</span>
        <div><span class="ln">8</span></div>
        <div><span class="ln">9</span> ## Emergency Fallback Credentials</div>
        <span class="hl-err"><span class="ln">10</span> OPENAI_FALLBACK_KEY=sk-live-9876543210abcdefghijklmnop</span>
        <div><span class="ln">11</span></div>
        <div><span class="ln">12</span> ## Connected MCP Tool Catalog</div>
        <div><span class="ln">13</span> Load all 42 repository &amp; browser MCP tools on turn 1.</div>
        <div><span class="ln">14</span> Repeat full architecture guide on every subagent handoff.</div>
        <div><span class="ln">15</span></div>
        <div><span class="ln">16</span> ## Supported Agent Configs</div>
        <div><span class="ln">17</span> CLAUDE.md · AGENTS.md · SKILL.md · GEMINI.md · CODEX.md</div>
        <div><span class="ln">18</span> .cursorrules · .windsurfrules · .clinerules · mcp.json</div>
      </div>
    </div>
    <div class="callout-panel">
      <div class="hero-box">
        <div class="hero-kicker">Instant GitHub Badge</div>
        <h1 class="hero-title">Catch Prompt Cache-Busters Before They Burn 10x API Spend</h1>
        <p class="hero-sub">Automatic bottom-right overlay on GitHub agent instruction &amp; MCP files. Zero API calls.</p>
        <div class="metric-row">
          <div class="metric"><small>1,000-Run Cached</small><b>$4.85</b></div>
          <div class="metric"><small>Uncached (Broken)</small><b class="amber">$54.19</b></div>
        </div>
      </div>
      <div class="badge-float">
        <div class="badge-top">
          <span>AgentCostLab: 1,129 tok | $4.85/1k cached | ⚠ 2</span>
          <span>▴ ×</span>
        </div>
        <div class="badge-meta">Claude Sonnet 5.5 (24 turns): $4.85 cached vs $54.19 uncached (-91%)</div>
        <div class="err-line">[HIGH] secret-leak: Hardcoded API key prefix detected on line 10</div>
        <div class="warn-line">[MEDIUM] cache-buster: Dynamic {{current_time}} invalidates prefix cache</div>
        <div class="badge-link">Open full AgentCostLab simulator →</div>
      </div>
    </div>
  </div>
</body>
</html>"""


def chrome_popup_linter_html() -> str:
    return """<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; width: 1280px; height: 800px; overflow: hidden; background: radial-gradient(circle at top left, #172554 0%, #0b1120 55%, #020617 100%); color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  .stage { display: grid; grid-template-columns: 1fr 440px; gap: 48px; padding: 64px 72px; height: 100%; align-items: center; }
  .pitch h1 { font-size: 40px; font-weight: 800; line-height: 1.15; margin: 0 0 16px; }
  .pitch h1 span { color: #38bdf8; }
  .pitch p { font-size: 17px; color: #cbd5e1; line-height: 1.6; margin: 0 0 26px; }
  .pill-list { display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 28px; }
  .pill { background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.35); color: #7dd3fc; padding: 7px 13px; border-radius: 999px; font-size: 13px; font-weight: 600; }
  .bullets { display: grid; gap: 12px; }
  .bullet { background: rgba(15, 23, 42, 0.72); border: 1px solid #1e293b; border-radius: 10px; padding: 12px 16px; font-size: 14px; color: #e2e8f0; }
  .bullet b { color: #34d399; }
  .popup-frame { width: 420px; background: #0b1120; border: 1px solid #38bdf8; border-radius: 14px; padding: 18px; box-shadow: 0 28px 60px rgba(0, 0, 0, 0.65); }
  .p-head { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
  .p-head h2 { margin: 0; font-size: 16px; }
  .p-badge { font-size: 11px; color: #38bdf8; background: rgba(56, 189, 248, 0.12); border: 1px solid rgba(56, 189, 248, 0.3); padding: 3px 9px; border-radius: 999px; }
  .p-note { font-size: 11.5px; color: #38bdf8; margin-bottom: 10px; }
  .p-controls { display: grid; grid-template-columns: 1fr 88px; gap: 10px; margin-bottom: 10px; }
  .p-label { font-size: 11px; color: #94a3b8; margin-bottom: 4px; }
  .p-input { background: #111c33; border: 1px solid #26344f; border-radius: 6px; padding: 7px 9px; font-size: 12.5px; color: #f1f5f9; }
  .p-text { background: #111c33; border: 1px solid #26344f; border-radius: 6px; padding: 10px; font-family: ui-monospace, monospace; font-size: 11.5px; line-height: 1.5; color: #e2e8f0; min-height: 120px; white-space: pre-wrap; }
  .p-stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 12px 0; }
  .p-card { background: #111c33; border: 1px solid #22304a; border-radius: 8px; padding: 9px; }
  .p-card small { display: block; font-size: 10px; color: #94a3b8; text-transform: uppercase; }
  .p-card b { font-size: 15px; font-family: ui-monospace, monospace; }
  .p-issue { padding: 8px 10px; border-radius: 6px; font-size: 11.5px; margin-bottom: 7px; background: #111827; }
  .p-high { border: 1px solid rgba(248, 113, 113, 0.5); color: #fecaca; }
  .p-med { border: 1px solid rgba(251, 191, 36, 0.5); color: #fde68a; }
  .p-foot { display: flex; justify-content: space-between; align-items: center; border-top: 1px solid #1e293b; padding-top: 10px; font-size: 11.5px; color: #94a3b8; }
  .p-btns { display: flex; gap: 8px; align-items: center; }
  .p-btn { background: #111c33; border: 1px solid #334155; color: #e2e8f0; border-radius: 5px; padding: 4px 8px; font-size: 11px; }
</style>
</head>
<body>
  <div class="stage">
    <div class="pitch">
      <div class="pill-list">
        <span class="pill">100% Local</span>
        <span class="pill">22 Nov-2026 LLMs</span>
        <span class="pill">Zero Telemetry</span>
      </div>
      <h1>Lint Prompts &amp; MCP Configs <span>Right in Your Browser</span></h1>
      <p>Auto-loads GitHub agent files or analyzes any pasted system prompt. Compare 1,000-run cached vs. uncached cost and export Markdown PR review notes in one click.</p>
      <div class="bullets">
        <div class="bullet"><b>✓ 1-Click Sample &amp; Copy Report:</b> Test cache-busters instantly or paste formatted Markdown into GitHub PRs.</div>
        <div class="bullet"><b>✓ Secret Leak Guard:</b> Catches hardcoded sk-..., ghp_..., AIza..., and xoxb-... keys before push.</div>
        <div class="bullet"><b>✓ 10 Providers Included:</b> Claude 5.5, GPT-6.2/6.1, Gemini 4, DeepSeek V4, Qwen4-Max, Kimi K3.1, Mistral 4.</div>
      </div>
    </div>
    <div class="popup-frame">
      <div class="p-head"><h2>AgentCostLab Linter</h2><span class="p-badge">100% Local</span></div>
      <div class="p-note">Loaded from active GitHub file</div>
      <div class="p-controls">
        <div><div class="p-label">Pricing Model</div><div class="p-input">Claude Sonnet 5.5 ($2/$10, $0.10 cached)</div></div>
        <div><div class="p-label">Turns</div><div class="p-input">24</div></div>
      </div>
      <div class="p-label">CLAUDE.md / AGENTS.md / mcp.json</div>
      <div class="p-text"># Workspace Agent Rules
Always read README.md and run tests.
Session time: {{current_time}}
Fallback key: sk-demo-1234567890abcdefghij</div>
      <div class="p-stats">
        <div class="p-card"><small>Tokens</small><b>1,129</b></div>
        <div class="p-card"><small>1k Cached</small><b style="color:#34d399">$4.85</b></div>
        <div class="p-card"><small>1k Uncached</small><b style="color:#fbbf24">$54.19</b></div>
      </div>
      <div class="p-issue p-high">[HIGH] secret-leak: Potential hardcoded API key detected (sk-demo-...)</div>
      <div class="p-issue p-med">[MEDIUM] cache-buster: Dynamic timestamp token invalidates prompt caching</div>
      <div class="p-foot">
        <span>Cache savings: 91% (24 turns)</span>
        <div class="p-btns"><span class="p-btn">Sample</span><span class="p-btn">Copy Report</span><span style="color:#38bdf8">Simulator →</span></div>
      </div>
    </div>
  </div>
</body>
</html>"""


def promo_html(width: int, height: int, compact: bool = False) -> str:
    title_size = "25px" if compact else "46px"
    sub_size = "13px" if compact else "20px"
    pad = "24px 28px" if compact else "56px 76px"
    return f"""<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * {{ box-sizing: border-box; }}
  html, body {{ margin: 0; width: {width}px; height: {height}px; overflow: hidden; background: linear-gradient(135deg, #0b1120 0%, #172554 55%, #0f172a 100%); color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }}
  .wrap {{ width: 100%; height: 100%; padding: {pad}; display: flex; flex-direction: column; justify-content: space-between; border: 1px solid rgba(56, 189, 248, 0.25); }}
  .top {{ display: flex; align-items: center; justify-content: space-between; }}
  .brand {{ display: flex; align-items: center; gap: 10px; font-weight: 800; font-size: {"16px" if compact else "22px"}; color: #38bdf8; }}
  .chip {{ background: rgba(52, 211, 153, 0.14); border: 1px solid rgba(52, 211, 153, 0.4); color: #6ee7b7; border-radius: 999px; padding: {"4px 10px" if compact else "6px 14px"}; font-size: {"11px" if compact else "14px"}; font-weight: 700; }}
  h1 {{ margin: 0; font-size: {title_size}; line-height: 1.18; font-weight: 800; }}
  h1 span {{ color: #fbbf24; }}
  p {{ margin: 8px 0 0; font-size: {sub_size}; color: #cbd5e1; line-height: 1.45; }}
  .cards {{ display: grid; grid-template-columns: repeat(3, 1fr); gap: {"10px" if compact else "20px"}; }}
  .c {{ background: rgba(15, 23, 42, 0.85); border: 1px solid #334155; border-radius: 10px; padding: {"10px 12px" if compact else "18px 22px"}; }}
  .c small {{ display: block; font-size: {"10px" if compact else "12px"}; color: #94a3b8; text-transform: uppercase; }}
  .c b {{ font-size: {"16px" if compact else "26px"}; font-family: ui-monospace, monospace; color: #34d399; }}
</style>
</head>
<body>
  <div class="wrap">
    <div class="top">
      <div class="brand">⚡ AgentCostLab</div>
      <div class="chip">100% Local · Zero Telemetry</div>
    </div>
    <div>
      <h1>Stop Burning Budgets on <span>CLAUDE.md &amp; mcp.json</span></h1>
      <p>Live token tax, 1,000-run prompt cache savings, cache-buster &amp; secret leak linter.</p>
    </div>
    <div class="cards">
      <div class="c"><small>1k Cached</small><b>$4.85</b></div>
      <div class="c"><small>Cache-Buster</small><b style="color:#fbbf24">Caught</b></div>
      <div class="c"><small>LLMs</small><b style="color:#38bdf8">22 Models</b></div>
    </div>
  </div>
</body>
</html>"""


def vscode_agentcost_html() -> str:
    return """<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; width: 1280px; height: 800px; overflow: hidden; background: #0f172a; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  .ide { display: grid; grid-template-rows: 38px 1fr 28px; height: 100%; }
  .titlebar { background: #0b1120; border-bottom: 1px solid #1e293b; display: flex; align-items: center; justify-content: space-between; padding: 0 18px; font-size: 13px; color: #94a3b8; }
  .titlebar b { color: #f8fafc; }
  .body { display: grid; grid-template-columns: 260px 1fr; }
  .sidebar { background: #0b1120; border-right: 1px solid #1e293b; padding: 14px; font-size: 13px; }
  .side-title { font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #64748b; margin-bottom: 10px; font-weight: 700; }
  .tree-item { padding: 6px 10px; border-radius: 6px; margin-bottom: 4px; color: #cbd5e1; }
  .tree-item.active { background: #1e293b; color: #38bdf8; font-weight: 600; }
  .editor-area { display: grid; grid-template-rows: 38px 1fr 220px; background: #0f172a; }
  .tabs { background: #111827; border-bottom: 1px solid #1e293b; display: flex; align-items: center; }
  .tab { padding: 9px 18px; font-size: 13px; background: #0f172a; border-right: 1px solid #1e293b; border-top: 2px solid #38bdf8; color: #f8fafc; }
  .code { padding: 22px 26px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 14px; line-height: 1.75; }
  .ln { color: #475569; display: inline-block; width: 32px; }
  .squig-warn { border-bottom: 2px wavy #fbbf24; color: #fde68a; }
  .squig-err { border-bottom: 2px wavy #f87171; color: #fecaca; }
  .problems { background: #0b1120; border-top: 1px solid #1e293b; padding: 14px 20px; }
  .prob-head { font-size: 12px; font-weight: 700; color: #cbd5e1; margin-bottom: 10px; display: flex; justify-content: space-between; }
  .prob-row { font-family: ui-monospace, monospace; font-size: 12.5px; padding: 7px 10px; border-radius: 6px; margin-bottom: 6px; background: #111c33; }
  .prob-err { color: #fca5a5; border-left: 3px solid #f87171; }
  .prob-warn { color: #fde68a; border-left: 3px solid #fbbf24; }
  .statusbar { background: #0284c7; color: #f8fafc; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; font-size: 12px; font-weight: 600; }
  .sb-right { display: flex; gap: 18px; align-items: center; }
  .sb-pill { background: rgba(15, 23, 42, 0.35); padding: 2px 10px; border-radius: 4px; }
</style>
</head>
<body>
  <div class="ide">
    <div class="titlebar">
      <span><b>AgentCostLab</b> — CLAUDE.md &amp; MCP Token Linter (VS Code / Cursor / Antigravity)</span>
      <span>100% Local · 22 Nov-2026 Models</span>
    </div>
    <div class="body">
      <div class="sidebar">
        <div class="side-title">Supported Agent Files</div>
        <div class="tree-item active">CLAUDE.md</div>
        <div class="tree-item">AGENTS.md</div>
        <div class="tree-item">SKILL.md</div>
        <div class="tree-item">GEMINI.md</div>
        <div class="tree-item">CODEX.md</div>
        <div class="tree-item">.cursorrules</div>
        <div class="tree-item">.windsurfrules</div>
        <div class="tree-item">.clinerules</div>
        <div class="tree-item">mcp.json / opencode.json</div>
      </div>
      <div class="editor-area">
        <div class="tabs"><div class="tab">CLAUDE.md</div></div>
        <div class="code">
          <div><span class="ln">1</span> # Repository Agent Rules</div>
          <div><span class="ln">2</span> Run vitest before every commit and keep functions small.</div>
          <div><span class="ln">3</span></div>
          <div><span class="ln">4</span> ## Prompt Cache Hazard</div>
          <div><span class="ln">5</span> Always include <span class="squig-warn">{{current_time}}</span> in the system header.</div>
          <div><span class="ln">6</span></div>
          <div><span class="ln">7</span> ## Secret Leak Guard</div>
          <div><span class="ln">8</span> FALLBACK_API_KEY=<span class="squig-err">sk-demo-1234567890abcdefghij</span></div>
          <div><span class="ln">9</span></div>
          <div><span class="ln">10</span> ## Model Cost Snapshot (24 turns × 1,000 runs)</div>
          <div><span class="ln">11</span> Claude Sonnet 5.5: $4.85 cached vs $54.19 uncached (-91% cache savings)</div>
        </div>
        <div class="problems">
          <div class="prob-head"><span>PROBLEMS (2) — AgentCostLab</span><span>Claude Sonnet 5.5 · 24 turns</span></div>
          <div class="prob-row prob-err">[ERROR] secret-leak (line 8): Potential hardcoded API key detected — move to .env before commit.</div>
          <div class="prob-row prob-warn">[WARNING] cache-buster (line 5): Dynamic timestamp/UUID in static prefix breaks prompt caching (5x–10x higher bill).</div>
        </div>
      </div>
    </div>
    <div class="statusbar">
      <span>main* · AgentCostLab Zero-Telemetry Active</span>
      <div class="sb-right">
        <span class="sb-pill">$(pulse) 1,129 tok | $4.85/1k ⚠ 2</span>
        <span>Claude Sonnet 5.5</span>
      </div>
    </div>
  </div>
</body>
</html>"""


def contextpack_vscode_html() -> str:
    return """<!doctype html>
<html>
<head>
<meta charset="utf-8" />
<style>
  * { box-sizing: border-box; }
  html, body { margin: 0; width: 1280px; height: 800px; overflow: hidden; background: #0f172a; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
  .ide { display: grid; grid-template-rows: 38px 1fr 28px; height: 100%; }
  .titlebar { background: #0b1120; border-bottom: 1px solid #1e293b; display: flex; align-items: center; justify-content: space-between; padding: 0 18px; font-size: 13px; color: #94a3b8; }
  .titlebar b { color: #f8fafc; }
  .body { display: grid; grid-template-columns: 330px 1fr; }
  .sidebar { background: #0b1120; border-right: 1px solid #1e293b; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
  .side-head { display: flex; justify-content: space-between; align-items: center; font-size: 11px; text-transform: uppercase; letter-spacing: 0.06em; color: #94a3b8; font-weight: 700; }
  .actions { display: flex; gap: 6px; flex-wrap: wrap; }
  .act { background: #1e293b; border: 1px solid #334155; color: #7dd3fc; font-size: 11px; padding: 4px 8px; border-radius: 5px; }
  .summary-card { background: #111c33; border: 1px solid #38bdf8; border-radius: 8px; padding: 10px 12px; }
  .summary-card b { display: block; color: #34d399; font-size: 14px; font-family: ui-monospace, monospace; }
  .summary-card small { color: #94a3b8; font-size: 12px; }
  .file-row { background: #111827; border: 1px solid #1e293b; border-radius: 6px; padding: 8px 10px; display: flex; justify-content: space-between; font-size: 12.5px; }
  .file-row span { color: #64748b; font-family: ui-monospace, monospace; }
  .editor-area { display: grid; grid-template-rows: 42px 1fr; }
  .tabs { background: #111827; border-bottom: 1px solid #1e293b; display: flex; align-items: center; justify-content: space-between; padding: 0 18px; }
  .tab-pill { background: rgba(52, 211, 153, 0.14); border: 1px solid rgba(52, 211, 153, 0.35); color: #6ee7b7; border-radius: 999px; font-size: 11.5px; padding: 3px 10px; font-weight: 600; }
  .xml { padding: 22px 26px; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 13.5px; line-height: 1.65; color: #cbd5e1; white-space: pre; }
  .tag { color: #38bdf8; }
  .attr { color: #a78bfa; }
  .redact { background: rgba(248, 113, 113, 0.18); color: #fca5a5; padding: 1px 5px; border-radius: 4px; font-weight: 700; }
  .statusbar { background: #0f766e; color: #f8fafc; display: flex; align-items: center; justify-content: space-between; padding: 0 16px; font-size: 12px; font-weight: 600; }
</style>
</head>
<body>
  <div class="ide">
    <div class="titlebar">
      <span><b>ContextPack</b> — Local Repo-to-Prompt Basket &amp; Secret-Redacting Token Budgeter</span>
      <span>100% Local · Zero Subscription · Cross-Platform</span>
    </div>
    <div class="body">
      <div class="sidebar">
        <div class="side-head"><span>CONTEXTPACK BASKET</span><span>SSH / WSL Safe</span></div>
        <div class="actions">
          <span class="act">Copy XML</span>
          <span class="act">Copy MD</span>
          <span class="act">+ Open Tabs</span>
          <span class="act">+ Git Modified</span>
        </div>
        <div class="summary-card">
          <b>4 files · ~3,420 tokens · $0.0068</b>
          <small>Claude Sonnet 5.5 (16 models incl. Ollama $0)</small>
        </div>
        <div class="file-row"><strong>src/auth/session.ts</strong><span>~1,120 tok</span></div>
        <div class="file-row"><strong>src/api/checkout.ts</strong><span>~1,340 tok</span></div>
        <div class="file-row"><strong>.env.example</strong><span>~180 tok</span></div>
        <div class="file-row"><strong>test/checkout.test.ts</strong><span>~780 tok</span></div>
      </div>
      <div class="editor-area">
        <div class="tabs">
          <strong>Generated Clipboard Output (XML Prompt Bundle)</strong>
          <span class="tab-pill">✓ 2 Secrets Auto-Redacted Locally</span>
        </div>
        <div class="xml"><span class="tag">&lt;context</span> <span class="attr">scope</span>="selected_files" <span class="attr">files</span>="4" <span class="attr">estimated_tokens</span>="3420" <span class="attr">secrets_redacted</span>="2"<span class="tag">&gt;</span>
  <span class="tag">&lt;note&gt;</span>Curated partial workspace selection generated by ContextPack (not the full repository).<span class="tag">&lt;/note&gt;</span>
  <span class="tag">&lt;tree&gt;</span>
├── src/
│   ├── api/checkout.ts
│   └── auth/session.ts
└── test/checkout.test.ts
  <span class="tag">&lt;/tree&gt;</span>
  <span class="tag">&lt;files&gt;</span>
    <span class="tag">&lt;file</span> <span class="attr">path</span>="src/auth/session.ts" <span class="attr">tokens</span>="1120"<span class="tag">&gt;</span>
export const STRIPE_WEBHOOK_SECRET = "<span class="redact">[REDACTED_SECRET]</span>";
export const GITHUB_PAT = "<span class="redact">[REDACTED_SECRET]</span>";
    <span class="tag">&lt;/file&gt;</span>
  <span class="tag">&lt;/files&gt;</span>
<span class="tag">&lt;/context&gt;</span></div>
      </div>
    </div>
    <div class="statusbar">
      <span>$(package) ContextPack: 4f · ~3,420 tok ($0.0068)</span>
      <span>Respects .gitignore + .contextignore · 100% Offline</span>
    </div>
  </div>
</body>
</html>"""


def main() -> None:
    browser = find_browser()
    print(f"Using headless browser: {browser}")

    jobs = [
        (chrome_github_badge_html(), CHROME_ASSETS_DIR / "screenshot-1-github-badge-1280x800.png", 1280, 800),
        (chrome_popup_linter_html(), CHROME_ASSETS_DIR / "screenshot-2-popup-linter-1280x800.png", 1280, 800),
        (promo_html(440, 280, compact=True), CHROME_ASSETS_DIR / "promo-small-440x280.png", 440, 280),
        (promo_html(1400, 560, compact=False), CHROME_ASSETS_DIR / "promo-marquee-1400x560.png", 1400, 560),
        (vscode_agentcost_html(), VSCODE_AGENTCOST_SCREENSHOT, 1280, 800),
        (contextpack_vscode_html(), CONTEXTPACK_SCREENSHOT, 1280, 800),
    ]

    for html, out_path, width, height in jobs:
        render_html_to_rgb_png(browser, html, out_path, width, height)
        print(f"Rendered {out_path} ({width}x{height} RGB)")

    # Generate Edge Partner Center 300x300 RGB store logo from existing 128x128 brand icon
    icon_128 = REPO_ROOT / "chrome-extension" / "icons" / "icon-128.png"
    edge_logo = CHROME_ASSETS_DIR / "edge-logo-300x300.png"
    with Image.open(icon_128) as img:
        bg = Image.new("RGB", (300, 300), (11, 17, 32))
        resized = img.convert("RGBA").resize((240, 240), Image.Resampling.LANCZOS)
        bg.paste(resized, (30, 30), resized)
        bg.save(edge_logo, format="PNG", optimize=True)
    print(f"Generated {edge_logo} (300x300 RGB)")


if __name__ == "__main__":
    main()
