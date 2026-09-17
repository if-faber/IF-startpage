// tab-alerts.js — Moduł Zakładki „Centrum Alertów i Diagnostyka” (mods/admin)

let currentAlertFilter = "all";
let cachedContainers = [];

function renderAlertsTab() {
  return `
    <div class="admin-tab-container">
      <!-- 1. Karta KPI i statusu na żywo -->
      <section class="admin-section-card">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 16px;">
          <h2 style="margin: 0;">🔔 Stan Usług i Kondycja Serwera</h2>
          <div style="display: flex; align-items: center; gap: 10px;">
            <div id="alertsLiveBadge" style="display: inline-flex; align-items: center; gap: 6px; padding: 5px 12px; border-radius: 20px; font-size: 11px; font-weight: 700; background: rgba(255,255,255,0.06); border: 1px solid var(--line); color: var(--muted);">
              <span id="alertsLiveDot" style="width: 8px; height: 8px; border-radius: 50%; background: #10b981;"></span>
              <span id="alertsLiveText">Aktualne</span>
            </div>
            <button type="button" class="button" id="btnRefreshAlertsTab">🔄 Odśwież</button>
          </div>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px;">
          <div class="cockpit-stat-card" style="margin: 0; min-height: auto; padding: 18px;">
            <header style="margin-bottom: 8px;"><h3>Stan ogólny</h3></header>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <strong id="valAlertsStatus" style="font-size: 20px; line-height: 1.2;">--</strong>
              <span id="subAlertsStatus" style="font-size: 12px; color: var(--muted); line-height: 1.4; word-break: break-word;">Inicjalizacja</span>
            </div>
          </div>
          <div class="cockpit-stat-card" style="margin: 0; min-height: auto; padding: 18px;">
            <header style="margin-bottom: 8px;"><h3>Aktywne alerty</h3></header>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <strong id="valAlertsTotal" style="font-size: 20px; line-height: 1.2;">0</strong>
              <span id="subAlertsTotal" style="font-size: 12px; color: var(--muted); line-height: 1.4; word-break: break-word;">0 krytycznych</span>
            </div>
          </div>
          <div class="cockpit-stat-card" style="margin: 0; min-height: auto; padding: 18px;">
            <header style="margin-bottom: 8px;"><h3>Kontenery Docker</h3></header>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <strong id="valAlertsRunning" style="font-size: 20px; line-height: 1.2;">--</strong>
              <span id="subAlertsTotalCont" style="font-size: 12px; color: var(--muted); line-height: 1.4; word-break: break-word;">Wszystkich: --</span>
            </div>
          </div>
          <div class="cockpit-stat-card" style="margin: 0; min-height: auto; padding: 18px;">
            <header style="margin-bottom: 8px;"><h3>Sprzęt</h3></header>
            <div style="display: flex; flex-direction: column; gap: 4px;">
              <strong id="valAlertsCpu" style="font-size: 20px; line-height: 1.2;">-- °C</strong>
              <span id="subAlertsRam" style="font-size: 12px; color: var(--muted); line-height: 1.4; word-break: break-word;">RAM: --%</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 2. Wykryte Zgłoszenia i Awarie -->
      <section class="admin-section-card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
          <h2 style="margin: 0;">⚠️ Wykryte Zgłoszenia i Awarie</h2>
          <span id="activeIncidentsBadge" style="font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 8px; background: rgba(255,255,255,0.08); color: var(--muted); border: 1px solid var(--line);">0 zgłoszeń</span>
        </div>
        <div id="alertsIncidentsList" style="display: flex; flex-direction: column; gap: 10px;">
          <div class="empty">Pobieranie alertów...</div>
        </div>
      </section>

      <!-- 3. Wszystkie Kontenery Docker -->
      <section class="admin-section-card">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 14px;">
          <h2 style="margin: 0;">🐳 Wszystkie Kontenery Docker</h2>
          <div class="filter-actions" style="display: flex; gap: 6px;">
            <button type="button" class="button filter-btn active" data-alert-filter="all">Wszystkie</button>
            <button type="button" class="button filter-btn" data-alert-filter="issues">Tylko z problemem</button>
            <button type="button" class="button filter-btn" data-alert-filter="running">Uruchomione</button>
          </div>
        </div>
        <div id="alertsContainersGrid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 12px;">
          <div class="empty">Pobieranie stanu kontenerów...</div>
        </div>
      </section>

      <!-- 4. Narzędzia Administracyjne -->
      <section class="admin-section-card">
        <h2 style="margin: 0 0 4px 0;">🛠️ Wybierz narzędzie administracyjne</h2>
        <p style="margin: 0 0 16px 0; font-size: 12px; color: var(--muted);">Bezpośrednie odnośniki do centralnych konsol zarządzania serwerem</p>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px;">
          <a id="tabLinkCockpit" href="#" target="_blank" rel="noreferrer" class="tool-card" style="display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid var(--line); text-decoration: none; color: inherit; transition: transform 0.15s ease, background 0.15s ease;">
            <span style="font-size: 26px;">🐧</span>
            <div>
              <strong style="display: block; font-size: 13px; color: #fff;">Cockpit Linux</strong>
              <span style="font-size: 11px; color: var(--muted);">Panel OS i logi (:9090)</span>
            </div>
            <span style="margin-left: auto; font-size: 13px; color: var(--muted);">↗</span>
          </a>
          <a id="tabLinkDockge" href="#" target="_blank" rel="noreferrer" class="tool-card" style="display: flex; align-items: center; gap: 12px; padding: 14px 16px; border-radius: 12px; background: rgba(255,255,255,0.03); border: 1px solid var(--line); text-decoration: none; color: inherit; transition: transform 0.15s ease, background 0.15s ease;">
            <span style="font-size: 26px;">🐳</span>
            <div>
              <strong style="display: block; font-size: 13px; color: #fff;">Dockge Stacks</strong>
              <span style="font-size: 11px; color: var(--muted);">Zarządzanie kontenerami (:5001)</span>
            </div>
            <span style="margin-left: auto; font-size: 13px; color: var(--muted);">↗</span>
          </a>
        </div>
      </section>
    </div>
  `;
}

