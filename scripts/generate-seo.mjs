import fs from 'node:fs';
import path from 'node:path';

const DIST_DIR = path.resolve(process.cwd(), 'dist');
const BASE_URL = (process.env.SITE_URL || 'https://jettlin927.github.io/agentcostlab').replace(
  /\/$/,
  ''
);

const PRESET_PAGES = [
  {
    slug: 'coding-agent',
    title: 'Coding Agent (Claude Code / Cursor) Token & Prompt Caching Cost Calculator — AgentCostLab',
    description:
      'Simulate a 24-turn AI coding agent loop with CLAUDE.md, 12 MCP tool schemas, file reads, and 85% prompt caching across 15 models.',
  },
  {
    slug: 'deep-research-agent',
    title: 'Autonomous Deep Research Agent Cost Simulator — AgentCostLab',
    description:
      'Estimate multi-turn web search, scraping, and long-context synthesis token costs across Gemini 4 Carbon, Claude Opus 5.5, and DeepSeek V4.',
  },
  {
    slug: 'mcp-support-bot',
    title: 'Enterprise MCP Customer Support Bot Cost Calculator — AgentCostLab',
    description:
      'Model high-volume 1,500 tickets/day MCP support triage loops with 92% prompt cache hit rates and economy worker routing.',
  },
  {
    slug: 'pr-review-ci-agent',
    title: 'PR Review & CI Auto-Fixer Agent Cost Estimator — AgentCostLab',
    description:
      'Calculate monthly LLM spend for automated pull request reviews, test log parsing, and CI patch loops.',
  },
  {
    slug: 'autonomous-data-analyst',
    title: 'SQL & Quant Data Analyst AI Agent Cost Simulator — AgentCostLab',
    description:
      'Estimate 18-turn iterative SQL and Python execution agent loops with hybrid frontier/economy model routing.',
  },
  {
    slug: 'uncached-loop-warning',
    title: 'Why Uncached 30-Turn AI Agent Loops Explode O(N²) Bills — AgentCostLab',
    description:
      'Interactive breakdown of how broken prompt caching and dynamic timestamps multiply multi-turn LLM bills by 5x or more.',
  },
];

const COMPARE_PAGES = [
  {
    slug: 'claude-sonnet-5-5-vs-gpt-6-2-sol',
    title: 'Claude Sonnet 5.5 vs GPT-6.2 Sol — Multi-Turn Agent Cost Comparison',
    description:
      'Compare O(N²) multi-turn agent loop costs, prompt caching discounts, and long-context step-ups between Claude Sonnet 5.5 and GPT-6.2 Sol.',
  },
  {
    slug: 'claude-sonnet-5-5-vs-deepseek-v4-pro-peak',
    title: 'Claude Sonnet 5.5 vs DeepSeek V4 Pro — Agent Loop & Caching Cost',
    description:
      'Calculate exact monthly savings switching a 24-turn coding or MCP agent from Claude Sonnet 5.5 to DeepSeek V4 Pro.',
  },
  {
    slug: 'claude-opus-5-5-vs-gemini-4-carbon',
    title: 'Claude Opus 5.5 vs Gemini 4 Carbon — Frontier Agent Economics',
    description:
      'Side-by-side multi-turn token burn and monthly spend projection for Claude Opus 5.5 vs Gemini 4 Carbon.',
  },
  {
    slug: 'gpt-6-2-astra-vs-claude-fable-5-2',
    title: 'GPT-6.2 Astra vs Claude Fable 5.2 — Ultra-Frontier Cost Simulator',
    description:
      'Model hybrid planner/worker routing and cache write penalties for GPT-6.2 Astra and Claude Fable 5.2.',
  },
  {
    slug: 'claude-haiku-5-5-vs-gpt-6-luna',
    title: 'Claude Haiku 5.5 vs GPT-6 Luna — High-Volume Sub-Agent Cost',
    description:
      'Compare economy worker models Claude Haiku 5.5 and GPT-6 Luna across 1,500+ daily MCP support and triage loops.',
  },
  {
    slug: 'gemini-3-8-flash-vs-deepseek-v4-1-flash-peak',
    title: 'Gemini 3.8 Flash vs DeepSeek V4.1 Flash — Fast Agent Pricing',
    description:
      'Simulate fast, low-cost agent loops comparing Gemini 3.8 Flash against DeepSeek V4.1 Flash with prompt caching.',
  },
];

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function writeVariantHtml(baseHtml, outDir, title, description, canonicalUrl) {
  fs.mkdirSync(outDir, { recursive: true });
  let html = baseHtml
    .replace(/<title>[\s\S]*?<\/title>/, `<title>${escapeHtml(title)}</title>`)
    .replace(
      /<meta\s+name="description"\s+content="[\s\S]*?"\s*\/>/,
      `<meta name="description" content="${escapeHtml(description)}" />`
    )
    .replace(
      /<meta\s+property="og:title"\s+content="[\s\S]*?"\s*\/>/,
      `<meta property="og:title" content="${escapeHtml(title)}" />`
    )
    .replace(
      /<meta\s+property="og:description"\s+content="[\s\S]*?"\s*\/>/,
      `<meta property="og:description" content="${escapeHtml(description)}" />`
    )
    .replace(
      '</head>',
      `  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />\n  </head>`
    );

  fs.writeFileSync(path.join(outDir, 'index.html'), html, 'utf8');
}

function main() {
  const indexPath = path.join(DIST_DIR, 'index.html');
  if (!fs.existsSync(indexPath)) {
    throw new Error('dist/index.html not found. Run vite build first.');
  }

  const baseHtml = fs.readFileSync(indexPath, 'utf8');
  const urls = [`${BASE_URL}/`];

  for (const p of PRESET_PAGES) {
    const url = `${BASE_URL}/presets/${p.slug}/`;
    writeVariantHtml(baseHtml, path.join(DIST_DIR, 'presets', p.slug), p.title, p.description, url);
    urls.push(url);
  }

  for (const c of COMPARE_PAGES) {
    const url = `${BASE_URL}/compare/${c.slug}/`;
    writeVariantHtml(baseHtml, path.join(DIST_DIR, 'compare', c.slug), c.title, c.description, url);
    urls.push(url);
  }

  // GitHub Pages SPA fallback
  fs.copyFileSync(indexPath, path.join(DIST_DIR, '404.html'));

  // robots.txt
  fs.writeFileSync(
    path.join(DIST_DIR, 'robots.txt'),
    `User-agent: *\nAllow: /\n\nSitemap: ${BASE_URL}/sitemap.xml\n`,
    'utf8'
  );

  // sitemap.xml
  const today = new Date().toISOString().slice(0, 10);
  const sitemap = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...urls.map(
      (u) =>
        `  <url>\n    <loc>${escapeHtml(u)}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>weekly</changefreq>\n  </url>`
    ),
    '</urlset>',
    '',
  ].join('\n');

  fs.writeFileSync(path.join(DIST_DIR, 'sitemap.xml'), sitemap, 'utf8');
  console.log(`[SEO] Generated ${urls.length} crawlable routes, sitemap.xml, robots.txt, and 404.html`);
}

main();
