// ── Favicon dark mode (était inline dans <head>) ──
  (function () {
    const favicon = document.getElementById('favicon');
    const mql = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = (isDark) => { favicon.href = isDark ? 'TP.png' : 'DarkTP.png'; };
    apply(mql.matches);
    mql.addEventListener('change', (e) => apply(e.matches));
  })();

// ── Code principal ──
const PROXY_DATA = {
  dnsgoogle:      {title:'dns.google', desc:'API DNS-over-HTTPS de Google (DoH). Utilisée pour résoudre MX, SPF, DKIM, DMARC, DNSSEC, BIMI et MTA-STS. Aucune donnée personnelle transmise — seulement le nom de domaine.', url:'https://dns.google/resolve'},
  rdap:           {title:'rdap.org',   desc:'Service RDAP public (Registration Data Access Protocol). Utilisé pour récupérer les données WHOIS : registrar, serveurs NS, dates de création/expiration. Lecture seule.', url:'https://rdap.org/domain/'},
  mslogin:        {title:'login.microsoftonline.com', desc:'Endpoint public officiel Microsoft. Utilisé pour détecter le Tenant ID (OpenID Connect) et valider le GUID du tenant.', url:'https://login.microsoftonline.com/common/.well-known/openid-configuration'},
  googleaccounts: {title:'accounts.google.com', desc:'Endpoint public officiel Google. Utilisé pour détecter Google Workspace via OpenID Connect (issuer, token & authorization endpoints). Lecture seule.', url:'https://accounts.google.com/.well-known/openid-configuration'},
};

// ── Drop section toggle ──
function toggleDropSection(btn) {
  btn.classList.toggle('open');
  const body = btn.nextElementSibling;
  if (body) body.classList.toggle('open');
}

// ── Dropdown ──
function toggleDropdown() {
  document.getElementById('mainDropdown').classList.toggle('open');
}
document.addEventListener('click', e => {
  const d  = document.getElementById('mainDropdown');
  const ov = document.getElementById('proxyOverlay');
  if (!d.contains(e.target) && !ov.contains(e.target)) {
    d.classList.remove('open');
    hideProxyDetail();
  }
});
function showProxyDetail(key) {
  const p = PROXY_DATA[key]; if (!p) return;
  document.getElementById('pdTitle').textContent = p.title;
  document.getElementById('pdDesc').textContent  = p.desc;
  document.getElementById('pdUrl').textContent   = p.url;
  const menu  = document.getElementById('dropMenu');
  const panel = document.getElementById('proxyDetailPanel');
  const rect  = menu.getBoundingClientRect();
  panel.style.top   = rect.top + 'px';
  panel.style.right = (window.innerWidth - rect.left + 8) + 'px';
  panel.style.left  = 'auto';
  document.getElementById('proxyOverlay').classList.add('open');
  panel.classList.add('open');
}
function hideProxyDetail() {
  document.getElementById('proxyDetailPanel').classList.remove('open');
  document.getElementById('proxyOverlay').classList.remove('open');
}

// ── Dark mode ──
function syncDarkUI(isDark) {
  document.getElementById('darkLabel').textContent = isDark ? 'Mode clair' : 'Mode sombre';
  document.getElementById('darkSwitch').classList.toggle('on', isDark);
}
function toggleDark() {
  const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
  document.documentElement.setAttribute('data-theme', isDark ? 'light' : 'dark');
  syncDarkUI(!isDark);
}
(function () {
  const isDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  if (isDark) document.documentElement.setAttribute('data-theme', 'dark');
  syncDarkUI(isDark);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
    document.documentElement.setAttribute('data-theme', e.matches ? 'dark' : 'light');
    syncDarkUI(e.matches);
  });
})();

// ── Collapsible ──
function toggleCollapsible(bodyId, arrowId) {
  const body  = document.getElementById(bodyId);
  const arrow = document.getElementById(arrowId);
  const open  = body.classList.contains('open');
  body.classList.toggle('open', !open);
  arrow.classList.toggle('open', !open);
}

// ── History ──
const HISTORY_KEY = 'tenantIdHistory_v1';
const HISTORY_OPT_KEY = 'tenantIdHistory_enabled';

function isHistoryEnabled() {
  try { return localStorage.getItem(HISTORY_OPT_KEY) === 'true'; } catch { return false; }
}
function setHistoryEnabled(val) {
  if (!val && isHistoryEnabled()) {
    const hasData = loadHistory().length > 0;
    if (hasData) {
      showDeleteConfirm();
      return;
    }
  }
  try { localStorage.setItem(HISTORY_OPT_KEY, val ? 'true' : 'false'); } catch {}
  syncHistoryToggleUI();
  if (!val) { saveHistory([]); renderHistory(); }
  else renderHistory();
  syncCacheIndicator();
}
function showDeleteConfirm() {
  const modal = document.getElementById('deleteConfirmModal');
  if (modal) modal.classList.add('open');
}
function hideDeleteConfirm() {
  const modal = document.getElementById('deleteConfirmModal');
  if (modal) modal.classList.remove('open');
}
function confirmDisableAndDelete() {
  hideDeleteConfirm();
  try { localStorage.setItem(HISTORY_OPT_KEY, 'false'); } catch {}
  syncHistoryToggleUI();
  clearHistory();
}
function confirmDisableKeep() {
  hideDeleteConfirm();
  try { localStorage.setItem(HISTORY_OPT_KEY, 'false'); } catch {}
  syncHistoryToggleUI();
  syncCacheIndicator();
  renderHistory();
}
function syncHistoryToggleUI() {
  const sw = document.getElementById('historyOptSwitch');
  if (sw) sw.classList.toggle('on', isHistoryEnabled());
}
function loadHistory()      { try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; } }
function saveHistory(items) { try { localStorage.setItem(HISTORY_KEY, JSON.stringify(items)); } catch {} }
function addToHistory(domain, tenantId) {
  if (!tenantId || !isHistoryEnabled()) return;
  let items = loadHistory().filter(i => i.domain !== domain);
  items.unshift({ domain, tenantId, at: Date.now() });
  saveHistory(items.slice(0, 7));
  renderHistory();
  syncCacheIndicator();
}
function clearHistory() {
  const fill = document.getElementById('cacheClearFill');
  const ind  = document.getElementById('cacheIndicator');
  const lbl  = document.getElementById('cacheIndicatorLabel');
  ind.className = 'cache-indicator state-clearing';
  lbl.textContent = 'Suppression…';
  fill.style.transition = 'none'; fill.style.width = '0%';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    fill.style.transition = 'width .5s ease'; fill.style.width = '100%';
    setTimeout(() => {
      fill.style.transition = 'width .3s ease'; fill.style.width = '0%';
      saveHistory([]); renderHistory(); syncCacheIndicator();
    }, 540);
  }));
}
function syncCacheIndicator() {
  const ind = document.getElementById('cacheIndicator');
  const lbl = document.getElementById('cacheIndicatorLabel');
  if (!ind) return;
  const enabled = isHistoryEnabled();
  const items   = loadHistory();
  const hasData = items.length > 0;
  if (!enabled && !hasData) {
    ind.className = 'cache-indicator state-inactive';
    lbl.textContent = 'Cache inactif';
  } else if (!enabled && hasData) {
    ind.className = 'cache-indicator state-inactive';
    lbl.textContent = 'Cache désactivé';
  } else if (enabled && hasData) {
    ind.className = 'cache-indicator state-active';
    lbl.textContent = items.length + ' entrée' + (items.length > 1 ? 's' : '') + ' en cache';
  } else {
    ind.className = 'cache-indicator state-inactive';
    lbl.textContent = 'Cache vide';
  }
}
function relativeTime(ts) {
  const s = Math.floor((Date.now() - ts) / 1000);
  if (s < 60)    return "À l'instant";
  if (s < 3600)  return Math.floor(s / 60)   + 'min';
  if (s < 86400) return Math.floor(s / 3600)  + 'h';
  return Math.floor(s / 86400) + 'j';
}
function renderHistory() {
  const list = document.getElementById('historyList'); if (!list) return;
  list.textContent = '';
  if (!isHistoryEnabled()) {
    const empty = document.createElement('div'); empty.className = 'history-empty'; empty.textContent = 'Historique désactivé — activez-le dans Options'; list.appendChild(empty); return;
  }
  const items = loadHistory();
  if (!items.length) {
    const empty = document.createElement('div'); empty.className = 'history-empty'; empty.textContent = 'Aucune analyse effectuée'; list.appendChild(empty); return;
  }
  items.forEach((item) => {
    const shortGuid = item.tenantId ? item.tenantId.slice(0, 8) + '…' : '—';
    const row = document.createElement('div'); row.className = 'history-item';
    row.addEventListener('click', () => loadFromHistory(item.domain));

    const iconSpan = document.createElement('span'); iconSpan.className = 'history-item-icon';
    const iconImg = document.createElement('img'); iconImg.src = 'Microsoft.png'; iconImg.width = 14; iconImg.height = 14; iconImg.alt = 'Microsoft'; iconImg.style.cssText = 'display:inline-block;vertical-align:middle;flex-shrink:0;';
    iconSpan.appendChild(iconImg);

    const textWrap = document.createElement('div'); textWrap.style.cssText = 'flex:1;min-width:0';
    const domainEl = document.createElement('div'); domainEl.className = 'history-item-domain'; domainEl.textContent = item.domain;
    const guidEl   = document.createElement('div'); guidEl.className   = 'history-item-guid';   guidEl.textContent   = shortGuid;
    textWrap.appendChild(domainEl); textWrap.appendChild(guidEl);

    const timeEl = document.createElement('span'); timeEl.className = 'history-item-time'; timeEl.textContent = relativeTime(item.at);

    const copyBtn = document.createElement('button'); copyBtn.className = 'history-item-copy'; copyBtn.textContent = '📋';
    copyBtn.addEventListener('click', e => { e.stopPropagation(); copyHistoryGuid(item.tenantId, copyBtn); });

    row.appendChild(iconSpan); row.appendChild(textWrap); row.appendChild(timeEl); row.appendChild(copyBtn);
    list.appendChild(row);
  });
}
function loadFromHistory(domain) {
  emailInput.value = domain;
  emailInput.dispatchEvent(new Event('input'));
  checkFast();
}
function copyHistoryGuid(guid, btn) {
  navigator.clipboard.writeText(guid).then(() => { btn.textContent = '✅'; setTimeout(() => { btn.textContent = '📋'; }, 1500); });
}

// ── Central event binding ──
function bindEvents() {
  document.getElementById('mainDropBtn').addEventListener('click', toggleDropdown);
  document.getElementById('btnDisableDelete').addEventListener('click', confirmDisableAndDelete);
  document.getElementById('btnDisableKeep').addEventListener('click', confirmDisableKeep);
  document.getElementById('btnDisableCancel').addEventListener('click', hideDeleteConfirm);
  document.getElementById('storageModal').addEventListener('click', hideStoragePanel);
  document.getElementById('storageModalInner').addEventListener('click', e => e.stopPropagation());
  document.getElementById('btnStorageClose').addEventListener('click', hideStoragePanel);
  document.getElementById('btnStorageCloseFooter').addEventListener('click', hideStoragePanel);
  document.getElementById('btnClearAllStorage').addEventListener('click', clearAllStorage);
  document.getElementById('btnShowStorage').addEventListener('click', showStoragePanel);
  document.querySelectorAll('[data-drop-section]').forEach(btn => {
    btn.addEventListener('click', () => toggleDropSection(btn));
  });
  document.getElementById('toggleDarkBtn').addEventListener('click', toggleDark);
  document.getElementById('toggleHistoryBtn').addEventListener('click', () => setHistoryEnabled(!isHistoryEnabled()));
  document.querySelectorAll('[data-proxy-key]').forEach(row => {
    row.addEventListener('click', () => showProxyDetail(row.dataset.proxyKey));
  });
  document.getElementById('proxyOverlay').addEventListener('click', hideProxyDetail);
  document.getElementById('proxyDetailPanel').addEventListener('click', e => e.stopPropagation());
  document.getElementById('proxyDetailBack').addEventListener('click', hideProxyDetail);
  document.getElementById('checkBtnFast').addEventListener('click', checkFast);
  document.getElementById('checkBtnFull').addEventListener('click', checkFull);
  document.getElementById('exportBtn').addEventListener('click', exportReport);
  document.getElementById('progList').addEventListener('click', e => {
    const cancel = e.target.closest('.p-step-cancel');
    const retry  = e.target.closest('.p-step-retry');
    if (cancel) cancelStep(cancel.dataset.step);
    if (retry)  retryStep(retry.dataset.step);
  });
  document.getElementById('btnHistoryToggle').addEventListener('click', () => toggleCollapsible('historyBody', 'historyArrow'));
  document.getElementById('btnClearHistory').addEventListener('click', clearHistory);
  document.getElementById('btnPrivacyToggle').addEventListener('click', () => toggleCollapsible('privacyBody', 'privacyArrow'));
  document.getElementById('btnPrivacyCta').addEventListener('click', () => {
    toggleDropdown();
    toggleCollapsible('privacyBody', 'privacyArrow');
  });
  document.getElementById('btnPanelClose').addEventListener('click', closePanel);
}

