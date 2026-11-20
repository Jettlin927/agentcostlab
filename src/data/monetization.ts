/**
 * Centralized monetization & distribution configuration.
 * Drop in your own referral/affiliate query params, sponsor link, or GitHub URL
 * without touching any UI component logic.
 */

export interface OptimizationPartner {
  id: string;
  name: string;
  badge: string;
  badgeZh: string;
  description: string;
  descriptionZh: string;
  ctaLabel: string;
  ctaLabelZh: string;
  /** Replace with your affiliate/referral URL */
  url: string;
}

export const SITE_META = {
  brandName: 'AgentCostLab',
  githubUrl: 'https://github.com/Jettlin927/agentcostlab',
  authorHandle: '@Jettlin927',
  sponsorUrl: 'https://github.com/sponsors/Jettlin927',
};

export const OPTIMIZATION_PARTNERS: OptimizationPartner[] = [
  {
    id: 'cloudflare-ai-gateway',
    name: 'Cloudflare AI Gateway',
    badge: 'Caching & Rate Limits',
    badgeZh: '边缘缓存与限流',
    description: 'Add semantic caching, fallback routing, and token analytics in front of any LLM provider.',
    descriptionZh: '在任意大模型 API 前增加边缘缓存、自动容灾路由与实时 Token 成本监控。',
    ctaLabel: 'Explore AI Gateway',
    ctaLabelZh: '查看 AI Gateway',
    url: 'https://developers.cloudflare.com/ai-gateway/',
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    badge: 'Hybrid Routing',
    badgeZh: '多模型混合路由',
    description: 'Route Turn 1 planning to Frontier models and tool-execution turns to Economy models via one API.',
    descriptionZh: '用一个统一接口将首轮规划路由给旗舰模型、工具执行轮路由给经济模型，直降 60%+ 账单。',
    ctaLabel: 'Compare API Routes',
    ctaLabelZh: '查看统一路由',
    url: 'https://openrouter.ai/',
  },
  {
    id: 'deepseek-api',
    name: 'DeepSeek API',
    badge: 'Up to 98% Cache Off',
    badgeZh: '缓存最高省 98%',
    description: 'Off-peak batching + automatic prefix caching cuts multi-turn coding & CI agent bills dramatically.',
    descriptionZh: '非高峰调度 + 自动前缀缓存，大幅压低多轮编程与 CI 修复 Agent 的月度账单。',
    ctaLabel: 'Check DeepSeek Docs',
    ctaLabelZh: '查看 DeepSeek 定价',
    url: 'https://api-docs.deepseek.com/',
  },
];
