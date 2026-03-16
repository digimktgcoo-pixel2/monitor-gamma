/**
 * app.js
 * Application initialization and orchestration — Section 7.7–7.12
 *
 * Data Source: U.S. Environmental Protection Agency (EPA) RadNet.
 * This site provides informational visualization only.
 * Not an official emergency alert system.
 */

// ── App State ─────────────────────────────────────────────────
const AppState = {
  stations:    [],       // raw station list from fallback-stations.json
  stationData: {},       // id → normalized data from radnet.js
  selectedId:  null,
  loadedCount: 0,
  totalCount:  0,
  refreshTimer: null,
};

const REFRESH_INTERVAL_MS = 60 * 60 * 1000; // 1 hour

// ── Boot ─────────────────────────────────────────────────────
document.addEventListener("DOMContentLoaded", async () => {
  initClock();
  await loadStationList();
  initMap("map", handleStationClick);
  AppState.stations.forEach(s => addStationMarker(s));
  initUI();
  startDataLoad();
  scheduleRefresh();
  registerPWA();
});

// ── Station List ──────────────────────────────────────────────
async function loadStationList() {
  try {
    const res = await fetch("data/fallback-stations.json");
    AppState.stations = await res.json();
    AppState.totalCount = AppState.stations.length;
  } catch (e) {
    console.error("Failed to load station list:", e);
    AppState.stations = [];
  }
}

// ── Data Load ─────────────────────────────────────────────────
function startDataLoad() {
  AppState.loadedCount = 0;
  setStatus("Connecting to EPA RadNet…");
  setProgress(0);

  loadAllStations(
    AppState.stations,
    onStationLoaded,
    onAllLoaded
  );
}

function onStationLoaded(data) {
  AppState.stationData[data.id] = data;
  AppState.loadedCount++;

  updateStationMarker(data);
  updateSummaryBar();
  setProgress(Math.round((AppState.loadedCount / AppState.totalCount) * 100));

  // If this is the selected station, refresh panel
  if (AppState.selectedId === data.id) {
    renderPanel(data);
  }
}

function onAllLoaded() {
  setStatus(`${AppState.loadedCount} stations loaded`);
  updateSummaryBar();
  // Fade progress bar
  setTimeout(() => {
    const pw = document.getElementById("progress-wrap");
    if (pw) pw.style.opacity = "0";
  }, 1500);
}

function scheduleRefresh() {
  AppState.refreshTimer = setInterval(() => {
    setStatus("Refreshing data…");
    startDataLoad();
  }, REFRESH_INTERVAL_MS);
}

// ── Station Selection ─────────────────────────────────────────
function handleStationClick(stationId) {
  AppState.selectedId = stationId;
  selectMarker(stationId);

  const data = AppState.stationData[stationId];
  const station = AppState.stations.find(s => s.id === stationId);

  if (data) {
    renderPanel(data);
    flyToStation(data);
  } else if (station) {
    renderPanelLoading(station);
    flyToStation(station);
  }

  openPanel();
}

// ── Panel Render ──────────────────────────────────────────────
function renderPanel(data) {
  const cfg   = getStatusConfig(data.status);
  const dose  = formatDose(data.dose_nsvh);
  const cpm   = data.cpm ? data.cpm + " CPM" : "—";
  const ts    = formatTimestamp(data.timestamp);
  const pct   = Math.min(Math.round(((data.dose_nsvh || 0) / 200) * 100), 100);
  const live  = data.isLive
    ? `<span class="badge badge-live">● LIVE</span>`
    : `<span class="badge badge-est">◌ ESTIMATED</span>`;

  document.getElementById("panel-title").textContent = data.name;
  document.getElementById("panel-body").innerHTML = `
    <div class="panel-status" style="color:${cfg.color}">
      <span class="status-pip" style="background:${cfg.color}"></span>
      ${cfg.label} ${live}
    </div>

    <div class="metric-grid">
      <div class="metric-card" style="border-color:${cfg.colorDim};background:${cfg.colorBg}">
        <div class="metric-val" style="color:${cfg.color}">${data.dose_nsvh ?? "—"}</div>
        <div class="metric-unit">nSv/h</div>
        <div class="metric-name">Dose Rate</div>
      </div>
      <div class="metric-card" style="border-color:${cfg.colorDim};background:${cfg.colorBg}">
        <div class="metric-val" style="color:${cfg.color}">${data.cpm ?? "—"}</div>
        <div class="metric-unit">CPM</div>
        <div class="metric-name">Gamma Count</div>
      </div>
    </div>

    <div class="context-card">
      <div class="context-heading">WHAT THIS MEANS</div>
      <p class="context-text">${getDoseContext(data.dose_nsvh)}</p>
    </div>

    <div class="scale-wrap">
      <div class="scale-label">Background Radiation Scale</div>
      <div class="scale-track">
        <div class="scale-fill" style="width:${pct}%;background:${cfg.color}"></div>
        <div class="scale-zones">
          <span class="zone-normal">NORMAL</span>
          <span class="zone-elev">ELEVATED</span>
          <span class="zone-alert">ALERT</span>
        </div>
      </div>
      <div class="scale-ticks">
        <span>0</span><span>100</span><span>150</span><span>200+ nSv/h</span>
      </div>
    </div>

    <div class="panel-meta">
      <div><span class="meta-label">UPDATED</span> ${ts}</div>
      <div><span class="meta-label">SOURCE</span> EPA RadNet CDX</div>
      <div><span class="meta-label">STATE</span> ${data.state}</div>
    </div>

    <div class="disclaimer-mini">
      ⚠ Visual indicator only. Not an official emergency alert system.<br>
      Check <a href="https://www.epa.gov/radnet" target="_blank" rel="noopener">epa.gov/radnet</a> for official data.
    </div>
  `;
}