window.addEventListener('load', () => {
  bindEvents();
  syncHistoryToggleUI();
  renderHistory();
  syncCacheIndicator();
});

// ── Panel ──
let openCardId = null;
let lastReport = null;
let currentState = { domain:null, ms:null, dns:null, goog:null, health:null, others:null, host:null, fullDone:false };

function openPanel(id, title, buildFn) {
  const panel   = document.getElementById('detailPanel');
  const body    = document.getElementById('panelBody');
  const titleEl = document.getElementById('panelTitle');
  document.querySelectorAll('.result-card').forEach(c => c.className = c.className.replace(/\bsel-\w+\b|\bselected\b/g, '').trim());
  if (openCardId === id) { openCardId = null; panel.classList.remove('open'); return; }
  openCardId = id;
  const card = document.getElementById('card-' + id);
  if (card) card.classList.add(card.dataset.selClass || 'selected');
  titleEl.textContent = title;
  body.innerHTML = '';
  buildFn(body);
  panel.classList.add('open');
}
function closePanel() {
  const panel = document.getElementById('detailPanel');
  panel.classList.remove('open');
  document.querySelectorAll('.result-card').forEach(c => c.className = c.className.replace(/\bsel-\w+\b|\bselected\b/g, '').trim());
  openCardId = null;
}

// ── Input ──
const emailInput = document.getElementById('emailInput');
function extractDomain(val) {
  val = val.trim();
  if (val.startsWith('@')) val = val.slice(1);
  if (val.includes('@'))   val = val.split('@').pop();
  return val.toLowerCase().trim();
}
emailInput.addEventListener('input', () => {
  const d = extractDomain(emailInput.value) || 'domaine.com';
  const preview = document.getElementById('endpointPreview');
  preview.textContent = '';
  const pre = document.createTextNode('https://login.microsoftonline.com/');
  const domSpan = document.createElement('span'); domSpan.className = 'domain'; domSpan.textContent = d;
  const post = document.createTextNode('/.well-known/openid-configuration');
  preview.appendChild(pre); preview.appendChild(domSpan); preview.appendChild(post);
});
emailInput.addEventListener('keydown', e => { if (e.key === 'Enter') checkFast(); });

// ── Step helpers ──
const stepControllers = {};
const stepRetryFns    = {};
const STEP_LABELS = {
  ms:     { active:'Interrogation Microsoft 365…', done:'Microsoft 365 ✓',   fail:'Microsoft 365 — Non trouvé',   timeout:'Microsoft 365 — Annulé' },
  google: { active:'Interrogation Google…',        done:'Google Workspace ✓', fail:'Google — Non détecté',         timeout:'Google — Annulé' },
  dns:    { active:'Récupération DNS…',            done:'DNS ✓',              fail:'DNS — Vide',                   timeout:'DNS — Annulé' },
  health: { active:'Vérification DKIM/DMARC…',    done:'Sécurité analysée ✓',fail:'Sécurité — Partiel',           timeout:'Sécurité — Annulé' },
  others: { active:'Détection services…',          done:'Autres services ✓',  fail:'Services — Partiel',           timeout:'Services — Annulé' },
  host:   { active:'Recherche hébergeur (WHOIS)…', done:'Hébergeur trouvé ✓', fail:'Hébergeur — Non trouvé',       timeout:'Hébergeur — Annulé' },
};
function setStep(id, state, label) {
  const el = document.getElementById(id); if (!el) return;
  el.className = 'p-step ' + state;
  const key    = id.replace('step-', '');
  const lbl    = label || STEP_LABELS[key]?.[state];
  if (lbl) { const labelEl = el.querySelector('.p-step-label'); if (labelEl) labelEl.textContent = lbl; }
}
function showSteps(ids) {
  document.querySelectorAll('.p-step').forEach(el => el.style.display = 'none');
  ids.forEach(id => { const el = document.getElementById('step-' + id); if (el) el.style.display = 'flex'; });
  document.getElementById('progList').style.display = 'flex';
}
function cancelStep(key) {
  const ctrl = stepControllers[key];
  if (ctrl) { ctrl.abort(); delete stepControllers[key]; }
  setStep('step-' + key, 'timeout');
}
async function retryStep(key) {
  const fn = stepRetryFns[key]; if (!fn) return;
  setStep('step-' + key, 'active');
  try { await fn(); } catch { setStep('step-' + key, 'timeout'); }
}

// ── Fetch helpers ──
async function fetchWithAbort(url, key, timeout, isJson) {
  const ctrl = new AbortController();
  stepControllers[key] = ctrl;
  const tid = setTimeout(() => ctrl.abort(), timeout);
  try {
    const r = await fetch(url, { signal: ctrl.signal });
    clearTimeout(tid); delete stepControllers[key];
    if (!r.ok) return null;
    return isJson ? await r.json() : await r.text();
  } catch { clearTimeout(tid); delete stepControllers[key]; return null; }
}
const fetchJsonC = (url, key, t=10000) => fetchWithAbort(url, key, t, true);
const fetchTextC = (url, key, t=10000) => fetchWithAbort(url, key, t, false);

async function fetchJson(url, timeout=9000) {
  const ctrl = new AbortController();
  const tid  = setTimeout(() => ctrl.abort(), timeout);
  try { const r = await fetch(url, { signal: ctrl.signal }); clearTimeout(tid); if (!r.ok) return null; return await r.json(); }
  catch { clearTimeout(tid); return null; }
}
async function dnsQuery(name, type) {
  const d = await fetchJson(`https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`);
  return d ? (d.Answer || []) : [];
}

function extractGuid(s) {
  if (!s) return null;
  const m = s.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  return m ? m[1] : null;
}

const MS_GENERIC_GUIDS = new Set(['9188040d-6c67-4c5b-b112-36a304b66dad','f8cdef31-a31e-4b4a-93e4-5f571e91255a','2f4a9838-26b7-47ee-be60-cfe0807d0ea7']);

async function validateTenantGuid(guid) {
  try {
    const r = await fetchJson(`https://login.microsoftonline.com/${guid}/.well-known/openid-configuration`, 6000);
    if (!r) return false;
    if (!r.issuer?.includes(guid)) return false;
    return !MS_GENERIC_GUIDS.has(guid.toLowerCase());
  } catch { return false; }
}

// ── Confidence tooltip ──
function showConfTooltip(e, confidence, ms) {
  const tip = document.getElementById('confTooltip');
  const rows = [
    { label: 'Tenant ID trouvé',      val: ms?.tenantId    ? '+45 pts ✓' : '0 pts —', earned: !!ms?.tenantId },
    { label: 'GUID validé Microsoft', val: ms?.tenantValid  ? '+30 pts ✓' : '0 pts —', earned: !!ms?.tenantValid },
    { label: 'Issuer présent',         val: ms?.issuer       ? '+15 pts ✓' : '0 pts —', earned: !!ms?.issuer },
    { label: 'Token endpoint',         val: ms?.tokenEndpoint? '+10 pts ✓' : '0 pts —', earned: !!ms?.tokenEndpoint },
  ];
  tip.innerHTML = '';
  const title = document.createElement('div'); title.className = 'conf-tooltip-title'; title.textContent = 'Indice de confiance — ' + confidence + '%';
  tip.appendChild(title);
  rows.forEach(r => {
    const row = document.createElement('div'); row.className = 'conf-tooltip-row';
    const lbl = document.createElement('span'); lbl.className = 'conf-tooltip-label'; lbl.textContent = r.label;
    const val = document.createElement('span'); val.className = 'conf-tooltip-val'; val.textContent = r.val;
    val.style.color = r.earned ? '#86efac' : 'rgba(255,255,255,.35)';
    row.appendChild(lbl); row.appendChild(val); tip.appendChild(row);
  });
  const note = document.createElement('div');
  note.style.cssText = 'margin-top:8px;padding-top:7px;border-top:1px solid rgba(255,255,255,.1);font-size:var(--text-xs);color:rgba(255,255,255,.38);line-height:1.5;font-style:italic';
  note.textContent = 'Namespace type non vérifiable depuis TenantPulse (bloqué par CORS navigateur).';
  tip.appendChild(note);
  const x = Math.min(e.clientX + 10, window.innerWidth - 260);
  const y = Math.min(e.clientY + 10, window.innerHeight - 200);
  tip.style.left = x + 'px'; tip.style.top = y + 'px';
  tip.classList.add('visible');
}
function hideConfTooltip() {
  const tip = document.getElementById('confTooltip');
  if (tip) tip.classList.remove('visible');
}
document.addEventListener('mouseup', hideConfTooltip);

// ── Storage inspector ──
function showStoragePanel() {
  document.getElementById('mainDropdown').classList.remove('open');
  const body = document.getElementById('storageInspectorBody');
  body.textContent = '';
  const keys = [];
  try { for (let i = 0; i < localStorage.length; i++) keys.push(localStorage.key(i)); } catch {}
  if (!keys.length) {
    const msg = document.createElement('div'); msg.className = 'storage-empty-msg'; msg.textContent = 'Aucune donnée stockée dans ce navigateur.';
    body.appendChild(msg);
  } else {
    keys.sort().forEach(key => {
      let raw = ''; try { raw = localStorage.getItem(key) || ''; } catch {}
      const sizeBytes = new Blob([raw]).size;
      const sizeLabel = sizeBytes < 1024 ? sizeBytes + ' o' : (sizeBytes / 1024).toFixed(1) + ' Ko';
      let display = raw;
      try { const parsed = JSON.parse(raw); display = JSON.stringify(parsed, null, 2); } catch {}
      const entry = document.createElement('div'); entry.className = 'storage-entry';
      const head  = document.createElement('div'); head.className = 'storage-entry-head';
      const keyEl = document.createElement('span'); keyEl.className = 'storage-entry-key'; keyEl.textContent = key;
      const right = document.createElement('div'); right.style.cssText = 'display:flex;align-items:center;gap:6px';
      const size  = document.createElement('span'); size.className = 'storage-entry-size'; size.textContent = sizeLabel;
      const del   = document.createElement('button'); del.className = 'storage-entry-del'; del.textContent = '🗑';
      del.addEventListener('click', () => {
        try { localStorage.removeItem(key); } catch {}
        entry.remove();
        syncCacheIndicator(); syncHistoryToggleUI();
        if (!document.querySelectorAll('.storage-entry').length) {
          const msg = document.createElement('div'); msg.className = 'storage-empty-msg'; msg.textContent = 'Aucune donnée stockée dans ce navigateur.';
          body.appendChild(msg);
        }
      });
      right.appendChild(size); right.appendChild(del);
      head.appendChild(keyEl); head.appendChild(right);
      const val = document.createElement('div'); val.className = 'storage-entry-val'; val.textContent = display;
      entry.appendChild(head); entry.appendChild(val);
      body.appendChild(entry);
    });
  }
  document.getElementById('storageModal').classList.add('open');
}
function hideStoragePanel() {
  document.getElementById('storageModal').classList.remove('open');
}
function clearAllStorage() {
  try {
    localStorage.removeItem(HISTORY_KEY);
    localStorage.removeItem(HISTORY_OPT_KEY);
  } catch {}
  hideStoragePanel();
  syncCacheIndicator(); syncHistoryToggleUI(); renderHistory();
  const fill = document.getElementById('cacheClearFill');
  fill.style.transition = 'none'; fill.style.width = '0%';
  requestAnimationFrame(() => requestAnimationFrame(() => {
    fill.style.transition = 'width .5s ease'; fill.style.width = '100%';
    setTimeout(() => { fill.style.transition = 'width .3s ease'; fill.style.width = '0%'; syncCacheIndicator(); }, 540);
  }));
}

