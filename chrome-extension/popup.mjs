import { analyzePromptForExtension, getAvailableLintModels } from './analyzer.mjs';

const modelSelect = document.getElementById('modelSelect');
const turnsInput = document.getElementById('turnsInput');
const promptInput = document.getElementById('promptInput');
const tokensVal = document.getElementById('tokensVal');
const cachedVal = document.getElementById('cachedVal');
const uncachedVal = document.getElementById('uncachedVal');
const savingsNote = document.getElementById('savingsNote');
const issuesList = document.getElementById('issuesList');
const sourceNote = document.getElementById('sourceNote');

function populateModels() {
  const models = getAvailableLintModels();
  for (const model of models) {
    const opt = document.createElement('option');
    opt.value = model.id;
    opt.textContent = model.name;
    modelSelect.appendChild(opt);
  }
}

function renderReport() {
  const report = analyzePromptForExtension(promptInput.value, {
    modelId: modelSelect.value,
    turns: Number(turnsInput.value) || 24,
  });

  tokensVal.textContent = report.estimatedTokens.toLocaleString('en-US');
  cachedVal.textContent = report.cachedFormatted;
  uncachedVal.textContent = report.uncachedFormatted;
  savingsNote.textContent = `Cache savings: ${report.savingsPct}% (${report.turns} turns)`;

  issuesList.replaceChildren();
  if (!promptInput.value.trim()) {
    const empty = document.createElement('div');
    empty.className = 'issue';
    empty.textContent = 'Paste a system prompt or mcp.json, or open a CLAUDE.md/AGENTS.md file on GitHub.';
    issuesList.appendChild(empty);
    return;
  }

  if (report.warnings.length === 0) {
    const clean = document.createElement('div');
    clean.className = 'issue clean';
    clean.textContent = '✓ No cache-busters, secret leaks, or malformed MCP JSON detected.';
    issuesList.appendChild(clean);
    return;
  }

  for (const warning of report.warnings) {
    const item = document.createElement('div');
    item.className = `issue ${warning.severity === 'high' ? 'high' : 'medium'}`;
    item.textContent = `[${warning.severity.toUpperCase()}] ${warning.ruleId}: ${warning.message}`;
    issuesList.appendChild(item);
  }
}

async function savePreferences() {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({
      modelId: modelSelect.value,
      turns: Math.max(1, Math.min(100, Number(turnsInput.value) || 24)),
    });
  }
}

async function tryLoadActiveGitHubTab() {
  if (typeof chrome === 'undefined' || !chrome.tabs?.query) return;
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab?.id) return;
    const response = await chrome.tabs.sendMessage(tab.id, { type: 'GET_PAGE_PROMPT' });
    if (response?.ok && response.text) {
      promptInput.value = response.text;
      sourceNote.hidden = false;
      sourceNote.textContent = `Loaded from active GitHub file`;
    }
  } catch {
    // Non-GitHub tabs or pages without content script will safely fall back to manual input.
  }
}

async function init() {
  populateModels();

  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    const saved = await chrome.storage.local.get(['modelId', 'turns']);
    if (saved.modelId) modelSelect.value = saved.modelId;
    if (saved.turns) turnsInput.value = String(saved.turns);
  }

  await tryLoadActiveGitHubTab();
  renderReport();

  modelSelect.addEventListener('change', () => {
    savePreferences();
    renderReport();
  });
  turnsInput.addEventListener('input', () => {
    savePreferences();
    renderReport();
  });
  promptInput.addEventListener('input', renderReport);
}

init();
