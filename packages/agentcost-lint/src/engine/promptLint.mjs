/**
 * Pure, zero-dependency token estimator and static prompt/MCP overhead linter.
 * Shared across the AgentCostLab web UI, Node CLI (`agentcost-lint`), and GitHub Action.
 */

export const DEFAULT_LINT_MODELS = {
  'claude-sonnet-5-5': {
    id: 'claude-sonnet-5-5',
    name: 'Claude Sonnet 5.5',
    inputPerM: 2.0,
    cachedInputPerM: 0.1,
    cacheWriteMultiplier: 1.25,
  },
  'claude-opus-5-5': {
    id: 'claude-opus-5-5',
    name: 'Claude Opus 5.5',
    inputPerM: 4.0,
    cachedInputPerM: 0.2,
    cacheWriteMultiplier: 1.25,
  },
  'claude-fable-5-2': {
    id: 'claude-fable-5-2',
    name: 'Claude Fable 5.2',
    inputPerM: 8.0,
    cachedInputPerM: 0.2,
    cacheWriteMultiplier: 1.25,
  },
  'claude-haiku-5-5': {
    id: 'claude-haiku-5-5',
    name: 'Claude Haiku 5.5',
    inputPerM: 0.1,
    cachedInputPerM: 0.01,
    cacheWriteMultiplier: 1.25,
  },
  'gpt-6-2-sol': {
    id: 'gpt-6-2-sol',
    name: 'GPT-6.2 Sol',
    inputPerM: 2.0,
    cachedInputPerM: 0.1,
    cacheWriteMultiplier: 1.0,
  },
  'gpt-6-2-astra': {
    id: 'gpt-6-2-astra',
    name: 'GPT-6.2 Astra',
    inputPerM: 8.0,
    cachedInputPerM: 0.4,
    cacheWriteMultiplier: 1.0,
  },
  'gpt-6-1-terra': {
    id: 'gpt-6-1-terra',
    name: 'GPT-6.1 Terra',
    inputPerM: 1.0,
    cachedInputPerM: 0.05,
    cacheWriteMultiplier: 1.25,
  },
  'gpt-6-luna': {
    id: 'gpt-6-luna',
    name: 'GPT-6 Luna',
    inputPerM: 0.1,
    cachedInputPerM: 0.01,
    cacheWriteMultiplier: 1.0,
  },
  'gemini-4-carbon': {
    id: 'gemini-4-carbon',
    name: 'Gemini 4 Carbon',
    inputPerM: 2.0,
    cachedInputPerM: 0.1,
    cacheWriteMultiplier: 1.0,
  },
  'gemini-4-neon': {
    id: 'gemini-4-neon',
    name: 'Gemini 4 Neon',
    inputPerM: 3.0,
    cachedInputPerM: 0.15,
    cacheWriteMultiplier: 1.0,
  },
  'gemini-4-argon': {
    id: 'gemini-4-argon',
    name: 'Gemini 4 Argon',
    inputPerM: 2.0,
    cachedInputPerM: 0.1,
    cacheWriteMultiplier: 1.0,
  },
  'gemini-4-hydrogen': {
    id: 'gemini-4-hydrogen',
    name: 'Gemini 4 Hydrogen',
    inputPerM: 1.5,
    cachedInputPerM: 0.075,
    cacheWriteMultiplier: 1.0,
  },
  'deepseek-v4-pro-peak': {
    id: 'deepseek-v4-pro-peak',
    name: 'DeepSeek V4 Pro (Peak)',
    inputPerM: 1.32,
    cachedInputPerM: 0.044,
    cacheWriteMultiplier: 1.0,
  },
  'deepseek-v4-1-flash-peak': {
    id: 'deepseek-v4-1-flash-peak',
    name: 'DeepSeek V4.1 Flash (Peak)',
    inputPerM: 0.3,
    cachedInputPerM: 0.006,
    cacheWriteMultiplier: 1.0,
  },
  'qwen4-max': {
    id: 'qwen4-max',
    name: 'Qwen4-Max',
    inputPerM: 1.5,
    cachedInputPerM: 0.075,
    cacheWriteMultiplier: 1.0,
  },
  'kimi-k3-1-pro': {
    id: 'kimi-k3-1-pro',
    name: 'Kimi K3.1 Pro',
    inputPerM: 2.0,
    cachedInputPerM: 0.2,
    cacheWriteMultiplier: 1.0,
  },
  'grok-4-7': {
    id: 'grok-4-7',
    name: 'Grok 4.7',
    inputPerM: 2.0,
    cachedInputPerM: 0.5,
    cacheWriteMultiplier: 1.0,
  },
  'glm-5-3': {
    id: 'glm-5-3',
    name: 'GLM-5.3',
    inputPerM: 1.4,
    cachedInputPerM: 0.26,
    cacheWriteMultiplier: 1.0,
  },
  'glm-5-3-flash': {
    id: 'glm-5-3-flash',
    name: 'GLM-5.3-Flash',
    inputPerM: 0.15,
    cachedInputPerM: 0.03,
    cacheWriteMultiplier: 1.0,
  },
  'minimax-m3': {
    id: 'minimax-m3',
    name: 'MiniMax-M3',
    inputPerM: 0.3,
    cachedInputPerM: 0.06,
    cacheWriteMultiplier: 1.0,
  },
  'mistral-large-4': {
    id: 'mistral-large-4',
    name: 'Mistral Large 4',
    inputPerM: 0.7,
    cachedInputPerM: 0.07,
    cacheWriteMultiplier: 1.0,
  },
  'mistral-small-4': {
    id: 'mistral-small-4',
    name: 'Mistral Small 4',
    inputPerM: 0.15,
    cachedInputPerM: 0.015,
    cacheWriteMultiplier: 1.0,
  },
};

