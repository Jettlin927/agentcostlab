import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..', '..');
const pkgBin = path.join(__dirname, 'bin', 'agentcost-lint.mjs');

const tempDirs = [];

function createTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentcost-lint-pkg-'));
  tempDirs.push(dir);
  return dir;
}

afterEach(() => {
  while (tempDirs.length > 0) {
    const dir = tempDirs.pop();
    if (dir && fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
});

describe('npm package agentcost-lint', () => {
  it('stays in exact byte parity with root CLI and promptLint engine', () => {
    const pairs = [
      ['bin/agentcost-lint.mjs', 'bin/agentcost-lint.mjs'],
      ['src/engine/promptLint.mjs', 'src/engine/promptLint.mjs'],
      ['src/engine/promptLint.d.mts', 'src/engine/promptLint.d.mts'],
      ['LICENSE', 'LICENSE'],
    ];
    for (const [rootRel, pkgRel] of pairs) {
      assert.equal(
        fs.readFileSync(path.join(__dirname, pkgRel), 'utf8'),
        fs.readFileSync(path.join(repoRoot, rootRel), 'utf8'),
        `${pkgRel} out of sync with ${rootRel}`
      );
    }
  });

  it('executes cleanly as a standalone package CLI with SARIF and exit codes', () => {
    const version = execFileSync(process.execPath, [pkgBin, '--version'], { encoding: 'utf8' }).trim();
    assert.equal(version, '1.0.0');

    const models = execFileSync(process.execPath, [pkgBin, '--list-models'], { encoding: 'utf8' })
      .trim()
      .split(/\r?\n/);
    assert.ok(models.length >= 22);
    assert.ok(models.includes('claude-sonnet-5-5'));
    assert.ok(models.includes('gemini-4-neon'));
    assert.ok(models.includes('mistral-large-4'));
    assert.ok(models.includes('mistral-small-4'));

    const dir = createTempDir();
    fs.writeFileSync(path.join(dir, 'AGENTS.md'), '# Clean Agent\nKeep responses concise.\n', 'utf8');
    const sarifOut = execFileSync(
      process.execPath,
      [pkgBin, 'AGENTS.md', '--model', 'claude-sonnet-5-5', '--format', 'sarif'],
      { cwd: dir, encoding: 'utf8' }
    );
    const sarif = JSON.parse(sarifOut);
    assert.equal(sarif.version, '2.1.0');
    assert.equal(sarif.runs[0].results.length, 0);

    const mcpInput = [
      JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} }),
      JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
      JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list' }),
      JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'tools/call',
        params: { name: 'list_lint_models', arguments: {} },
      }),
    ].join('\n') + '\n';

    const mcpOut = execFileSync(process.execPath, [pkgBin, '--mcp'], {
      input: mcpInput,
      encoding: 'utf8',
    });
    const responses = mcpOut
      .trim()
      .split(/\r?\n/)
      .map((line) => JSON.parse(line));
    assert.equal(responses.length, 3);
    assert.equal(responses[0].result.serverInfo.name, 'agentcost-lint');
    assert.equal(responses[1].result.tools.length, 3);
    const modelsPayload = JSON.parse(responses[2].result.content[0].text);
    assert.ok(modelsPayload.count >= 22);
    assert.ok(modelsPayload.models.some((m) => m.id === 'mistral-large-4'));
  });
});
