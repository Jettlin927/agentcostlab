#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  DEFAULT_LINT_MODELS,
  DEFAULT_TARGET_FILES,
  formatLintOutput,
  renderMarkdownSummary,
  renderSarifReport,
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
  --format <fmt>       Output format: text | json | github | sarif (default: auto)
  --sarif-file <p>     Write SARIF 2.1.0 report to file (for GitHub Code Scanning)
  --summary-file <p>   Append Markdown summary table to file (or GITHUB_STEP_SUMMARY)
  --mcp                Start zero-dependency stdio MCP server (for Claude Code / Cursor / Codex)
  --list-models        Print built-in model IDs and exit
  -h, --help           Show this help message
  -v, --version        Print version

If no paths are given, scans standard agent files in cwd:
  ${DEFAULT_TARGET_FILES.join(', ')}
`;

const MCP_PROTOCOL_VERSION = '2025-06-18';

export const MCP_TOOLS = [
  {
    name: 'lint_prompt_text',
    description:
      'Audit raw CLAUDE.md, AGENTS.md, SKILL.md, .cursorrules, or mcp.json content for token tax, 1,000-run cached vs uncached USD cost, prompt cache-busters, leaked API keys, and exact line/column spans.',
    inputSchema: {
      type: 'object',
      properties: {
        content: { type: 'string', description: 'Raw prompt, rules, or MCP config file text' },
        path: { type: 'string', description: 'Logical file path (default: CLAUDE.md)', default: 'CLAUDE.md' },
        modelId: { type: 'string', description: 'Built-in model profile ID', default: 'claude-sonnet-5-5' },
        turns: { type: 'number', description: 'Simulated multi-turn loop turns (default: 24)', default: 24 },
        maxTokens: { type: 'number', description: 'Optional token ceiling' },
        failOnHigh: { type: 'boolean', default: true },
        failOnMedium: { type: 'boolean', default: false },
      },
      required: ['content'],
    },
  },
  {
    name: 'lint_workspace_prompts',
    description:
      'Scan standard agent instruction and MCP config files (CLAUDE.md, AGENTS.md, .cursorrules, mcp.json, .mcp.json) in a workspace directory for token tax, cache-busters, and leaked secrets.',
    inputSchema: {
      type: 'object',
      properties: {
        cwd: { type: 'string', description: 'Workspace directory path (defaults to server cwd)' },
        paths: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional relative file or directory paths to scan',
        },
        modelId: { type: 'string', default: 'claude-sonnet-5-5' },
        turns: { type: 'number', default: 24 },
        maxTokens: { type: 'number' },
        failOnHigh: { type: 'boolean', default: true },
        failOnMedium: { type: 'boolean', default: false },
      },
    },
  },
  {
    name: 'list_lint_models',
    description:
      'List all built-in Nov 2026 LLM pricing profiles supported by agentcost-lint (input, cached input, and cache-write multipliers).',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
];

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
    sarifFile: undefined,
    summaryFile: env.GITHUB_STEP_SUMMARY || undefined,
    mcp: false,
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
    } else if (arg === '--mcp') {
      opts.mcp = true;
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
      if (fmt === 'text' || fmt === 'json' || fmt === 'github' || fmt === 'sarif') {
        opts.format = fmt;
      } else {
        throw new Error(`Unsupported --format "${fmt}". Expected text, json, github, or sarif.`);
      }
    } else if (arg === '--sarif-file' && i + 1 < argv.length) {
      opts.sarifFile = argv[++i];
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
function writeGithubOutputs(outputFile, report, sarifFile) {
  if (!outputFile) return;
  const lines = [
    `total-tokens=${report.totals.estimatedTokens}`,
    `high-warnings=${report.totals.highWarnings}`,
    `medium-warnings=${report.totals.mediumWarnings}`,
    `cost-1k-cached-usd=${report.totals.costPer1kRunsCached.toFixed(4)}`,
    `cost-1k-uncached-usd=${report.totals.costPer1kRunsUncached.toFixed(4)}`,
  ];
  if (sarifFile) {
    lines.push(`sarif-file=${sarifFile}`);
  }
  fs.appendFileSync(outputFile, lines.join('\n') + '\n', 'utf8');
}

function writeSarifFile(cwd, sarifFile, report) {
  if (!sarifFile) return;
  const abs = path.resolve(cwd, sarifFile);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, JSON.stringify(renderSarifReport(report, CLI_VERSION), null, 2) + '\n', 'utf8');
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
    const emptyReport = runLintBatch([], opts);
    writeSarifFile(cwd, opts.sarifFile, emptyReport);
    writeGithubOutputs(env.GITHUB_OUTPUT, emptyReport, opts.sarifFile);
    if (opts.format === 'json') {
      return { exitCode: 0, stdout: JSON.stringify(emptyReport, null, 2), stderr: '' };
    }
    if (opts.format === 'sarif') {
      return { exitCode: 0, stdout: JSON.stringify(renderSarifReport(emptyReport, CLI_VERSION), null, 2), stderr: '' };
    }
    return {
      exitCode: 0,
      stdout:
        'No agent prompt or MCP config files found (checked CLAUDE.md, AGENTS.md, .cursorrules, mcp.json, .mcp.json).',
      stderr: '',
    };
  }

  const report = runLintBatch(files, opts);
  const stdout =
    opts.format === 'sarif'
      ? JSON.stringify(renderSarifReport(report, CLI_VERSION), null, 2)
      : formatLintOutput(report, opts.format);

  writeSarifFile(cwd, opts.sarifFile, report);
  if (opts.summaryFile) {
    fs.appendFileSync(opts.summaryFile, renderMarkdownSummary(report) + '\n', 'utf8');
  }
  writeGithubOutputs(env.GITHUB_OUTPUT, report, opts.sarifFile);

  return {
    exitCode: report.passed ? 0 : 1,
    stdout,
    stderr: '',
  };
}

function mcpToolResult(payload, isError = false) {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
    isError,
  };
}

function executeMcpToolCall(name, args = {}, ctx = {}) {
  if (name === 'list_lint_models') {
    return mcpToolResult({
      count: Object.keys(DEFAULT_LINT_MODELS).length,
      models: Object.values(DEFAULT_LINT_MODELS),
      simulatorUrl: 'https://jettlin927.github.io/agentcostlab/',
    });
  }

  if (name === 'lint_prompt_text') {
    if (typeof args.content !== 'string') {
      return mcpToolResult({ error: 'Missing required string parameter: content' }, true);
    }
    const report = runLintBatch(
      [{ path: typeof args.path === 'string' && args.path ? args.path : 'CLAUDE.md', content: args.content }],
      {
        modelId: typeof args.modelId === 'string' ? args.modelId : 'claude-sonnet-5-5',
        turns: typeof args.turns === 'number' ? args.turns : 24,
        maxTokens: typeof args.maxTokens === 'number' ? args.maxTokens : undefined,
        failOnHigh: args.failOnHigh !== false,
        failOnMedium: Boolean(args.failOnMedium),
      }
    );
    return mcpToolResult({
      ...report,
      markdownSummary: renderMarkdownSummary(report),
      simulatorUrl: 'https://jettlin927.github.io/agentcostlab/',
    });
  }

  if (name === 'lint_workspace_prompts') {
    const cwd = typeof args.cwd === 'string' && args.cwd ? path.resolve(args.cwd) : ctx.cwd || process.cwd();
    const inputPaths = Array.isArray(args.paths) ? args.paths.filter((p) => typeof p === 'string') : [];
    const files = loadTargetFiles(inputPaths, cwd);
    const report = runLintBatch(files, {
      modelId: typeof args.modelId === 'string' ? args.modelId : 'claude-sonnet-5-5',
      turns: typeof args.turns === 'number' ? args.turns : 24,
      maxTokens: typeof args.maxTokens === 'number' ? args.maxTokens : undefined,
      failOnHigh: args.failOnHigh !== false,
      failOnMedium: Boolean(args.failOnMedium),
    });
    return mcpToolResult({
      cwd,
      ...report,
      markdownSummary: files.length > 0 ? renderMarkdownSummary(report) : 'No default prompt or MCP files found.',
      simulatorUrl: 'https://jettlin927.github.io/agentcostlab/',
    });
  }

  return null;
}

/**
 * Process a single JSON-RPC 2.0 MCP message and return a response object (or null for notifications).
 * @param {any} msg
 * @param {{ cwd?: string }} [ctx]
 */
export function handleMcpMessage(msg, ctx = {}) {
  if (!msg || typeof msg !== 'object') {
    return { jsonrpc: '2.0', id: null, error: { code: -32600, message: 'Invalid JSON-RPC request' } };
  }

  const hasId = Object.prototype.hasOwnProperty.call(msg, 'id') && msg.id !== undefined;
  const method = msg.method;

  if (typeof method !== 'string') {
    return hasId
      ? { jsonrpc: '2.0', id: msg.id, error: { code: -32600, message: 'Missing JSON-RPC method' } }
      : null;
  }

  if (!hasId || method.startsWith('notifications/')) {
    return null;
  }

  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id: msg.id,
      result: {
        protocolVersion: MCP_PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: { name: 'agentcost-lint', version: CLI_VERSION },
      },
    };
  }

  if (method === 'ping') {
    return { jsonrpc: '2.0', id: msg.id, result: {} };
  }

  if (method === 'tools/list') {
    return { jsonrpc: '2.0', id: msg.id, result: { tools: MCP_TOOLS } };
  }

  if (method === 'tools/call') {
    const params = msg.params && typeof msg.params === 'object' ? msg.params : {};
    try {
      const result = executeMcpToolCall(params.name, params.arguments || {}, ctx);
      if (!result) {
        return {
          jsonrpc: '2.0',
          id: msg.id,
          error: { code: -32602, message: `Unknown tool: ${String(params.name || '')}` },
        };
      }
      return { jsonrpc: '2.0', id: msg.id, result };
    } catch (err) {
      return {
        jsonrpc: '2.0',
        id: msg.id,
        result: mcpToolResult({ error: err instanceof Error ? err.message : String(err) }, true),
      };
    }
  }

  return {
    jsonrpc: '2.0',
    id: msg.id,
    error: { code: -32601, message: `Method not found: ${method}` },
  };
}

/**
 * Run newline-delimited JSON-RPC 2.0 MCP server over stdin/stdout.
 * @param {{ stdin?: NodeJS.ReadableStream, stdout?: NodeJS.WritableStream, cwd?: string }} [ctx]
 */
export function startMcpStdioServer(ctx = {}) {
  const stdin = ctx.stdin || process.stdin;
  const stdout = ctx.stdout || process.stdout;
  let buffer = '';

  stdin.setEncoding('utf8');
  stdin.on('data', (chunk) => {
    buffer += chunk;
    let idx;
    while ((idx = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, idx).trim();
      buffer = buffer.slice(idx + 1);
      if (!line) continue;
      let response;
      try {
        response = handleMcpMessage(JSON.parse(line), ctx);
      } catch {
        response = { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } };
      }
      if (response) {
        stdout.write(JSON.stringify(response) + '\n');
      }
    }
  });
  stdin.resume();
}

function isInvokedAsMain() {
  if (!process.argv[1]) return false;
  try {
    return import.meta.url === pathToFileURL(fs.realpathSync(path.resolve(process.argv[1]))).href;
  } catch {
    return import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
  }
}

const isMain = isInvokedAsMain();

if (isMain) {
  try {
    const argv = process.argv.slice(2);
    const opts = parseCliArgs(argv);
    if (opts.mcp && !opts.help && !opts.version && !opts.listModels) {
      startMcpStdioServer();
    } else {
      const result = runCli(argv);
      if (result.stdout) console.log(result.stdout);
      if (result.stderr) console.error(result.stderr);
      process.exitCode = result.exitCode;
    }
  } catch (err) {
    console.error(`agentcost-lint error: ${err instanceof Error ? err.message : String(err)}`);
    process.exitCode = 2;
  }
}
