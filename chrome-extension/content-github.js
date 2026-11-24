(() => {
  const BADGE_ID = 'agentcostlab-github-badge';
  let analyzerPromise = null;
  let lastUrl = '';

  async function getAnalyzer() {
    if (!analyzerPromise) {
      analyzerPromise = import(chrome.runtime.getURL('analyzer.mjs'));
    }
    return analyzerPromise;
  }

  function removeBadge() {
    const existing = document.getElementById(BADGE_ID);
    if (existing) existing.remove();
  }

  function buildBadgeElement(report) {
    const container = document.createElement('div');
    container.id = BADGE_ID;
    Object.assign(container.style, {
      position: 'fixed',
      right: '20px',
      bottom: '20px',
      zIndex: '2147483647',
      maxWidth: '340px',
      background: '#0f172a',
      color: '#e2e8f0',
      border: '1px solid #334155',
      borderRadius: '10px',
      boxShadow: '0 10px 25px rgba(0,0,0,0.35)',
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
      fontSize: '12px',
      lineHeight: '1.45',
      padding: '10px 12px',
    });

    const header = document.createElement('div');
    Object.assign(header.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: '8px',
      fontWeight: '700',
      cursor: 'pointer',
    });

    const warnCount = report.warnings.length;
    const summaryText = document.createElement('span');
    summaryText.textContent = `AgentCostLab: ${report.estimatedTokens.toLocaleString('en-US')} tok | ${report.cachedFormatted}/1k cached${warnCount > 0 ? ` | ⚠ ${warnCount}` : ' | ✓ clean'}`;
    summaryText.style.color = warnCount > 0 ? '#fbbf24' : '#34d399';

    const toggleHint = document.createElement('span');
    toggleHint.textContent = '▾';
    toggleHint.style.color = '#94a3b8';

    header.append(summaryText, toggleHint);
    container.appendChild(header);

    const details = document.createElement('div');
    details.style.display = 'none';
    details.style.marginTop = '8px';
    details.style.paddingTop = '8px';
    details.style.borderTop = '1px solid #1e293b';

    const metaLine = document.createElement('div');
    metaLine.textContent = `${report.model.name} (${report.turns} turns): ${report.cachedFormatted} cached vs ${report.uncachedFormatted} uncached (-${report.savingsPct}%)`;
    metaLine.style.color = '#cbd5e1';
    metaLine.style.marginBottom = '6px';
    details.appendChild(metaLine);

    if (report.warnings.length > 0) {
      for (const warning of report.warnings.slice(0, 4)) {
        const item = document.createElement('div');
        item.textContent = `[${warning.severity.toUpperCase()}] ${warning.ruleId}: ${warning.message}`;
        item.style.color = warning.severity === 'high' ? '#fca5a5' : '#fcd34d';
        item.style.marginBottom = '4px';
        details.appendChild(item);
      }
    }

    const link = document.createElement('a');
    link.href = 'https://jettlin927.github.io/agentcostlab/';
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = 'Open full AgentCostLab simulator →';
    Object.assign(link.style, {
      display: 'inline-block',
      marginTop: '4px',
      color: '#38bdf8',
      textDecoration: 'none',
    });
    details.appendChild(link);
    container.appendChild(details);

    header.addEventListener('click', () => {
      const open = details.style.display === 'block';
      details.style.display = open ? 'none' : 'block';
      toggleHint.textContent = open ? '▾' : '▴';
    });

    return container;
  }

  async function refreshBadge() {
    try {
      const analyzer = await getAnalyzer();
      if (!analyzer.isTargetGitHubBlobUrl(window.location.href)) {
        removeBadge();
        return;
      }

      const rawText = analyzer.extractGitHubRawText(document);
      if (!rawText) return;

      const stored = await chrome.storage.local.get(['modelId', 'turns']);
      const report = analyzer.analyzePromptForExtension(rawText, {
        modelId: stored.modelId || 'claude-sonnet-5-5',
        turns: stored.turns || 24,
      });

      removeBadge();
      document.body.appendChild(buildBadgeElement(report));
    } catch {
      // Ignore transient DOM states during GitHub SPA navigation.
    }
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (!message || message.type !== 'GET_PAGE_PROMPT') return false;
    getAnalyzer()
      .then((analyzer) => {
        if (!analyzer.isTargetGitHubBlobUrl(window.location.href)) {
          sendResponse({ ok: false });
          return;
        }
        const text = analyzer.extractGitHubRawText(document);
        sendResponse({ ok: Boolean(text), text, url: window.location.href });
      })
      .catch(() => sendResponse({ ok: false }));
    return true;
  });

  function checkNavigation() {
    if (window.location.href !== lastUrl) {
      lastUrl = window.location.href;
      window.setTimeout(refreshBadge, 350);
    }
  }

  document.addEventListener('turbo:load', refreshBadge);
  document.addEventListener('pjax:end', refreshBadge);
  const observer = new MutationObserver(checkNavigation);
  observer.observe(document.documentElement, { childList: true, subtree: true });

  lastUrl = window.location.href;
  refreshBadge();
})();
