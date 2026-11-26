'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const TARGET_BASENAMES = new Set([
  'claude.md',
  'agents.md',
  'skill.md',
  'gemini.md',
  'codex.md',
  '.cursorrules',
  '.windsurfrules',
  '.clinerules',
  'copilot_instructions.md',
  'copilot-instructions.md',
  'mcp.json',
  '.mcp.json',
  'opencode.json',
]);

const TARGET_SUFFIXES = [
  '/.github/copilot-instructions.md',
  '/.claude/settings.json',
];

/**
 * Determine whether a file path is an agent prompt, skill, or MCP config file.
 * @param {string} filePath
 * @param {boolean} [lintAll]
 * @returns {boolean}
 */
function isAgentPromptFile(filePath, lintAll = false) {
  if (!filePath) return false;
  const normalized = filePath.replace(/\\/g, '/').toLowerCase();
  if (lintAll) {
    return normalized.endsWith('.md') || normalized.endsWith('.json');
  }
  const base = path.posix.basename(normalized);
  if (TARGET_BASENAMES.has(base)) return true;
  return TARGET_SUFFIXES.some((suffix) => normalized.endsWith(suffix));
}

async function loadLintCore() {
  const localBundled = path.join(__dirname, 'core', 'promptLint.mjs');
  const repoSource = path.resolve(__dirname, '..', 'src', 'engine', 'promptLint.mjs');
  const target = fs.existsSync(localBundled) ? localBundled : repoSource;
  return import(pathToFileURL(target).href);
}

/**
 * Create a testable controller around the VS Code API and shared promptLint core.
 * @param {typeof import('vscode')} vscode
 * @param {Awaited<ReturnType<typeof loadLintCore>>} core
 */
