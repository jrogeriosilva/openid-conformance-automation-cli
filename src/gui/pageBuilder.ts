/**
 * Generates the single-page HTML dashboard for OIDC Autopilot.
 *
 * Layout: Header → Configuration & Controls → Module Cards Grid → Log Panel
 *
 * @param envDefaults - Pre-fill values from .env (CONFORMANCE_PLAN_ID, etc.)
 * @param configFiles - List of discovered .config.json files for the dropdown
 */
export function buildPage(
  envDefaults: { planId: string; token: string; serverUrl: string },
  configFiles: string[],
): string {
  const configOptions = configFiles
    .map((f) => `<option value="${escapeAttr(f)}">${escapeHtml(f)}</option>`)
    .join("\n          ");

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>OIDC Autopilot Dashboard</title>
<style>
${cssBlock()}
</style>
</head>
<body>
<header class="topbar">
  <h1>OIDC Autopilot</h1>
  <a href="/config-manager" class="topbar-link">Config Manager</a>
  <span id="statusBadge" class="badge idle">Idle</span>
  <div class="topbar-counters" id="topCounters"></div>
</header>

<!-- Configuration form -->
<section class="config-section">
  <details class="config-details" open>
    <summary class="config-summary">Plan Configuration</summary>
    <form id="launchForm" autocomplete="off" class="config-form">
      <div class="form-row">
        <label class="form-field">Config File
          <select id="fConfigPath" required>
            <option value="">— select a .config.json file —</option>
            ${configOptions}
          </select>
        </label>
        <label class="form-field">Plan ID
          <input id="fPlanId" type="text" placeholder="plan-abc-123" value="${escapeAttr(envDefaults.planId)}" required>
        </label>
        <label class="form-field">Server URL
          <input id="fServerUrl" type="text" value="${escapeAttr(envDefaults.serverUrl)}">
        </label>
        <label class="form-field">
          <span class="form-field-label">Bearer Token</span>
          <div class="token-input-group">
            <input id="fToken" type="password" placeholder="your-api-token" value="${escapeAttr(envDefaults.token)}" required>
            <button id="btnToggleToken" type="button" class="token-btn" title="Show/hide token">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M8 3C4.5 3 1.7 5.1.3 8c1.4 2.9 4.2 5 7.7 5s6.3-2.1 7.7-5C14.3 5.1 11.5 3 8 3zm0 8.5A3.5 3.5 0 1 1 8 4.5a3.5 3.5 0 0 1 0 7zm0-5.5a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/></svg>
            </button>
            <button id="btnCopyToken" type="button" class="token-btn" title="Copy token">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 0 1 0 1.5h-1.5a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-1.5a.75.75 0 0 1 1.5 0v1.5A1.75 1.75 0 0 1 9.25 16h-7.5A1.75 1.75 0 0 1 0 14.25zM5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0 1 14.25 11h-7.5A1.75 1.75 0 0 1 5 9.25zm1.75-.25a.25.25 0 0 0-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 0 0 .25-.25v-7.5a.25.25 0 0 0-.25-.25z"/></svg>
            </button>
          </div>
        </label>
      </div>
      <div class="form-row form-row-bottom">
        <label class="form-field-sm">Poll Interval (s)
          <input id="fPollInterval" type="number" value="5" min="1">
        </label>
        <label class="form-field-sm">Timeout (s)
          <input id="fTimeout" type="number" value="240" min="1">
        </label>
        <label class="cb-row">
          <input id="fHeadless" type="checkbox" checked> Headless browser
        </label>
        <div class="form-actions">
          <button id="btnLaunch" type="submit" class="btn-launch">Launch Plan</button>
          <button id="btnStop" type="button" class="btn-stop" disabled>Stop</button>
        </div>
      </div>
    </form>
  </details>
</section>

<!-- Module cards -->
<section class="cards-section" id="cardsSection">
  <div id="cardsPlaceholder" class="cards-placeholder">
    <p>Configure and launch a plan to see test modules here.</p>
  </div>
  <div id="cardsGrid" class="cards-grid" hidden></div>
</section>

<!-- Collapsible bottom log panel -->
<div class="log-drawer" id="logDrawer">
  <div class="log-drawer-header" id="logDrawerToggle">
    <span class="log-drawer-title">
      <span class="log-drawer-chevron" id="logChevron">&#9650;</span>
      Logs
      <span class="log-count" id="logCount">0</span>
    </span>
    <div class="log-toolbar">
      <button id="btnCopyLogs" type="button" class="small-btn" title="Copy all logs">Copy All</button>
      <button id="btnClear" type="button" class="small-btn">Clear</button>
      <button id="btnExpandLogs" type="button" class="small-btn" title="Toggle fullscreen">&#x26F6;</button>
    </div>
  </div>
  <div class="log-drawer-body" id="logDrawerBody">
    <div id="logBox" class="log-box"></div>
  </div>
</div>

<script>
${jsBlock()}
</script>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// ── CSS ─────────────────────────────────────────────

function cssBlock(): string {
  return `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,sans-serif;background:#0f1117;color:#c9d1d9;min-height:100vh;display:flex;flex-direction:column}

/* ── Topbar ── */
.topbar{display:flex;align-items:center;gap:1rem;padding:.6rem 1.5rem;background:#161b22;border-bottom:1px solid #30363d;flex-shrink:0}
.topbar h1{font-size:1.2rem;font-weight:600;color:#58a6ff}
.topbar-link{font-size:.82rem;color:#8b949e;text-decoration:none;padding:4px 10px;border:1px solid #30363d;border-radius:6px;transition:color .15s,border-color .15s}
.topbar-link:hover{color:#58a6ff;border-color:#58a6ff}
.badge{font-size:.7rem;padding:2px 10px;border-radius:12px;font-weight:600;text-transform:uppercase}
.badge.idle{background:#30363d;color:#8b949e}
.badge.running{background:#1f6feb33;color:#58a6ff;animation:pulse 1.5s infinite}
.badge.done{background:#23883533;color:#3fb950}
.badge.errored{background:#f8514933;color:#f85149}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
.topbar-counters{display:flex;gap:.5rem;margin-left:auto;align-items:center}
.tc{font-size:.75rem;font-weight:600;padding:2px 8px;border-radius:4px}
.tc-passed{background:#23883533;color:#3fb950}
.tc-failed{background:#f8514933;color:#f85149}
.tc-warning{background:#d29a0033;color:#d29922}
.tc-total{background:#30363d;color:#c9d1d9}

/* ── Config section ── */
.config-section{flex-shrink:0;background:#161b22;border-bottom:1px solid #30363d;padding:0 1.5rem}
.config-details{border:none}
.config-summary{padding:.6rem 0;font-size:.9rem;font-weight:600;color:#c9d1d9;cursor:pointer;user-select:none;list-style:none;display:flex;align-items:center;gap:.4rem}
.config-summary::before{content:'\\25B6';font-size:.55rem;transition:transform .2s;display:inline-block}
.config-details[open] .config-summary::before{transform:rotate(90deg)}
.config-form{padding:.5rem 0 .75rem 0}
.form-row-bottom{align-items:flex-end}
.form-field-label{display:block;margin-bottom:3px}
.token-input-group{display:flex;gap:4px;align-items:center}
.token-input-group input{flex:1}
.token-btn{background:none;border:1px solid #30363d;border-radius:5px;color:#8b949e;cursor:pointer;padding:5px 7px;display:flex;align-items:center;justify-content:center;transition:color .15s,border-color .15s}
.token-btn:hover{color:#c9d1d9;border-color:#8b949e}
.form-row{display:flex;gap:.75rem;flex-wrap:wrap;margin-bottom:.5rem}
.form-field{flex:1;min-width:180px;font-size:.82rem;color:#8b949e}
.form-field input,.form-field select{display:block;width:100%;margin-top:3px;padding:6px 9px;background:#0d1117;border:1px solid #30363d;border-radius:5px;color:#c9d1d9;font-size:.85rem}
.form-field select{appearance:auto}
.form-field input:focus,.form-field select:focus{outline:none;border-color:#58a6ff}
.form-field-sm{flex:0 0 120px;font-size:.82rem;color:#8b949e}
.form-field-sm input{display:block;width:100%;margin-top:3px;padding:6px 9px;background:#0d1117;border:1px solid #30363d;border-radius:5px;color:#c9d1d9;font-size:.85rem}
.form-field-sm input:focus{outline:none;border-color:#58a6ff}
.cb-row{display:flex;align-items:center;gap:.4rem;font-size:.82rem;color:#8b949e;cursor:pointer;align-self:flex-end;padding-bottom:4px}
.cb-row input{width:auto;margin:0}
.form-actions{display:flex;gap:.5rem;align-self:flex-end;padding-bottom:0}
.btn-launch{padding:7px 20px;background:#238636;border:none;border-radius:6px;color:#fff;font-weight:600;font-size:.85rem;cursor:pointer;white-space:nowrap}
.btn-launch:hover{background:#2ea043}
.btn-launch:disabled{opacity:.5;cursor:not-allowed}
.btn-stop{padding:7px 16px;background:#da3633;border:none;border-radius:6px;color:#fff;font-weight:600;font-size:.85rem;cursor:pointer;white-space:nowrap}
.btn-stop:hover{background:#f85149}
.btn-stop:disabled{opacity:.35;cursor:not-allowed}
.small-btn{background:none;border:1px solid #30363d;border-radius:4px;color:#8b949e;font-size:.72rem;padding:2px 8px;cursor:pointer}
.small-btn:hover{color:#c9d1d9;border-color:#8b949e}

/* ── Cards section ── */
.cards-section{flex:1 1 auto;min-height:0;overflow-y:auto;padding:1rem 1.5rem}
.cards-placeholder{display:flex;align-items:center;justify-content:center;min-height:120px;color:#484f58;font-size:.95rem}
.cards-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:.75rem;align-content:start}

/* ── Module card ── */
.mod-card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:.85rem 1rem;display:flex;flex-direction:column;gap:.4rem;transition:border-color .2s}
.mod-card.st-RUNNING,.mod-card.st-WAITING{border-color:#1f6feb}
.mod-card.st-FINISHED.res-PASSED{border-color:#238636}
.mod-card.st-FINISHED.res-FAILED,.mod-card.st-INTERRUPTED{border-color:#f85149}
.mod-card.st-FINISHED.res-WARNING{border-color:#d29922}
.mod-card-header{display:flex;align-items:center;gap:.4rem;flex-wrap:wrap}
.mod-card-name{font-size:.85rem;font-weight:600;color:#e6edf3;word-break:break-word;line-height:1.3;flex:1}
.mod-card-badge{font-size:.65rem;padding:2px 8px;border-radius:10px;font-weight:600;text-transform:uppercase;white-space:nowrap}
.mcb-PENDING{background:#30363d;color:#8b949e}
.mcb-RUNNING{background:#1f6feb33;color:#58a6ff;animation:pulse 1.5s infinite}
.mcb-WAITING{background:#d29a0033;color:#d29922;animation:pulse 1.5s infinite}
.mcb-CREATED,.mcb-CONFIGURED{background:#30363d;color:#8b949e}
.mcb-FINISHED{background:#23883533;color:#3fb950}
.mcb-INTERRUPTED,.mcb-ERROR{background:#f8514933;color:#f85149}
.mod-card-result{font-size:.6rem;display:inline-block;padding:1px 6px;border-radius:3px;font-weight:600}
.mcr-PASSED{color:#3fb950;background:#23883520}
.mcr-FAILED{color:#f85149;background:#f8514920}
.mcr-WARNING{color:#d29922;background:#d29a0020}
.mcr-SKIPPED,.mcr-REVIEW,.mcr-UNKNOWN{color:#8b949e}
.mod-card-msg{font-size:.72rem;color:#6e7681;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-height:1em}

/* ── Collapsible log drawer ── */
.log-drawer{flex-shrink:0;background:#161b22;border-top:1px solid #30363d;display:flex;flex-direction:column;transition:height .25s ease}
.log-drawer-header{display:flex;align-items:center;justify-content:space-between;padding:.45rem 1rem;cursor:pointer;user-select:none}
.log-drawer-title{display:flex;align-items:center;gap:.5rem;font-size:.85rem;font-weight:600;color:#c9d1d9}
.log-drawer-chevron{font-size:.65rem;transition:transform .25s;display:inline-block}
.log-drawer-chevron.collapsed{transform:rotate(180deg)}
.log-count{font-size:.7rem;background:#30363d;color:#8b949e;padding:1px 7px;border-radius:8px;font-weight:500}
.log-drawer-body{overflow:hidden;transition:max-height .25s ease}
.log-toolbar{display:flex;gap:.4rem;align-items:center}
.log-drawer-body.collapsed{max-height:0 !important}
.log-drawer.fullscreen{position:fixed;inset:0;z-index:1000;height:100vh;border-top:none}
.log-drawer.fullscreen .log-box{height:calc(100vh - 40px)}
.log-box{
  height:220px;overflow-y:auto;font-family:'SFMono-Regular',Consolas,monospace;
  font-size:.78rem;line-height:1.55;padding:.4rem .7rem;background:#0d1117;border-top:1px solid #21262d}
.log-line{white-space:pre-wrap;word-break:break-all}
.log-line.sev-info{color:#58a6ff}
.log-line.sev-error{color:#f85149}
.log-line.sev-debug{color:#6e7681}
.log-line.sev-log{color:#c9d1d9}
`;
}

// ── JavaScript ──────────────────────────────────────

function jsBlock(): string {
  return `
(function() {
  var logBox = document.getElementById('logBox');
  var badge = document.getElementById('statusBadge');
  var form = document.getElementById('launchForm');
  var btnLaunch = document.getElementById('btnLaunch');
  var btnStop = document.getElementById('btnStop');
  var btnClear = document.getElementById('btnClear');
  var cardsGrid = document.getElementById('cardsGrid');
  var cardsPlaceholder = document.getElementById('cardsPlaceholder');
  var topCounters = document.getElementById('topCounters');
  var logDrawerBody = document.getElementById('logDrawerBody');
  var logChevron = document.getElementById('logChevron');
  var logCountEl = document.getElementById('logCount');
  var logDrawer = document.getElementById('logDrawer');
  var btnCopyLogs = document.getElementById('btnCopyLogs');
  var btnExpandLogs = document.getElementById('btnExpandLogs');
  var btnToggleToken = document.getElementById('btnToggleToken');
  var btnCopyToken = document.getElementById('btnCopyToken');
  var fToken = document.getElementById('fToken');
  var logLineCount = 0;

  // ── Log drawer collapse toggle ──
  var logExpanded = true;
  document.getElementById('logDrawerToggle').addEventListener('click', function() {
    logExpanded = !logExpanded;
    if (logExpanded) {
      logDrawerBody.classList.remove('collapsed');
      logChevron.classList.remove('collapsed');
    } else {
      logDrawerBody.classList.add('collapsed');
      logChevron.classList.add('collapsed');
    }
  });

  btnClear.addEventListener('click', function(e) {
    e.stopPropagation();
    logBox.innerHTML = '';
    logLineCount = 0;
    logCountEl.textContent = '0';
  });

  // ── Token show/hide toggle ──
  btnToggleToken.addEventListener('click', function(e) {
    e.preventDefault();
    fToken.type = fToken.type === 'password' ? 'text' : 'password';
  });

  // ── Token copy ──
  btnCopyToken.addEventListener('click', function(e) {
    e.preventDefault();
    navigator.clipboard.writeText(fToken.value);
  });

  // ── Copy all logs ──
  btnCopyLogs.addEventListener('click', function(e) {
    e.stopPropagation();
    var lines = logBox.querySelectorAll('.log-line');
    var text = [];
    for (var i = 0; i < lines.length; i++) text.push(lines[i].textContent);
    navigator.clipboard.writeText(text.join('\\n')).then(function() {
      var orig = btnCopyLogs.textContent;
      btnCopyLogs.textContent = 'Copied!';
      setTimeout(function() { btnCopyLogs.textContent = orig; }, 1500);
    });
  });

  // ── Expand/fullscreen logs ──
  btnExpandLogs.addEventListener('click', function(e) {
    e.stopPropagation();
    logDrawer.classList.toggle('fullscreen');
    btnExpandLogs.innerHTML = logDrawer.classList.contains('fullscreen') ? '&#x2716;' : '&#x26F6;';
    if (logDrawer.classList.contains('fullscreen')) {
      logDrawerBody.classList.remove('collapsed');
      logChevron.classList.remove('collapsed');
    }
  });

  function appendLog(severity, text) {
    var el = document.createElement('div');
    el.className = 'log-line sev-' + severity;
    el.textContent = text;
    logBox.appendChild(el);
    logBox.scrollTop = logBox.scrollHeight;
    logLineCount++;
    logCountEl.textContent = String(logLineCount);
  }

  function setBadge(cls, label) {
    badge.className = 'badge ' + cls;
    badge.textContent = label;
  }

  function setRunning(running) {
    btnLaunch.disabled = running;
    btnStop.disabled = !running;
  }

  // ── Module cards ──
  function renderCards(modules) {
    cardsGrid.innerHTML = '';
    cardsPlaceholder.hidden = true;
    cardsGrid.hidden = false;
    for (var i = 0; i < modules.length; i++) {
      cardsGrid.appendChild(createCard(modules[i]));
    }
  }

  function createCard(mod) {
    var card = document.createElement('div');
    card.className = 'mod-card st-' + mod.status + (mod.result ? ' res-' + mod.result : '');
    card.id = 'card-' + mod.name;

    var header = document.createElement('div');
    header.className = 'mod-card-header';

    var nameEl = document.createElement('span');
    nameEl.className = 'mod-card-name';
    nameEl.textContent = mod.name;
    nameEl.title = mod.name;

    var badgeEl = document.createElement('span');
    badgeEl.className = 'mod-card-badge mcb-' + mod.status;
    badgeEl.textContent = mod.status;
    badgeEl.id = 'cbadge-' + mod.name;

    header.appendChild(nameEl);
    header.appendChild(badgeEl);

    if (mod.result) {
      var resultEl = document.createElement('span');
      resultEl.className = 'mod-card-result mcr-' + mod.result;
      resultEl.textContent = mod.result;
      resultEl.id = 'cresult-' + mod.name;
      header.appendChild(resultEl);
    }

    card.appendChild(header);

    var msgEl = document.createElement('div');
    msgEl.className = 'mod-card-msg';
    msgEl.textContent = mod.lastMessage || '';
    msgEl.id = 'cmsg-' + mod.name;
    card.appendChild(msgEl);

    return card;
  }

  function updateCard(mod) {
    var card = document.getElementById('card-' + mod.name);
    if (!card) return;

    card.className = 'mod-card st-' + mod.status + (mod.result ? ' res-' + mod.result : '');

    var badgeEl = document.getElementById('cbadge-' + mod.name);
    if (badgeEl) {
      badgeEl.className = 'mod-card-badge mcb-' + mod.status;
      badgeEl.textContent = mod.status;
    }

    var resultEl = document.getElementById('cresult-' + mod.name);
    if (mod.result) {
      if (!resultEl) {
        resultEl = document.createElement('span');
        resultEl.id = 'cresult-' + mod.name;
        var headerEl = card.querySelector('.mod-card-header');
        if (headerEl) headerEl.appendChild(resultEl);
      }
      resultEl.className = 'mod-card-result mcr-' + mod.result;
      resultEl.textContent = mod.result;
    }

    var msgEl = document.getElementById('cmsg-' + mod.name);
    if (msgEl && mod.lastMessage) {
      msgEl.textContent = mod.lastMessage;
    }
  }

  function renderTopCounters(outcome) {
    var skippedAndInterrupted = outcome.skipped + outcome.interrupted;
    topCounters.innerHTML =
      '<span class="tc tc-total">' + outcome.passed + '/' + outcome.total + '</span>' +
      '<span class="tc tc-passed">Passed: ' + outcome.passed + '</span>' +
      '<span class="tc tc-failed">Failed: ' + outcome.failed + '</span>' +
      (outcome.warning > 0 ? '<span class="tc tc-warning">Warn: ' + outcome.warning + '</span>' : '') +
      (skippedAndInterrupted > 0 ? '<span class="tc tc-total">Other: ' + skippedAndInterrupted + '</span>' : '');
  }

  function handlePlanDone(outcome) {
    renderTopCounters(outcome);
    if (outcome.modules) {
      for (var i = 0; i < outcome.modules.length; i++) {
        var m = outcome.modules[i];
        updateCard({ name: m.name, status: m.state, result: m.result, lastMessage: m.result });
      }
    }
    var hasFails = outcome.failed > 0;
    setBadge(hasFails ? 'errored' : 'done', hasFails ? 'Failed' : 'Done');
    setRunning(false);
  }

  // ── SSE ──
  var evtSource = new EventSource('/api/feed');

  evtSource.addEventListener('message', function(ev) {
    try {
      var d = JSON.parse(ev.data);
      appendLog(d.severity || 'log', d.message || '');
    } catch(_) {}
  });

  evtSource.addEventListener('moduleList', function(ev) {
    try { renderCards(JSON.parse(ev.data)); } catch(_) {}
  });

  evtSource.addEventListener('moduleUpdate', function(ev) {
    try { updateCard(JSON.parse(ev.data)); } catch(_) {}
  });

  evtSource.addEventListener('planDone', function(ev) {
    try { handlePlanDone(JSON.parse(ev.data)); } catch(_) {}
  });

  evtSource.addEventListener('stopped', function(ev) {
    setBadge('errored', 'Stopped');
    setRunning(false);
    appendLog('error', 'Execution stopped by user.');
    try {
      var d = JSON.parse(ev.data);
      if (d.cards) {
        for (var i = 0; i < d.cards.length; i++) {
          updateCard(d.cards[i]);
        }
      }
    } catch(_) {}
  });

  // ── Stop button ──
  btnStop.addEventListener('click', function() {
    btnStop.disabled = true;
    fetch('/api/stop', { method: 'POST' })
      .then(function(resp) {
        if (!resp.ok) {
          return resp.json().then(function(j) {
            appendLog('error', 'Stop failed: ' + (j.error || resp.statusText));
          });
        }
      })
      .catch(function(err) {
        appendLog('error', 'Stop request failed: ' + err.message);
      });
  });

  // ── Form submit ──
  form.addEventListener('submit', function(ev) {
    ev.preventDefault();
    setRunning(true);
    setBadge('running', 'Running');
    logBox.innerHTML = '';
    logLineCount = 0;
    logCountEl.textContent = '0';
    topCounters.innerHTML = '';
    cardsGrid.innerHTML = '';
    cardsGrid.hidden = true;
    cardsPlaceholder.hidden = true;

    var payload = {
      configPath: document.getElementById('fConfigPath').value,
      planId: document.getElementById('fPlanId').value,
      token: document.getElementById('fToken').value,
      serverUrl: document.getElementById('fServerUrl').value,
      pollInterval: parseInt(document.getElementById('fPollInterval').value, 10),
      timeout: parseInt(document.getElementById('fTimeout').value, 10),
      headless: document.getElementById('fHeadless').checked
    };

    fetch('/api/launch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function(resp) {
      if (!resp.ok) {
        return resp.json().then(function(j) {
          appendLog('error', 'Launch failed: ' + (j.error || resp.statusText));
          setBadge('errored', 'Error');
          setRunning(false);
        });
      }
    }).catch(function(err) {
      appendLog('error', 'Network error: ' + err.message);
      setBadge('errored', 'Error');
      setRunning(false);
    });
  });

  // ── Hide placeholder when config file is selected ──
  document.getElementById('fConfigPath').addEventListener('change', function() {
    if (this.value) cardsPlaceholder.hidden = true;
  });

  // ── Restore state on load ──
  fetch('/api/health').then(function(r) { return r.json(); }).then(function(d) {
    if (d.executionInFlight) {
      setBadge('running', 'Running');
      setRunning(true);
    }
    if (d.moduleCards && d.moduleCards.length > 0) renderCards(d.moduleCards);
    if (d.outcome) handlePlanDone(d.outcome);
  }).catch(function() {});
})();
`;
}
