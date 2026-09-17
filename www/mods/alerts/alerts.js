/* ==========================================================================
   Autorski Moduł www/mods/alerts/alerts.js — Glassmorphism Alerts & Diagnostics
   ========================================================================== */

(function () {
  let pollTimer = null;
  let activeFilter = "all";
  let currentLogContainer = null;
  let cachedContainers = [];
  let cachedSummary = null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#39;");
  }

  function getBaseUrl() {
    return "";
  }

  function setupAdminToolLinks() {
    const host = window.location.hostname || "127.0.0.1";
    const cockpitLink = document.querySelector("#linkCockpit");
    const dockgeLink = document.querySelector("#linkDockge");
    const portainerLink = document.querySelector("#linkPortainer");

    if (cockpitLink) cockpitLink.href = `https://${host}:9090`;
    if (dockgeLink) dockgeLink.href = `http://${host}:5001`;
    if (portainerLink) portainerLink.href = `https://${host}:9443`;
  }

  async function fetchAlertsSummary() {
    try {
      const res = await fetch(`${getBaseUrl()}/api/alerts/summary`, {
        headers: { "Cache-Control": "no-cache" }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      console.warn("Fetch alerts summary fallback:", err.message);
      return null;
    }
  }

  async function fetchContainers() {
    try {
      const res = await fetch(`${getBaseUrl()}/api/docker/containers`, {
        headers: { "Cache-Control": "no-cache" }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.containers || [];
    } catch (err) {
      console.error("Fetch containers error:", err);
      return [];
    }
  }

  async function fetchSystemStats() {
    try {
      const res = await fetch(`${getBaseUrl()}/api/system/stats`, {
        headers: { "Cache-Control": "no-cache" }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch {
      return null;
    }
  }

  async function refreshData() {
    const liveDot = document.querySelector("#liveDot");
    const liveStatusText = document.querySelector("#liveStatusText");

    if (liveStatusText) liveStatusText.textContent = "Odświeżanie...";

    try {
      const [summaryRes, containers, stats] = await Promise.all([
        fetchAlertsSummary(),
        fetchContainers(),
        fetchSystemStats()
      ]);

      cachedContainers = containers;
      cachedSummary = summaryRes;

      renderSummaryKPIs(summaryRes, containers, stats);
      renderAlertsList(summaryRes, containers);
      renderContainersGrid();

      const hasCritical = summaryRes?.summary?.critical > 0;
      const hasWarning = summaryRes?.summary?.warning > 0;

      if (liveDot) {
        liveDot.className = "live-dot" + (hasCritical ? " danger" : hasWarning ? " warning" : "");
      }
      if (liveStatusText) {
        liveStatusText.textContent = `Aktualne: ${new Date().toLocaleTimeString("pl-PL")}`;
      }
    } catch (err) {
      console.error("Refresh error:", err);
      if (liveDot) liveDot.className = "live-dot danger";
      if (liveStatusText) liveStatusText.textContent = "Błąd połączenia";
    }
  }

  function renderSummaryKPIs(summaryRes, containers, stats) {
    const valOverallStatus = document.querySelector("#valOverallStatus");
    const subOverallStatus = document.querySelector("#subOverallStatus");
    const cardStatus = document.querySelector("#cardStatus");
    const valAlertsCount = document.querySelector("#valAlertsCount");
    const subAlertsCount = document.querySelector("#subAlertsCount");
    const valContainersRunning = document.querySelector("#valContainersRunning");
    const subContainersTotal = document.querySelector("#subContainersTotal");
    const valCpuTemp = document.querySelector("#valCpuTemp");
    const subRamUsage = document.querySelector("#subRamUsage");

    const totalAlerts = summaryRes?.summary?.total ?? 0;
    const criticalCount = summaryRes?.summary?.critical ?? 0;
    const warningCount = summaryRes?.summary?.warning ?? 0;

    if (valOverallStatus) {
      if (criticalCount > 0) {
        valOverallStatus.textContent = "Awaria";
        valOverallStatus.style.color = "#f87171";
        if (subOverallStatus) subOverallStatus.textContent = `Wykryto ${criticalCount} krytycznych błędów`;
        if (cardStatus) cardStatus.className = "summary-card status-danger";
      } else if (warningCount > 0) {
        valOverallStatus.textContent = "Uwaga";
        valOverallStatus.style.color = "#fbbf24";
        if (subOverallStatus) subOverallStatus.textContent = `Wykryto ${warningCount} ostrzeżeń`;
        if (cardStatus) cardStatus.className = "summary-card";
      } else {
        valOverallStatus.textContent = "Optymalny";
        valOverallStatus.style.color = "#34d399";
        if (subOverallStatus) subOverallStatus.textContent = "Wszystkie usługi stabilne";
        if (cardStatus) cardStatus.className = "summary-card status-ok";
      }
    }

    if (valAlertsCount) {
      valAlertsCount.textContent = String(totalAlerts);
      valAlertsCount.style.color = criticalCount > 0 ? "#f87171" : warningCount > 0 ? "#fbbf24" : "#34d399";
    }
    if (subAlertsCount) {
      subAlertsCount.textContent = `${criticalCount} krytycznych, ${warningCount} ostrzeżeń`;
    }

    const running = containers.filter((c) => String(c.state).toLowerCase() === "running").length;
    if (valContainersRunning) {
      valContainersRunning.textContent = `${running} / ${containers.length}`;
    }
    if (subContainersTotal) {
      subContainersTotal.textContent = `Zatrzymanych: ${containers.length - running}`;
    }

    if (stats) {
      const temp = stats.cpu?.temperature;
      if (valCpuTemp) {
        valCpuTemp.textContent = temp != null ? `${Math.round(temp)} °C` : "—";
      }
      const ram = stats.memory?.percent;
      if (subRamUsage) {
        subRamUsage.textContent = ram != null ? `RAM: ${Math.round(ram)}%` : "RAM: —";
      }
    }
  }

  function renderAlertsList(summaryRes, containers) {
    const list = document.querySelector("#alertsList");
    const badge = document.querySelector("#activeAlertsBadge");
    if (!list) return;

    const alerts = summaryRes?.alerts || [];

    // Fallback: create alert items if summary didn't return any but bad containers exist
    if (alerts.length === 0 && containers.length > 0) {
      containers.forEach((c) => {
        const stateLower = String(c.state || "").toLowerCase();
        const statusLower = String(c.status || "").toLowerCase();
        if (stateLower !== "running" || statusLower.includes("unhealthy")) {
          alerts.push({
            id: `docker-${c.name}`,
            type: "docker",
            severity: "critical",
            title: `Kontener: ${c.name}`,
            message: `Stan: ${c.state} (${c.status})`,
            resource: c.name
          });
        }
      });
    }

    if (badge) {
      badge.textContent = `${alerts.length} zgłoszeń`;
      badge.style.color = alerts.length > 0 ? "#f87171" : "#94a3b8";
    }

    if (alerts.length === 0) {
      list.innerHTML = `
        <div class="alerts-empty">
          <span class="empty-icon">✅</span>
          <strong>Wszystkie usługi i kontenery działają prawidłowo.</strong>
          <p>Brak aktywnych incydentów w środowisku Homelab.</p>
        </div>
      `;
      return;
    }

    list.innerHTML = alerts.map((alert) => {
      const isCritical = alert.severity === "critical";
      const isDocker = alert.type === "docker" || (alert.resource && alert.resource !== "cpu" && alert.resource !== "ram" && alert.resource !== "disk");
      const icon = alert.type === "hardware" ? "🌡️" : isCritical ? "🚨" : "⚠️";
      
      return `
        <div class="alert-item-card ${escapeHtml(alert.severity || "warning")}">
          <div class="alert-item-main">
            <span class="alert-item-icon">${icon}</span>
            <div class="alert-item-info">
              <strong>${escapeHtml(alert.title)}</strong>
              <span>${escapeHtml(alert.message)}</span>
            </div>
          </div>
          <div class="alert-item-actions">
            ${isDocker && alert.resource ? `<button type="button" class="alerts-btn" onclick="window.openContainerLog('${escapeHtml(alert.resource)}')">📜 Logi</button>` : ""}
          </div>
        </div>
      `;
    }).join("");
  }

  function renderContainersGrid() {
    const grid = document.querySelector("#containersGrid");
    if (!grid) return;

    let items = cachedContainers;

    if (activeFilter === "issues") {
      items = items.filter((c) => {
        const stateLower = String(c.state || "").toLowerCase();
        const statusLower = String(c.status || "").toLowerCase();
        return stateLower !== "running" || statusLower.includes("unhealthy");
      });
    } else if (activeFilter === "running") {
      items = items.filter((c) => String(c.state || "").toLowerCase() === "running");
    }

    if (items.length === 0) {
      grid.innerHTML = `<div class="loading-box" style="grid-column: 1 / -1; text-align: center; color: #94a3b8; padding: 20px;">Brak kontenerów pasujących do wybranego filtra.</div>`;
      return;
    }

    grid.innerHTML = items.map((c) => {
      const stateLower = String(c.state || "").toLowerCase();
      const statusLower = String(c.status || "").toLowerCase();
      const isRunning = stateLower === "running";
      const isUnhealthy = statusLower.includes("unhealthy");
      
      const cardClass = !isRunning ? "stopped" : isUnhealthy ? "unhealthy" : "running";
      const badgeClass = !isRunning ? "stopped" : isUnhealthy ? "unhealthy" : "running";
      const badgeText = isUnhealthy ? "Unhealthy" : isRunning ? "Running" : (c.state || "Stopped");

      return `
        <div class="container-card ${cardClass}">
          <div class="container-header">
            <span class="container-name">${escapeHtml(c.name)}</span>
            <span class="container-badge ${badgeClass}">${escapeHtml(badgeText)}</span>
          </div>
          <div class="container-status-text">${escapeHtml(c.status || c.state)}</div>
          <div class="container-actions">
            <button type="button" class="alerts-btn" onclick="window.openContainerLog('${escapeHtml(c.name)}')">📜 Logi</button>
          </div>
        </div>
      `;
    }).join("");
  }

  window.openContainerLog = async function (containerName) {
    currentLogContainer = containerName;
    const dialog = document.querySelector("#logModal");
    const title = document.querySelector("#logModalTitle");
    const sub = document.querySelector("#logModalSubtitle");
    const body = document.querySelector("#logModalBody");

    if (!dialog) return;

    if (title) title.textContent = `Logi: ${containerName}`;
    if (sub) sub.textContent = "Pobieranie...";
    if (body) body.textContent = "Ładowanie logów...";

    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    }

    await loadLogContent(containerName);
  };

  async function loadLogContent(name) {
    const body = document.querySelector("#logModalBody");
    const sub = document.querySelector("#logModalSubtitle");
    if (!name) return;

    try {
      const res = await fetch(`${getBaseUrl()}/api/docker/container/${encodeURIComponent(name)}/logs`);
      const data = await res.json();
      if (body) body.textContent = data.logs || "Brak logów dla tego kontenera.";
      if (sub) sub.textContent = `Zaktualizowano: ${new Date().toLocaleTimeString("pl-PL")}`;
    } catch (err) {
      if (body) body.textContent = `Błąd odczytu logów: ${err.message}`;
      if (sub) sub.textContent = "Błąd";
    }
  }

  function closeLogModal() {
    const dialog = document.querySelector("#logModal");
    if (dialog && typeof dialog.close === "function") {
      dialog.close();
    }
  }

  function init() {
    setupAdminToolLinks();

    document.querySelector("#btnRefresh")?.addEventListener("click", refreshData);
    document.querySelector("#btnLogClose")?.addEventListener("click", closeLogModal);
    document.querySelector("#btnLogDone")?.addEventListener("click", closeLogModal);
    document.querySelector("#btnLogRefresh")?.addEventListener("click", () => {
      if (currentLogContainer) loadLogContent(currentLogContainer);
    });

    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        document.querySelectorAll(".filter-btn").forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        activeFilter = btn.dataset.filter || "all";
        renderContainersGrid();
      });
    });

    // Initial load & 15-second polling
    refreshData();
    pollTimer = setInterval(refreshData, 15000);
  }

  window.addEventListener("DOMContentLoaded", init);
})();
