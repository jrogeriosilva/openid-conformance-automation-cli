/**
 * Generates the single-page HTML dashboard for OIDC Autopilot.
 *
 * The page provides:
 *  - A form to configure and launch conformance plan executions
 *  - A real-time log viewer powered by Server-Sent Events
 *  - An outcome panel showing pass/fail/warning counts
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
</header>
<main class="grid">
  <section class="panel config-panel">
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
  </section>

  <section class="panel outcome-panel" id="outcomePanel" hidden>
    <h2>Results</h2>
    <div class="counters" id="counters"></div>
    <table id="moduleTable">
      <thead><tr><th>Module</th><th>State</th><th>Result</th></tr></thead>
      <tbody id="moduleBody"></tbody>
    </table>
  </section>

  <section class="panel log-panel">
    <h2>Live Log <button id="btnClear" type="button" class="small-btn">Clear</button></h2>
    <div id="logBox" class="log-box"></div>
  </section>
</main>
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
body{font-family:system-ui,-apple-system,sans-serif;background:#0f1117;color:#c9d1d9;min-height:100vh}
.topbar{display:flex;align-items:center;gap:1rem;padding:.75rem 1.5rem;background:#161b22;border-bottom:1px solid #30363d}
.topbar h1{font-size:1.25rem;font-weight:600;color:#58a6ff}
.badge{font-size:.75rem;padding:2px 10px;border-radius:12px;font-weight:600;text-transform:uppercase}
.badge.idle{background:#30363d;color:#8b949e}
.badge.running{background:#1f6feb33;color:#58a6ff;animation:pulse 1.5s infinite}
.badge.done{background:#23883533;color:#3fb950}
.badge.errored{background:#f8514933;color:#f85149}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.5}}
.grid{display:grid;grid-template-columns:380px 1fr;grid-template-rows:auto 1fr;gap:1rem;padding:1rem;height:calc(100vh - 52px)}
.panel{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:1rem;overflow:auto}
.panel h2{font-size:1rem;margin-bottom:.75rem;color:#c9d1d9;display:flex;align-items:center;gap:.5rem}
.config-panel{grid-row:1/3}
.outcome-panel{grid-column:2}
.log-panel{grid-column:2}
label{display:block;font-size:.85rem;color:#8b949e;margin-bottom:.6rem}
label input[type="text"],label input[type="password"],label input[type="number"]{
  display:block;width:100%;margin-top:3px;padding:7px 10px;background:#0d1117;border:1px solid #30363d;border-radius:5px;color:#c9d1d9;font-size:.9rem}
label input:focus{outline:none;border-color:#58a6ff}
.row{display:flex;gap:.75rem}
.half{flex:1}
.cb-row{display:flex;align-items:center;gap:.4rem;flex-direction:row;cursor:pointer}
.cb-row input{width:auto;margin:0}
button[type="submit"]{
  margin-top:.75rem;width:100%;padding:9px;background:#238636;border:none;border-radius:6px;
  color:#fff;font-weight:600;font-size:.9rem;cursor:pointer}
button[type="submit"]:hover{background:#2ea043}
button[type="submit"]:disabled{opacity:.5;cursor:not-allowed}
.small-btn{background:none;border:1px solid #30363d;border-radius:4px;color:#8b949e;font-size:.75rem;padding:2px 8px;cursor:pointer}
.small-btn:hover{color:#c9d1d9;border-color:#8b949e}
.log-box{
  height:100%;max-height:calc(100vh - 220px);overflow-y:auto;font-family:'SFMono-Regular',Consolas,monospace;
  font-size:.8rem;line-height:1.6;padding:.5rem;background:#0d1117;border-radius:5px;border:1px solid #21262d}
.log-line{white-space:pre-wrap;word-break:break-all}
.log-line.sev-info{color:#58a6ff}
.log-line.sev-error{color:#f85149}
.log-line.sev-debug{color:#6e7681}
.log-line.sev-log{color:#c9d1d9}
.counters{display:flex;gap:.75rem;margin-bottom:.75rem;flex-wrap:wrap}
.ctr{padding:6px 14px;border-radius:6px;font-weight:600;font-size:.85rem}
.ctr-total{background:#30363d;color:#c9d1d9}
.ctr-passed{background:#23883533;color:#3fb950}
.ctr-failed{background:#f8514933;color:#f85149}
.ctr-warning{background:#d29a0033;color:#d29922}
.ctr-other{background:#30363d;color:#8b949e}
#moduleTable{width:100%;border-collapse:collapse;font-size:.85rem}
#moduleTable th{text-align:left;padding:4px 8px;border-bottom:1px solid #30363d;color:#8b949e}
#moduleTable td{padding:4px 8px;border-bottom:1px solid #21262d}
.res-PASSED{color:#3fb950}.res-FAILED{color:#f85149}.res-WARNING{color:#d29922}
.res-SKIPPED,.res-REVIEW,.res-UNKNOWN{color:#8b949e}
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
  var outcomePanel = document.getElementById('outcomePanel');
  var counters = document.getElementById('counters');
  var moduleBody = document.getElementById('moduleBody');

  btnClear.addEventListener('click', function() { logBox.innerHTML = ''; });

  function appendLog(severity, text) {
    var el = document.createElement('div');
    el.className = 'log-line sev-' + severity;
    el.textContent = text;
    logBox.appendChild(el);
    logBox.scrollTop = logBox.scrollHeight;
  }

  function setBadge(cls, label) {
    badge.className = 'badge ' + cls;
    badge.textContent = label;
  }

  function renderOutcome(o) {
    outcomePanel.hidden = false;
    var otherCount = o.skipped + o.interrupted;
    counters.innerHTML =
      '<span class="ctr ctr-total">Total: ' + o.total + '</span>' +
      '<span class="ctr ctr-passed">Passed: ' + o.passed + '</span>' +
      '<span class="ctr ctr-failed">Failed: ' + o.failed + '</span>' +
      (o.warning > 0 ? '<span class="ctr ctr-warning">Warning: ' + o.warning + '</span>' : '') +
      (otherCount > 0 ? '<span class="ctr ctr-other">Other: ' + otherCount + '</span>' : '');

    moduleBody.innerHTML = '';
    for (var i = 0; i < o.modules.length; i++) {
      var m = o.modules[i];
      var tr = document.createElement('tr');
      var tdName = document.createElement('td');
      tdName.textContent = m.name;
      var tdState = document.createElement('td');
      tdState.textContent = m.state;
      var tdResult = document.createElement('td');
      tdResult.textContent = m.result;
      tdResult.className = 'res-' + m.result;
      tr.appendChild(tdName);
      tr.appendChild(tdState);
      tr.appendChild(tdResult);
      moduleBody.appendChild(tr);
    }
  }

  // SSE connection
  var evtSource = new EventSource('/api/feed');

  evtSource.addEventListener('message', function(ev) {
    try {
      var d = JSON.parse(ev.data);
      appendLog(d.severity || 'log', d.message || '');
    } catch(_) {}
  });

  evtSource.addEventListener('planDone', function(ev) {
    try {
      var o = JSON.parse(ev.data);
      renderOutcome(o);
      setBadge(o.failed > 0 ? 'errored' : 'done', o.failed > 0 ? 'Failed' : 'Done');
      btnLaunch.disabled = false;
    } catch(_) {}
  });

  // Form submission
  form.addEventListener('submit', function(ev) {
    ev.preventDefault();
    btnLaunch.disabled = true;
    setBadge('running', 'Running');
    logBox.innerHTML = '';
    outcomePanel.hidden = true;

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

  // Check initial state
  fetch('/api/health').then(function(r) { return r.json(); }).then(function(d) {
    if (d.executionInFlight) setBadge('running', 'Running');
    if (d.outcome) renderOutcome(d.outcome);
  }).catch(function() {});
})();
`;
}