function computeConfidence(ms) {
  if (!ms) return 0;
  let score = 0;
  if (ms.tenantId)                                   score += 45;
  if (ms.tenantValid)                                score += 30;
  if (ms.issuer)                                     score += 15;
  if (ms.tokenEndpoint)                              score += 10;
  return Math.min(score, 100);
}

// ── Core checks ──
async function checkMicrosoft(domain) {
  let tenantId = null, realmData = null, oidcData = null, tenantValid = false;
  const realm = await fetchJsonC(`https://login.microsoftonline.com/common/userrealm/?user=check@${domain}&api-version=2.1`, 'ms', 8000);
  if (realm?.account_type && realm.account_type !== 'Unknown') realmData = realm;
  if (realmData?.NameSpaceType === 'Consumer' || realmData?.account_type?.toLowerCase() === 'consumer') return null;
  const direct = await fetchJsonC(`https://login.microsoftonline.com/${domain}/.well-known/openid-configuration`, 'ms', 8000);
  if (direct) {
    const c = extractGuid(direct.issuer) || extractGuid(direct.token_endpoint) || extractGuid(direct.authorization_endpoint);
    if (c && !MS_GENERIC_GUIDS.has(c.toLowerCase()) && direct.issuer?.includes(c)) { oidcData = direct; tenantId = c; tenantValid = true; }
  }
  if (!tenantId) {
    try {
      const x = await fetchTextC(`https://login.microsoftonline.com/${domain}/federationmetadata/2007-06/federationmetadata.xml`, 'ms', 8000);
      if (x) { const c = extractGuid(x); if (c && !MS_GENERIC_GUIDS.has(c.toLowerCase())) { const v = await validateTenantGuid(c); if (v) { tenantId = c; tenantValid = true; } } }
    } catch {}
  }
  if (tenantId && !tenantValid) { tenantValid = await validateTenantGuid(tenantId); if (!tenantValid) tenantId = null; }
  const isPro = realmData && realmData.NameSpaceType !== 'Consumer' && realmData.account_type?.toLowerCase() !== 'consumer';
  if (tenantId || isPro) return { tenantId, tenantValid, namespaceType: realmData?.NameSpaceType || null, federationType: realmData?.federation_protocol || null, cloudInstance: realmData?.cloud_instance_name || 'microsoftonline.com', issuer: oidcData?.issuer || null, tokenEndpoint: oidcData?.token_endpoint || null, authorizationEndpoint: oidcData?.authorization_endpoint || null, userInfoEndpoint: oidcData?.userinfo_endpoint || null };
  return null;
}

async function checkGoogle(domain) {
  try {
    const [oidc, mx] = await Promise.all([fetchJson('https://accounts.google.com/.well-known/openid-configuration'), fetchJson(`https://dns.google/resolve?name=${domain}&type=MX`)]);
    if (!oidc || !mx) return null;
    const ans = mx.Answer || [];
    if (!ans.some(a => a.data?.toLowerCase().includes('google'))) return null;
    return { issuer: oidc.issuer, authorizationEndpoint: oidc.authorization_endpoint, tokenEndpoint: oidc.token_endpoint, userInfoEndpoint: oidc.userinfo_endpoint, mxRecords: ans.map(a => a.data).filter(Boolean) };
  } catch { return null; }
}

async function checkDNS(domain) {
  const r = { mx: [], spf: null, txt: [], detectedProviders: [] };
  const mx  = await fetchJson(`https://dns.google/resolve?name=${domain}&type=MX`);  if (mx)  r.mx  = (mx.Answer  || []).map(a => a.data).filter(Boolean);
  const txt = await fetchJson(`https://dns.google/resolve?name=${domain}&type=TXT`); if (txt) { const all = (txt.Answer || []).map(a => a.data).filter(Boolean); r.spf = all.find(t => t.includes('v=spf1')) || null; r.txt = all; }
  const ms = r.mx.join(' ').toLowerCase(), ss = (r.spf || '').toLowerCase(), ts = r.txt.join(' ').toLowerCase();
  const providers = [
    [['google','googlemail'],              ['google'],                      'Google Workspace'],
    [['outlook','microsoft','protection.outlook'], ['microsoft','protection.outlook'], 'Microsoft 365'],
    [['amazonses'],                        ['amazonses'],                   'Amazon SES'],
    [['ovh'],                              [],                              'OVH Mail'],
    [['ionos','1and1'],                    ['ionos','1&1'],                 'IONOS / 1&1'],
    [['protonmail'],                       ['protonmail'],                  'Proton Mail'],
    [['zoho'],                             ['zoho'],                        'Zoho Mail'],
    [['mimecast'],                         ['mimecast'],                    'Mimecast'],
    [['pphosted','proofpoint'],            ['proofpoint'],                  'Proofpoint'],
    [['mailinblack'],                      ['mailinblack','spf.mailinblack'],'Mailinblack'],
    [['vadecloud','vadesecure'],           ['vadecloud','vadesecure'],      'Vade Secure'],
    [['barracudanetworks'],                ['barracudanetworks'],           'Barracuda'],
    [['hornetsecurity'],                   ['hornetsecurity'],              'Hornetsecurity'],
    [['spamtitan'],                        ['spamtitan'],                   'SpamTitan'],
    [['brevo','sendinblue'],               ['brevo','sendinblue'],          'Brevo'],
    [['mailjet'],                          ['mailjet'],                     'Mailjet'],
    [['sendgrid'],                         ['sendgrid'],                    'SendGrid'],
    [['mandrillapp','mandrill'],           ['mandrillapp'],                 'Mailchimp / Mandrill'],
    [['postmarkapp'],                      ['postmarkapp','spf.mtasv'],     'Postmark'],
  ];
  for (const [mxKeys, spfKeys, name] of providers) {
    if (mxKeys.some(k => ms.includes(k)) || spfKeys.some(k => ss.includes(k)) || (name === 'Proton Mail' && ts.includes('protonmail')))
      r.detectedProviders.push(name);
  }
  return r;
}

async function checkHealth(domain) {
  const checks = []; let score = 0;
  const mxA = await dnsQuery(domain, 'MX');
  if (mxA.length > 0) { score += 15; checks.push({ t:'ok',    icon:'✅', title:'MX Records présents', desc: mxA.map(a => a.data).join(' | ') }); }
  else                              checks.push({ t:'error', icon:'❌', title:'MX Records manquants',  desc: 'Aucun enregistrement MX.' });

  const txtA = await dnsQuery(domain, 'TXT'), allTxt = txtA.map(a => a.data).filter(Boolean), spf = allTxt.find(t => t.includes('v=spf1'));
  if (spf) { score += 15; checks.push({ t: spf.includes('-all') ? 'ok' : 'warn', icon: spf.includes('-all') ? '✅' : '⚠️', title: spf.includes('-all') ? 'SPF strict (-all)' : 'SPF (softfail ~all)', desc: spf }); }
  else     checks.push({ t:'error', icon:'❌', title:'SPF manquant', desc:'Risque de spoofing.' });

  const dmarcA = await dnsQuery(`_dmarc.${domain}`, 'TXT'), dmarc = dmarcA.map(a => a.data).find(d => d.includes('v=DMARC1'));
  let dmarcIsQuarantine = false;
  if (dmarc) {
    const p = (dmarc.match(/p=([^;]+)/i) || [])[1]?.trim().toLowerCase();
    if (p === 'reject')     { score += 20; checks.push({ t:'ok',   icon:'✅', title:'DMARC p=reject', desc: dmarc }); }
    else if (p === 'quarantine') { score += 20; dmarcIsQuarantine = true; checks.push({ t:'ok',   icon:'✅', title:'DMARC p=quarantine ⭐', desc: dmarc + ' — Niveau équivalent à reject. ⭐ indique que p=reject serait préférable.' }); }
    else                    { score += 5;  checks.push({ t:'warn', icon:'⚠️', title:'DMARC p=none',   desc: dmarc }); }
  } else checks.push({ t:'error', icon:'❌', title:'DMARC manquant', desc: `Aucun _dmarc.${domain}` });

  const dkimSelectors = ['selector1','selector2','default','google','microsoft','k1','mail','dkim','smtp','email','mailjet','sendgrid','mandrill','amazonses','postmark','sparkpost','mxroute','zoho','protonmail','brevo','s1','s2','sig1'];
  const dkimResults   = {};
  for (const s of dkimSelectors) {
    const a = await dnsQuery(`${s}._domainkey.${domain}`, 'TXT');
    dkimResults[s] = a.map(x => x.data).find(d => d.includes('v=DKIM1') || d.includes('p=')) || null;
  }
  const foundSelectors = Object.entries(dkimResults).filter(([, v]) => v !== null);
  const hasSel1 = dkimResults['selector1'] !== null, hasSel2 = dkimResults['selector2'] !== null;
  if (foundSelectors.length > 0) {
    score += 25;
    const selNames = foundSelectors.map(([k]) => k).join(', ');
    let dkimDesc = `Sélecteurs actifs : ${selNames}`;
    if (hasSel1 && hasSel2)   dkimDesc += ' — ✅ Rotation Microsoft 365 (selector1 + selector2 actifs)';
    else if (hasSel1)          dkimDesc += ' — ⚠️ selector1 actif, selector2 absent';
    else if (hasSel2)          dkimDesc += ' — ⚠️ selector2 actif, selector1 absent';
    checks.push({ t:'ok', icon:'✅', title:`DKIM actif (${selNames})`, desc: dkimDesc, dkimResults, hasSel1, hasSel2 });
  } else checks.push({ t:'error', icon:'❌', title:'DKIM non détecté', desc:'Aucun DKIM sur les sélecteurs testés.', dkimResults, hasSel1:false, hasSel2:false });

  const cnA = await dnsQuery(`www.${domain}`, 'CNAME'), aA = await dnsQuery(`www.${domain}`, 'A');
  if      (cnA.length > 0) { score += 5; checks.push({ t:'ok',   icon:'✅', title:'CNAME www',          desc: cnA.map(a => a.data).join(', ') }); }
  else if (aA.length  > 0) { score += 4; checks.push({ t:'info', icon:'ℹ️', title:'www via A record',   desc: aA.map(a  => a.data).join(', ') }); }
  else                              checks.push({ t:'warn', icon:'⚠️', title:'www non résolu',           desc: `Aucun CNAME ni A pour www.${domain}.` });

  const dsA = await dnsQuery(domain, 'DS'), dkA = await dnsQuery(domain, 'DNSKEY');
  if (dsA.length > 0 || dkA.length > 0) { score += 10; checks.push({ t:'ok',   icon:'✅', title:'DNSSEC activé',          desc: `${dsA.length} DS, ${dkA.length} DNSKEY.` }); }
  else                                               checks.push({ t:'warn', icon:'⚠️', title:'DNSSEC non activé',         desc: 'Vulnérable au DNS spoofing.' });

  const mtaSts = await dnsQuery(`_mta-sts.${domain}`, 'TXT'), mtaRec = mtaSts.map(a => a.data).find(d => d.includes('v=STSv1'));
  if (mtaRec) { score += 5; checks.push({ t:'ok',   icon:'✅', title:'MTA-STS activé',         desc: mtaRec }); }
  else                  checks.push({ t:'info', icon:'ℹ️', title:'MTA-STS non configuré',  desc: 'Recommandé pour les domaines pro.' });

  const bimiA = await dnsQuery(`default._bimi.${domain}`, 'TXT'), bimiRec = bimiA.map(a => a.data).find(d => d.includes('v=BIMI1'));
  if (bimiRec) { score += 5; checks.push({ t:'ok',   icon:'🏷️', title:'BIMI configuré',          desc: bimiRec }); }
  else                  checks.push({ t:'info', icon:'ℹ️', title:'BIMI absent',              desc: 'Nécessite DMARC p=quarantine ou reject.' });

  return { score: Math.min(score, 100), checks, dkimResults, hasSel1, hasSel2, dmarcIsQuarantine };
}