function renderPanelLoading(station) {
  document.getElementById("panel-title").textContent = station.name;
  document.getElementById("panel-body").innerHTML = `
    <div class="panel-loading">
      <div class="loading-spinner"></div>
      <p>Loading EPA RadNet data…</p>
    </div>
  `;
}

// ── Summary Bar ───────────────────────────────────────────────
function updateSummaryBar() {
  const s = getNationalSummary(AppState.stationData);
  setText("stat-normal",   s.normal);
  setText("stat-elevated", s.elevated);
  setText("stat-alert",    s.alert);
  setText("stat-nodata",   s.noData);
  setText("stat-avg",      s.avgDose ? s.avgDose + " nSv/h" : "—");
  setText("stat-loaded",   `${AppState.loadedCount}/${AppState.totalCount}`);
}

// ── Panel Open/Close ──────────────────────────────────────────
function openPanel() {
  document.getElementById("info-panel").classList.add("open");
}

function closePanel() {
  document.getElementById("info-panel").classList.remove("open");
  AppState.selectedId = null;
}

// ── Clock ─────────────────────────────────────────────────────
function initClock() {
  const el = document.getElementById("utc-clock");
  if (!el) return;
  function tick() {
    el.textContent = new Date().toUTCString().replace("GMT", "UTC");
  }
  tick();
  setInterval(tick, 1000);
}

// ── Progress & Status ─────────────────────────────────────────
function setProgress(pct) {
  const bar = document.getElementById("progress-bar");
  if (bar) bar.style.width = pct + "%";
  const pw = document.getElementById("progress-wrap");
  if (pw) pw.style.opacity = "1";
}

function setStatus(msg) {
  const el = document.getElementById("status-text");
  if (el) el.textContent = msg;
}

// ── UI Events ─────────────────────────────────────────────────
function initUI() {
  // Close panel button
  const closeBtn = document.getElementById("panel-close");
  if (closeBtn) closeBtn.addEventListener("click", closePanel);

  // Search
  const searchInput = document.getElementById("search-input");
  if (searchInput) {
    searchInput.addEventListener("input", handleSearch);
    searchInput.addEventListener("keydown", e => {
      if (e.key === "Escape") clearSearch();
    });
  }

  // Click outside search results
  document.addEventListener("click", e => {
    if (!e.target.closest(".search-wrap")) clearSearch();
  });

  // PWA install prompt
  window.addEventListener("beforeinstallprompt", e => {
    e.preventDefault();
    window._pwaPrompt = e;
    const btn = document.getElementById("install-btn");
    if (btn) btn.style.display = "flex";
  });

  const installBtn = document.getElementById("install-btn");
  if (installBtn) {
    installBtn.addEventListener("click", async () => {
      if (window._pwaPrompt) {
        window._pwaPrompt.prompt();
        const { outcome } = await window._pwaPrompt.userChoice;
        if (outcome === "accepted") installBtn.style.display = "none";
      }
    });
  }
}

// ── Search ────────────────────────────────────────────────────
function handleSearch(e) {
  const q = e.target.value.toLowerCase().trim();
  const list = document.getElementById("search-results");
  if (!q) { list.innerHTML = ""; list.style.display = "none"; return; }

  const matches = AppState.stations.filter(s =>
    s.name.toLowerCase().includes(q) || s.state.toLowerCase() === q
  ).slice(0, 7);

  if (!matches.length) { list.innerHTML = ""; list.style.display = "none"; return; }

  list.innerHTML = matches.map(s => {
    const d = AppState.stationData[s.id];
    const color = d ? getStatusConfig(d.status).color : "#475569";
    const val   = d?.dose_nsvh ? `${d.dose_nsvh} nSv/h` : "loading…";
    return `<div class="search-item" onclick="jumpTo('${s.id}')">
      <span class="search-name">${s.name}</span>
      <span class="search-val" style="color:${color}">${val}</span>
    </div>`;
  }).join("");
  list.style.display = "block";
}

function clearSearch() {
  const list = document.getElementById("search-results");
  if (list) { list.innerHTML = ""; list.style.display = "none"; }
}

function jumpTo(stationId) {
  clearSearch();
  const inp = document.getElementById("search-input");
  const s = AppState.stations.find(x => x.id === stationId);
  if (inp && s) inp.value = s.name;
  handleStationClick(stationId);
}

// ── Helpers ───────────────────────────────────────────────────
function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

// ── PWA ───────────────────────────────────────────────────────
function registerPWA() {
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("/service-worker.js").catch(() => {});
  }
}
