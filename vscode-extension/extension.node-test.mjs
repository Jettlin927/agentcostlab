import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import * as core from '../src/engine/promptLint.mjs';
import { packageVsCodeExtension } from './scripts/package.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const { createController, isAgentPromptFile } = require('./extension.cjs');

function createMockVscode(initialModelId = 'claude-sonnet-5-5') {
  const diagnosticStore = new Map();
  let configModelId = initialModelId;
  const infoMessages = [];
  const externalUrls = [];

  const statusBarItem = {
    text: '',
    tooltip: '',
    command: '',
    visible: false,
    show() {
      this.visible = true;
    },
    hide() {
      this.visible = false;
    },
    dispose() {},
  };

  const mockVscode = {
    DiagnosticSeverity: { Error: 0, Warning: 1, Information: 2 },
    StatusBarAlignment: { Left: 1, Right: 2 },
    ConfigurationTarget: { Global: 1 },
    Range: class Range {
      constructor(sl, sc, el, ec) {
        this.start = { line: sl, character: sc };
        this.end = { line: el, character: ec };
      }
    },
    Diagnostic: class Diagnostic {
      constructor(range, message, severity) {
        this.range = range;
        this.message = message;
        this.severity = severity;
      }
    },
    Uri: {
      parse(str) {
        return { toString: () => str, fsPath: str };
      },
    },
    languages: {
      createDiagnosticCollection() {
        return {
          set(uri, list) {
            diagnosticStore.set(uri.fsPath, list);
          },
          delete(uri) {
            diagnosticStore.delete(uri.fsPath);
          },
          dispose() {},
        };
      },
    },
    workspace: {
      getConfiguration() {
        return {
          get(key, fallback) {
            if (key === 'modelId') return configModelId;
            if (key === 'turns') return 24;
            if (key === 'lintAllMarkdownAndJson') return false;
            return fallback;
          },
          async update(key, value) {
            if (key === 'modelId') configModelId = value;
          },
        };
      },
    },
    window: {
      activeTextEditor: null,
      createStatusBarItem() {
        return statusBarItem;
      },
      showInformationMessage(msg) {
        infoMessages.push(msg);
      },
      async showQuickPick(items) {
        return items.find((i) => i.modelId === 'gemini-4-neon');
      },
    },
    env: {
      async openExternal(uri) {
        externalUrls.push(uri.toString());
        return true;
      },
    },
  };

  return { mockVscode, diagnosticStore, statusBarItem, infoMessages, externalUrls };
}

test('isAgentPromptFile matches CLAUDE.md, AGENTS.md, SKILL.md, .cursorrules, and mcp.json', () => {
  assert.equal(isAgentPromptFile('/repo/CLAUDE.md'), true);
  assert.equal(isAgentPromptFile('D:\\proj\\.github\\copilot-instructions.md'), true);
  assert.equal(isAgentPromptFile('/repo/.claude/settings.json'), true);
  assert.equal(isAgentPromptFile('/repo/SKILL.md'), true);
  assert.equal(isAgentPromptFile('/repo/GEMINI.md'), true);
  assert.equal(isAgentPromptFile('/repo/CODEX.md'), true);
  assert.equal(isAgentPromptFile('/repo/.windsurfrules'), true);
  assert.equal(isAgentPromptFile('/repo/.clinerules'), true);
  assert.equal(isAgentPromptFile('/repo/opencode.json'), true);
  assert.equal(isAgentPromptFile('/repo/src/index.ts'), false);
  assert.equal(isAgentPromptFile('/repo/notes.md', true), true);
});

test('controller populates VS Code diagnostics and status bar for CLAUDE.md', async () => {
  const { mockVscode, diagnosticStore, statusBarItem, infoMessages, externalUrls } =
    createMockVscode();
  const controller = createController(mockVscode, core);

  const doc = {
    isUntitled: false,
    uri: { fsPath: '/workspace/CLAUDE.md' },
    getText: () => '# Rules\nInject current_time here.\nKey: sk-1234567890abcdefghij',
  };
  mockVscode.window.activeTextEditor = { document: doc };

  const report = controller.inspectDocument(doc);
  assert.ok(report);
  assert.equal(statusBarItem.visible, true);
  assert.match(statusBarItem.text, /tok \| \$/);
  assert.match(statusBarItem.text, /\$\(warning\) 2/);

  const diags = diagnosticStore.get('/workspace/CLAUDE.md');
  assert.equal(diags.length, 2);
  assert.equal(diags[0].code, 'cache-buster');
  assert.equal(diags[0].range.start.line, 1);
  assert.equal(diags[1].code, 'secret-leak');
  assert.equal(diags[1].range.start.line, 2);

  await controller.selectModelCommand();
  assert.match(statusBarItem.tooltip, /Gemini 4 Neon/);

  await controller.inspectCurrentFileCommand();
  assert.equal(infoMessages.length, 1);
  assert.match(infoMessages[0], /Gemini 4 Neon/);

  await controller.openCalculatorCommand();
  assert.deepEqual(externalUrls, ['https://jettlin927.github.io/agentcostlab/']);
});

test('VS Code extension manifest, icon, privacy policy, and .vsix packager are store-ready', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, 'package.json'), 'utf8'));
  assert.equal(pkg.icon, 'images/icon.png');
  assert.equal(pkg.galleryBanner?.theme, 'dark');
  assert.ok(fs.existsSync(path.join(__dirname, pkg.icon)));
  assert.ok(fs.existsSync(path.join(__dirname, 'PRIVACY.md')));

  const vsixResult = packageVsCodeExtension();
  assert.ok(fs.existsSync(vsixResult.outPath));
  assert.ok(vsixResult.fileCount >= 9);
  assert.ok(vsixResult.byteLength > 2000);
});
