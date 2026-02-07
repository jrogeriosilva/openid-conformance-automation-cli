/**
 * Generates the Config Manager single-page HTML application.
 *
 * Follows the same monolithic pattern as pageBuilder.ts:
 * one exported function returning a complete HTML document
 * with inline CSS and JavaScript.
 */
export function buildConfigManagerPage(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Config Manager — OIDC Autopilot</title>
<style>
${cssBlock()}
</style>
</head>
<body>
<header class="topbar">
  <h1>OIDC Autopilot</h1>
  <a href="/" class="topbar-link">Dashboard</a>
  <span class="topbar-title">Config Manager</span>
</header>

<!-- Toolbar -->
<div class="toolbar" id="toolbar">
  <button type="button" class="btn-toolbar" id="btnNew">New</button>
  <select id="selConfig" class="toolbar-select">
    <option value="">— select config —</option>
  </select>
  <button type="button" class="btn-toolbar" id="btnLoad">Load</button>
  <button type="button" class="btn-toolbar btn-primary" id="btnSave">Save</button>
  <button type="button" class="btn-toolbar btn-danger" id="btnDelete">Delete</button>
  <input type="text" id="inpFilename" class="toolbar-input" placeholder="filename.config.json">
  <span id="dirtyBadge" class="dirty-badge" hidden>unsaved</span>
</div>

<!-- Main panels -->
<div class="cm-main">
  <!-- Left panel -->
  <div class="cm-panel cm-left">
    <details class="cm-section" open>
      <summary class="cm-section-title">Global Variables</summary>
      <div id="secVariables" class="cm-section-body">
        <div id="varRows"></div>
        <button type="button" class="btn-add" id="btnAddVar">+ Add Variable</button>
      </div>
    </details>

    <details class="cm-section" open>
      <summary class="cm-section-title">Capture Variables</summary>
      <div id="secCaptureVars" class="cm-section-body">
        <div id="captureRows"></div>
        <button type="button" class="btn-add" id="btnAddCapture">+ Add Capture Variable</button>
      </div>
    </details>

    <details class="cm-section" open>
      <summary class="cm-section-title">Actions</summary>
      <div id="secActions" class="cm-section-body">
        <div id="actionCards"></div>
        <button type="button" class="btn-add" id="btnAddAction">+ Add Action</button>
      </div>
    </details>

    <div id="actionEditor" class="action-editor" hidden></div>
  </div>

  <!-- Right panel -->
  <div class="cm-panel cm-right">
    <details class="cm-section" open>
      <summary class="cm-section-title">Available Modules</summary>
      <div class="cm-section-body">
        <div class="module-fetch-row">
          <input type="text" id="inpPlanName" class="toolbar-input" placeholder="e.g. fapi1-advanced-final-test-plan" style="flex:1;min-width:0">
          <button type="button" class="btn-toolbar" id="btnFetchModules">Fetch</button>
        </div>
        <input type="text" id="inpModuleFilter" class="toolbar-input module-filter" placeholder="Filter modules...">
        <div class="module-bulk-actions">
          <button type="button" class="btn-small" id="btnSelectAll">Select All</button>
          <button type="button" class="btn-small" id="btnDeselectAll">Deselect All</button>
        </div>
        <div id="moduleList" class="module-list"></div>
      </div>
    </details>

    <details class="cm-section" open>
      <summary class="cm-section-title">Selected Modules</summary>
      <div class="cm-section-body">
        <div id="selectedModulesList" class="selected-modules-list"></div>
      </div>
    </details>

    <details class="cm-section" id="moduleDetailSection" hidden>
      <summary class="cm-section-title">Module Config</summary>
      <div class="cm-section-body" id="moduleDetailBody"></div>
    </details>
  </div>
</div>

<!-- Status bar -->
<footer class="status-bar" id="statusBar">Ready</footer>

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
.topbar-link{font-size:.82rem;color:#8b949e;text-decoration:none;padding:4px 10px;border:1px solid #30363d;border-radius:6px;transition:color .15s,border-color .15s}
.topbar-link:hover{color:#58a6ff;border-color:#58a6ff}
.topbar-title{font-size:.9rem;font-weight:600;color:#c9d1d9}

/* ── Toolbar ── */
.toolbar{display:flex;align-items:center;gap:.5rem;padding:.5rem 1.5rem;background:#161b22;border-bottom:1px solid #30363d;flex-wrap:wrap}
.toolbar-select{padding:5px 8px;background:#0d1117;border:1px solid #30363d;border-radius:5px;color:#c9d1d9;font-size:.82rem;min-width:180px;appearance:auto}
.toolbar-select:focus{outline:none;border-color:#58a6ff}
.toolbar-input{padding:5px 8px;background:#0d1117;border:1px solid #30363d;border-radius:5px;color:#c9d1d9;font-size:.82rem;min-width:200px}
.toolbar-input:focus{outline:none;border-color:#58a6ff}
.btn-toolbar{padding:5px 14px;background:#21262d;border:1px solid #30363d;border-radius:6px;color:#c9d1d9;font-size:.82rem;font-weight:600;cursor:pointer;white-space:nowrap}
.btn-toolbar:hover{background:#30363d}
.btn-toolbar.btn-primary{background:#238636;border-color:#238636;color:#fff}
.btn-toolbar.btn-primary:hover{background:#2ea043}
.btn-toolbar.btn-danger{background:#da3633;border-color:#da3633;color:#fff}
.btn-toolbar.btn-danger:hover{background:#f85149}
.dirty-badge{font-size:.72rem;color:#d29922;font-weight:600;padding:2px 8px;background:#d29a0033;border-radius:10px}

/* ── Main layout ── */
.cm-main{display:flex;flex:1;overflow:hidden}
.cm-panel{overflow-y:auto;padding:1rem 1.2rem}
.cm-left{width:42%;border-right:1px solid #30363d}
.cm-right{width:58%}

/* ── Sections ── */
.cm-section{border:1px solid #30363d;border-radius:8px;margin-bottom:.75rem;background:#161b22}
.cm-section-title{padding:.6rem .8rem;font-size:.85rem;font-weight:600;color:#c9d1d9;cursor:pointer;user-select:none;list-style:none;display:flex;align-items:center;gap:.4rem}
.cm-section-title::before{content:'\\25B6';font-size:.55rem;transition:transform .2s;display:inline-block}
.cm-section[open] .cm-section-title::before{transform:rotate(90deg)}
.cm-section-body{padding:0 .8rem .6rem}

/* ── Variable rows ── */
.var-row{display:flex;gap:.4rem;margin-bottom:.3rem;align-items:center}
.var-row input{flex:1;padding:4px 7px;background:#0d1117;border:1px solid #30363d;border-radius:4px;color:#c9d1d9;font-size:.8rem}
.var-row input:focus{outline:none;border-color:#58a6ff}
.btn-delete{background:none;border:1px solid #30363d;border-radius:4px;color:#f85149;cursor:pointer;font-size:.75rem;padding:2px 7px;line-height:1}
.btn-delete:hover{color:#ff7b72;border-color:#f85149}
.btn-add{background:none;border:1px dashed #30363d;border-radius:4px;color:#8b949e;font-size:.78rem;padding:4px 10px;cursor:pointer;width:100%;text-align:center;margin-top:.3rem}
.btn-add:hover{border-color:#58a6ff;color:#58a6ff}

/* ── Action cards ── */
.action-card{display:flex;align-items:center;gap:.5rem;padding:.5rem .7rem;background:#0d1117;border:1px solid #30363d;border-radius:6px;margin-bottom:.4rem;cursor:pointer;transition:border-color .15s}
.action-card:hover{border-color:#58a6ff}
.action-card-name{flex:1;font-size:.82rem;font-weight:600;color:#e6edf3;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.action-type-badge{font-size:.65rem;padding:2px 8px;border-radius:10px;font-weight:600;text-transform:uppercase}
.atb-api{background:#1f6feb33;color:#58a6ff}
.atb-browser{background:#23883533;color:#3fb950}
.action-btns{display:flex;gap:.3rem}
.btn-small{background:none;border:1px solid #30363d;border-radius:4px;color:#8b949e;font-size:.72rem;padding:2px 8px;cursor:pointer}
.btn-small:hover{color:#c9d1d9;border-color:#8b949e}

/* ── Drag handle ── */
.drag-handle{color:#484f58;cursor:grab;font-size:.95rem;padding:0 4px;user-select:none;line-height:1;flex-shrink:0;letter-spacing:-2px}
.drag-handle:hover{color:#8b949e}
.dragging{opacity:.4;background:#1f6feb22}
.drag-over-above{border-top:2px solid #58a6ff !important}
.drag-over-below{border-bottom:2px solid #58a6ff !important}

/* ── Action editor ── */
.action-editor{background:#161b22;border:1px solid #30363d;border-radius:8px;padding:.8rem;margin-top:.5rem}
.ae-row{display:flex;gap:.5rem;margin-bottom:.4rem;align-items:center}
.ae-row label{font-size:.78rem;color:#8b949e;min-width:70px}
.ae-row input,.ae-row select,.ae-row textarea{flex:1;padding:4px 7px;background:#0d1117;border:1px solid #30363d;border-radius:4px;color:#c9d1d9;font-size:.8rem}
.ae-row input:focus,.ae-row select:focus,.ae-row textarea:focus{outline:none;border-color:#58a6ff}
.ae-row textarea{min-height:60px;resize:vertical;font-family:monospace}
.ae-actions{display:flex;gap:.4rem;justify-content:flex-end;margin-top:.4rem}

/* ── Modules ── */
.module-fetch-row{display:flex;gap:.4rem;margin-bottom:.4rem}
.module-filter{width:100%;margin-bottom:.4rem}
.module-bulk-actions{display:flex;gap:.3rem;margin-bottom:.4rem}
.module-list{max-height:300px;overflow-y:auto;border:1px solid #21262d;border-radius:4px;background:#0d1117}
.module-item{display:flex;align-items:center;gap:.5rem;padding:.35rem .6rem;border-bottom:1px solid #21262d;font-size:.8rem;cursor:pointer;transition:background .1s}
.module-item:last-child{border-bottom:none}
.module-item:hover{background:#161b22}
.module-item.selected{background:#1f6feb22}
.module-item input[type=checkbox]{margin:0;cursor:pointer}
.module-item-name{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

/* ── Selected modules list ── */
.selected-modules-list{max-height:300px;overflow-y:auto;border:1px solid #21262d;border-radius:4px;background:#0d1117}
.selected-module-item{display:flex;align-items:center;gap:.4rem;padding:.35rem .6rem;border-bottom:1px solid #21262d;font-size:.8rem;transition:background .1s;cursor:pointer}
.selected-module-item:last-child{border-bottom:none}
.selected-module-item:hover{background:#161b22}
.selected-module-item.active{background:#1f6feb22}
.selected-module-item .drag-handle{margin-right:.2rem}
.selected-module-item-name{flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:500;color:#e6edf3}
.selected-module-item-actions{display:flex;gap:.3rem;flex-shrink:0}

/* ── Module detail ── */
.md-sub{font-size:.78rem;color:#8b949e;margin-bottom:.3rem;font-weight:600}
.md-action-row{display:flex;align-items:center;gap:.4rem;padding:.25rem 0;font-size:.8rem}
.md-action-row input[type=checkbox]{margin:0}
.md-action-row .drag-handle{margin-right:.2rem}

/* ── Status bar ── */
.status-bar{flex-shrink:0;padding:.4rem 1.5rem;background:#161b22;border-top:1px solid #30363d;font-size:.75rem;color:#8b949e}
.status-bar.status-ok{color:#3fb950}
.status-bar.status-error{color:#f85149}
`;
}

// ── JavaScript ──────────────────────────────────────

function jsBlock(): string {
  return `
(function() {
  // ── State ──
  var state = {
    filename: '',
    isNew: false,
    dirty: false,
    config: {
      capture_vars: [],
      variables: {},
      actions: [],
      modules: []
    },
    availableModules: [],
    selectedModuleName: null,
    editingActionIndex: -1
  };

  // ── DOM refs ──
  var selConfig = document.getElementById('selConfig');
  var inpPlanName = document.getElementById('inpPlanName');
  var inpFilename = document.getElementById('inpFilename');
  var inpModuleFilter = document.getElementById('inpModuleFilter');
  var dirtyBadge = document.getElementById('dirtyBadge');
  var statusBar = document.getElementById('statusBar');
  var varRows = document.getElementById('varRows');
  var captureRows = document.getElementById('captureRows');
  var actionCards = document.getElementById('actionCards');
  var actionEditor = document.getElementById('actionEditor');
  var moduleList = document.getElementById('moduleList');
  var selectedModulesList = document.getElementById('selectedModulesList');
  var moduleDetailSection = document.getElementById('moduleDetailSection');
  var moduleDetailBody = document.getElementById('moduleDetailBody');

  // ── Init ──
  loadConfigList();

  document.getElementById('btnNew').addEventListener('click', newConfig);
  document.getElementById('btnLoad').addEventListener('click', function() { loadConfig(selConfig.value); });
  document.getElementById('btnSave').addEventListener('click', saveConfig);
  document.getElementById('btnDelete').addEventListener('click', deleteConfig);
  document.getElementById('btnAddVar').addEventListener('click', addVariable);
  document.getElementById('btnAddCapture').addEventListener('click', addCaptureVar);
  document.getElementById('btnAddAction').addEventListener('click', addAction);
  document.getElementById('btnFetchModules').addEventListener('click', function() { fetchModules(inpPlanName.value.trim()); });
  document.getElementById('btnSelectAll').addEventListener('click', selectAllModules);
  document.getElementById('btnDeselectAll').addEventListener('click', deselectAllModules);
  inpModuleFilter.addEventListener('input', function() { renderModuleCheckboxes(); });

  // ── Config list ──
  function loadConfigList() {
    fetch('/api/configs').then(function(r) { return r.json(); }).then(function(d) {
      selConfig.innerHTML = '<option value="">\\u2014 select config \\u2014</option>';
      (d.files || []).forEach(function(f) {
        var opt = document.createElement('option');
        opt.value = f;
        opt.textContent = f;
        selConfig.appendChild(opt);
      });
    }).catch(function() {});
  }

  // ── Load config ──
  function loadConfig(filename) {
    if (!filename) { setStatus('Select a config file first', true); return; }
    fetch('/api/config/' + encodeURIComponent(filename))
      .then(function(r) {
        if (!r.ok) return r.json().then(function(e) { throw new Error(e.error || r.statusText); });
        return r.json();
      })
      .then(function(cfg) {
        state.config = {
          capture_vars: cfg.capture_vars || [],
          variables: cfg.variables || {},
          actions: cfg.actions || [],
          modules: cfg.modules || []
        };
        state.filename = filename;
        state.isNew = false;
        state.dirty = false;
        state.editingActionIndex = -1;
        state.selectedModuleName = null;
        inpFilename.value = filename;
        renderAll();
        setStatus('Loaded: ' + filename, false);
      })
      .catch(function(err) { setStatus('Load failed: ' + err.message, true); });
  }

  // ── Save config ──
  function saveConfig() {
    var fname = inpFilename.value.trim();
    if (!fname) { setStatus('Enter a filename', true); return; }
    if (!fname.endsWith('.config.json')) { setStatus('Filename must end with .config.json', true); return; }

    var errors = validateConfig();
    if (errors.length > 0) { setStatus('Validation: ' + errors.join('; '), true); return; }

    var body = buildConfigPayload();

    fetch('/api/config/' + encodeURIComponent(fname), {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
      .then(function(r) {
        if (!r.ok) return r.json().then(function(e) { throw new Error(e.error || r.statusText); });
        return r.json();
      })
      .then(function() {
        state.filename = fname;
        state.isNew = false;
        state.dirty = false;
        dirtyBadge.hidden = true;
        setStatus('Saved: ' + fname, false);
        loadConfigList();
      })
      .catch(function(err) { setStatus('Save failed: ' + err.message, true); });
  }

  // ── Delete config ──
  function deleteConfig() {
    var fname = selConfig.value || inpFilename.value.trim();
    if (!fname) { setStatus('No config selected to delete', true); return; }
    if (!confirm('Delete ' + fname + '?')) return;

    fetch('/api/config/' + encodeURIComponent(fname), { method: 'DELETE' })
      .then(function(r) {
        if (!r.ok) return r.json().then(function(e) { throw new Error(e.error || r.statusText); });
        return r.json();
      })
      .then(function() {
        newConfig();
        setStatus('Deleted: ' + fname, false);
        loadConfigList();
      })
      .catch(function(err) { setStatus('Delete failed: ' + err.message, true); });
  }

  // ── New config ──
  function newConfig() {
    state.config = { capture_vars: [], variables: {}, actions: [], modules: [] };
    state.filename = '';
    state.isNew = true;
    state.dirty = false;
    state.editingActionIndex = -1;
    state.selectedModuleName = null;
    state.availableModules = [];
    inpFilename.value = '';
    selConfig.value = '';
    renderAll();
    setStatus('New config \\u2014 enter a filename and start editing', false);
  }

  // ── Build payload from state ──
  function buildConfigPayload() {
    return {
      capture_vars: state.config.capture_vars,
      variables: state.config.variables,
      actions: state.config.actions,
      modules: state.config.modules
    };
  }

  // ── Client-side validation ──
  function validateConfig() {
    var errs = [];
    var actionNames = {};
    for (var i = 0; i < state.config.actions.length; i++) {
      var a = state.config.actions[i];
      if (!a.name || !a.name.trim()) errs.push('Action #' + (i + 1) + ' has no name');
      if (a.name && actionNames[a.name]) errs.push('Duplicate action name: ' + a.name);
      actionNames[a.name] = true;
      if (a.type === 'api' && (!a.endpoint || !a.endpoint.trim())) errs.push('API action "' + a.name + '" needs an endpoint');
      if (a.type === 'browser' && (!a.url || !a.url.trim())) errs.push('Browser action "' + a.name + '" needs a URL');
    }
    var varKeys = {};
    var keys = Object.keys(state.config.variables);
    for (var k = 0; k < keys.length; k++) {
      if (varKeys[keys[k]]) errs.push('Duplicate variable key: ' + keys[k]);
      varKeys[keys[k]] = true;
    }
    return errs;
  }

  // ── Render all ──
  function renderAll() {
    dirtyBadge.hidden = !state.dirty;
    renderVariables();
    renderCaptureVars();
    renderActions();
    renderModuleCheckboxes();
    renderSelectedModules();
    renderModuleDetail();
    actionEditor.hidden = true;
  }

  // ── Variables ──
  function renderVariables() {
    varRows.innerHTML = '';
    var keys = Object.keys(state.config.variables);
    for (var i = 0; i < keys.length; i++) {
      (function(key) {
        var row = document.createElement('div');
        row.className = 'var-row';
        var inpKey = document.createElement('input');
        inpKey.type = 'text'; inpKey.placeholder = 'key'; inpKey.value = key;
        var inpVal = document.createElement('input');
        inpVal.type = 'text'; inpVal.placeholder = 'value'; inpVal.value = state.config.variables[key];
        var btnDel = document.createElement('button');
        btnDel.className = 'btn-delete'; btnDel.textContent = 'x'; btnDel.type = 'button';

        inpKey.addEventListener('change', function() {
          var newKey = inpKey.value.trim();
          if (newKey && newKey !== key) {
            var val = state.config.variables[key];
            delete state.config.variables[key];
            state.config.variables[newKey] = val;
            markDirty();
            renderVariables();
          }
        });
        inpVal.addEventListener('change', function() {
          state.config.variables[key] = inpVal.value;
          markDirty();
        });
        btnDel.addEventListener('click', function() {
          delete state.config.variables[key];
          markDirty();
          renderVariables();
        });

        row.appendChild(inpKey); row.appendChild(inpVal); row.appendChild(btnDel);
        varRows.appendChild(row);
      })(keys[i]);
    }
  }

  function addVariable() {
    var k = 'new_var_' + Date.now();
    state.config.variables[k] = '';
    markDirty();
    renderVariables();
  }

  // ── Capture Variables ──
  function renderCaptureVars() {
    captureRows.innerHTML = '';
    for (var i = 0; i < state.config.capture_vars.length; i++) {
      (function(idx) {
        var row = document.createElement('div');
        row.className = 'var-row';
        var inp = document.createElement('input');
        inp.type = 'text'; inp.placeholder = 'variable name'; inp.value = state.config.capture_vars[idx];
        var btnDel = document.createElement('button');
        btnDel.className = 'btn-delete'; btnDel.textContent = 'x'; btnDel.type = 'button';

        inp.addEventListener('change', function() {
          state.config.capture_vars[idx] = inp.value.trim();
          markDirty();
        });
        btnDel.addEventListener('click', function() {
          state.config.capture_vars.splice(idx, 1);
          markDirty();
          renderCaptureVars();
        });

        row.appendChild(inp); row.appendChild(btnDel);
        captureRows.appendChild(row);
      })(i);
    }
  }

  function addCaptureVar() {
    state.config.capture_vars.push('');
    markDirty();
    renderCaptureVars();
  }

  // ── Actions ──
  function renderActions() {
    actionCards.innerHTML = '';
    for (var i = 0; i < state.config.actions.length; i++) {
      (function(idx) {
        var a = state.config.actions[idx];
        var card = document.createElement('div');
        card.className = 'action-card';

        var nameEl = document.createElement('span');
        nameEl.className = 'action-card-name';
        nameEl.textContent = a.name || '(unnamed)';

        var badge = document.createElement('span');
        badge.className = 'action-type-badge atb-' + a.type;
        badge.textContent = a.type;

        var btns = document.createElement('div');
        btns.className = 'action-btns';
        var btnEdit = document.createElement('button');
        btnEdit.className = 'btn-small'; btnEdit.textContent = 'edit'; btnEdit.type = 'button';
        var btnDel = document.createElement('button');
        btnDel.className = 'btn-delete'; btnDel.textContent = 'x'; btnDel.type = 'button';

        btnEdit.addEventListener('click', function(e) { e.stopPropagation(); renderActionEditor(idx); });
        btnDel.addEventListener('click', function(e) {
          e.stopPropagation();
          state.config.actions.splice(idx, 1);
          if (state.editingActionIndex === idx) { state.editingActionIndex = -1; actionEditor.hidden = true; }
          markDirty();
          renderActions();
        });

        btns.appendChild(btnEdit); btns.appendChild(btnDel);
        card.appendChild(nameEl); card.appendChild(badge); card.appendChild(btns);
        card.addEventListener('click', function() { renderActionEditor(idx); });
        actionCards.appendChild(card);
      })(i);
    }
  }

  function addAction() {
    state.config.actions.push({ name: '', type: 'api', endpoint: '', method: 'POST' });
    markDirty();
    renderActions();
    renderActionEditor(state.config.actions.length - 1);
  }

  // ── Action Editor ──
  function renderActionEditor(idx) {
    state.editingActionIndex = idx;
    var a = state.config.actions[idx];
    if (!a) { actionEditor.hidden = true; return; }

    actionEditor.hidden = false;
    actionEditor.innerHTML = '';

    // Name row
    var nameRow = mkRow('Name');
    var inpName = document.createElement('input');
    inpName.type = 'text'; inpName.value = a.name || '';
    inpName.addEventListener('change', function() { a.name = inpName.value.trim(); markDirty(); renderActions(); });
    nameRow.appendChild(inpName);
    actionEditor.appendChild(nameRow);

    // Type row
    var typeRow = mkRow('Type');
    var selType = document.createElement('select');
    selType.innerHTML = '<option value="api">api</option><option value="browser">browser</option>';
    selType.value = a.type;
    selType.addEventListener('change', function() {
      var newType = selType.value;
      if (newType === 'api') {
        state.config.actions[idx] = { name: a.name, type: 'api', endpoint: a.endpoint || '', method: a.method || 'POST' };
      } else {
        state.config.actions[idx] = { name: a.name, type: 'browser', operation: 'navigate', url: a.url || '', wait_for: 'networkidle' };
      }
      markDirty();
      renderActions();
      renderActionEditor(idx);
    });
    typeRow.appendChild(selType);
    actionEditor.appendChild(typeRow);

    if (a.type === 'api') {
      // Endpoint
      var epRow = mkRow('Endpoint');
      var inpEp = document.createElement('input');
      inpEp.type = 'text'; inpEp.value = a.endpoint || '';
      inpEp.addEventListener('change', function() { a.endpoint = inpEp.value; markDirty(); });
      epRow.appendChild(inpEp);
      actionEditor.appendChild(epRow);

      // Method
      var methRow = mkRow('Method');
      var selMeth = document.createElement('select');
      selMeth.innerHTML = '<option value="GET">GET</option><option value="POST">POST</option><option value="PUT">PUT</option><option value="DELETE">DELETE</option>';
      selMeth.value = a.method || 'POST';
      selMeth.addEventListener('change', function() { a.method = selMeth.value; markDirty(); });
      methRow.appendChild(selMeth);
      actionEditor.appendChild(methRow);

      // Payload
      var payRow = mkRow('Payload');
      var taPay = document.createElement('textarea');
      taPay.value = a.payload ? JSON.stringify(a.payload, null, 2) : '';
      taPay.placeholder = '{"key": "value"} (JSON)';
      taPay.addEventListener('change', function() {
        var v = taPay.value.trim();
        if (!v) { a.payload = undefined; markDirty(); return; }
        try { a.payload = JSON.parse(v); markDirty(); } catch(e) { setStatus('Invalid JSON in payload', true); }
      });
      payRow.appendChild(taPay);
      actionEditor.appendChild(payRow);

      // Headers
      var hdRow = mkRow('Headers');
      var taHd = document.createElement('textarea');
      taHd.value = a.headers ? JSON.stringify(a.headers, null, 2) : '';
      taHd.placeholder = '{"Header": "value"} (JSON)';
      taHd.addEventListener('change', function() {
        var v = taHd.value.trim();
        if (!v) { a.headers = undefined; markDirty(); return; }
        try { a.headers = JSON.parse(v); markDirty(); } catch(e) { setStatus('Invalid JSON in headers', true); }
      });
      hdRow.appendChild(taHd);
      actionEditor.appendChild(hdRow);
    } else {
      // Browser — URL
      var urlRow = mkRow('URL');
      var inpUrl = document.createElement('input');
      inpUrl.type = 'text'; inpUrl.value = a.url || '';
      inpUrl.addEventListener('change', function() { a.url = inpUrl.value; markDirty(); });
      urlRow.appendChild(inpUrl);
      actionEditor.appendChild(urlRow);

      // Wait For
      var wfRow = mkRow('Wait For');
      var selWf = document.createElement('select');
      selWf.innerHTML = '<option value="networkidle">networkidle</option><option value="domcontentloaded">domcontentloaded</option><option value="load">load</option>';
      selWf.value = a.wait_for || 'networkidle';
      selWf.addEventListener('change', function() { a.wait_for = selWf.value; markDirty(); });
      wfRow.appendChild(selWf);
      actionEditor.appendChild(wfRow);
    }

    // Done button
    var doneRow = document.createElement('div');
    doneRow.className = 'ae-actions';
    var btnDone = document.createElement('button');
    btnDone.className = 'btn-toolbar'; btnDone.textContent = 'Done'; btnDone.type = 'button';
    btnDone.addEventListener('click', function() { state.editingActionIndex = -1; actionEditor.hidden = true; });
    doneRow.appendChild(btnDone);
    actionEditor.appendChild(doneRow);
  }

  function mkRow(label) {
    var row = document.createElement('div');
    row.className = 'ae-row';
    var lbl = document.createElement('label');
    lbl.textContent = label;
    row.appendChild(lbl);
    return row;
  }

  // ── Modules: Fetch ──
  function fetchModules(planName) {
    if (!planName) { setStatus('Enter a plan name first', true); return; }
    setStatus('Fetching modules for ' + planName + '...', false);
    fetch('/api/plan/info/' + encodeURIComponent(planName))
      .then(function(r) {
        if (!r.ok) return r.json().then(function(e) { throw new Error(e.error || r.statusText); });
        return r.json();
      })
      .then(function(info) {
        state.availableModules = (info.modules || []).map(function(m) { return m.testModule; });
        renderModuleCheckboxes();
        setStatus('Fetched ' + state.availableModules.length + ' modules from ' + planName, false);
      })
      .catch(function(err) { setStatus('Fetch failed: ' + err.message, true); });
  }

  // ── Available Modules: checkbox list ──
  function renderModuleCheckboxes() {
    moduleList.innerHTML = '';
    var filter = (inpModuleFilter.value || '').toLowerCase();

    // Merge available modules with modules already in config
    var allNames = state.availableModules.slice();
    var configModuleNames = state.config.modules.map(function(m) { return m.name; });
    for (var i = 0; i < configModuleNames.length; i++) {
      if (allNames.indexOf(configModuleNames[i]) === -1) {
        allNames.push(configModuleNames[i]);
      }
    }

    allNames.sort();

    for (var j = 0; j < allNames.length; j++) {
      (function(name) {
        if (filter && name.toLowerCase().indexOf(filter) === -1) return;

        var item = document.createElement('div');
        item.className = 'module-item';

        var cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = configModuleNames.indexOf(name) !== -1;
        cb.addEventListener('change', function() {
          toggleModule(name, cb.checked);
          renderSelectedModules();
        });

        var lbl = document.createElement('span');
        lbl.className = 'module-item-name';
        lbl.textContent = name;

        item.appendChild(cb);
        item.appendChild(lbl);
        moduleList.appendChild(item);
      })(allNames[j]);
    }
  }

  function toggleModule(name, checked) {
    var idx = -1;
    for (var i = 0; i < state.config.modules.length; i++) {
      if (state.config.modules[i].name === name) { idx = i; break; }
    }
    if (checked && idx === -1) {
      state.config.modules.push({ name: name });
      markDirty();
    } else if (!checked && idx !== -1) {
      state.config.modules.splice(idx, 1);
      if (state.selectedModuleName === name) {
        state.selectedModuleName = null;
        renderModuleDetail();
      }
      markDirty();
    }
  }

  function selectAllModules() {
    var filter = (inpModuleFilter.value || '').toLowerCase();
    var allNames = state.availableModules.slice();
    var configModuleNames = state.config.modules.map(function(m) { return m.name; });
    for (var i = 0; i < configModuleNames.length; i++) {
      if (allNames.indexOf(configModuleNames[i]) === -1) allNames.push(configModuleNames[i]);
    }
    for (var j = 0; j < allNames.length; j++) {
      if (filter && allNames[j].toLowerCase().indexOf(filter) === -1) continue;
      var exists = false;
      for (var k = 0; k < state.config.modules.length; k++) {
        if (state.config.modules[k].name === allNames[j]) { exists = true; break; }
      }
      if (!exists) state.config.modules.push({ name: allNames[j] });
    }
    markDirty();
    renderModuleCheckboxes();
    renderSelectedModules();
  }

  function deselectAllModules() {
    var filter = (inpModuleFilter.value || '').toLowerCase();
    state.config.modules = state.config.modules.filter(function(m) {
      if (filter && m.name.toLowerCase().indexOf(filter) === -1) return true;
      return false;
    });
    state.selectedModuleName = null;
    markDirty();
    renderModuleCheckboxes();
    renderSelectedModules();
    renderModuleDetail();
  }

  // ── Selected Modules: ordered list with drag-to-reorder ──
  var dragModuleIdx = -1;

  function renderSelectedModules() {
    selectedModulesList.innerHTML = '';

    if (state.config.modules.length === 0) {
      var empty = document.createElement('div');
      empty.style.cssText = 'padding:.5rem .6rem;font-size:.78rem;color:#8b949e';
      empty.textContent = 'No modules selected. Check modules above to add them.';
      selectedModulesList.appendChild(empty);
      return;
    }

    for (var i = 0; i < state.config.modules.length; i++) {
      (function(idx) {
        var mod = state.config.modules[idx];
        var item = document.createElement('div');
        item.className = 'selected-module-item' + (state.selectedModuleName === mod.name ? ' active' : '');
        item.setAttribute('draggable', 'true');
        item.dataset.idx = String(idx);

        // Drag handle
        var handle = document.createElement('span');
        handle.className = 'drag-handle';
        handle.textContent = '\\u2807\\u2807';

        // Drag events
        item.addEventListener('dragstart', function(e) {
          dragModuleIdx = idx;
          e.dataTransfer.effectAllowed = 'move';
          e.dataTransfer.setData('text/plain', String(idx));
          setTimeout(function() { item.classList.add('dragging'); }, 0);
        });
        item.addEventListener('dragend', function() {
          item.classList.remove('dragging');
          dragModuleIdx = -1;
          clearDragIndicators(selectedModulesList);
        });
        item.addEventListener('dragover', function(e) {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          clearDragIndicators(selectedModulesList);
          if (dragModuleIdx === -1 || dragModuleIdx === idx) return;
          var rect = item.getBoundingClientRect();
          var midY = rect.top + rect.height / 2;
          if (e.clientY < midY) {
            item.classList.add('drag-over-above');
          } else {
            item.classList.add('drag-over-below');
          }
        });
        item.addEventListener('dragleave', function() {
          item.classList.remove('drag-over-above', 'drag-over-below');
        });
        item.addEventListener('drop', function(e) {
          e.preventDefault();
          clearDragIndicators(selectedModulesList);
          var fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
          if (isNaN(fromIdx) || fromIdx === idx) return;
          var rect = item.getBoundingClientRect();
          var midY = rect.top + rect.height / 2;
          var toIdx = e.clientY < midY ? idx : idx + 1;
          if (fromIdx < toIdx) toIdx--;
          if (fromIdx === toIdx) return;
          var moved = state.config.modules.splice(fromIdx, 1)[0];
          state.config.modules.splice(toIdx, 0, moved);
          markDirty();
          renderSelectedModules();
        });

        var nameEl = document.createElement('span');
        nameEl.className = 'selected-module-item-name';
        nameEl.textContent = mod.name;

        var actions = document.createElement('div');
        actions.className = 'selected-module-item-actions';

        var btnConfig = document.createElement('button');
        btnConfig.className = 'btn-small';
        btnConfig.textContent = 'config';
        btnConfig.type = 'button';
        btnConfig.addEventListener('click', function(e) {
          e.stopPropagation();
          state.selectedModuleName = mod.name;
          renderSelectedModules();
          renderModuleDetail();
        });

        var btnRemove = document.createElement('button');
        btnRemove.className = 'btn-delete';
        btnRemove.textContent = 'x';
        btnRemove.type = 'button';
        btnRemove.addEventListener('click', function(e) {
          e.stopPropagation();
          state.config.modules.splice(idx, 1);
          if (state.selectedModuleName === mod.name) {
            state.selectedModuleName = null;
            renderModuleDetail();
          }
          markDirty();
          renderSelectedModules();
          renderModuleCheckboxes();
        });

        actions.appendChild(btnConfig);
        actions.appendChild(btnRemove);

        item.appendChild(handle);
        item.appendChild(nameEl);
        item.appendChild(actions);

        item.addEventListener('click', function() {
          state.selectedModuleName = mod.name;
          renderSelectedModules();
          renderModuleDetail();
        });

        selectedModulesList.appendChild(item);
      })(i);
    }
  }

  // ── Module detail / config ──
  function renderModuleDetail() {
    if (!state.selectedModuleName) {
      moduleDetailSection.hidden = true;
      return;
    }

    moduleDetailSection.hidden = false;
    moduleDetailSection.open = true;
    moduleDetailBody.innerHTML = '';

    var name = state.selectedModuleName;
    var modCfg = null;
    for (var i = 0; i < state.config.modules.length; i++) {
      if (state.config.modules[i].name === name) { modCfg = state.config.modules[i]; break; }
    }

    // Title
    var title = document.createElement('div');
    title.className = 'md-sub';
    title.textContent = name;
    moduleDetailBody.appendChild(title);

    if (!modCfg) {
      var note = document.createElement('div');
      note.style.cssText = 'font-size:.78rem;color:#8b949e;margin-top:.3rem';
      note.textContent = 'This module is not selected. Check its checkbox to configure it.';
      moduleDetailBody.appendChild(note);
      return;
    }

    // ── Assigned Actions (drag-to-reorder for checked) ──
    if (state.config.actions.length > 0) {
      var aTitle = document.createElement('div');
      aTitle.className = 'md-sub';
      aTitle.textContent = 'Assigned Actions:';
      aTitle.style.marginTop = '.5rem';
      moduleDetailBody.appendChild(aTitle);

      var assignedActions = modCfg.actions || [];

      // Build ordered list: checked first (in their order), then unchecked
      var checkedNames = [];
      var uncheckedNames = [];
      for (var c = 0; c < assignedActions.length; c++) {
        var stillExists = false;
        for (var g = 0; g < state.config.actions.length; g++) {
          if (state.config.actions[g].name === assignedActions[c]) { stillExists = true; break; }
        }
        if (stillExists) checkedNames.push(assignedActions[c]);
      }
      for (var g2 = 0; g2 < state.config.actions.length; g2++) {
        var aName = state.config.actions[g2].name;
        if (checkedNames.indexOf(aName) === -1) uncheckedNames.push(aName);
      }

      // Draggable container for checked actions
      var dragActionIdx = -1;
      var checkedContainer = document.createElement('div');
      checkedContainer.className = 'md-checked-actions';

      for (var ci = 0; ci < checkedNames.length; ci++) {
        (function(actionName, checkedIdx) {
          var row = document.createElement('div');
          row.className = 'md-action-row';
          row.setAttribute('draggable', 'true');
          row.dataset.idx = String(checkedIdx);

          var handle = document.createElement('span');
          handle.className = 'drag-handle';
          handle.textContent = '\\u2807\\u2807';

          row.addEventListener('dragstart', function(e) {
            dragActionIdx = checkedIdx;
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', String(checkedIdx));
            setTimeout(function() { row.classList.add('dragging'); }, 0);
          });
          row.addEventListener('dragend', function() {
            row.classList.remove('dragging');
            dragActionIdx = -1;
            clearDragIndicators(checkedContainer);
          });
          row.addEventListener('dragover', function(e) {
            e.preventDefault();
            e.dataTransfer.dropEffect = 'move';
            clearDragIndicators(checkedContainer);
            if (dragActionIdx === -1 || dragActionIdx === checkedIdx) return;
            var rect = row.getBoundingClientRect();
            var midY = rect.top + rect.height / 2;
            if (e.clientY < midY) {
              row.classList.add('drag-over-above');
            } else {
              row.classList.add('drag-over-below');
            }
          });
          row.addEventListener('dragleave', function() {
            row.classList.remove('drag-over-above', 'drag-over-below');
          });
          row.addEventListener('drop', function(e) {
            e.preventDefault();
            clearDragIndicators(checkedContainer);
            var fromIdx = parseInt(e.dataTransfer.getData('text/plain'), 10);
            if (isNaN(fromIdx) || fromIdx === checkedIdx) return;
            var rect = row.getBoundingClientRect();
            var midY = rect.top + rect.height / 2;
            var toIdx = e.clientY < midY ? checkedIdx : checkedIdx + 1;
            if (fromIdx < toIdx) toIdx--;
            if (fromIdx === toIdx) return;
            var moved = modCfg.actions.splice(fromIdx, 1)[0];
            modCfg.actions.splice(toIdx, 0, moved);
            markDirty();
            renderModuleDetail();
          });

          var cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.checked = true;
          cb.addEventListener('change', function() {
            modCfg.actions = modCfg.actions.filter(function(x) { return x !== actionName; });
            markDirty();
            renderModuleDetail();
          });

          var lbl = document.createElement('span');
          lbl.textContent = actionName;

          row.appendChild(handle);
          row.appendChild(cb);
          row.appendChild(lbl);
          checkedContainer.appendChild(row);
        })(checkedNames[ci], ci);
      }
      moduleDetailBody.appendChild(checkedContainer);

      // Unchecked actions (not draggable)
      for (var ui = 0; ui < uncheckedNames.length; ui++) {
        (function(actionName) {
          var row = document.createElement('div');
          row.className = 'md-action-row';

          // Spacer matching drag handle width
          var spacer = document.createElement('span');
          spacer.style.cssText = 'width:24px;flex-shrink:0';

          var cb = document.createElement('input');
          cb.type = 'checkbox';
          cb.checked = false;
          cb.addEventListener('change', function() {
            if (!modCfg.actions) modCfg.actions = [];
            if (modCfg.actions.indexOf(actionName) === -1) modCfg.actions.push(actionName);
            markDirty();
            renderModuleDetail();
          });

          var lbl = document.createElement('span');
          lbl.textContent = actionName;

          row.appendChild(spacer);
          row.appendChild(cb);
          row.appendChild(lbl);
          moduleDetailBody.appendChild(row);
        })(uncheckedNames[ui]);
      }
    }

    // ── Module-level variables ──
    var vTitle = document.createElement('div');
    vTitle.className = 'md-sub';
    vTitle.textContent = 'Module Variables:';
    vTitle.style.marginTop = '.5rem';
    moduleDetailBody.appendChild(vTitle);

    var modVarContainer = document.createElement('div');
    modVarContainer.id = 'modVarContainer';

    function renderModVars() {
      modVarContainer.innerHTML = '';
      var keys = Object.keys(modCfg.variables || {});
      for (var v = 0; v < keys.length; v++) {
        (function(key) {
          var row = document.createElement('div');
          row.className = 'var-row';
          var inpK = document.createElement('input');
          inpK.type = 'text'; inpK.value = key; inpK.placeholder = 'key';
          var inpV = document.createElement('input');
          inpV.type = 'text'; inpV.value = (modCfg.variables || {})[key]; inpV.placeholder = 'value';
          var btnDel = document.createElement('button');
          btnDel.className = 'btn-delete'; btnDel.textContent = 'x'; btnDel.type = 'button';

          inpK.addEventListener('change', function() {
            var nk = inpK.value.trim();
            if (nk && nk !== key) {
              var val = modCfg.variables[key];
              delete modCfg.variables[key];
              modCfg.variables[nk] = val;
              markDirty();
              renderModVars();
            }
          });
          inpV.addEventListener('change', function() { modCfg.variables[key] = inpV.value; markDirty(); });
          btnDel.addEventListener('click', function() { delete modCfg.variables[key]; markDirty(); renderModVars(); });

          row.appendChild(inpK); row.appendChild(inpV); row.appendChild(btnDel);
          modVarContainer.appendChild(row);
        })(keys[v]);
      }
    }

    renderModVars();
    moduleDetailBody.appendChild(modVarContainer);

    var btnAddModVar = document.createElement('button');
    btnAddModVar.className = 'btn-add';
    btnAddModVar.textContent = '+ Add Module Variable';
    btnAddModVar.type = 'button';
    btnAddModVar.addEventListener('click', function() {
      if (!modCfg.variables) modCfg.variables = {};
      modCfg.variables['new_var_' + Date.now()] = '';
      markDirty();
      renderModVars();
    });
    moduleDetailBody.appendChild(btnAddModVar);
  }

  function clearDragIndicators(container) {
    var items = container.querySelectorAll('.drag-over-above,.drag-over-below');
    for (var d = 0; d < items.length; d++) {
      items[d].classList.remove('drag-over-above', 'drag-over-below');
    }
  }

  // ── Helpers ──
  function markDirty() {
    state.dirty = true;
    dirtyBadge.hidden = false;
  }

  function setStatus(msg, isError) {
    statusBar.textContent = msg;
    statusBar.className = 'status-bar' + (isError ? ' status-error' : ' status-ok');
  }
})();
`;
}