export const DEFAULT_TARGET_FILES = [
  'CLAUDE.md',
  'AGENTS.md',
  '.cursorrules',
  'COPILOT_INSTRUCTIONS.md',
  '.github/copilot-instructions.md',
  'mcp.json',
  '.mcp.json',
  '.claude/settings.json',
];

const CACHE_BUSTER_REGEX = /\b(current_time|timestamp|Date\.now|new Date|uuid|random)\b/i;
const SECRET_LEAK_REGEX = /(sk-[a-zA-Z0-9]{16,}|ghp_[a-zA-Z0-9]{20,}|AIza[0-9A-Za-z_-]{20,}|xoxb-)/i;

/**
 * Estimate token count for mixed English prose, JSON/code punctuation, and CJK text.
 * @param {string} text
 * @returns {number}
 */
export function estimateTokens(text) {
  if (!text) return 0;
  let cjkCount = 0;
  let codePunctCount = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0x3040 && code <= 0x30ff) ||
      (code >= 0xac00 && code <= 0xd7af)
    ) {
      cjkCount++;
    } else if ('{}[]":,;()=<>'.includes(text[i])) {
      codePunctCount++;
    }
  }
  const otherChars = Math.max(0, text.length - cjkCount - codePunctCount);
  // CJK ~1.5 tokens/char, JSON punctuation ~0.65 tokens/char, English prose ~0.256 tokens/char
  return Math.max(1, Math.round(cjkCount * 1.5 + codePunctCount * 0.65 + otherChars / 3.9));
}

/**
 * Detect whether a text payload is JSON and count defined tools/MCP servers.
 * @param {string} text
 * @param {Array<object>} warnings
 * @returns {{ isJson: boolean, detectedToolCount: number }}
 */
function inspectJsonPayload(text, warnings) {
  const trimmed = text.trim();
  if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
    return { isJson: false, detectedToolCount: 0 };
  }

  try {
    const parsed = JSON.parse(trimmed);
    let detectedToolCount = 0;
    if (Array.isArray(parsed)) {
      detectedToolCount = parsed.length;
    } else if (parsed && typeof parsed === 'object') {
      if (Array.isArray(parsed.tools)) detectedToolCount = parsed.tools.length;
      else if (parsed.mcpServers && typeof parsed.mcpServers === 'object') {
        detectedToolCount = Object.keys(parsed.mcpServers).length;
      }
    }
    return { isJson: true, detectedToolCount };
  } catch {
    warnings.push({
      ruleId: 'malformed-json',
      severity: 'medium',
      message: 'Looks like JSON but failed to parse. Syntax errors can break MCP/tool loaders.',
      messageZh: '内容疑似 JSON 但解析失败，语法错误可能导致 MCP/工具加载失败。',
    });
    return { isJson: false, detectedToolCount: 0 };
  }
}

