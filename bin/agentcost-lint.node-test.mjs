import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, describe, it } from 'node:test';
import { handleMcpMessage, MCP_TOOLS, parseCliArgs, runCli } from './agentcost-lint.mjs';

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
      [
        'AGENTS.md',
        '--model',
        'gpt-6-2-sol',
        '--turns',
        '30',
        '--max-tokens',
        '4000',
        '--fail-on-high',
        '--format',
        'sarif',
        '--sarif-file',
        'reports/agentcost.sarif',
      ],
      {}
    );
    assert.deepEqual(parsed.paths, ['AGENTS.md']);
    assert.equal(parsed.modelId, 'gpt-6-2-sol');
    assert.equal(parsed.turns, 30);
    assert.equal(parsed.maxTokens, 4000);
    assert.equal(parsed.failOnHigh, true);
    assert.equal(parsed.format, 'sarif');
    assert.equal(parsed.sarifFile, 'reports/agentcost.sarif');
  });

  it('writes valid SARIF 2.1.0 diagnostics via --sarif-file with line and column locations', () => {
    const dir = createTempDir();
    fs.writeFileSync(
      path.join(dir, 'CLAUDE.md'),
      '# Instructions\nInject current_time and backup sk-1234567890abcdefghij\n',
      'utf8'
    );
    const outputPath = path.join(dir, 'github_output.txt');

    const res = runCli(
      ['CLAUDE.md', '--fail-on-high', '--format', 'github', '--sarif-file', 'out/agentcost.sarif'],
      {
        cwd: dir,
        env: { GITHUB_OUTPUT: outputPath },
      }
    );

    assert.equal(res.exitCode, 1);
    assert.match(res.stdout, /::error file=CLAUDE\.md,line=2,col=8,title=agentcost-lint \(cache-buster\)::/);
    assert.match(res.stdout, /::error file=CLAUDE\.md,line=2,col=32,title=agentcost-lint \(secret-leak\)::/);

    const sarif = JSON.parse(fs.readFileSync(path.join(dir, 'out/agentcost.sarif'), 'utf8'));
    assert.equal(sarif.version, '2.1.0');
    assert.equal(sarif.runs[0].tool.driver.name, 'agentcost-lint');
    assert.equal(sarif.runs[0].results.length, 2);
    assert.equal(sarif.runs[0].results[0].ruleId, 'cache-buster');
    assert.equal(sarif.runs[0].results[0].locations[0].physicalLocation.region.startLine, 2);
    assert.equal(sarif.runs[0].results[0].locations[0].physicalLocation.region.startColumn, 8);
    assert.equal(sarif.runs[0].results[1].ruleId, 'secret-leak');
    assert.match(fs.readFileSync(outputPath, 'utf8'), /sarif-file=out\/agentcost\.sarif/);
  });

  it('handles stdio MCP JSON-RPC initialize, tools/list, and tools/call cleanly', () => {
    assert.equal(parseCliArgs(['--mcp'], {}).mcp, true);
    assert.equal(MCP_TOOLS.length, 3);

    const init = handleMcpMessage({ jsonrpc: '2.0', id: 1, method: 'initialize', params: {} });
    assert.equal(init?.result?.serverInfo?.name, 'agentcost-lint');

    assert.equal(handleMcpMessage({ jsonrpc: '2.0', method: 'notifications/initialized' }), null);

    const list = handleMcpMessage({ jsonrpc: '2.0', id: 2, method: 'tools/list' });
    assert.deepEqual(
      list?.result?.tools.map((t) => t.name),
      ['lint_prompt_text', 'lint_workspace_prompts', 'list_lint_models']
    );

    const callText = handleMcpMessage({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'lint_prompt_text',
        arguments: {
          content: 'Inject current_time into system prompt.',
          path: 'CLAUDE.md',
          modelId: 'claude-sonnet-5-5',
          turns: 20,
        },
      },
    });
    assert.equal(callText?.result?.isError, false);
    const payload = JSON.parse(callText?.result?.content[0].text);
    assert.equal(payload.passed, false);
    assert.equal(payload.totals.highWarnings, 1);

    const dir = createTempDir();
    fs.writeFileSync(path.join(dir, 'AGENTS.md'), '# Clean Agent\nUse concise tools.\n', 'utf8');
    const callWorkspace = handleMcpMessage(
      {
        jsonrpc: '2.0',
        id: 4,
        method: 'tools/call',
        params: { name: 'lint_workspace_prompts', arguments: { cwd: dir, modelId: 'qwen4-max' } },
      },
      { cwd: dir }
    );
    const wsPayload = JSON.parse(callWorkspace?.result?.content[0].text);
    assert.equal(wsPayload.totals.files, 1);
    assert.equal(wsPayload.passed, true);

    const callModels = handleMcpMessage({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: { name: 'list_lint_models', arguments: {} },
    });
    const modelsPayload = JSON.parse(callModels?.result?.content[0].text);
    assert.ok(modelsPayload.count >= 22);
    assert.ok(modelsPayload.models.some((m) => m.id === 'mistral-large-4'));
    assert.ok(modelsPayload.models.some((m) => m.id === 'mistral-small-4'));

    const unknownTool = handleMcpMessage({
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: { name: 'nope', arguments: {} },
    });
    assert.equal(unknownTool?.error?.code, -32602);
  });
});
