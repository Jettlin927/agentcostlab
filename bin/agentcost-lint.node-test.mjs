import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { parseCliArgs, runCli } from './agentcost-lint.mjs';

const tempDirs = [];

function createTempDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'agentcost-lint-'));
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

describe('agentcost-lint CLI', () => {
  it('auto-discovers standard agent files and writes GitHub outputs + step summary', () => {
    const dir = createTempDir();
    fs.writeFileSync(path.join(dir, 'AGENTS.md'), '# Repo Guidelines\nKeep responses concise.\n', 'utf8');
    fs.writeFileSync(
      path.join(dir, 'mcp.json'),
      JSON.stringify({ mcpServers: { docs: { command: 'npx' } } }),
      'utf8'
    );
    const summaryPath = path.join(dir, 'summary.md');
    const outputPath = path.join(dir, 'github_output.txt');

    const res = runCli(['--model', 'gemini-4-neon', '--turns', '20', '--fail-on-high'], {
      cwd: dir,
      env: {
        GITHUB_ACTIONS: 'true',
        GITHUB_STEP_SUMMARY: summaryPath,
        GITHUB_OUTPUT: outputPath,
      },
    });

    assert.equal(res.exitCode, 0);
    assert.match(res.stdout, /Gemini 4 Neon/);
    assert.match(fs.readFileSync(summaryPath, 'utf8'), /AgentCostLab Prompt & MCP Token Tax Report/);
    const ghOutput = fs.readFileSync(outputPath, 'utf8');
    assert.match(ghOutput, /total-tokens=/);
    assert.match(ghOutput, /high-warnings=0/);
  });

  it('returns exitCode 1 when --fail-on-high catches a cache-buster', () => {
    const dir = createTempDir();
    fs.writeFileSync(path.join(dir, 'CLAUDE.md'), 'Always inject current_time before answering.', 'utf8');

    const res = runCli(['CLAUDE.md', '--fail-on-high', '--format', 'json'], { cwd: dir, env: {} });
    assert.equal(res.exitCode, 1);
    const parsed = JSON.parse(res.stdout);
    assert.equal(parsed.passed, false);
    assert.equal(parsed.totals.highWarnings, 1);
  });

  it('parses CLI flags cleanly', () => {
    const parsed = parseCliArgs(
      ['AGENTS.md', '--model', 'gpt-6-2-sol', '--turns', '30', '--max-tokens', '4000', '--fail-on-high'],
      {}
    );
    assert.deepEqual(parsed.paths, ['AGENTS.md']);
    assert.equal(parsed.modelId, 'gpt-6-2-sol');
    assert.equal(parsed.turns, 30);
    assert.equal(parsed.maxTokens, 4000);
    assert.equal(parsed.failOnHigh, true);
    assert.equal(parsed.format, 'text');
  });
});