function bindAlertsEvents() {
  document.querySelector("#btnRefreshAlertsTab")?.addEventListener("click", loadAlertsData);
  
  document.querySelectorAll("[data-alert-filter]").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      document.querySelectorAll("[data-alert-filter]").forEach((b) => b.classList.remove("active"));
      e.currentTarget.classList.add("active");
      currentAlertFilter = e.currentTarget.dataset.alertFilter;
      renderContainersGrid(cachedContainers);
    });
  });

  setupToolsLinks();
  loadAlertsData();
}

function setupToolsLinks() {
  const host = window.location.hostname || "127.0.0.1";
  const cockpit = document.querySelector("#tabLinkCockpit");
  const dockge = document.querySelector("#tabLinkDockge");

  if (cockpit) cockpit.href = `https://${host}:9090`;
  if (dockge) dockge.href = `http://${host}:5001`;
}

async function loadAlertsData() {
  try {
    const data = await request("/api/alerts/summary");
    updateKPI(data);
    renderIncidents(data.alerts || []);
  } catch (error) {
    const list = document.querySelector("#alertsIncidentsList");
    if (list) list.innerHTML = `<div class="empty" style="color:var(--danger);">Błąd pobierania danych: ${escapeHtml(error.message)}</div>`;
  }

  try {
    const contData = await request("/api/docker/containers");
    cachedContainers = contData.containers || [];
    renderContainersGrid(cachedContainers);
  } catch (error) {
    const grid = document.querySelector("#alertsContainersGrid");
    if (grid) grid.innerHTML = `<div class="empty" style="color:var(--danger);">Błąd pobierania kontenerów: ${escapeHtml(error.message)}</div>`;
  }

  try {
    const sys = await request("/api/system/stats");
    const temp = sys.cpu?.temperature ? `${Math.round(sys.cpu.temperature)} °C` : "—";
    const ram = sys.memory?.percent != null ? `${Math.round(sys.memory.percent)}%` : "—";
    const cpuEl = document.querySelector("#valAlertsCpu");
    const ramEl = document.querySelector("#subAlertsRam");
    if (cpuEl) cpuEl.textContent = temp;
    if (ramEl) ramEl.textContent = `RAM: ${ram}`;
  } catch {}
}

