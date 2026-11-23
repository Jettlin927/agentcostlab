import type { SimulationConfig } from '../engine/simulator';

export interface AgentPreset {
  id: string;
  slug: string;
  name: string;
  nameZh: string;
  tagline: string;
  taglineZh: string;
  badge: string;
  config: Partial<SimulationConfig>;
}

export const AGENT_PRESETS: AgentPreset[] = [
  {
    id: 'coding-agent',
    slug: 'coding-agent',
    name: 'Coding Agent (Claude Code / Cursor)',
    nameZh: 'AI 编程助手 (Claude Code / Cursor)',
    tagline: '24-turn repo edit loop with CLAUDE.md + 12 MCP tools & file reads',
    taglineZh: '24 轮代码修改循环，含 CLAUDE.md + 12 个 MCP 工具定义与文件读取',
    badge: 'Most Popular',
    config: {
      modelId: 'claude-sonnet-5-5',
      workerModelId: 'claude-haiku-5-5',
      turns: 24,
      staticPrefixTokens: 12000,
      newInputTokensPerTurn: 350,
      toolOutputTokensPerTurn: 2600,
      outputTokensPerTurn: 900,
      reasoningTokensPerTurn: 600,
      enableCaching: true,
      cacheHitRate: 0.85,
      retryRate: 0.12,
      runsPerDay: 40,
      activeDaysPerMonth: 22,
      enableHybridRouting: false,
      plannerInterval: 5,
    },
  },
  {
    id: 'deep-research',
    slug: 'deep-research-agent',
    name: 'Autonomous Deep Research Agent',
    nameZh: '自主深度调研 Agent',
    tagline: '16 turns of web search, page scraping, and heavy synthesis reasoning',
    taglineZh: '16 轮联网搜索、网页抓取与深度长文推理总结',
    badge: 'Heavy Context',
    config: {
      modelId: 'gemini-4-carbon',
      workerModelId: 'gemini-3-5-flash-lite',
      turns: 16,
      staticPrefixTokens: 6500,
      newInputTokensPerTurn: 250,
      toolOutputTokensPerTurn: 4500,
      outputTokensPerTurn: 1400,
      reasoningTokensPerTurn: 1200,
      enableCaching: true,
      cacheHitRate: 0.78,
      retryRate: 0.1,
      runsPerDay: 25,
      activeDaysPerMonth: 30,
      enableHybridRouting: true,
      plannerInterval: 4,
    },
  },
  {
    id: 'mcp-support',
    slug: 'mcp-support-bot',
    name: 'Enterprise MCP Support Triage',
    nameZh: '企业级 MCP 客服工单分流',
    tagline: 'High-volume 5-turn CRM/DB lookup bot running 1,500 tickets/day',
    taglineZh: '高并发 5 轮工单处理，日均 1,500 次 CRM/数据库工具查询',
    badge: 'High Volume',
    config: {
      modelId: 'gpt-6-2-sol',
      workerModelId: 'gpt-6-luna',
      turns: 5,
      staticPrefixTokens: 8000,
      newInputTokensPerTurn: 400,
      toolOutputTokensPerTurn: 1100,
      outputTokensPerTurn: 450,
      reasoningTokensPerTurn: 150,
      enableCaching: true,
      cacheHitRate: 0.92,
      retryRate: 0.05,
      runsPerDay: 1500,
      activeDaysPerMonth: 30,
      enableHybridRouting: false,
      plannerInterval: 5,
    },
  },
  {
    id: 'pr-review-ci',
    slug: 'pr-review-ci-agent',
    name: 'PR Review & CI Auto-Fixer',
    nameZh: '自动 PR 审查与 CI 修复 Agent',
    tagline: '12-turn diff inspection, test runner output parsing, and patch loop',
    taglineZh: '12 轮代码 Diff 审查、单测报错解析与自动打补丁循环',
    badge: 'DevOps',
    config: {
      modelId: 'deepseek-v4-pro-peak',
      workerModelId: 'deepseek-v4-1-flash-peak',
      turns: 12,
      staticPrefixTokens: 9500,
      newInputTokensPerTurn: 500,
      toolOutputTokensPerTurn: 2200,
      outputTokensPerTurn: 800,
      reasoningTokensPerTurn: 500,
      enableCaching: true,
      cacheHitRate: 0.82,
      retryRate: 0.15,
      runsPerDay: 80,
      activeDaysPerMonth: 22,
      enableHybridRouting: false,
      plannerInterval: 4,
    },
  },
  {
    id: 'data-analyst',
    slug: 'autonomous-data-analyst',
    name: 'SQL & Quant Data Analyst Loop',
    nameZh: '量化 / SQL 数据分析 Agent',
    tagline: '18-turn iterative SQL querying, Python execution & chart synthesis',
    taglineZh: '18 轮迭代 SQL 查询、Python 脚本执行与报表生成',
    badge: 'Analytics',
    config: {
      modelId: 'claude-opus-5-5',
      workerModelId: 'claude-haiku-5-5',
      turns: 18,
      staticPrefixTokens: 14000,
      newInputTokensPerTurn: 300,
      toolOutputTokensPerTurn: 3000,
      outputTokensPerTurn: 1000,
      reasoningTokensPerTurn: 900,
      enableCaching: true,
      cacheHitRate: 0.85,
      retryRate: 0.15,
      runsPerDay: 30,
      activeDaysPerMonth: 22,
      enableHybridRouting: true,
      plannerInterval: 4,
    },
  },
  {
    id: 'uncached-disaster',
    slug: 'uncached-loop-warning',
    name: 'Uncached 30-Turn Loop (Warning!)',
    nameZh: '无缓存 30 轮失控循环 (反面教材)',
    tagline: 'See what happens when prompt caching breaks or timestamps bust cache',
    taglineZh: '演示在系统提示词里塞入动态时间戳导致缓存全失效的账单灾难',
    badge: 'O(N²) Alert',
    config: {
      modelId: 'claude-opus-5-5',
      workerModelId: 'claude-haiku-5-5',
      turns: 30,
      staticPrefixTokens: 15000,
      newInputTokensPerTurn: 400,
      toolOutputTokensPerTurn: 3200,
      outputTokensPerTurn: 1000,
      reasoningTokensPerTurn: 800,
      enableCaching: false,
      cacheHitRate: 0,
      retryRate: 0.2,
      runsPerDay: 50,
      activeDaysPerMonth: 30,
      enableHybridRouting: false,
      plannerInterval: 5,
    },
  },
];