async function checkOtherTenants(domain, dns) {
  const t  = [], ms = (dns.mx || []).join(' ').toLowerCase(), ss = (dns.spf || '').toLowerCase(), ts = (dns.txt || []).join(' ').toLowerCase();

  t.push({ name:'Google Workspace', imgSrc:'google.png',          on: ms.includes('google.com') || ms.includes('googlemail.com') });
  t.push({ name:'Mailinblack',      imgSrc:'mailinblack.jpeg',    on: ms.includes('mailinblack') || ss.includes('mailinblack') });
  t.push({ name:'Mimecast',         imgSrc:'Mimecast.png',        on: ms.includes('mimecast') || ss.includes('mimecast') });
  t.push({ name:'Proofpoint',       imgSrc:'Proofpoint.png',      on: ms.includes('pphosted') || ms.includes('proofpoint') || ss.includes('proofpoint') });
  t.push({ name:'Vade Secure',      imgSrc:'Vade.png',            on: ms.includes('vadecloud') || ms.includes('vadesecure') || ss.includes('vadecloud') });
  t.push({ name:'Barracuda',        imgSrc:'Barracuda.png',       on: ms.includes('barracudanetworks') || ss.includes('barracudanetworks') });
  t.push({ name:'Hornetsecurity',   imgSrc:'Hornetsecurity.png',  on: ms.includes('hornetsecurity') || ss.includes('hornetsecurity') });
  t.push({ name:'Brevo',            imgSrc:'Brevo.jpeg',          on: ss.includes('brevo') || ss.includes('sendinblue') || ms.includes('sendinblue') });
  t.push({ name:'Mailjet',          imgSrc:'Mailjet.png',         on: ss.includes('mailjet') || (await dnsQuery(`mailjet._domainkey.${domain}`, 'TXT')).length > 0 });
  t.push({ name:'SendGrid',         imgSrc:'SendGrid.png',        on: ss.includes('sendgrid') || (await dnsQuery(`s1._domainkey.${domain}`, 'CNAME')).length > 0 });
  t.push({ name:'Postmark',         imgSrc:'Postmark.png',        on: ss.includes('spf.mtasv') || ss.includes('postmarkapp') });

  const odoo = ts.includes('odoo') || ss.includes('odoo') || ms.includes('odoo') || (await dnsQuery(`odoo.${domain}`, 'CNAME')).length > 0;
  t.push({ name:'Odoo',             imgSrc:'Odoo.png',            on: odoo });
  t.push({ name:'Salesforce',       imgSrc:'Salesforce.png',      on: ts.includes('salesforce') || ss.includes('salesforce') });
  const hs = ts.includes('hubspot') || ss.includes('hubspot') || (await dnsQuery(`hs1._domainkey.${domain}`, 'CNAME')).length > 0;
  t.push({ name:'HubSpot',          imgSrc:'HubSpot.png',         on: hs });
  t.push({ name:'Zendesk',          imgSrc:'Zendesk.png',         on: ts.includes('zendesk') || ss.includes('zendesk') });
  t.push({ name:'Slack',            imgSrc:'Slack.png',           on: ts.includes('slack') || ss.includes('slack-mail') });
  const atl = ts.includes('atlassian') || !!(dns.txt || []).find(x => x.toLowerCase().includes('atlassian-domain-verification'));
  t.push({ name:'Atlassian',        imgSrc:'Atlassian.png',       on: atl });
  t.push({ name:'Amazon SES',       imgSrc:'Amazon.png',          on: ss.includes('amazonses') || ms.includes('amazonses') });
  return t;
}

const MSA_DOMAINS = new Set(['outlook.com','outlook.fr','outlook.be','outlook.es','outlook.de','outlook.it','outlook.co.uk','outlook.jp','outlook.pt','outlook.dk','outlook.at','outlook.ch','hotmail.com','hotmail.fr','hotmail.be','hotmail.es','hotmail.de','hotmail.it','hotmail.co.uk','hotmail.nl','hotmail.pt','hotmail.dk','hotmail.se','hotmail.no','live.com','live.fr','live.be','live.nl','live.co.uk','live.de','live.it','live.es','live.se','live.dk','live.no','live.ca','live.com.au','msn.com','passport.com','windowslive.com']);
const isMsaPersonalDomain = d => MSA_DOMAINS.has(d.toLowerCase());

async function checkHost(domain) {
  function parseRdap(r) {
    const entities  = r.entities || []; let registrar = null;
    for (const e of entities) { if ((e.roles || []).includes('registrar')) { const fn = (e.vcardArray?.[1] || []).find(x => x[0] === 'fn'); if (fn) { registrar = fn[3]; break; } } }
    const ns      = (r.nameservers || []).map(n => n.ldhName).filter(Boolean);
    const events  = r.events || [];
    const created = events.find(e => e.eventAction === 'registration')?.eventDate;
    const expires = events.find(e => e.eventAction === 'expiration')?.eventDate;
    const updated = events.find(e => e.eventAction === 'last changed')?.eventDate;
    return { registrar, ns, status: r.status || [], created, expires, updated, hostName: detectHostFromNS(ns.join(' ').toLowerCase(), registrar || '') };
  }
  try { const r = await fetchJsonC(`https://rdap.org/domain/${domain}`, 'host', 12000); if (r) return parseRdap(r); } catch {}
  return null;
}

function detectHostFromNS(nsStr, registrar) {
  const r = registrar.toLowerCase();
  const map = [
    [['ovh'],                              ['ovh'],                         'OVH'],
    [['gandi'],                            ['gandi'],                       'Gandi'],
    [['cloudflare'],                       ['cloudflare'],                  'Cloudflare'],
    [['awsdns'],                           ['amazon','aws'],                'Amazon AWS / Route 53'],
    [['google'],                           ['google'],                      'Google Domains / Cloud DNS'],
    [['azure','microsoft'],                ['microsoft'],                   'Microsoft Azure DNS'],
    [['ionos','1and1'],                    ['ionos','1&1'],                  'IONOS / 1&1'],
    [['godaddy'],                          ['godaddy'],                     'GoDaddy'],
    [['namecheap'],                        ['namecheap'],                   'Namecheap'],
    [['infomaniak'],                       ['infomaniak'],                  'Infomaniak'],
    [['online.net'],                       ['online.net','scaleway'],       'Scaleway / Online.net'],
    [['o2switch'],                         ['o2switch'],                    'o2switch'],
    [['planethoster'],                     ['planethoster'],                'PlanetHoster'],
    [['nameshield'],                       ['nameshield'],                  'Nameshield'],
    [['amen.fr'],                          ['amen','agence des m'],         'AMEN'],
    [['cscdbs.com','cscglobal'],           ['csc corporate','csc global','corporation service'], 'CSC Corporate Domains'],
    [['markmonitor'],                      ['markmonitor'],                 'MarkMonitor'],
    [['verisign'],                         ['verisign'],                    'VeriSign'],
    [['networksolutions'],                 ['network solutions'],           'Network Solutions'],
    [['register.com'],                     ['register.com'],                'Register.com'],
    [['nic.fr'],                           ['afnic','nic.fr'],              'AFNIC'],
    [['bookmyname'],                       ['bookmyname'],                  'BookMyName'],
    [['hostinger'],                        ['hostinger'],                   'Hostinger'],
    [['siteground'],                       ['siteground'],                  'SiteGround'],
    [['bluehost'],                         ['bluehost'],                    'Bluehost'],
    [['dreamhost'],                        ['dreamhost'],                   'DreamHost'],
    [['wpengine'],                         ['wp engine'],                   'WP Engine'],
    [['hetzner'],                          ['hetzner'],                     'Hetzner'],
    [['digitalocean'],                     ['digitalocean'],                'DigitalOcean'],
    [['linode'],                           ['linode','akamai'],             'Akamai / Linode'],
    [['vultr'],                            ['vultr'],                       'Vultr'],
    [['dnsimple'],                         ['dnsimple'],                    'DNSimple'],
    [['name.com'],                         ['name.com'],                    'Name.com'],
    [['dynadot'],                          ['dynadot'],                     'Dynadot'],
    [['porkbun'],                          ['porkbun'],                     'Porkbun'],
    [['hover'],                            ['hover'],                       'Hover'],
    [['cloudns'],                          ['cloudns'],                     'ClouDNS'],
  ];
  for (const [nsKeys, rKeys, label] of map) {
    if (nsKeys.some(k => nsStr.includes(k)) || rKeys.some(k => r.includes(k))) return label;
  }
  return registrar || 'Inconnu';
}

function formatDate(d) {
  if (!d) return null;
  try { return new Date(d).toLocaleDateString('fr-FR', { day:'2-digit', month:'long', year:'numeric' }); } catch { return d; }
}

const HOST_LOGO_MAP = {
  ovh:              {domain:'ovh.com',               color:'#007DC5', label:'OVH'},
  cloudflare:       {domain:'cloudflare.com',         color:'#F48120', label:'CF'},
  gandi:            {domain:'gandi.net',              color:'#2E7D32', label:'GN'},
  godaddy:          {domain:'godaddy.com',            color:'#1BDB00', label:'GD'},
  namecheap:        {domain:'namecheap.com',          color:'#DE3723', label:'NC'},
  ionos:            {domain:'ionos.com',              color:'#003D8F', label:'IO'},
  '1and1':          {domain:'ionos.com',              color:'#003D8F', label:'IO'},
  infomaniak:       {domain:'infomaniak.com',         color:'#0098FF', label:'IK'},
  scaleway:         {domain:'scaleway.com',           color:'#7B5EA7', label:'SCW'},
  'online.net':     {domain:'online.net',             color:'#7B5EA7', label:'ONL'},
  amazon:           {domain:'aws.amazon.com',         color:'#FF9900', label:'AWS'},
  aws:              {domain:'aws.amazon.com',         color:'#FF9900', label:'AWS'},
  google:           {domain:'domains.google',         color:'#4285F4', label:'G'},
  microsoft:        {domain:'microsoft.com',          color:'#0078D4', label:'MS'},
  azure:            {domain:'azure.microsoft.com',    color:'#0078D4', label:'AZ'},
  o2switch:         {domain:'o2switch.fr',            color:'#2ECC71', label:'O2'},
  planethoster:     {domain:'planethoster.com',       color:'#E74C3C', label:'PH'},
  nameshield:       {domain:'nameshield.net',         color:'#003566', label:'NSH'},
  amen:             {domain:'amen.fr',                color:'#E2001A', label:'AMN'},
  'csc corporate':  {domain:'cscglobal.com',          color:'#1A1A2E', label:'CSC'},
  markmonitor:      {domain:'markmonitor.com',        color:'#003087', label:'MM'},
  verisign:         {domain:'verisign.com',           color:'#005A8E', label:'VS'},
  'network solutions':{domain:'networksolutions.com', color:'#E8622A', label:'NS'},
  'register.com':   {domain:'register.com',           color:'#0069AA', label:'RC'},
  afnic:            {domain:'afnic.fr',               color:'#003189', label:'AF'},
  bookmyname:       {domain:'bookmyname.com',         color:'#FF6600', label:'BM'},
  hostinger:        {domain:'hostinger.com',          color:'#7B2FBE', label:'HG'},
  siteground:       {domain:'siteground.com',         color:'#F7941D', label:'SG'},
  bluehost:         {domain:'bluehost.com',           color:'#003768', label:'BH'},
  dreamhost:        {domain:'dreamhost.com',          color:'#00ADEF', label:'DH'},
  'wp engine':      {domain:'wpengine.com',           color:'#40BFB0', label:'WP'},
  hetzner:          {domain:'hetzner.com',            color:'#D50C2D', label:'HZ'},
  digitalocean:     {domain:'digitalocean.com',       color:'#0080FF', label:'DO'},
  akamai:           {domain:'akamai.com',             color:'#009BDE', label:'AK'},
  linode:           {domain:'linode.com',             color:'#009BDE', label:'LN'},
  vultr:            {domain:'vultr.com',              color:'#007BFC', label:'VT'},
  dnsimple:         {domain:'dnsimple.com',           color:'#1083C6', label:'DS'},
  'name.com':       {domain:'name.com',               color:'#3E9A47', label:'NM'},
  dynadot:          {domain:'dynadot.com',            color:'#FF6600', label:'DY'},
  porkbun:          {domain:'porkbun.com',            color:'#F26522', label:'PB'},
  hover:            {domain:'hover.com',              color:'#41B6E6', label:'HV'},
  cloudns:          {domain:'cloudns.net',            color:'#2196F3', label:'CN'},
};