function updateKPI(data) {
  const summary = data.summary || {};
  const statusEl = document.querySelector("#valAlertsStatus");
  const subStatusEl = document.querySelector("#subAlertsStatus");
  const dot = document.querySelector("#alertsLiveDot");
  const liveText = document.querySelector("#alertsLiveText");

  if (summary.healthy) {
    if (statusEl) { statusEl.textContent = "Stabilny"; statusEl.style.color = "#34d399"; }
    if (subStatusEl) subStatusEl.textContent = "Brak aktywnych awarii";
    if (dot) dot.style.background = "#10b981";
    if (liveText) liveText.textContent = "Wszystko działa";
  } else {
    const crit = summary.critical || 0;
    if (statusEl) { statusEl.textContent = "Awaria"; statusEl.style.color = "#f87171"; }
    if (subStatusEl) subStatusEl.textContent = `Wykryto ${crit} ${crit === 1 ? "krytyczny błąd" : "krytycznych błędów"}`;
    if (dot) dot.style.background = "#ef4444";
    if (liveText) liveText.textContent = "Wykryto usterki";
  }

  const totalEl = document.querySelector("#valAlertsTotal");
  const subTotalEl = document.querySelector("#subAlertsTotal");
  if (totalEl) {
    totalEl.textContent = String(summary.total || 0);
    totalEl.style.color = (summary.critical || 0) > 0 ? "#f87171" : (summary.total || 0) > 0 ? "#fbbf24" : "inherit";
  }
  if (subTotalEl) subTotalEl.textContent = `${summary.critical || 0} krytycznych, ${summary.warning || 0} ostrzeżeń`;

  const runEl = document.querySelector("#valAlertsRunning");
  const totalContEl = document.querySelector("#subAlertsTotalCont");
  if (runEl) runEl.textContent = `${summary.containersRunning ?? "—"} / ${summary.containersTotal ?? "—"}`;
  if (totalContEl) {
    const diff = (summary.containersTotal || 0) - (summary.containersRunning || 0);
    totalContEl.textContent = diff > 0 ? `Zatrzymanych: ${diff}` : "Wszystkie aktywne";
  }
}