/**
 * Inspect static prompt or MCP config overhead, cache-busters, secret leaks, and 1k-run cost.
 * @param {string} text
 * @param {number} turns
 * @param {{ inputPerM: number, cachedInputPerM: number, cacheWriteMultiplier: number }} model
 */
export function inspectPromptOverhead(text, turns, model) {
  const charCount = text.length;
  const lineCount = text ? text.split(/\r?\n/).length : 0;
  const estimatedTokens = estimateTokens(text);
  const warnings = [];

  const { isJson, detectedToolCount } = inspectJsonPayload(text, warnings);

  if (CACHE_BUSTER_REGEX.test(text)) {
    warnings.push({
      ruleId: 'cache-buster',
      severity: 'high',
      message:
        'Potential cache-buster detected (timestamp/UUID in static prefix). Dynamic strings in system prompts invalidate 100% of prompt caching!',
      messageZh:
        '检测到疑似破坏缓存的动态字段（时间戳/UUID）。在静态前缀中放入动态变量会导致 Prompt Caching 彻底失效！',
    });
  }

  if (SECRET_LEAK_REGEX.test(text)) {
    warnings.push({
      ruleId: 'secret-leak',
      severity: 'high',
      message: 'Possible hardcoded API key or token detected! Move credentials to environment variables.',
      messageZh: '检测到疑似硬编码的 API 密钥或 Token！请立即改为环境变量。',
    });
  }

  if (estimatedTokens > 8000) {
    warnings.push({
      ruleId: 'heavy-prefix',
      severity: 'medium',
      message: `Heavy static prefix (${estimatedTokens.toLocaleString('en-US')} tokens). Consider lazy-loading MCP tool schemas or trimming redundant examples.`,
      messageZh: `静态前缀偏大（约 ${estimatedTokens.toLocaleString('en-US')} tokens），建议按需懒加载 MCP 工具定义或精简冗余示例。`,
    });
  }

  const effectiveTurns = Math.max(1, turns);
  const costPer1kRunsUncached =
    ((estimatedTokens * effectiveTurns * 1000) / 1_000_000) * model.inputPerM;
  const costPer1kRunsCached =
    ((estimatedTokens * 1000) / 1_000_000) * (model.inputPerM * model.cacheWriteMultiplier) +
    ((estimatedTokens * Math.max(0, effectiveTurns - 1) * 1000) / 1_000_000) *
      model.cachedInputPerM;

  return {
    charCount,
    lineCount,
    estimatedTokens,
    isJson,
    detectedToolCount,
    warnings,
    costPer1kRunsUncached,
    costPer1kRunsCached,
  };
}

/**
 * Find 0-based line/column spans for all regex matches across lines.
 * @param {string[]} lines
 * @param {RegExp} baseRegex
 * @param {{ ruleId: string, severity: string, message: string, messageZh: string }} meta
 */
function findRegexSpans(lines, baseRegex, meta) {
  const spans = [];
  const flags = baseRegex.flags.includes('g') ? baseRegex.flags : `${baseRegex.flags}g`;
  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const lineText = lines[lineIdx];
    const re = new RegExp(baseRegex.source, flags);
    for (const match of lineText.matchAll(re)) {
      const startCol = match.index ?? 0;
      spans.push({
        line: lineIdx,
        startCol,
        endCol: startCol + match[0].length,
        ...meta,
      });
    }
  }
  return spans;
}

/**
 * Inspect a prompt/MCP file and return exact line/column diagnostic spans for IDE integrations.
 * @param {string} text
 * @param {number} turns
 * @param {{ inputPerM: number, cachedInputPerM: number, cacheWriteMultiplier: number }} model
 */
export function findPromptDiagnosticSpans(text, turns, model) {
  const inspection = inspectPromptOverhead(text, turns, model);
  const lines = text ? text.split(/\r?\n/) : [''];
  const spans = [];

  for (const w of inspection.warnings) {
    if (w.ruleId === 'cache-buster') {
      spans.push(...findRegexSpans(lines, CACHE_BUSTER_REGEX, w));
    } else if (w.ruleId === 'secret-leak') {
      spans.push(...findRegexSpans(lines, SECRET_LEAK_REGEX, w));
    } else {
      const firstLineLen = Math.max(1, lines[0]?.length ?? 1);
      spans.push({
        line: 0,
        startCol: 0,
        endCol: firstLineLen,
        ...w,
      });
    }
  }

  return {
    ...inspection,
    spans,
  };
}