function _hostInitial(letter, color) {
  const s = document.createElement('span');
  s.style.cssText = `display:inline-flex;width:22px;height:22px;border-radius:4px;background:${color};color:#fff;font-size:9px;font-weight:500;align-items:center;justify-content:center`;
  s.textContent = letter;
  return s;
}

function hostLogo(hostName) {
  if (!hostName) return { el: _hostInitial('?', '#9ca3af') };
  const l = hostName.toLowerCase();
  for (const [key, val] of Object.entries(HOST_LOGO_MAP)) {
    if (l.includes(key)) {
      const wrap = document.createElement('span'); wrap.style.cssText = 'display:inline-flex;align-items:center;justify-content:center;width:22px;height:22px';
      const img = document.createElement('img'); img.src = `https://www.google.com/s2/favicons?domain=${val.domain}&sz=64`; img.style.cssText = 'width:22px;height:22px;object-fit:contain;border-radius:4px'; img.alt = val.label; img.loading = 'lazy';
      const fallback = _hostInitial(val.label.slice(0,2), val.color); fallback.style.display = 'none';
      img.onerror = () => { img.style.display = 'none'; fallback.style.display = 'inline-flex'; };
      wrap.appendChild(img); wrap.appendChild(fallback);
      return { el: wrap };
    }
  }
  return { el: _hostInitial(hostName[0]?.toUpperCase() || '?', '#6b7280') };
}

// ── FIX #1 : helpers DOM sûrs — remplacent MS_SVG / GG_SVG (innerHTML supprimé) ──
// Avant : const MS_SVG = `<img ...>`  puis  iconWrap.innerHTML = iconHtml
// Après : fonctions createElement — aucun parsing HTML, aucun risque XSS
function makeImgIcon(src, alt, size) {
  const img = document.createElement('img');
  img.src = src; img.alt = alt;
  img.width = size || 20; img.height = size || 20;
  img.style.cssText = 'object-fit:contain;border-radius:3px;';
  return img;
}
function makeGoogleSvgIcon() {
  const NS  = 'http://www.w3.org/2000/svg';
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  [
    ['#4285F4', 'M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z'],
    ['#34A853', 'M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z'],
    ['#FBBC05', 'M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z'],
    ['#EA4335', 'M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z'],
  ].forEach(([fill, d]) => {
    const path = document.createElementNS(NS, 'path');
    path.setAttribute('fill', fill);
    path.setAttribute('d', d);
    svg.appendChild(path);
  });
  return svg;
}

// ── UI helpers ──
function addRow(b, label, value, hiClass = '') {
  if (!value) return;
  const id  = 'rv_' + Math.random().toString(36).slice(2);
  const row = document.createElement('div');
  row.className = 'd-row' + (hiClass ? ' ' + hiClass : '');
  const lbl = document.createElement('div'); lbl.className = 'd-label'; lbl.textContent = label;
  const val = document.createElement('div'); val.className = 'd-value';
  const sp  = document.createElement('span'); sp.id = id; sp.style.flex = '1';
  String(value).split('\n').forEach((line, i) => { if (i > 0) sp.appendChild(document.createElement('br')); sp.appendChild(document.createTextNode(line)); });
  const btn = document.createElement('button'); btn.className = 'copy-btn'; btn.textContent = 'Copier';
  btn.addEventListener('click', () => copyVal(id, btn));
  val.appendChild(sp); val.appendChild(btn);
  row.appendChild(lbl); row.appendChild(val);
  b.appendChild(row);
}
function addSectionTitle(b, title) {
  const d = document.createElement('div'); d.className = 'panel-section-title'; d.textContent = title; b.appendChild(d);
}
function showError(msg) { const b = document.getElementById('errBox'); b.textContent = msg; b.style.display = 'block'; }
function copyVal(id, btn) {
  const el = document.getElementById(id);
  if (!el) return; // guard : l'élément peut avoir quitté le DOM (panel fermé)
  navigator.clipboard.writeText(el.innerText).then(() => { btn.textContent = '✓ Copié'; btn.classList.add('copied'); setTimeout(() => { btn.textContent = 'Copier'; btn.classList.remove('copied'); }, 1500); });
}
function lockButtons()     { document.getElementById('checkBtnFast').disabled = true;  document.getElementById('checkBtnFull').disabled = true; }
function unlockButtons()   { document.getElementById('checkBtnFast').disabled = false; document.getElementById('checkBtnFull').disabled = false; }
function setFastLoading(on){ document.getElementById('btnFastText').style.display = on ? 'none' : 'inline'; document.getElementById('spinnerFast').style.display = on ? 'inline-block' : 'none'; }
function setFullLoading(on){ document.getElementById('btnFullText').style.display  = on ? 'none' : 'inline'; document.getElementById('spinnerFull').style.display  = on ? 'inline-block' : 'none'; }

function buildScoreRing(score, dmarcIsQuarantine) {
  const r      = 22, circ = 2 * Math.PI * r, offset = circ - (score / 100) * circ;
  const color  = score < 40 ? '#dc2626' : score < 70 ? '#d97706' : '#16a34a';
  const lbl    = score >= 80 ? 'Excellent' : score >= 60 ? 'Bon' : score >= 40 ? 'Moyen' : 'Faible';
  const lblClr = score < 40 ? '#dc2626' : score < 70 ? '#b45309' : '#15803d';
  const bg     = score < 40 ? '#1A1010' : score < 70 ? '#12100C' : '#0C120C';

  const el = document.createElement('div'); el.className = 'score-block'; el.style.background = bg; el.style.borderColor = color + '44';

  const NS = 'http://www.w3.org/2000/svg';
  const ring = document.createElement('div'); ring.className = 'score-ring';
  const svg = document.createElementNS(NS, 'svg'); svg.setAttribute('viewBox', '0 0 54 54');
  const trk = document.createElementNS(NS, 'circle'); trk.setAttribute('class','trk'); trk.setAttribute('cx','27'); trk.setAttribute('cy','27'); trk.setAttribute('r', String(r));
  const fll = document.createElementNS(NS, 'circle'); fll.setAttribute('class','fll'); fll.setAttribute('cx','27'); fll.setAttribute('cy','27'); fll.setAttribute('r', String(r)); fll.setAttribute('stroke', color); fll.setAttribute('stroke-dasharray', String(circ)); fll.setAttribute('stroke-dashoffset', String(offset));
  svg.appendChild(trk); svg.appendChild(fll);
  const lbl_el = document.createElement('div'); lbl_el.className = 'lbl'; lbl_el.textContent = score + '%';
  if (dmarcIsQuarantine) { const star = document.createElement('span'); star.style.fontSize = '8px'; star.textContent = '⭐'; lbl_el.appendChild(star); }
  ring.appendChild(svg); ring.appendChild(lbl_el);

  const info = document.createElement('div'); info.className = 'score-info';
  const title = document.createElement('div'); title.className = 'score-title'; title.style.color = lblClr; title.textContent = 'Sécurité : ' + lbl;
  const desc  = document.createElement('div'); desc.className  = 'score-desc';  desc.textContent  = 'MX · SPF · DMARC · DKIM · DNSSEC · MTA-STS · BIMI';
  info.appendChild(title); info.appendChild(desc);
  if (dmarcIsQuarantine) { const star = document.createElement('div'); star.style.cssText = 'font-size:9.5px;font-weight:500;color:#b45309;margin-top:3px'; star.textContent = '⭐ DMARC p=quarantine — score plein, p=reject recommandé'; info.appendChild(star); }

  el.appendChild(ring); el.appendChild(info);
  return el;
}

function buildDkimBlock(b, dkimResults, hasSel1, hasSel2) {
  addSectionTitle(b, 'Détail des sélecteurs DKIM testés');
  const priority = ['selector1', 'selector2'];
  const others   = Object.keys(dkimResults).filter(k => !priority.includes(k));
  for (const sel of [...priority, ...others]) {
    const val     = dkimResults[sel], present = val !== null;
    const isPri   = priority.includes(sel);
    const shortV  = val && val.length > 100 ? val.slice(0, 100) + '…' : val;
    const div     = document.createElement('div'); div.className = 'dkim-detail';
    const head = document.createElement('div'); head.className = 'dkim-detail-head';
    const selLbl = document.createElement('span'); selLbl.style.cssText = 'font-size:10.5px;font-weight:500;color:var(--text)';
    selLbl.textContent = sel + '._domainkey';
    if (isPri) { const tag = document.createElement('span'); tag.style.cssText = 'font-size:8px;color:#0078d4;font-weight:500;margin-left:4px'; tag.textContent = '[MS365]'; selLbl.appendChild(tag); }
    const badge = document.createElement('span'); badge.className = 'dkim-sel-badge' + (present ? '' : ' absent'); badge.textContent = present ? '✅ Présent' : '❌ Absent';
    head.appendChild(selLbl); head.appendChild(badge);
    div.appendChild(head);
    if (present && shortV) { const dv = document.createElement('div'); dv.className = 'dkim-val'; dv.textContent = shortV; div.appendChild(dv); }
    b.appendChild(div);
  }
}

// ── FIX #1 : makeCard — paramètre iconHtml supprimé, seul iconEl (élément DOM) est accepté ──
// Avant : { id, iconHtml, iconEl, ... }  avec  iconWrap.innerHTML = iconHtml  comme fallback
// Après : { id, iconEl, ... }  —  iconWrap.appendChild(iconEl) uniquement
function makeCard({ id, iconEl, iconBg, title, sub, badge, badgeCls, selCls, onClick }) {
  const card = document.createElement('div');
  card.className = 'result-card'; card.id = 'card-' + id; card.dataset.selClass = selCls;
  const row = document.createElement('div'); row.className = 'card-row';
  const left = document.createElement('div'); left.className = 'card-left';
  const iconWrap = document.createElement('div'); iconWrap.className = 'card-icon-wrap ' + iconBg;
  // FIX #1 : appendChild au lieu de innerHTML — aucun parsing HTML
  if (iconEl) iconWrap.appendChild(iconEl);
  const textWrap = document.createElement('div');
  const titleEl = document.createElement('div'); titleEl.className = 'card-title'; titleEl.textContent = title;
  const subEl   = document.createElement('div'); subEl.className   = 'card-sub';   subEl.textContent   = sub;
  textWrap.appendChild(titleEl); textWrap.appendChild(subEl);
  left.appendChild(iconWrap); left.appendChild(textWrap);
  row.appendChild(left);
  if (badge) { const b = document.createElement('span'); b.className = 'card-badge ' + badgeCls; b.textContent = badge; row.appendChild(b); }
  const chev = document.createElement('span'); chev.className = 'card-chevron'; chev.textContent = '›';
  row.appendChild(chev);
  card.appendChild(row);
  card.addEventListener('click', onClick);
  return card;
}

