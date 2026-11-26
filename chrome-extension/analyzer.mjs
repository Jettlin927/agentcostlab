import {
  DEFAULT_LINT_MODELS,
  DEFAULT_TARGET_FILES,
  findPromptDiagnosticSpans,
  formatUsdCompact,
  resolveLintModel,
} from './core/promptLint.mjs';

const EXTRA_TARGET_BASENAMES = [
  'skill.md',
  'gemini.md',
  'codex.md',
  '.cursorrules',
  '.windsurfrules',
  '.clinerules',
  'copilot-instructions.md',
  'opencode.json',
];

const TARGET_BASENAMES = new Set([
  ...DEFAULT_TARGET_FILES.map((file) => file.split('/').pop().toLowerCase()),
  ...EXTRA_TARGET_BASENAMES,
]);

const TARGET_SUFFIXES = DEFAULT_TARGET_FILES.filter((f) => f.includes('/')).map((f) =>
  `/${f.toLowerCase()}`
);

/**
 * Determine whether a GitHub URL points to an agent prompt, skill, or MCP config file.
 * @param {string} rawUrl
 * @returns {boolean}
 */
export function isTargetGitHubBlobUrl(rawUrl) {
  if (!rawUrl) return false;
  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch {
    return false;
  }
  if (parsed.hostname !== 'github.com') return false;
  const pathname = parsed.pathname.toLowerCase();
  if (!pathname.includes('/blob/')) return false;
  const segments = pathname.split('/').filter(Boolean);
  const last = segments[segments.length - 1] ?? '';
  if (TARGET_BASENAMES.has(last)) return true;
  return TARGET_SUFFIXES.some((suffix) => pathname.endsWith(suffix));
}

/**
 * Extract raw text content from a GitHub file blob DOM document.
 * @param {{ querySelector: (sel: string) => any, querySelectorAll?: (sel: string) => any[] }} doc
 * @returns {string}
 */
export function extractGitHubRawText(doc) {
  if (!doc || typeof doc.querySelector !== 'function') return '';
  const textarea =
    doc.querySelector('textarea#read-only-cursor-text-area') ||
    doc.querySelector('[data-testid="raw-text-area"]');
  if (textarea && typeof textarea.value === 'string' && textarea.value.trim()) {
    return textarea.value;
  }

  if (typeof doc.querySelectorAll === 'function') {
    const lineNodes = doc.querySelectorAll('.react-file-line, .blob-code-inner');
    if (lineNodes && lineNodes.length > 0) {
      return Array.from(lineNodes)
        .map((node) => node.textContent ?? '')
        .join('\n');
    }
  }

  return '';
}

/**
 * Return the list of supported pricing models for extension UI selectors.
 */
export function getAvailableLintModels() {
  return Object.values(DEFAULT_LINT_MODELS);
}

/**
 * Analyze a prompt or MCP config string using the shared AgentCostLab engine.
 * @param {string} text
 * @param {{ modelId?: string, turns?: number }} [options]
 */
export function analyzePromptForExtension(text, options = {}) {
  const safeText = typeof text === 'string' ? text : '';
  const model = resolveLintModel(options.modelId);
  const turns = Math.max(1, Number.isFinite(Number(options.turns)) ? Math.round(Number(options.turns)) : 24);
  const result = findPromptDiagnosticSpans(safeText, turns, model);

  const savingsPct =
    result.costPer1kRunsUncached > 0
      ? Math.max(
          0,
          Math.round(
            ((result.costPer1kRunsUncached - result.costPer1kRunsCached) /
              result.costPer1kRunsUncached) *
              100
          )
        )
      : 0;

  return {
    model,
    turns,
    ...result,
    savingsPct,
    cachedFormatted: formatUsdCompact(result.costPer1kRunsCached),
    uncachedFormatted: formatUsdCompact(result.costPer1kRunsUncached),
  };
}

/**
 * Format an extension lint report as a concise Markdown snippet for PRs or reviews.
 * @param {ReturnType<typeof analyzePromptForExtension>} report
 * @returns {string}
 */
export function formatLintReportMarkdown(report) {
  const lines = [
    `**AgentCostLab Lint (${report.model.name}, ${report.turns} turns)**`,
    `- Static prefix: **${report.estimatedTokens.toLocaleString('en-US')} tokens** (${report.charCount} chars)`,
    `- 1,000-run cost: **${report.cachedFormatted} cached** vs **${report.uncachedFormatted} uncached** (-${report.savingsPct}% savings)`,
  ];
  if (report.detectedToolCount > 0) {
    lines.push(`- Detected MCP/tool definitions: **${report.detectedToolCount}**`);
  }
  if (report.warnings.length === 0) {
    lines.push('- Findings: none (cache-safe)');
  } else {
    lines.push(`- Findings (${report.warnings.length}):`);
    for (const w of report.warnings) {
      lines.push(`  - [${w.severity.toUpperCase()}] \`${w.ruleId}\`: ${w.message}`);
    }
  }
  return lines.join('\n');
}