function createController(vscode, core) {
  const diagnostics = vscode.languages.createDiagnosticCollection('agentcost-lint');
  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Right, 100);
  statusBar.command = 'agentcostlab.inspectCurrentFile';

  function getConfig() {
    const cfg = vscode.workspace.getConfiguration('agentcostlab');
    const modelId = cfg.get('modelId', 'claude-sonnet-5-5');
    const turns = Math.max(1, Number(cfg.get('turns', 24)) || 24);
    const lintAll = Boolean(cfg.get('lintAllMarkdownAndJson', false));
    return {
      model: core.resolveLintModel(modelId),
      turns,
      lintAll,
    };
  }

  function mapSeverity(severity) {
    if (severity === 'high') return vscode.DiagnosticSeverity.Error;
    if (severity === 'medium') return vscode.DiagnosticSeverity.Warning;
    return vscode.DiagnosticSeverity.Information;
  }

  function inspectDocument(document, force = false) {
    if (!document || document.isUntitled) {
      statusBar.hide();
      return null;
    }

    const { model, turns, lintAll } = getConfig();
    const filePath = document.uri?.fsPath || document.fileName || '';
    if (!force && !isAgentPromptFile(filePath, lintAll)) {
      diagnostics.delete(document.uri);
      statusBar.hide();
      return null;
    }

    const report = core.findPromptDiagnosticSpans(document.getText(), turns, model);
    const vsDiagnostics = report.spans.map((span) => {
      const range = new vscode.Range(span.line, span.startCol, span.line, span.endCol);
      const diag = new vscode.Diagnostic(range, span.message, mapSeverity(span.severity));
      diag.source = 'AgentCostLab';
      diag.code = span.ruleId || span.severity;
      return diag;
    });

    diagnostics.set(document.uri, vsDiagnostics);

    const warnBadge = report.warnings.length > 0 ? ` $(warning) ${report.warnings.length}` : '';
    const cachedStr = core.formatUsdCompact(report.costPer1kRunsCached);
    const uncachedStr = core.formatUsdCompact(report.costPer1kRunsUncached);
    statusBar.text = `$(pulse) ${report.estimatedTokens.toLocaleString('en-US')} tok | ${cachedStr}/1k${warnBadge}`;
    statusBar.tooltip = [
      `AgentCostLab (${model.name}, ${turns} turns)`,
      `Estimated static prefix: ${report.estimatedTokens.toLocaleString('en-US')} tokens (${report.charCount} chars)`,
      report.detectedToolCount > 0 ? `Detected MCP/tools: ${report.detectedToolCount}` : null,
      `1,000-run cost: ${cachedStr} cached vs ${uncachedStr} uncached`,
      `Findings: ${report.warnings.length} — click for full breakdown`,
    ]
      .filter(Boolean)
      .join('\n');
    statusBar.show();

    return report;
  }

  async function inspectCurrentFileCommand() {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {
      vscode.window.showInformationMessage('AgentCostLab: Open a file first to inspect its token tax.');
      return null;
    }
    const report = inspectDocument(editor.document, true);
    if (!report) return null;
    const { model, turns } = getConfig();
    const topFinding = report.warnings[0] ? ` Top: [${report.warnings[0].ruleId}] ${report.warnings[0].message}` : '';
    const summary = `AgentCostLab (${model.name}, ${turns}t): ${report.estimatedTokens.toLocaleString('en-US')} tokens | ${core.formatUsdCompact(report.costPer1kRunsCached)}/1k cached vs ${core.formatUsdCompact(report.costPer1kRunsUncached)}/1k uncached | ${report.warnings.length} warning(s)${topFinding}`;
    const choice = await vscode.window.showInformationMessage(summary, 'Switch Model', 'Open Simulator');
    if (choice === 'Switch Model') {
      await selectModelCommand();
    } else if (choice === 'Open Simulator') {
      await openCalculatorCommand();
    }
    return report;
  }

  async function selectModelCommand() {
    const items = Object.values(core.DEFAULT_LINT_MODELS).map((m) => ({
      label: m.name,
      description: `$${m.inputPerM}/M in · $${m.cachedInputPerM}/M cached`,
      modelId: m.id,
    }));
    const picked = await vscode.window.showQuickPick(items, {
      placeHolder: 'Select LLM pricing profile for AgentCostLab token tax estimates',
    });
    if (!picked) return null;
    const cfg = vscode.workspace.getConfiguration('agentcostlab');
    await cfg.update('modelId', picked.modelId, vscode.ConfigurationTarget.Global);
    if (vscode.window.activeTextEditor) {
      inspectDocument(vscode.window.activeTextEditor.document);
    }
    return picked.modelId;
  }

  function openCalculatorCommand() {
    return vscode.env.openExternal(vscode.Uri.parse('https://jettlin927.github.io/agentcostlab/'));
  }

  function refreshActiveEditor() {
    if (vscode.window.activeTextEditor) {
      inspectDocument(vscode.window.activeTextEditor.document);
    } else {
      statusBar.hide();
    }
  }

  return {
    diagnostics,
    statusBar,
    inspectDocument,
    inspectCurrentFileCommand,
    selectModelCommand,
    openCalculatorCommand,
    refreshActiveEditor,
    dispose() {
      diagnostics.dispose();
      statusBar.dispose();
    },
  };
}

/**
 * @param {import('vscode').ExtensionContext} context
 */
async function activate(context) {
  const vscode = require('vscode');
  const core = await loadLintCore();
  const controller = createController(vscode, core);

  context.subscriptions.push(
    controller,
    vscode.commands.registerCommand('agentcostlab.inspectCurrentFile', () =>
      controller.inspectCurrentFileCommand()
    ),
    vscode.commands.registerCommand('agentcostlab.selectModel', () =>
      controller.selectModelCommand()
    ),
    vscode.commands.registerCommand('agentcostlab.openCalculator', () =>
      controller.openCalculatorCommand()
    ),
    vscode.window.onDidChangeActiveTextEditor((editor) => {
      if (editor) controller.inspectDocument(editor.document);
      else controller.statusBar.hide();
    }),
    vscode.workspace.onDidChangeTextDocument((event) => {
      const active = vscode.window.activeTextEditor;
      if (active && event.document === active.document) {
        controller.inspectDocument(event.document);
      }
    }),
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration('agentcostlab')) {
        controller.refreshActiveEditor();
      }
    })
  );

  controller.refreshActiveEditor();
  return controller;
}

function deactivate() {}

module.exports = {
  activate,
  deactivate,
  createController,
  isAgentPromptFile,
};