// ── Hero renderer ──
function renderHero(ms, domain, confidence) {
  const hero = document.createElement('div'); hero.className = 'tenant-hero';
  const msLogoEl = () => { const i = document.createElement('img'); i.src='Microsoft.png'; i.width=14; i.height=14; i.alt='Microsoft'; i.style.cssText='display:inline-block;vertical-align:middle;flex-shrink:0;opacity:.85;'; return i; };

  const mkLabel = (text) => {
    const d = document.createElement('div'); d.className = 'hero-label';
    const s = document.createElement('span'); s.style.cssText = 'display:inline-flex;align-items:center;gap:5px;';
    s.appendChild(msLogoEl()); s.appendChild(document.createTextNode(' ' + text));
    d.appendChild(s); return d;
  };
  const mkDomain = () => { const d = document.createElement('div'); d.className = 'hero-domain'; d.textContent = domain; return d; };

  if (!ms) {
    hero.style.background = 'linear-gradient(135deg,#374151 0%,#4b5563 100%)';
    hero.appendChild(mkLabel('Microsoft 365'));
    const none = document.createElement('div'); none.className = 'hero-none'; none.textContent = 'Aucun tenant Microsoft 365 détecté pour ce domaine';
    hero.appendChild(none); hero.appendChild(mkDomain());
  } else if (ms.tenantId && !ms.tenantValid) {
    hero.appendChild(mkLabel('Microsoft Tenant ID'));
    const guid = document.createElement('div'); guid.className = 'hero-guid'; guid.style.cssText = 'opacity:.45;text-decoration:line-through;font-size:15px';
    const sp = document.createElement('span'); sp.textContent = ms.tenantId; guid.appendChild(sp);
    hero.appendChild(guid); hero.appendChild(mkDomain());
    const alert = document.createElement('div'); alert.className = 'dup-alert warn';
    const ico = document.createElement('div'); ico.className = 'dup-icon'; ico.textContent = '⚠️';
    const body = document.createElement('div'); body.className = 'dup-body';
    const t = document.createElement('div'); t.className = 'dup-title'; t.textContent = 'Tenant ID invalide';
    const desc = document.createElement('div'); desc.className = 'dup-desc'; desc.textContent = 'Le GUID ne correspond pas à un tenant 365 actif.';
    body.appendChild(t); body.appendChild(desc); alert.appendChild(ico); alert.appendChild(body);
    hero.appendChild(alert);
  } else {
    const hid = 'tid_' + Math.random().toString(36).slice(2);
    const confClass = confidence >= 80 ? 'high' : confidence >= 50 ? 'medium' : 'low';
    const confLabel = confidence >= 80 ? 'Confiance élevée' : confidence >= 50 ? 'Confiance moyenne' : 'Confiance faible';
    hero.appendChild(mkLabel('Microsoft Tenant ID'));
    if (ms.tenantId) {
      const guid = document.createElement('div'); guid.className = 'hero-guid';
      const sp = document.createElement('span'); sp.id = hid; sp.textContent = ms.tenantId;
      const copyBtn = document.createElement('button'); copyBtn.className = 'hero-copy-btn'; copyBtn.textContent = 'Copier';
      copyBtn.addEventListener('click', () => copyVal(hid, copyBtn));
      const badge = document.createElement('span'); badge.className = 'confidence-badge ' + confClass;
      badge.textContent = confidence + '% — ' + confLabel;
      const infoBtn = document.createElement('button'); infoBtn.className = 'conf-info-btn'; infoBtn.textContent = 'i'; infoBtn.setAttribute('aria-label', 'Détail de l\'indice de confiance');
      infoBtn.addEventListener('mousedown', (e) => { e.preventDefault(); showConfTooltip(e, confidence, ms); });
      // mouseup global déjà bindé ligne 430 — pas de listener supplémentaire ici
      badge.appendChild(infoBtn);
      guid.appendChild(sp); guid.appendChild(copyBtn); guid.appendChild(badge);
      hero.appendChild(guid);
    } else {
      const none = document.createElement('div'); none.className = 'hero-none'; none.textContent = 'GUID non résolu — domaine Microsoft détecté';
      hero.appendChild(none);
    }
    hero.appendChild(mkDomain());
    if (ms.tenantId && ms.tenantValid) {
      const a = document.createElement('a');
      a.className = 'hero-partner-btn'; a.href = `https://partner.microsoft.com/dashboard/v2/customers/${encodeURIComponent(ms.tenantId)}/servicemanagementpage`; a.target = '_blank'; a.rel = 'noopener noreferrer';
      const img = document.createElement('img'); img.src='Redirect.png'; img.width=11; img.height=11; img.alt=''; img.style.cssText='display:inline-block;vertical-align:middle;flex-shrink:0;margin-right:5px;';
      a.appendChild(img); a.appendChild(document.createTextNode('Ouvrir Partner Center'));
      const actions = document.createElement('div'); actions.className = 'hero-actions'; actions.appendChild(a);
      hero.appendChild(actions);
    }
  }
  return hero;
}

// ── Export ──
function exportReport() {
  if (!lastReport) return;
  const r       = lastReport;
  const W       = 52;
  const pad     = (l, v) => l + ': ' + v;
  const hr      = (char = '\u2500') => char.repeat(W);
  const section = t => '\n' + t.toUpperCase() + '\n' + hr();
  const dateStr = new Date(r.analysedAt).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' });
  const lines   = [];

  lines.push('  TENANTPULSE  \u2014  SECURITY SUMMARY REPORT');
  lines.push('  ' + r.domain + '   \u00b7   ' + dateStr);
  lines.push(hr());

  lines.push(section('Overall Status'));
  if (r.health) {
    const s       = r.health.score;
    const posture = s >= 80 ? 'HIGH' : s >= 50 ? 'MEDIUM' : 'LOW';
    const grade   = s >= 80 ? '[OK]' : s >= 50 ? '[WARN]' : '[CRIT]';
    const hasSpf  = r.health.checks.some(c => c.title.includes('SPF')       && (c.type === 'ok' || c.type === 'warn'));
    const hasDkim = r.health.checks.some(c => c.title.includes('DKIM actif'));
    const hasDmarc= r.health.checks.some(c => c.title.includes('DMARC')     && (c.type === 'ok' || c.type === 'warn'));
    const mailProt = (hasSpf && hasDkim && hasDmarc) ? 'FULL' : (hasSpf || hasDmarc) ? 'PARTIAL' : 'NONE';
    lines.push(pad('Health Score',     s + '%  ' + grade));
    lines.push(pad('Security Posture', posture));
    lines.push(pad('Mail Protection',  mailProt));
  } else {
    lines.push(pad('Health Score', 'N/A  (fast scan only)'));
  }
  if (r.microsoft?.tenantId && r.microsoft.tenantValid)
    lines.push(pad('MS365 Tenant',   'Detected'));
  else if (!r.microsoft)
    lines.push(pad('MS365 Tenant',   'Not found'));

  if (r.health) {
    lines.push(section('Security Checks'));
    const sym = { ok:' [+]', warn:' [!]', error:' [-]', info:' [i]' };
    r.health.checks.forEach(c => lines.push(sym[c.type] + '  ' + c.title));
  }

  lines.push(section('Infrastructure'));
  const cloud = r.microsoft ? 'Microsoft 365' : r.google ? 'Google Workspace' : r.dns?.detectedProviders?.[0] || '\u2014';
  if (r.host?.hostName)  lines.push(pad('Provider',      r.host.hostName));
  lines.push(pad('Cloud Platform',  cloud));
  if (r.host?.registrar) lines.push(pad('Registrar',     r.host.registrar));
  if (r.microsoft?.tenantId && r.microsoft.tenantValid)
                         lines.push(pad('Tenant ID',     r.microsoft.tenantId));
  if (r.microsoft?.cloudInstance)
                         lines.push(pad('Cloud Instance',r.microsoft.cloudInstance));
  if (r.host?.created)   lines.push(pad('Domain Since',  new Date(r.host.created).toLocaleDateString('en-GB', { day:'2-digit', month:'short', year:'numeric' })));
  if (r.host?.expires)   lines.push(pad('Expires',       new Date(r.host.expires).toLocaleDateString('en-GB',  { day:'2-digit', month:'short', year:'numeric' })));
  if (r.dns?.mx?.length) lines.push(pad('MX',            r.dns.mx[0] + (r.dns.mx.length > 1 ? ' (+' + (r.dns.mx.length - 1) + ')' : '')));

  if (r.health) {
    const RISK_MAP = [
      ['SPF manquant',        'Outbound mail spoofing risk'],
      ['SPF (softfail',       'SPF softfail \u2014 spoofing partially possible'],
      ['DKIM non',            'Weak email authentication posture'],
      ['DMARC manquant',      'No DMARC policy \u2014 phishing risk'],
      ['DMARC p=none',        'DMARC monitor-only \u2014 no enforcement'],
      ['DNSSEC non',          'No DNSSEC integrity validation'],
      ['MX Records manquants','No mail server configured'],
    ];
    const risks = [];
    r.health.checks.forEach(c => {
      if (c.type !== 'error' && c.type !== 'warn') return;
      for (const [key, msg] of RISK_MAP) {
        if (c.title.includes(key.split(' ')[0]) && c.title.toLowerCase().includes((key.split(' ')[1] || '').toLowerCase())) {
          if (!risks.includes(msg)) risks.push(msg);
          return;
        }
      }
    });
    if (risks.length) {
      lines.push(section('Key Risks'));
      risks.forEach(risk => lines.push('  \u25b8  ' + risk));
    }

    const actions = [];
    r.health.checks.forEach(c => {
      if (c.type === 'error') {
        if (c.title.includes('DKIM'))  actions.push('Enable and configure DKIM signing');
        if (c.title.includes('SPF'))   actions.push('Add a valid SPF record');
        if (c.title.includes('DMARC')) actions.push('Deploy a DMARC policy (p=quarantine minimum)');
        if (c.title.includes('MX'))    actions.push('Configure MX records');
      }
      if (c.type === 'warn') {
        if (c.title.includes('DMARC') && c.title.includes('none')) actions.push('Enforce DMARC \u2014 move to p=quarantine or p=reject');
        if (c.title.includes('SPF')   && c.title.includes('softfail')) actions.push('Harden SPF \u2014 replace ~all with -all');
        if (c.title.includes('DNSSEC')) actions.push('Activate DNSSEC on your registrar');
      }
      if (c.type === 'info') {
        if (c.title.includes('MTA-STS')) actions.push('Configure MTA-STS for inbound mail security');
        if (c.title.includes('BIMI'))    actions.push('Configure BIMI (requires DMARC enforce)');
      }
    });
    const unique = [...new Set(actions)];
    if (unique.length) {
      lines.push(section('Recommended Actions'));
      unique.forEach((a, i) => lines.push('  ' + (i + 1) + '.  ' + a));
    }
  }

  const active = (r.otherServices || []).filter(s => s.on);
  if (active.length) {
    lines.push(section('Detected Services'));
    active.forEach(s => lines.push('  [+]  ' + s.name));
  }

  lines.push('');
  lines.push(hr());
  lines.push('  TenantPulse  \u2014  Internal RUN MW Platform');
  lines.push(hr());

  const text = lines.join('\n'), btn = document.getElementById('exportBtn');
  navigator.clipboard.writeText(text).then(() => {
    btn.textContent = '✅ Rapport copié !';
    setTimeout(() => { btn.textContent = '📋 Copier le rapport'; }, 2000);
  }).catch(() => {
    btn.textContent = '⚠ Copiez manuellement';
    setTimeout(() => { btn.textContent = '📋 Copier le rapport'; }, 3000);
  });
}