export interface ComparisonPair {
  slug: string;
  modelA: string;
  modelB: string;
  title: string;
  description: string;
}

export const SEO_COMPARISONS: ComparisonPair[] = [
  {
    slug: 'claude-sonnet-5-5-vs-gpt-6-2-sol',
    modelA: 'claude-sonnet-5-5',
    modelB: 'gpt-6-2-sol',
    title: 'Claude Sonnet 5.5 vs GPT-6.2 Sol — Multi-Turn Agent Cost Comparison',
    description:
      'Compare quadratic multi-turn agent loop costs, 95% vs 90% prompt caching discounts, and long-context pricing between Claude Sonnet 5.5 and GPT-6.2 Sol.',
  },
  {
    slug: 'claude-sonnet-5-5-vs-deepseek-v4-pro-peak',
    modelA: 'claude-sonnet-5-5',
    modelB: 'deepseek-v4-pro-peak',
    title: 'Claude Sonnet 5.5 vs DeepSeek V4 Pro — Agent Loop & Caching Cost',
    description:
      'Calculate how much you save switching a 24-turn coding or MCP agent from Claude Sonnet 5.5 to DeepSeek V4 Pro with 96.7% cache hit discounts.',
  },
  {
    slug: 'claude-opus-5-5-vs-gemini-4-carbon',
    modelA: 'claude-opus-5-5',
    modelB: 'gemini-4-carbon',
    title: 'Claude Opus 5.5 vs Gemini 4 Carbon — Frontier Agent Economics',
    description:
      'Side-by-side multi-turn token burn and monthly spend projection for Claude Opus 5.5 vs Gemini 4 Carbon on long-context reasoning agents.',
  },
  {
    slug: 'gpt-6-2-astra-vs-claude-fable-5-2',
    modelA: 'gpt-6-2-astra',
    modelB: 'claude-fable-5-2',
    title: 'GPT-6.2 Astra vs Claude Fable 5.2 — Ultra-Frontier Cost Simulator',
    description:
      'Model hybrid planner/worker routing and cache write penalties for ultra-frontier models GPT-6.2 Astra and Claude Fable 5.2.',
  },
  {
    slug: 'claude-haiku-5-5-vs-gpt-6-luna',
    modelA: 'claude-haiku-5-5',
    modelB: 'gpt-6-luna',
    title: 'Claude Haiku 5.5 vs GPT-6 Luna — High-Volume Sub-Agent Cost',
    description:
      'Compare economy worker models Claude Haiku 5.5 and GPT-6 Luna across 1,500+ daily MCP support and triage loops.',
  },
  {
    slug: 'gemini-3-8-flash-vs-deepseek-v4-1-flash-peak',
    modelA: 'gemini-3-8-flash',
    modelB: 'deepseek-v4-1-flash-peak',
    title: 'Gemini 3.8 Flash vs DeepSeek V4.1 Flash — Fast Agent Pricing',
    description:
      'Simulate fast, low-cost agent loops comparing Gemini 3.8 Flash against DeepSeek V4.1 Flash with prompt caching enabled.',
  },
  {
    slug: 'gemini-4-neon-vs-claude-sonnet-5-5',
    modelA: 'gemini-4-neon',
    modelB: 'claude-sonnet-5-5',
    title: 'Gemini 4 Neon vs Claude Sonnet 5.5 — Coding Agent Cost & Caching',
    description:
      'Compare Google Gemini 4 Neon ($3/$15, 95% cache hit discount) against Anthropic Claude Sonnet 5.5 ($2/$10) across multi-turn coding agent loops.',
  },
  {
    slug: 'qwen4-max-vs-deepseek-v4-pro-peak',
    modelA: 'qwen4-max',
    modelB: 'deepseek-v4-pro-peak',
    title: 'Qwen4-Max vs DeepSeek V4 Pro — High-Value Agent Loop Economics',
    description:
      'Compare Alibaba Qwen4-Max ($1.50/$4.50, 95% cached reads) against DeepSeek V4 Pro ($1.32/$3.96) for long-running autonomous agents.',
  },
  {
    slug: 'gemini-4-hydrogen-vs-claude-sonnet-5-5',
    modelA: 'gemini-4-hydrogen',
    modelB: 'claude-sonnet-5-5',
    title: 'Gemini 4 Hydrogen vs Claude Sonnet 5.5 — Coding Agent Cost & Speed',
    description:
      'Compare Google Gemini 4 Hydrogen ($1.50/$7.50, 95% cache discount, 164 tok/s) against Claude Sonnet 5.5 ($2/$10) across multi-turn agent loops.',
  },
  {
    slug: 'gpt-6-1-terra-vs-gemini-4-hydrogen',
    modelA: 'gpt-6-1-terra',
    modelB: 'gemini-4-hydrogen',
    title: 'GPT-6.1 Terra vs Gemini 4 Hydrogen — Mid-Tier Agent Cost & Caching',
    description:
      'Compare OpenAI GPT-6.1 Terra ($1/$5, $0.05 cached, 1.05M ctx) against Google Gemini 4 Hydrogen ($1.50/$7.50, 164 tok/s) on multi-turn agent loops.',
  },
  {
    slug: 'kimi-k3-1-pro-vs-claude-sonnet-5-5',
    modelA: 'kimi-k3-1-pro',
    modelB: 'claude-sonnet-5-5',
    title: 'Kimi K3.1 Pro vs Claude Sonnet 5.5 — Open-Weight vs Proprietary Agent Cost',
    description:
      'Compare Moonshot Kimi K3.1 Pro (Apache 2.0 2.8T MoE, $2/$10, $0.20 cached, 1M ctx) against Anthropic Claude Sonnet 5.5 ($2/$10, 1.25x cache write) across multi-turn agent loops.',
  },
];
