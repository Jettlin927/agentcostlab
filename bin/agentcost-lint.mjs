#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  DEFAULT_LINT_MODELS,
  DEFAULT_TARGET_FILES,
  formatLintOutput,
  renderMarkdownSummary,
  runLintBatch,
} from '../src/engine/promptLint.mjs';

const CLI_VERSION = '1.0.0';

const HELP_TEXT = `agentcost-lint v${CLI_VERSION} — Static Token Tax, Cache-Buster & Secret Leak Linter

Usage:
  agentcost-lint [paths...] [options]

Options:
  --model <id>         Model pricing profile (default: claude-sonnet-5-5)
  --turns <n>          Simulated agent loop turns (default: 24)
  --max-tokens <n>     Fail (exit 1) if total static prefix exceeds <n> tokens
  --fail-on-high       Fail (exit 1) on high-severity findings (cache-busters, leaked keys)
  --fail-on-medium     Fail (exit 1) on medium-severity findings (heavy prefix, bad JSON)
  --format <fmt>       Output format: text | json | github (default: auto)
  --summary-file <p>   Append Markdown summary table to file (or GITHUB_STEP_SUMMARY)
  --list-models        Print built-in model IDs and exit
  -h, --help           Show this help message
  -v, --version        Print version

If no paths are given, scans standard agent files in cwd:
  ${DEFAULT_TARGET_FILES.join(', ')}
`;

/**
 * Parse CLI arguments into structured lint options.
 * @param {string[]} argv
 * @param {Record<string, string | undefined>} [env]
 */
export function parseCliArgs(argv, env = process.env) {
  const opts = {
    paths: [],
    modelId: 'claude-sonnet-5-5',
    turns: 24,
    maxTokens: undefined,
    failOnHigh: false,
    failOnMedium: false,
    format: env.GITHUB_ACTIONS === 'true' ? 'github' : 'text',
    summaryFile: env.GITHUB_STEP_SUMMARY || undefined,
    help: false,
    version: false,
    listModels: false,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '-h' || arg === '--help') {
      opts.help = true;
    } else if (arg === '-v' || arg === '--version') {
      opts.version = true;
    } else if (arg === '--list-models') {
      opts.listModels = true;
    } else if (arg === '--fail-on-high') {
      opts.failOnHigh = true;
    } else if (arg === '--fail-on-medium') {
      opts.failOnMedium = true;
    } else if (arg === '--model' && i + 1 < argv.length) {
      opts.modelId = argv[++i];
    } else if (arg === '--turns' && i + 1 < argv.length) {
      opts.turns = Number(argv[++i]);
    } else if (arg === '--max-tokens' && i + 1 < argv.length) {
      opts.maxTokens = Number(argv[++i]);
    } else if (arg === '--format' && i + 1 < argv.length) {
      const fmt = argv[++i];
      if (fmt === 'text' || fmt === 'json' || fmt === 'github') {
        opts.format = fmt;
      } else {
        throw new Error(`Unsupported --format "${fmt}". Expected text, json, or github.`);
      }
    } else if (arg === '--summary-file' && i + 1 < argv.length) {
      opts.summaryFile = argv[++i];
    } else if (arg.startsWith('-')) {
      throw new Error(`Unknown flag: ${arg}`);
    } else {
      opts.paths.push(arg);
    }
  }

  return opts;
}

/**
 * Resolve explicit file/directory paths or discover default agent files in cwd.
 * @param {string[]} inputPaths
 * @param {string} [cwd]
 * @returns {Array<{ path: string, content: string }>}
 */
export function loadTargetFiles(inputPaths, cwd = process.cwd()) {
  const candidates = [];

  if (inputPaths.length === 0) {
    for (const rel of DEFAULT_TARGET_FILES) {
      const abs = path.resolve(cwd, rel);
      if (fs.existsSync(abs) && fs.statSync(abs).isFile()) {
        candidates.push({ rel, abs });
      }
    }
  } else {
    for (const raw of inputPaths) {
      const abs = path.resolve(cwd, raw);
      if (!fs.existsSync(abs)) {
        throw new Error(`Target path not found: ${raw}`);
      }
      const stat = fs.statSync(abs);
      if (stat.isFile()) {
        candidates.push({ rel: path.relative(cwd, abs) || path.basename(abs), abs });
      } else if (stat.isDirectory()) {
        for (const rel of DEFAULT_TARGET_FILES) {
          const nested = path.join(abs, rel);
          if (fs.existsSync(nested) && fs.statSync(nested).isFile()) {
            candidates.push({ rel: path.relative(cwd, nested), abs: nested });
          }
        }
      }
    }
  }

  return candidates.map(({ rel, abs }) => ({
    path: rel.replace(/\\/g, '/'),
    content: fs.readFileSync(abs, 'utf8'),
  }));
}

/**
 * Write GitHub Actions outputs when GITHUB_OUTPUT is provided.
 * @param {string | undefined} outputFile
 * @param {ReturnType<typeof runLintBatch>} report
 */
function writeGithubOutputs(outputFile, report) {
  if (!outputFile) return;
  const lines = [
    `total-tokens=${report.totals.estimatedTokens}`,
    `high-warnings=${report.totals.highWarnings}`,
    `medium-warnings=${report.totals.mediumWarnings}`,
    `cost-1k-cached-usd=${report.totals.costPer1kRunsCached.toFixed(4)}`,
    `cost-1k-uncached-usd=${report.totals.costPer1kRunsUncached.toFixed(4)}`,
  ];
  fs.appendFileSync(outputFile, lines.join('\n') + '\n', 'utf8');
}

/**
 * Execute the CLI pipeline and return exit code + stdout/stderr strings.
 * @param {string[]} argv
 * @param {{ cwd?: string, env?: Record<string, string | undefined> }} [ctx]
 */
export function runCli(argv, ctx = {}) {
  const cwd = ctx.cwd || process.cwd();
  const env = ctx.env || process.env;
  const opts = parseCliArgs(argv, env);

  if (opts.help) {
    return { exitCode: 0, stdout: HELP_TEXT, stderr: '' };
  }
  if (opts.version) {
    return { exitCode: 0, stdout: CLI_VERSION, stderr: '' };
  }
  if (opts.listModels) {
    return { exitCode: 0, stdout: Object.keys(DEFAULT_LINT_MODELS).join('\n'), stderr: '' };
  }

  const files = loadTargetFiles(opts.paths, cwd);
  if (files.length === 0) {
    const msg =
      'No agent prompt or MCP config files found (checked CLAUDE.md, AGENTS.md, .cursorrules, mcp.json, .mcp.json).';
    if (opts.format === 'json') {
      const emptyReport = runLintBatch([], opts);
      return { exitCode: 0, stdout: JSON.stringify(emptyReport, null, 2), stderr: '' };
    }
    return { exitCode: 0, stdout: msg, stderr: '' };
  }

  const report = runLintBatch(files, opts);
  const stdout = formatLintOutput(report, opts.format);

  if (opts.summaryFile) {
    fs.appendFileSync(opts.summaryFile, renderMarkdownSummary(report) + '\n', 'utf8');
  }
  writeGithubOutputs(env.GITHUB_OUTPUT, report);

  return {
    exitCode: report.passed ? 0 : 1,
    stdout,
    stderr: '',
  };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMain) {
  try {
    const result = runCli(process.argv.slice(2));
    if (result.stdout) console.log(result.stdout);
    if (result.stderr) console.error(result.stderr);
    process.exitCode = result.exitCode;
  } catch (err) {
    console.error(`agentcost-lint error: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 2;
  }
}