function renderIncidents(alerts) {
  const container = document.querySelector("#alertsIncidentsList");
  const badge = document.querySelector("#activeIncidentsBadge");
  if (!container) return;

  if (badge) {
    badge.textContent = `${alerts.length} ${alerts.length === 1 ? "zgłoszenie" : "zgłoszeń"}`;
    badge.style.borderColor = alerts.length > 0 ? "rgba(239,68,68,0.4)" : "var(--line)";
    badge.style.color = alerts.length > 0 ? "#f87171" : "var(--muted)";
  }

  if (alerts.length === 0) {
    container.innerHTML = `
      <div style="display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; text-align: center; border-radius: 12px; background: rgba(16, 185, 129, 0.05); border: 1px dashed rgba(16, 185, 129, 0.25);">
        <span style="font-size: 32px; margin-bottom: 6px;">✅</span>
        <strong style="color: #34d399; font-size: 14px;">Wszystkie usługi i kontenery działają prawidłowo.</strong>
        <p style="color: var(--muted); font-size: 12px; margin: 4px 0 0;">Brak aktywnych incydentów w środowisku Homelab.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = alerts.map((a) => {
    const isCritical = a.severity === "critical";
    return `
      <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px 16px; border-radius: 12px; background: ${isCritical ? "rgba(239, 68, 68, 0.12)" : "rgba(245, 158, 11, 0.12)"}; border: 1px solid ${isCritical ? "rgba(239, 68, 68, 0.35)" : "rgba(245, 158, 11, 0.35)"}; min-width: 0;">
        <div style="display: flex; align-items: center; gap: 12px; min-width: 0; flex: 1;">
          <span style="font-size: 18px; flex-shrink: 0;">${isCritical ? "🚨" : "⚠️"}</span>
          <div style="min-width: 0; flex: 1;">
            <strong style="display: block; font-size: 13px; color: #fff; word-break: break-word;">${escapeHtml(a.title)}</strong>
            <span style="display: block; font-size: 12px; color: var(--muted); word-break: break-word;">${escapeHtml(a.message)}</span>
          </div>
        </div>
        ${a.resource ? `<button type="button" class="button" onclick="showContainerLogs('${escapeHtml(a.resource)}')" style="padding: 4px 10px; font-size: 12px; flex-shrink: 0;">📋 Logi</button>` : ""}
      </div>
    `;
  }).join("");
}

function renderContainersGrid(containers) {
  const grid = document.querySelector("#alertsContainersGrid");
  if (!grid) return;

  let filtered = containers;
  if (currentAlertFilter === "running") {
    filtered = containers.filter((c) => (c.state || "").toLowerCase() === "running");
  } else if (currentAlertFilter === "issues") {
    filtered = containers.filter((c) => (c.state || "").toLowerCase() !== "running");
  }

  if (filtered.length === 0) {
    grid.innerHTML = '<div class="empty" style="grid-column: 1 / -1;">Brak kontenerów spełniających kryteria filtra.</div>';
    return;
  }

  grid.innerHTML = filtered.map((c) => {
    const isRunning = (c.state || "").toLowerCase() === "running";
    const containerName = c.name || c.names || c.id;
    return `
      <div style="display: flex; flex-direction: column; justify-content: space-between; gap: 10px; padding: 14px; border-radius: 12px; background: ${isRunning ? "rgba(255,255,255,0.03)" : "rgba(239,68,68,0.08)"}; border: 1px solid ${isRunning ? "var(--line)" : "rgba(239,68,68,0.4)"}; min-width: 0;">
        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;">
          <div style="min-width: 0; flex: 1;">
            <strong style="display: block; font-size: 13px; color: #fff; word-break: break-all;">${escapeHtml(containerName)}</strong>
            <div style="font-size: 11px; color: var(--muted); margin-top: 2px; word-break: break-word;">${escapeHtml(c.status || c.state)}</div>
          </div>
          <span style="font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 6px; background: ${isRunning ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.2)"}; color: ${isRunning ? "#34d399" : "#f87171"}; text-transform: uppercase; flex-shrink: 0;">
            ${escapeHtml(c.state || "unknown")}
          </span>
        </div>
        <div style="display: flex; justify-content: flex-end; margin-top: 4px;">
          <button type="button" class="button" onclick="showContainerLogs('${escapeHtml(containerName)}')" style="padding: 3px 8px; font-size: 11px;">📋 Logi</button>
        </div>
      </div>
    `;
  }).join("");
}

function stripAnsi(text) {
  return String(text || "")
    .replace(/\x1b\[[0-9;]*m/g, "")
    .replace(/\[\d+m/g, "")
    .replace(/\[\d+;\d+m/g, "")
    .replace(/\[0m/g, "");
}

async function showContainerLogs(name) {
  const dialog = document.querySelector("#logsDialog");
  const content = document.querySelector("#logsDialogContent");
  const title = document.querySelector("#logsDialogHeaderTitle") || document.querySelector("#logsDialog h2");
  if (!dialog || !content) return;

  const cleanName = name.replace(/^\//, "");
  if (title) title.textContent = `Logi kontenera: ${cleanName}`;
  content.textContent = `Pobieranie logów kontenera: ${cleanName}...`;
  dialog.showModal();

  try {
    const res = await request(`/api/docker/container/${encodeURIComponent(cleanName)}/logs`);
    content.textContent = stripAnsi(res.logs) || "Brak dostępnych logów.";
  } catch (err) {
    content.textContent = `Błąd pobierania logów: ${err.message}`;
  }
}

window.showContainerLogs = showContainerLogs;
