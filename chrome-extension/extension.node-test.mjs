import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { DEFAULT_LINT_MODELS } from '../src/engine/promptLint.mjs';
import {
  analyzePromptForExtension,
  extractGitHubRawText,
  formatLintReportMarkdown,
  getAvailableLintModels,
  isTargetGitHubBlobUrl,
} from './analyzer.mjs';
import { packageChromeExtension } from './scripts/package.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

test('manifest.json is valid Manifest V3 with minimal permissions, icons, and privacy policy', () => {
  const manifestPath = path.join(__dirname, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

  assert.equal(manifest.manifest_version, 3);
  assert.equal(manifest.action.default_popup, 'popup.html');
  assert.deepEqual(manifest.permissions, ['activeTab', 'storage']);
  assert.ok(manifest.web_accessible_resources[0].resources.includes('core/promptLint.mjs'));
  assert.ok(manifest.web_accessible_resources[0].resources.includes('analyzer.mjs'));
  for (const sz of ['16', '32', '48', '128']) {
    assert.ok(manifest.icons?.[sz], `missing manifest icon ${sz}`);
    assert.ok(fs.existsSync(path.join(__dirname, manifest.icons[sz])), `missing icon file ${manifest.icons[sz]}`);
  }
  assert.ok(fs.existsSync(path.join(__dirname, 'PRIVACY.md')));
  const popupHtml = fs.readFileSync(path.join(__dirname, 'popup.html'), 'utf8');
  assert.match(popupHtml, /id="loadSampleBtn"/);
  assert.match(popupHtml, /id="copyReportBtn"/);
});

test('isTargetGitHubBlobUrl detects agent prompt and MCP config URLs on GitHub', () => {
  assert.equal(isTargetGitHubBlobUrl('https://github.com/Jettlin927/agentcostlab/blob/main/CLAUDE.md'), true);
  assert.equal(isTargetGitHubBlobUrl('https://github.com/org/repo/blob/main/packages/a/AGENTS.md?plain=1'), true);
  assert.equal(isTargetGitHubBlobUrl('https://github.com/org/repo/blob/main/.github/copilot-instructions.md'), true);
  assert.equal(isTargetGitHubBlobUrl('https://github.com/org/repo/blob/main/.claude/settings.json'), true);
  assert.equal(isTargetGitHubBlobUrl('https://github.com/org/repo/blob/main/GEMINI.md'), true);
  assert.equal(isTargetGitHubBlobUrl('https://github.com/org/repo/blob/main/CODEX.md'), true);
  assert.equal(isTargetGitHubBlobUrl('https://github.com/org/repo/blob/main/.windsurfrules'), true);
  assert.equal(isTargetGitHubBlobUrl('https://github.com/org/repo/blob/main/.clinerules'), true);
  assert.equal(isTargetGitHubBlobUrl('https://github.com/org/repo/blob/main/opencode.json'), true);
  assert.equal(isTargetGitHubBlobUrl('https://github.com/org/repo/blob/main/mcp.json'), true);
  assert.equal(isTargetGitHubBlobUrl('https://github.com/org/repo/blob/main/src/index.ts'), false);
  assert.equal(isTargetGitHubBlobUrl('https://gitlab.com/org/repo/blob/main/CLAUDE.md'), false);
  assert.equal(isTargetGitHubBlobUrl('not-a-url'), false);
});

test('extractGitHubRawText extracts content from GitHub textarea or line elements', () => {
  const textareaDoc = {
    querySelector(sel) {
      if (sel === 'textarea#read-only-cursor-text-area') {
        return { value: '# Agent Rules\nUse cached prefix.' };
      }
      return null;
    },
  };
  assert.equal(extractGitHubRawText(textareaDoc), '# Agent Rules\nUse cached prefix.');

  const linesDoc = {
    querySelector: () => null,
    querySelectorAll(sel) {
      if (sel === '.react-file-line, .blob-code-inner') {
        return [{ textContent: '{' }, { textContent: '  "mcpServers": {}' }, { textContent: '}' }];
      }
      return [];
    },
  };
  assert.equal(extractGitHubRawText(linesDoc), '{\n  "mcpServers": {}\n}');
});

test('analyzePromptForExtension detects cache-busters, secret leaks, and formats costs', () => {
  const report = analyzePromptForExtension(
    '# Rules\nAlways inject current_time.\nAPI: sk-1234567890abcdefghij',
    { modelId: 'gemini-4-neon', turns: 24 }
  );

  assert.equal(report.model.id, 'gemini-4-neon');
  assert.equal(report.turns, 24);
  assert.ok(report.estimatedTokens > 0);
  assert.ok(report.costPer1kRunsCached < report.costPer1kRunsUncached);
  assert.ok(report.savingsPct > 0);
  assert.match(report.cachedFormatted, /^\$/);
  assert.deepEqual(
    report.warnings.map((w) => w.ruleId),
    ['cache-buster', 'secret-leak']
  );
});

test('getAvailableLintModels stays in sync with DEFAULT_LINT_MODELS', () => {
  const models = getAvailableLintModels();
  assert.equal(models.length, Object.keys(DEFAULT_LINT_MODELS).length);
});

test('formatLintReportMarkdown and Chrome zip packager produce valid store bundle', () => {
  const report = analyzePromptForExtension('# Rules\nInject current_time.', {
    modelId: 'claude-sonnet-5-5',
    turns: 24,
  });
  const md = formatLintReportMarkdown(report);
  assert.match(md, /AgentCostLab Lint/);
  assert.match(md, /cache-buster/);

  const pkgResult = packageChromeExtension();
  assert.ok(fs.existsSync(pkgResult.outPath));
  assert.ok(pkgResult.fileCount >= 11);
  assert.ok(pkgResult.byteLength > 2000);
});
