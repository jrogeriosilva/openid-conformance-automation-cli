/**
 * Generates the single-page HTML dashboard for OIDC Autopilot.
 *
 * Layout:
 *  - Left sidebar: Plan configuration form
 *  - Main area: Module cards grid (each test = one card with live status)
 *  - Bottom: Collapsible log panel
 */
export function buildPage(): string {
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
  <span id="statusBadge" class="badge idle">Idle</span>
  <div class="topbar-counters" id="topCounters"></div>
</header>

<div class="app-layout">
  <!-- Left sidebar: config form -->
  <aside class="sidebar">
    <h2>Plan Configuration</h2>
    <form id="launchForm" autocomplete="off">
      <label>Config File Path
        <input id="fConfigPath" type="text" placeholder="./my-plan.config.json" required>
      </label>
      <label>Plan ID
        <input id="fPlanId" type="text" placeholder="plan-abc-123" required>
      </label>
      <label>Bearer Token
        <input id="fToken" type="password" placeholder="your-api-token" required>
      </label>
      <label>Server URL
        <input id="fServerUrl" type="text" value="https://www.certification.openid.net">
      </label>
      <div class="row">
        <label class="half">Poll Interval (s)
          <input id="fPollInterval" type="number" value="5" min="1">
        </label>
        <label class="half">Timeout (s)
          <input id="fTimeout" type="number" value="240" min="1">
        </label>
      </div>
      <label class="cb-row">
        <input id="fHeadless" type="checkbox" checked> Headless browser
      </label>
      <button id="btnLaunch" type="submit">Launch Plan</button>
    </form>
  </aside>

  <!-- Main area: module cards -->
  <main class="main-area">
    <div id="cardsPlaceholder" class="cards-placeholder">
      <p>Configure and launch a plan to see test modules here.</p>
    </div>
    <div id="cardsGrid" class="cards-grid" hidden></div>
  </main>
</div>

<!-- Collapsible bottom log panel -->
<div class="log-drawer" id="logDrawer">
  <div class="log-drawer-header" id="logDrawerToggle">
    <span class="log-drawer-title">
      <span class="log-drawer-chevron" id="logChevron">&#9650;</span>
      Logs
      <span class="log-count" id="logCount">0</span>
    </span>
    <button id="btnClear" type="button" class="small-btn">Clear</button>
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

// ── CSS ─────────────────────────────────────────────

function cssBlock(): string {
  return `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,-apple-system,sans-serif;background:#0f1117;color:#c9d1d9;min-height:100vh;display:flex;flex-direction:column}

/* ── Topbar ── */
.topbar{display:flex;align-items:center;gap:1rem;padding:.6rem 1.5rem;background:#161b22;border-bottom:1px solid #30363d;flex-shrink:0}
.topbar h1{font-size:1.2rem;font-weight:600;color:#58a6ff}
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

/* ── App layout: sidebar + main ── */
.app-layout{display:flex;flex:1;overflow:hidden}

/* ── Sidebar ── */
.sidebar{width:340px;min-width:300px;background:#161b22;border-right:1px solid #30363d;padding:1rem;overflow-y:auto;flex-shrink:0}
.sidebar h2{font-size:1rem;margin-bottom:.75rem;color:#c9d1d9}
label{display:block;font-size:.82rem;color:#8b949e;margin-bottom:.55rem}
label input[type="text"],label input[type="password"],label input[type="number"]{
  display:block;width:100%;margin-top:3px;padding:6px 9px;background:#0d1117;border:1px solid #30363d;border-radius:5px;color:#c9d1d9;font-size:.85rem}
label input:focus{outline:none;border-color:#58a6ff}
.row{display:flex;gap:.6rem}
.half{flex:1}
.cb-row{display:flex;align-items:center;gap:.4rem;flex-direction:row;cursor:pointer}
.cb-row input{width:auto;margin:0}
button[type="submit"]{
  margin-top:.6rem;width:100%;padding:8px;background:#238636;border:none;border-radius:6px;
  color:#fff;font-weight:600;font-size:.85rem;cursor:pointer}
button[type="submit"]:hover{background:#2ea043}
button[type="submit"]:disabled{opacity:.5;cursor:not-allowed}
.small-btn{background:none;border:1px solid #30363d;border-radius:4px;color:#8b949e;font-size:.72rem;padding:2px 8px;cursor:pointer}
.small-btn:hover{color:#c9d1d9;border-color:#8b949e}

/* ── Main area with cards ── */
.main-area{flex:1;overflow-y:auto;padding:1rem}
.cards-placeholder{display:flex;align-items:center;justify-content:center;height:100%;color:#484f58;font-size:.95rem}
.cards-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:.75rem;align-content:start}

/* ── Module card ── */
.mod-card{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:.85rem 1rem;display:flex;flex-direction:column;gap:.4rem;transition:border-color .2s}
.mod-card.st-RUNNING,.mod-card.st-WAITING{border-color:#1f6feb}
.mod-card.st-FINISHED.res-PASSED{border-color:#238636}
.mod-card.st-FINISHED.res-FAILED,.mod-card.st-INTERRUPTED{border-color:#f85149}
.mod-card.st-FINISHED.res-WARNING{border-color:#d29922}
.mod-card-header{display:flex;align-items:center;justify-content:space-between;gap:.5rem}
.mod-card-name{font-size:.85rem;font-weight:600;color:#e6edf3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1}
.mod-card-badge{font-size:.65rem;padding:2px 8px;border-radius:10px;font-weight:600;text-transform:uppercase;white-space:nowrap}
.mcb-PENDING{background:#30363d;color:#8b949e}
.mcb-RUNNING{background:#1f6feb33;color:#58a6ff;animation:pulse 1.5s infinite}
.mcb-WAITING{background:#d29a0033;color:#d29922;animation:pulse 1.5s infinite}
.mcb-CREATED,.mcb-CONFIGURED{background:#30363d;color:#8b949e}
.mcb-FINISHED{background:#23883533;color:#3fb950}
.mcb-INTERRUPTED,.mcb-ERROR{background:#f8514933;color:#f85149}
.mod-card-result{font-size:.75rem;font-weight:600}
.mcr-PASSED{color:#3fb950}
.mcr-FAILED{color:#f85149}
.mcr-WARNING{color:#d29922}
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
.log-drawer-body.collapsed{max-height:0 !important}
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
  var btnClear = document.getElementById('btnClear');
  var cardsGrid = document.getElementById('cardsGrid');
  var cardsPlaceholder = document.getElementById('cardsPlaceholder');
  var topCounters = document.getElementById('topCounters');
  var logDrawerBody = document.getElementById('logDrawerBody');
  var logChevron = document.getElementById('logChevron');
  var logCountEl = document.getElementById('logCount');
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

  // ── Module cards ──
  function renderCards(modules) {
    cardsGrid.innerHTML = '';
    cardsPlaceholder.hidden = true;
    cardsGrid.hidden = false;
    for (var i = 0; i < modules.length; i++) {
      var card = createCard(modules[i]);
      cardsGrid.appendChild(card);
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
    card.appendChild(header);

    if (mod.result) {
      var resultEl = document.createElement('div');
      resultEl.className = 'mod-card-result mcr-' + mod.result;
      resultEl.textContent = mod.result;
      resultEl.id = 'cresult-' + mod.name;
      card.appendChild(resultEl);
    }

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
        resultEl = document.createElement('div');
        resultEl.id = 'cresult-' + mod.name;
        var msgEl = document.getElementById('cmsg-' + mod.name);
        card.insertBefore(resultEl, msgEl);
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
      (outcome.warning > 0 ? '<span class="tc tc-warning">Warn: ' + outcome.warning + '</span>' : '');
  }

  function handlePlanDone(outcome) {
    renderTopCounters(outcome);

    // Update all cards with final results
    if (outcome.modules) {
      for (var i = 0; i < outcome.modules.length; i++) {
        var m = outcome.modules[i];
        updateCard({ name: m.name, status: m.state, result: m.result, lastMessage: m.result });
      }
    }

    var hasFails = outcome.failed > 0;
    setBadge(hasFails ? 'errored' : 'done', hasFails ? 'Failed' : 'Done');
    btnLaunch.disabled = false;
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
    try {
      var modules = JSON.parse(ev.data);
      renderCards(modules);
    } catch(_) {}
  });

  evtSource.addEventListener('moduleUpdate', function(ev) {
    try {
      var mod = JSON.parse(ev.data);
      updateCard(mod);
    } catch(_) {}
  });

  evtSource.addEventListener('planDone', function(ev) {
    try {
      var o = JSON.parse(ev.data);
      handlePlanDone(o);
    } catch(_) {}
  });

  // ── Form submit ──
  form.addEventListener('submit', function(ev) {
    ev.preventDefault();
    btnLaunch.disabled = true;
    setBadge('running', 'Running');
    logBox.innerHTML = '';
    logLineCount = 0;
    logCountEl.textContent = '0';
    topCounters.innerHTML = '';
    cardsGrid.innerHTML = '';
    cardsGrid.hidden = true;
    cardsPlaceholder.hidden = false;

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
          btnLaunch.disabled = false;
        });
      }
    }).catch(function(err) {
      appendLog('error', 'Network error: ' + err.message);
      setBadge('errored', 'Error');
      btnLaunch.disabled = false;
    });
  });

  // ── Restore state on load ──
  fetch('/api/health').then(function(r) { return r.json(); }).then(function(d) {
    if (d.executionInFlight) setBadge('running', 'Running');
    if (d.moduleCards && d.moduleCards.length > 0) renderCards(d.moduleCards);
    if (d.outcome) handlePlanDone(d.outcome);
  }).catch(function() {});
})();
`;
}