// ── Common panel builders ──
function buildMsPanel(ms) {
  return b => [
    ms.namespaceType       && ['Namespace Type',         ms.namespaceType],
    ms.federationType      && ['Fédération',             ms.federationType],
    ms.cloudInstance       && ['Cloud Instance',         ms.cloudInstance],
    ms.issuer              && ['Issuer',                 ms.issuer],
    ms.tokenEndpoint       && ['Token Endpoint',         ms.tokenEndpoint],
    ms.authorizationEndpoint && ['Authorization Endpoint', ms.authorizationEndpoint],
    ms.userInfoEndpoint    && ['UserInfo Endpoint',      ms.userInfoEndpoint],
  ].filter(Boolean).forEach(([l, v]) => addRow(b, l, v));
}
function buildGooglePanel(goog) {
  return b => { addRow(b, 'MX Records', goog.mxRecords.join('\n'), 'hi-google'); addRow(b, 'Issuer', goog.issuer); addRow(b, 'Authorization', goog.authorizationEndpoint); addRow(b, 'Token', goog.tokenEndpoint); addRow(b, 'UserInfo', goog.userInfoEndpoint); };
}
function buildDnsPanel(dns) {
  const rows = [dns.mx?.length && ['MX Records', dns.mx.join('\n')], dns.spf && ['SPF Record', dns.spf], dns.detectedProviders?.length && ['Providers détectés', dns.detectedProviders.join(', ')], dns.txt?.length && ['TXT Records', dns.txt.join('\n')]].filter(Boolean);
  return b => rows.forEach(([l, v]) => addRow(b, l, v));
}
function buildHostPanel(host, domain) {
  return b => {
    const logo = hostLogo(host.hostName);
    const sum  = document.createElement('div'); sum.className = 'host-summary';
    const logoDiv = document.createElement('div'); logoDiv.className = 'host-logo'; logoDiv.appendChild(logo.el);
    const info = document.createElement('div');
    const nameEl = document.createElement('div'); nameEl.className = 'host-name'; nameEl.textContent = host.hostName || 'Inconnu';
    const subEl  = document.createElement('div'); subEl.className  = 'host-sub';  subEl.textContent  = host.registrar || 'Registrar non disponible';
    info.appendChild(nameEl); info.appendChild(subEl);
    sum.appendChild(logoDiv); sum.appendChild(info);
    b.appendChild(sum);
    if (host.ns?.length)    addRow(b, 'Serveurs de noms (NS)', host.ns.join('\n'));
    if (host.created)       addRow(b, 'Date de création',      formatDate(host.created));
    if (host.expires)       addRow(b, "Date d'expiration",     formatDate(host.expires));
    if (host.updated)       addRow(b, 'Dernière mise à jour',  formatDate(host.updated));
    if (host.status?.length)addRow(b, 'Statut WHOIS',          host.status.join(', '));
    const lnk = document.createElement('a'); lnk.className = 'ext-link'; lnk.href = `https://www.whois.com/whois/${encodeURIComponent(domain)}`; lnk.target = '_blank'; lnk.rel = 'noopener noreferrer';
    const lnkIcon = document.createTextNode('🔗 WHOIS complet — '); const lnkStrong = document.createElement('strong'); lnkStrong.textContent = domain;
    lnk.appendChild(lnkIcon); lnk.appendChild(lnkStrong); b.appendChild(lnk);
  };
}
function buildHealthPanel(health, domain) {
  return b => {
    b.appendChild(buildScoreRing(health.score, health.dmarcIsQuarantine));
    const hcl = document.createElement('div'); hcl.className = 'hc-list';
    health.checks.forEach(c => {
      const it = document.createElement('div'); it.className = 'hc-item ' + c.t;
      const ico = document.createElement('div'); ico.className = 'hc-icon'; ico.textContent = c.icon;
      const body = document.createElement('div'); body.className = 'hc-body';
      const ttl = document.createElement('div'); ttl.className = 'hc-title'; ttl.textContent = c.title;
      const dsc = document.createElement('div'); dsc.className = 'hc-desc';  dsc.textContent = c.desc;
      body.appendChild(ttl); body.appendChild(dsc); it.appendChild(ico); it.appendChild(body);
      hcl.appendChild(it);
    });
    b.appendChild(hcl);
    buildDkimBlock(b, health.dkimResults, health.hasSel1, health.hasSel2);
    const lnk = document.createElement('a'); lnk.className = 'ext-link'; lnk.href = `https://mxtoolbox.com/SuperTool.aspx?action=mx:${encodeURIComponent(domain)}`; lnk.target = '_blank'; lnk.rel = 'noopener';
    const lnkIcon = document.createTextNode('🔗 Analyse complète sur MXToolbox — '); const lnkStrong = document.createElement('strong'); lnkStrong.textContent = domain;
    lnk.appendChild(lnkIcon); lnk.appendChild(lnkStrong); b.appendChild(lnk);
  };
}

function msRows(ms) {
  return [ms.namespaceType && ['Namespace Type', ms.namespaceType], ms.federationType && ['Fédération', ms.federationType], ms.cloudInstance && ['Cloud Instance', ms.cloudInstance], ms.issuer && ['Issuer', ms.issuer], ms.tokenEndpoint && ['Token Endpoint', ms.tokenEndpoint], ms.authorizationEndpoint && ['Authorization Endpoint', ms.authorizationEndpoint], ms.userInfoEndpoint && ['UserInfo Endpoint', ms.userInfoEndpoint]].filter(Boolean);
}
function healthScoreLbl(health) {
  const star = health.dmarcIsQuarantine ? ' ⭐' : '';
  return health.score >= 80 ? `${health.score}%${star} 🟢` : health.score >= 50 ? `${health.score}%${star} 🟡` : `${health.score}%${star} 🔴`;
}
function healthSubLbl(health) {
  const errC = health.checks.filter(c => c.t === 'error').length, warnC = health.checks.filter(c => c.t === 'warn').length;
  const dkim = health.hasSel1 && health.hasSel2 ? ' · DKIM✅✅' : health.hasSel1 || health.hasSel2 ? ' · DKIM✅⚠️' : ' · DKIM❌';
  return `SPF · DMARC · DKIM · DNSSEC · MTA-STS${errC > 0 ? ' — ' + errC + ' erreur(s)' : ''}${warnC > 0 ? ', ' + warnC + ' avert.' : ''}${dkim}`;
}

// ── FAST check ──
async function checkFast() {
  const raw = emailInput.value.trim(); if (!raw) { showError('Veuillez entrer une adresse e-mail ou un domaine.'); return; }
  const domain = extractDomain(raw); if (!domain || !domain.includes('.')) { showError('Domaine invalide.'); return; }
  const center = document.getElementById('centerCol'), exportBtn = document.getElementById('exportBtn'), errBox = document.getElementById('errBox');
  errBox.style.display = 'none'; center.innerHTML = ''; closePanel();
  exportBtn.classList.remove('visible'); lastReport = null;
  currentState = { domain, ms:null, dns:null, goog:null, health:null, others:null, host:null, fullDone:false };
  showSteps(['ms', 'google', 'dns']);
  try {
    setStep('step-ms', 'active');
    stepRetryFns.ms = async () => { setStep('step-ms', 'active'); currentState.ms = isMsaPersonalDomain(domain) ? null : await checkMicrosoft(domain); setStep('step-ms', currentState.ms ? 'done' : 'fail'); };
    currentState.ms = isMsaPersonalDomain(domain) ? null : await checkMicrosoft(domain);
    if (!document.getElementById('step-ms').className.includes('timeout')) setStep('step-ms', currentState.ms ? 'done' : 'fail');

    setStep('step-google', 'active');
    stepRetryFns.google = async () => { setStep('step-google', 'active'); currentState.goog = await checkGoogle(domain); setStep('step-google', currentState.goog ? 'done' : 'fail'); };
    currentState.goog = await checkGoogle(domain);
    if (!document.getElementById('step-google').className.includes('timeout')) setStep('step-google', currentState.goog ? 'done' : 'fail');

    setStep('step-dns', 'active');
    stepRetryFns.dns = async () => { setStep('step-dns', 'active'); currentState.dns = await checkDNS(domain); setStep('step-dns', currentState.dns?.mx?.length > 0 ? 'done' : 'fail'); };
    currentState.dns = await checkDNS(domain);
    if (!document.getElementById('step-dns').className.includes('timeout')) setStep('step-dns', currentState.dns.mx.length > 0 ? 'done' : 'fail');

    document.getElementById('progList').style.display = 'none';
    const confidence = computeConfidence(currentState.ms);
    lastReport = { domain, analysedAt: new Date().toISOString(), input: raw, microsoft: currentState.ms, google: currentState.goog, dns: currentState.dns, health: null, otherServices: null, host: null, tenantConfidence: confidence, fullDone: false };
    exportBtn.classList.add('visible');
    if (currentState.ms?.tenantId && currentState.ms.tenantValid) addToHistory(domain, currentState.ms.tenantId);
    center.appendChild(renderHero(currentState.ms, domain, confidence));
    if (currentState.dns?.detectedProviders?.length) {
      const pb = document.createElement('div'); pb.className = 'pills-block';
      const pl = document.createElement('div'); pl.className = 'pills-label'; pl.textContent = 'Providers e-mail détectés (DNS)';
      const pr = document.createElement('div'); pr.className = 'pills-row';
      currentState.dns.detectedProviders.forEach(name => { const p = document.createElement('div'); p.className = 'pill on'; p.textContent = '✓ ' + name; pr.appendChild(p); });
      pb.appendChild(pl); pb.appendChild(pr); center.appendChild(pb);
    }
    // FIX #1 : iconEl reçoit un élément DOM créé via makeImgIcon (plus de MS_SVG / innerHTML)
    if (currentState.ms?.tenantValid) {
      const rows = msRows(currentState.ms);
      center.appendChild(makeCard({ id:'ms', iconEl:makeImgIcon('Microsoft.png','Microsoft',22), iconBg:'ms-clr', title:'Microsoft 365 / Entra ID', sub:'Endpoints & informations tenant', badge: rows.length + ' champs', badgeCls:'ms-b', selCls:'selected', onClick: () => openPanel('ms', 'Microsoft 365 / Entra ID', buildMsPanel(currentState.ms)) }));
    }
    // FIX #1 : makeGoogleSvgIcon() remplace GG_SVG (chaîne SVG) — création DOM sûre
    if (currentState.goog) center.appendChild(makeCard({ id:'google', iconEl:makeGoogleSvgIcon(), iconBg:'gg-clr', title:'Google Workspace', sub:'OpenID Connect & MX Records', badge:'5 champs', badgeCls:'gg-b', selCls:'sel-google', onClick: () => openPanel('google', '🔵 Google Workspace', buildGooglePanel(currentState.goog)) }));
    const dnsRowCount = [currentState.dns?.mx?.length, currentState.dns?.spf, currentState.dns?.detectedProviders?.length, currentState.dns?.txt?.length].filter(Boolean).length;
    // FIX #1 : makeImgIcon remplace la chaîne '<img src="DNS.png" ...>' passée en innerHTML
    if (dnsRowCount) center.appendChild(makeCard({ id:'dns', iconEl:makeImgIcon('DNS.png','DNS',20), iconBg:'dn-clr', title:'Enregistrements DNS', sub:'MX · SPF · TXT', badge: dnsRowCount + ' entrées', badgeCls:'dn-b', selCls:'sel-dns', onClick: () => openPanel('dns', '🌐 Enregistrements DNS', buildDnsPanel(currentState.dns)) }));
    const ctaBtn = document.createElement('button'); ctaBtn.className = 'btn-trigger-full'; ctaBtn.id = 'btnTriggerFull';
    (() => {
      ctaBtn.textContent = '';
      const lbl = document.createElement('span'); lbl.id = 'stfLabel';
      const img = document.createElement('img'); img.src='Analyse.png'; img.width=14; img.height=14; img.alt=''; img.style.cssText='display:inline-block;vertical-align:middle;flex-shrink:0;margin-right:4px;';
      lbl.appendChild(img); lbl.appendChild(document.createTextNode("Lancer l'analyse complète"));
      const spinner = document.createElement('span'); spinner.className = 'stf-spinner';
      const hint = document.createElement('span'); hint.style.cssText='font-size:10px;opacity:.65;margin-left:4px'; hint.textContent='WHOIS · sécurité DNS';
      ctaBtn.appendChild(lbl); ctaBtn.appendChild(spinner); ctaBtn.appendChild(hint);
    })();
    ctaBtn.onclick = () => runFullFromState(raw, domain, ctaBtn);
    center.appendChild(ctaBtn);
  } catch (err) { document.getElementById('progList').style.display = 'none'; showError('⚠ Erreur : ' + err.message); }
  finally { unlockButtons(); setFastLoading(false); }
}