/**
 * Format a USD amount cleanly for terminal and Markdown reports.
 * @param {number} amount
 * @returns {string}
 */
export function formatUsdCompact(amount) {
  if (!Number.isFinite(amount) || amount === 0) return '$0.00';
  if (amount < 0.01) return `$${amount.toFixed(4)}`;
  if (amount < 10) return `$${amount.toFixed(2)}`;
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Resolve a model pricing profile by ID, falling back to Claude Sonnet 5.5.
 * @param {string} [modelId]
 */
export function resolveLintModel(modelId) {
  if (modelId && DEFAULT_LINT_MODELS[modelId]) {
    return DEFAULT_LINT_MODELS[modelId];
  }
  return DEFAULT_LINT_MODELS['claude-sonnet-5-5'];
}

/**
 * Aggregate per-file lint inspections into a single summary report.
 * @param {Array<{ path: string, content: string }>} files
 * @param {{ modelId?: string, turns?: number, maxTokens?: number, failOnHigh?: boolean, failOnMedium?: boolean }} [options]
 */
export function runLintBatch(files, options = {}) {
  const model = resolveLintModel(options.modelId);
  const turns = Math.max(1, Number.isFinite(options.turns) ? Math.round(options.turns) : 24);
  const maxTokens =
    options.maxTokens !== undefined && Number.isFinite(options.maxTokens)
      ? Math.max(0, Math.round(options.maxTokens))
      : undefined;

  const results = files.map((file) => {
    const inspection = findPromptDiagnosticSpans(file.content, turns, model);
    return {
      path: file.path,
      ...inspection,
    };
  });

  const totals = results.reduce(
    (acc, r) => {
      acc.files += 1;
      acc.estimatedTokens += r.estimatedTokens;
      acc.costPer1kRunsUncached += r.costPer1kRunsUncached;
      acc.costPer1kRunsCached += r.costPer1kRunsCached;
      for (const w of r.warnings) {
        if (w.severity === 'high') acc.highWarnings += 1;
        else if (w.severity === 'medium') acc.mediumWarnings += 1;
        else acc.infoWarnings += 1;
      }
      return acc;
    },
    {
      files: 0,
      estimatedTokens: 0,
      costPer1kRunsUncached: 0,
      costPer1kRunsCached: 0,
      highWarnings: 0,
      mediumWarnings: 0,
      infoWarnings: 0,
    }
  );

  const budgetExceeded = maxTokens !== undefined && totals.estimatedTokens > maxTokens;
  const highFailed = Boolean(options.failOnHigh) && totals.highWarnings > 0;
  const mediumFailed = Boolean(options.failOnMedium) && totals.mediumWarnings > 0;

  return {
    model,
    turns,
    maxTokens: maxTokens ?? null,
    results,
    totals,
    budgetExceeded,
    passed: !(budgetExceeded || highFailed || mediumFailed),
  };
}

/**
 * Render a Markdown summary table suitable for PR comments or GITHUB_STEP_SUMMARY.
 * @param {ReturnType<typeof runLintBatch>} report
 * @returns {string}
 */
export function renderMarkdownSummary(report) {
  const lines = [
    `### AgentCostLab Prompt & MCP Token Tax Report`,
    ``,
    `- **Model**: \`${report.model.id}\` (${report.model.name}) | **Loop**: ${report.turns} turns`,
    `- **Total Static Prefix**: **${report.totals.estimatedTokens.toLocaleString('en-US')} tokens**${report.maxTokens !== null ? ` (budget: ${report.maxTokens.toLocaleString('en-US')})` : ''}`,
    `- **1,000-Run Prefix Tax**: **${formatUsdCompact(report.totals.costPer1kRunsCached)}** cached vs **${formatUsdCompact(report.totals.costPer1kRunsUncached)}** uncached`,
    `- **Findings**: ${report.totals.highWarnings} high, ${report.totals.mediumWarnings} medium`,
    ``,
    `| File | Tokens | Tools | 1k Runs (Cached) | 1k Runs (Uncached) | Warnings |`,
    `| --- | ---: | ---: | ---: | ---: | --- |`,
  ];

  for (const r of report.results) {
    const warnLabel =
      r.warnings.length === 0
        ? 'OK'
        : r.warnings.map((w) => `${w.severity.toUpperCase()}:${w.ruleId || 'warn'}`).join(', ');
    lines.push(
      `| \`${r.path}\` | ${r.estimatedTokens.toLocaleString('en-US')} | ${r.detectedToolCount} | ${formatUsdCompact(r.costPer1kRunsCached)} | ${formatUsdCompact(r.costPer1kRunsUncached)} | ${warnLabel} |`
    );
  }

  if (report.results.some((r) => r.warnings.length > 0)) {
    lines.push(``, `#### Details`);
    for (const r of report.results) {
      for (const w of r.warnings) {
        lines.push(`- **[${w.severity.toUpperCase()}]** \`${r.path}\`: ${w.message}`);
      }
    }
  }

  lines.push(
    ``,
    `_Powered by [AgentCostLab](https://jettlin927.github.io/agentcostlab/) & [x402-mcp-agentcost](https://x402-mcp-agentcost.jettlin666.workers.dev/)_`
  );

  return lines.join('\n');
}

const SARIF_RULES = [
  {
    id: 'cache-buster',
    name: 'PromptCacheBuster',
    shortDescription: { text: 'Dynamic variable in static prompt prefix breaks prompt caching' },
    fullDescription: {
      text: 'Dynamic expressions such as current_time, timestamp, Date.now, uuid, or random inside static agent instruction files invalidate prompt prefix caches on every turn.',
    },
    helpUri: 'https://jettlin927.github.io/agentcostlab/',
    defaultConfiguration: { level: 'error' },
    properties: { tags: ['performance', 'cost', 'prompt-caching'] },
  },
  {
    id: 'secret-leak',
    name: 'HardcodedSecretLeak',
    shortDescription: { text: 'Potential API key or token hardcoded in agent prompt or MCP config' },
    fullDescription: {
      text: 'Hardcoded provider API keys or personal access tokens in CLAUDE.md, AGENTS.md, or mcp.json risk repository leakage and unauthorized LLM spend.',
    },
    helpUri: 'https://jettlin927.github.io/agentcostlab/',
    defaultConfiguration: { level: 'error' },
    properties: { tags: ['security', 'secrets'] },
  },
  {
    id: 'malformed-json',
    name: 'MalformedMcpJson',
    shortDescription: { text: 'Invalid JSON syntax in MCP configuration file' },
    fullDescription: {
      text: 'The MCP configuration file failed JSON parsing, which can break tool discovery or silently disable server registrations.',
    },
    helpUri: 'https://jettlin927.github.io/agentcostlab/',
    defaultConfiguration: { level: 'warning' },
    properties: { tags: ['reliability', 'mcp'] },
  },
  {
    id: 'heavy-prefix',
    name: 'HeavyStaticPrefix',
    shortDescription: { text: 'Static prompt or MCP schema prefix exceeds 8,000 tokens' },
    fullDescription: {
      text: 'Oversized static instruction prefixes and bloated MCP tool schemas multiply O(N^2) agent loop input costs across every turn.',
    },
    helpUri: 'https://jettlin927.github.io/agentcostlab/',
    defaultConfiguration: { level: 'warning' },
    properties: { tags: ['performance', 'cost'] },
  },
  {
    id: 'token-budget',
    name: 'StaticPrefixTokenBudgetExceeded',
    shortDescription: { text: 'Total static prefix exceeds configured max-tokens budget' },
    fullDescription: {
      text: 'The combined estimated tokens across scanned agent prompt and MCP config files exceed the repository max-tokens guardrail.',
    },
    helpUri: 'https://jettlin927.github.io/agentcostlab/',
    defaultConfiguration: { level: 'error' },
    properties: { tags: ['performance', 'cost'] },
  },
];

function severityToSarifLevel(severity) {
  if (severity === 'high') return 'error';
  if (severity === 'medium') return 'warning';
  return 'note';
}

/**
 * Render a SARIF 2.1.0 report for GitHub Code Scanning (`upload-sarif`).
 * @param {ReturnType<typeof runLintBatch>} report
 * @param {string} [toolVersion]
 */
export function renderSarifReport(report, toolVersion = '1.0.0') {
  const sarifResults = [];

  for (const r of report.results) {
    const entries = r.spans && r.spans.length > 0 ? r.spans : r.warnings.map((w) => ({ line: 0, startCol: 0, endCol: 1, ...w }));
    for (const entry of entries) {
      const ruleId = entry.ruleId || 'heavy-prefix';
      const startLine = (entry.line ?? 0) + 1;
      const startColumn = (entry.startCol ?? 0) + 1;
      const endColumn = Math.max(startColumn + 1, (entry.endCol ?? 1) + 1);
      sarifResults.push({
        ruleId,
        level: severityToSarifLevel(entry.severity),
        message: { text: entry.message },
        locations: [
          {
            physicalLocation: {
              artifactLocation: {
                uri: r.path,
                uriBaseId: '%SRCROOT%',
              },
              region: {
                startLine,
                startColumn,
                endLine: startLine,
                endColumn,
              },
            },
          },
        ],
      });
    }
  }

  if (report.budgetExceeded) {
    const targetUri = report.results[0]?.path || 'CLAUDE.md';
    sarifResults.push({
      ruleId: 'token-budget',
      level: 'error',
      message: {
        text: `Total static prefix (${report.totals.estimatedTokens} tokens) exceeds max-tokens budget (${report.maxTokens}).`,
      },
      locations: [
        {
          physicalLocation: {
            artifactLocation: {
              uri: targetUri,
              uriBaseId: '%SRCROOT%',
            },
            region: {
              startLine: 1,
              startColumn: 1,
              endLine: 1,
              endColumn: 2,
            },
          },
        },
      ],
    });
  }

  return {
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    version: '2.1.0',
    runs: [
      {
        tool: {
          driver: {
            name: 'agentcost-lint',
            informationUri: 'https://jettlin927.github.io/agentcostlab/',
            version: toolVersion,
            rules: SARIF_RULES,
          },
        },
        results: sarifResults,
      },
    ],
  };
}

/**
 * Render human-readable CLI text, JSON, SARIF 2.1.0, or GitHub Actions workflow annotations.
 * @param {ReturnType<typeof runLintBatch>} report
 * @param {'text' | 'json' | 'github' | 'sarif'} format
 * @returns {string}
 */
export function formatLintOutput(report, format = 'text') {
  if (format === 'json') {
    return JSON.stringify(report, null, 2);
  }
  if (format === 'sarif') {
    return JSON.stringify(renderSarifReport(report), null, 2);
  }

  const lines = [];
  if (format === 'github') {
    for (const r of report.results) {
      const entries = r.spans && r.spans.length > 0 ? r.spans : r.warnings;
      for (const w of entries) {
        const level = w.severity === 'high' ? 'error' : 'warning';
        const loc = typeof w.line === 'number' ? `,line=${w.line + 1},col=${(w.startCol ?? 0) + 1}` : '';
        lines.push(`::${level} file=${r.path}${loc},title=agentcost-lint (${w.ruleId || w.severity})::${w.message}`);
      }
    }
    if (report.budgetExceeded) {
      lines.push(
        `::error title=agentcost-lint (token-budget)::Total static prefix (${report.totals.estimatedTokens} tokens) exceeds max-tokens budget (${report.maxTokens}).`
      );
    }
  }

  lines.push(
    `AgentCostLab Lint (${report.model.name}, ${report.turns} turns) — ${report.totals.files} file(s), ${report.totals.estimatedTokens.toLocaleString('en-US')} tokens`
  );
  lines.push(
    `1,000-run prefix tax: ${formatUsdCompact(report.totals.costPer1kRunsCached)} cached / ${formatUsdCompact(report.totals.costPer1kRunsUncached)} uncached`
  );

  for (const r of report.results) {
    lines.push(
      `  - ${r.path}: ${r.estimatedTokens.toLocaleString('en-US')} tokens` +
        (r.detectedToolCount > 0 ? ` (${r.detectedToolCount} tools)` : '') +
        ` | ${formatUsdCompact(r.costPer1kRunsCached)}/1k cached`
    );
    for (const w of r.warnings) {
      lines.push(`      [${w.severity.toUpperCase()}] ${w.message}`);
    }
  }

  if (report.budgetExceeded) {
    lines.push(
      `  [ERROR] Total static prefix (${report.totals.estimatedTokens}) exceeds --max-tokens (${report.maxTokens})`
    );
  }

  return lines.join('\n');
}