// ── Full from fast ──
async function runFullFromState(raw, domain, ctaBtn) {
  if (currentState.fullDone) return;
  ctaBtn.classList.add('running');
  document.getElementById('stfLabel').textContent = 'Analyse en cours…';
  lockButtons();
  showSteps(['health', 'others', 'host']);
  ['health', 'others', 'host'].forEach(k => setStep('step-' + k, 'pending'));
  try {
    const center = document.getElementById('centerCol'), exportBtn = document.getElementById('exportBtn');

    setStep('step-health', 'active');
    stepRetryFns.health = async () => { setStep('step-health', 'active'); currentState.health = await checkHealth(domain); setStep('step-health', 'done'); };
    currentState.health = await checkHealth(domain);
    if (!document.getElementById('step-health').className.includes('timeout')) setStep('step-health', 'done');

    setStep('step-others', 'active');
    stepRetryFns.others = async () => { setStep('step-others', 'active'); currentState.others = await checkOtherTenants(domain, currentState.dns || {}); setStep('step-others', 'done'); };
    currentState.others = await checkOtherTenants(domain, currentState.dns || {});
    if (!document.getElementById('step-others').className.includes('timeout')) setStep('step-others', 'done');

    setStep('step-host', 'active');
    stepRetryFns.host = async () => { setStep('step-host', 'active'); currentState.host = await checkHost(domain); setStep('step-host', currentState.host ? 'done' : 'fail'); };
    currentState.host = await checkHost(domain);
    if (!document.getElementById('step-host').className.includes('timeout')) setStep('step-host', currentState.host ? 'done' : 'fail');

    document.getElementById('progList').style.display = 'none';
    currentState.fullDone = true;
    const confidence = computeConfidence(currentState.ms);
    const oldHero = center.querySelector('.tenant-hero');
    if (oldHero) center.replaceChild(renderHero(currentState.ms, domain, confidence), oldHero);

    lastReport = { domain, analysedAt: new Date().toISOString(), input: raw, microsoft: currentState.ms, google: currentState.goog, dns: currentState.dns, health: { score: currentState.health.score, dmarcIsQuarantine: currentState.health.dmarcIsQuarantine, checks: currentState.health.checks.map(c => ({ type:c.t, title:c.title, desc:c.desc })), dkim: { selector1: currentState.health.hasSel1, selector2: currentState.health.hasSel2, allResults: currentState.health.dkimResults } }, otherServices: currentState.others, host: currentState.host, tenantConfidence: confidence, fullDone: true };
    exportBtn.classList.add('visible');

    const newPb = document.createElement('div'); newPb.className = 'pills-block';
    const pl = document.createElement('div'); pl.className = 'pills-label'; pl.textContent = 'Autres services détectés';
    const pr = document.createElement('div'); pr.className = 'pills-row collapsed';
    (currentState.others || []).forEach(t => {
      const p = document.createElement('div'); p.className = 'pill ' + (t.on ? 'on' : 'off');
      if (t.imgSrc) { const img = document.createElement('img'); img.className='svc-logo'; img.src=t.imgSrc; img.alt=t.name; img.loading='lazy'; p.appendChild(img); p.appendChild(document.createTextNode(' ')); }
      p.appendChild(document.createTextNode(t.name + (t.on ? ' ✓' : '')));
      pr.appendChild(p);
    });
    const tg = document.createElement('button'); tg.type='button'; tg.className='pills-toggle'; tg.textContent='Afficher tout';
    tg.onclick = () => { const c = pr.classList.toggle('collapsed'); tg.textContent = c ? 'Afficher tout' : 'Réduire'; };
    pl.appendChild(tg);
    newPb.appendChild(pl); newPb.appendChild(pr);
    const oldPills = center.querySelector('.pills-block');
    if (oldPills) center.replaceChild(newPb, oldPills); else center.insertBefore(newPb, center.querySelector('.result-card') || ctaBtn);

    if (currentState.host) {
      const logo = hostLogo(currentState.host.hostName);
      center.insertBefore(makeCard({ id:'host', iconEl:logo.el, iconBg:'hs-clr', title:'Hébergeur & Registrar', sub:'WHOIS / RDAP — ' + (currentState.host.hostName || 'Inconnu'), badge: currentState.host.hostName || 'Inconnu', badgeCls:'hs-b', selCls:'sel-host', onClick: () => openPanel('host', '🏠 Hébergeur & Registrar', buildHostPanel(currentState.host, domain)) }), ctaBtn);
    }
    // FIX #1 : makeImgIcon remplace la chaîne '<img src="Santé.png" ...>' passée en innerHTML
    if (currentState.health) {
      center.insertBefore(makeCard({ id:'health', iconEl:makeImgIcon('Santé.png','Santé',20), iconBg:'hl-clr', title:'Santé du domaine', sub: healthSubLbl(currentState.health), badge: healthScoreLbl(currentState.health), badgeCls:'hl-b', selCls:'sel-health', onClick: () => openPanel('health', '🛡️ Santé du domaine', buildHealthPanel(currentState.health, domain)) }), ctaBtn);
    }
    ctaBtn.classList.remove('running'); ctaBtn.classList.add('done'); ctaBtn.textContent = '✅ Analyse complète effectuée'; ctaBtn.onclick = null;
  } catch (err) {
    ctaBtn.classList.remove('running');
    ctaBtn.textContent = '';
    const lbl2 = document.createElement('span'); lbl2.id = 'stfLabel';
    const img2 = document.createElement('img'); img2.src='Analyse.png'; img2.width=14; img2.height=14; img2.alt=''; img2.style.cssText='display:inline-block;vertical-align:middle;flex-shrink:0;margin-right:4px;';
    lbl2.appendChild(img2); lbl2.appendChild(document.createTextNode("Lancer l'analyse complète"));
    const hint2 = document.createElement('span'); hint2.style.cssText='font-size:10px;opacity:.65;margin-left:4px'; hint2.textContent='WHOIS · sécurité DNS';
    ctaBtn.appendChild(lbl2); ctaBtn.appendChild(hint2);
    document.getElementById('progList').style.display = 'none';
    showError('⚠ Erreur analyse complète : ' + err.message);
  } finally { unlockButtons(); }
}

// ── Full from scratch ──
async function checkFull() {
  const raw = emailInput.value.trim(); if (!raw) { showError('Veuillez entrer une adresse e-mail ou un domaine.'); return; }
  const domain = extractDomain(raw); if (!domain || !domain.includes('.')) { showError('Domaine invalide.'); return; }
  const center = document.getElementById('centerCol'), exportBtn = document.getElementById('exportBtn'), errBox = document.getElementById('errBox');
  errBox.style.display = 'none'; center.innerHTML = ''; closePanel();
  exportBtn.classList.remove('visible'); lastReport = null;
  currentState = { domain, ms:null, dns:null, goog:null, health:null, others:null, host:null, fullDone:false };
  lockButtons(); setFullLoading(true);
  showSteps(['ms', 'google', 'dns', 'health', 'others', 'host']);
  ['ms', 'google', 'dns', 'health', 'others', 'host'].forEach(k => setStep('step-' + k, 'pending'));
  try {
    setStep('step-ms', 'active');     currentState.ms     = isMsaPersonalDomain(domain) ? null : await checkMicrosoft(domain); setStep('step-ms', currentState.ms ? 'done' : 'fail');
    setStep('step-google', 'active'); currentState.goog   = await checkGoogle(domain);                                          setStep('step-google', currentState.goog ? 'done' : 'fail');
    setStep('step-dns', 'active');    currentState.dns    = await checkDNS(domain);                                            setStep('step-dns', currentState.dns.mx.length > 0 ? 'done' : 'fail');
    setStep('step-health', 'active'); currentState.health = await checkHealth(domain);                                         setStep('step-health', 'done');
    setStep('step-others', 'active'); currentState.others = await checkOtherTenants(domain, currentState.dns);                 setStep('step-others', 'done');
    setStep('step-host', 'active');   currentState.host   = await checkHost(domain);                                           setStep('step-host', currentState.host ? 'done' : 'fail');
    document.getElementById('progList').style.display = 'none';
    currentState.fullDone = true;
    const confidence = computeConfidence(currentState.ms);
    lastReport = { domain, analysedAt: new Date().toISOString(), input: raw, microsoft: currentState.ms, google: currentState.goog, dns: currentState.dns, health: { score: currentState.health.score, dmarcIsQuarantine: currentState.health.dmarcIsQuarantine, checks: currentState.health.checks.map(c => ({ type:c.t, title:c.title, desc:c.desc })), dkim: { selector1: currentState.health.hasSel1, selector2: currentState.health.hasSel2, allResults: currentState.health.dkimResults } }, otherServices: currentState.others, host: currentState.host, tenantConfidence: confidence, fullDone: true };
    exportBtn.classList.add('visible');
    if (currentState.ms?.tenantId && currentState.ms.tenantValid) addToHistory(domain, currentState.ms.tenantId);
    center.appendChild(renderHero(currentState.ms, domain, confidence));

    const pb = document.createElement('div'); pb.className = 'pills-block';
    const pl = document.createElement('div'); pl.className = 'pills-label'; pl.textContent = 'Autres services détectés';
    const pr = document.createElement('div'); pr.className = 'pills-row collapsed';
    currentState.others.forEach(t => {
      const p = document.createElement('div'); p.className = 'pill ' + (t.on ? 'on' : 'off');
      if (t.imgSrc) { const img = document.createElement('img'); img.className='svc-logo'; img.src=t.imgSrc; img.alt=t.name; img.loading='lazy'; p.appendChild(img); p.appendChild(document.createTextNode(' ')); }
      p.appendChild(document.createTextNode(t.name + (t.on ? ' ✓' : '')));
      pr.appendChild(p);
    });
    const tg = document.createElement('button'); tg.type='button'; tg.className='pills-toggle'; tg.textContent='Afficher tout';
    tg.onclick = () => { const c = pr.classList.toggle('collapsed'); tg.textContent = c ? 'Afficher tout' : 'Réduire'; };
    pl.appendChild(tg);
    pb.appendChild(pl); pb.appendChild(pr); center.appendChild(pb);

    // FIX #1 : tous les appels makeCard utilisent maintenant iconEl (createElement), pas iconHtml
    if (currentState.ms?.tenantValid) {
      const rows = msRows(currentState.ms);
      center.appendChild(makeCard({ id:'ms', iconEl:makeImgIcon('Microsoft.png','Microsoft',22), iconBg:'ms-clr', title:'Microsoft 365 / Entra ID', sub:'Endpoints & informations tenant', badge: rows.length + ' champs', badgeCls:'ms-b', selCls:'selected', onClick: () => openPanel('ms', 'Microsoft 365 / Entra ID', buildMsPanel(currentState.ms)) }));
    }
    if (currentState.goog) center.appendChild(makeCard({ id:'google', iconEl:makeGoogleSvgIcon(), iconBg:'gg-clr', title:'Google Workspace', sub:'OpenID Connect & MX Records', badge:'5 champs', badgeCls:'gg-b', selCls:'sel-google', onClick: () => openPanel('google', '🔵 Google Workspace', buildGooglePanel(currentState.goog)) }));
    if (currentState.host) {
      const logo = hostLogo(currentState.host.hostName);
      center.appendChild(makeCard({ id:'host', iconEl:logo.el, iconBg:'hs-clr', title:'Hébergeur & Registrar', sub:'WHOIS / RDAP — ' + (currentState.host.hostName || 'Inconnu'), badge: currentState.host.hostName || 'Inconnu', badgeCls:'hs-b', selCls:'sel-host', onClick: () => openPanel('host', '🏠 Hébergeur & Registrar', buildHostPanel(currentState.host, domain)) }));
    }
    const dnsRowCount = [currentState.dns?.mx?.length, currentState.dns?.spf, currentState.dns?.detectedProviders?.length, currentState.dns?.txt?.length].filter(Boolean).length;
    if (dnsRowCount) center.appendChild(makeCard({ id:'dns', iconEl:makeImgIcon('DNS.png','DNS',20), iconBg:'dn-clr', title:'Enregistrements DNS', sub:'MX · SPF · TXT', badge: dnsRowCount + ' entrées', badgeCls:'dn-b', selCls:'sel-dns', onClick: () => openPanel('dns', '🌐 Enregistrements DNS', buildDnsPanel(currentState.dns)) }));
    center.appendChild(makeCard({ id:'health', iconEl:makeImgIcon('Santé.png','Santé',20), iconBg:'hl-clr', title:'Santé du domaine', sub: healthSubLbl(currentState.health), badge: healthScoreLbl(currentState.health), badgeCls:'hl-b', selCls:'sel-health', onClick: () => openPanel('health', '🛡️ Santé du domaine', buildHealthPanel(currentState.health, domain)) }));
  } catch (err) { document.getElementById('progList').style.display = 'none'; showError('⚠ Erreur : ' + err.message); }
  finally { unlockButtons(); setFullLoading(false); }
}
