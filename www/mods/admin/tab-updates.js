// tab-updates.js — Zakładka Aktualizacje: pakiety apt + kontenery Docker → informacja + nawigacja

function renderUpdatesTab() {
  const settings = state.settings || {};
  const host = (settings.defaultHost || window.location.hostname || "localhost");
  const cockpitUrl = `https://${host}:9090`;
  const dockgeUrl = `http://${host}:5001`;

  return `
    <div class="admin-tab-container">

      <section class="admin-section-card">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 12px;">
          <div>
            <h2>🐧 Pakiety systemowe (Debian apt)</h2>
            <p class="settings-note">Informacja o oczekujących aktualizacjach systemu. Aktualizacje wykonujesz przez Cockpit.</p>
          </div>
          <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
            <button type="button" class="button primary" id="btnCheckOsUpdates">🔍 Sprawdź aktualizacje</button>
            <a href="${escapeHtml(cockpitUrl)}" target="_blank" class="button" style="font-size: 13px;">🖥️ Otwórz Cockpit ↗</a>
          </div>
        </div>

        <div id="osUpdatesResult" style="margin-top: 10px;">
          <div class="empty" style="font-size: 13px;">Kliknij „Sprawdź aktualizacje" aby pobrać listę pakietów.</div>
        </div>
      </section>

      <div class="admin-section-divider"></div>

      <section class="admin-section-card">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 12px;">
          <div>
            <h2>🐳 Kontenery Docker</h2>
            <p class="settings-note">Zainstalowana i najnowsza stabilna wersja każdego kontenera (bez beta/rc/dev). Nowe kontenery pojawiają się tu automatycznie. Zapis nowego tagu do compose.yaml nie restartuje sam — restart/aktualizację zawsze robisz ręcznie w Dockge.</p>
          </div>
          <div style="display: flex; gap: 10px; flex-wrap: wrap; align-items: center;">
            <button type="button" class="button primary" id="btnRefreshContainers">🔄 Odśwież</button>
            <a href="${escapeHtml(dockgeUrl)}" target="_blank" class="button" style="font-size: 13px;">📦 Otwórz Dockge ↗</a>
          </div>
        </div>

        <div id="containersResult" style="margin-top: 10px;">
          <div class="empty" style="font-size: 13px;">Sprawdzanie wersji kontenerów...</div>
        </div>
      </section>

    </div>
  `;
}

function bindUpdatesEvents() {
  document.querySelector("#btnCheckOsUpdates")?.addEventListener("click", checkOsUpdates);
  document.querySelector("#btnRefreshContainers")?.addEventListener("click", loadContainers);
  loadContainers();
}

// ─── Pakiety systemowe ────────────────────────────────────────────────────────

async function checkOsUpdates() {
  const btn = document.querySelector("#btnCheckOsUpdates");
  const result = document.querySelector("#osUpdatesResult");
  if (!btn || !result) return;

  btn.disabled = true;
  result.innerHTML = `<div class="empty" style="font-size:13px;">Sprawdzanie pakietów...</div>`;

  try {
    const data = await request("/api/system/updates");
    const count = data.count || 0;
    const pkgs = data.packages || [];

    if (count === 0) {
      result.innerHTML = `
        <div style="padding: 12px 16px; border-radius: 10px; background: rgba(16,185,129,0.1); color: #10b981; font-size: 13px; font-weight: 500;">
          🟢 Wszystkie pakiety systemowe są aktualne.
        </div>`;
    } else {
      result.innerHTML = `
        <div style="padding: 10px 14px; border-radius: 10px; background: rgba(239,119,119,0.1); color: var(--danger); font-size: 13px; font-weight: 500; margin-bottom: 12px;">
          ⚠️ ${count} pakiet${count === 1 ? "" : count < 5 ? "i" : "ów"} do aktualizacji. Użyj Cockpit → Software Updates.
        </div>
        <div style="display: grid; gap: 6px;">
          ${pkgs.map(p => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 14px; border: 1px solid var(--line); border-radius: 8px; background: rgba(0,0,0,0.2); font-size: 13px;">
              <strong>${escapeHtml(p.name)}</strong>
              <span style="background: rgba(239,119,119,0.2); color: #ef7777; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: bold;">${escapeHtml(p.newVersion)}</span>
            </div>
          `).join("")}
        </div>`;
    }
  } catch (error) {
    result.innerHTML = `<div class="empty" style="color: var(--danger); font-size: 13px;">Błąd: ${escapeHtml(error.message)}</div>`;
  } finally {
    btn.disabled = false;
  }
}

// ─── Kontenery Docker ─────────────────────────────────────────────────────────

function compareTagsClient(a, b) {
  const partsA = String(a).replace(/^v/, "").split(".").map(Number);
  const partsB = String(b).replace(/^v/, "").split(".").map(Number);
  const len = Math.max(partsA.length, partsB.length);
  for (let i = 0; i < len; i++) {
    const diff = (partsA[i] || 0) - (partsB[i] || 0);
    if (diff !== 0) return diff;
  }
  return 0;
}

async function loadContainers() {
  const btn = document.querySelector("#btnRefreshContainers");
  const result = document.querySelector("#containersResult");
  if (!result) return;

  if (btn) btn.disabled = true;
  result.innerHTML = `<div class="empty" style="font-size:13px;">Sprawdzanie wersji kontenerów...</div>`;

  try {
    const data = await request("/api/docker/versions");
    const versions = data.versions || [];

    if (!versions.length) {
      result.innerHTML = `<div class="empty" style="font-size:13px;">Brak kontenerów Docker.</div>`;
      return;
    }

    const settings = state.settings || {};
    const host = (settings.defaultHost || window.location.hostname || "localhost");
    const dockgeBase = `http://${host}:5001`;

    const rows = versions.map((v) => {
      const installed = escapeHtml(v.installedVersion || v.installedTag || "—");
      const hasLatest = Boolean(v.latestStable);
      const isOutdated = hasLatest && v.installedVersion && compareTagsClient(v.installedVersion, v.latestStable) < 0;
      const latestCell = hasLatest
        ? `${escapeHtml(v.latestStable)}${isOutdated ? " ⚠️" : ""}`
        : `<span style="color:var(--muted);">nieznana</span>`;
      const stackUrl = `${dockgeBase}/compose/${encodeURIComponent(v.stack)}`;

      return `
        <tr style="border-bottom:1px solid var(--line);">
          <td style="padding:8px 10px;font-weight:600;">${escapeHtml(v.container)}</td>
          <td style="padding:8px 10px;">${installed}</td>
          <td style="padding:8px 10px;${isOutdated ? "color:#f59e0b;font-weight:600;" : ""}">${latestCell}</td>
          <td style="padding:8px 10px;">
            ${hasLatest
              ? `<button type="button" class="button" style="font-size:12px;" data-update-compose data-container="${escapeHtml(v.container)}" data-tag="${escapeHtml(v.latestStable)}">💾 Aktualizuj compose</button>`
              : `<span style="color:var(--muted);font-size:12px;">—</span>`}
          </td>
          <td style="padding:8px 10px;">
            <a href="${escapeHtml(stackUrl)}" target="_blank" class="button" style="font-size:12px;">🔁 Restart / Aktualizuj ↗</a>
          </td>
        </tr>`;
    }).join("");

    result.innerHTML = `
      <div style="overflow-x:auto;">
        <table style="width:100%;border-collapse:collapse;font-size:13px;">
          <thead>
            <tr style="border-bottom:1px solid var(--line);text-align:left;color:var(--muted);font-size:12px;">
              <th style="padding:8px 10px;">Kontener</th>
              <th style="padding:8px 10px;">Zainstalowana wersja</th>
              <th style="padding:8px 10px;">Najnowsza (stabilna)</th>
              <th style="padding:8px 10px;">Compose</th>
              <th style="padding:8px 10px;">Dockge</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>`;

    result.querySelectorAll("[data-update-compose]").forEach((btnEl) => {
      btnEl.addEventListener("click", () => updateContainerCompose(btnEl));
    });
  } catch (error) {
    result.innerHTML = `<div class="empty" style="color:var(--danger);font-size:13px;">Błąd: ${escapeHtml(error.message)}</div>`;
  } finally {
    if (btn) btn.disabled = false;
  }
}

async function updateContainerCompose(btnEl) {
  const container = btnEl.dataset.container;
  const tag = btnEl.dataset.tag;

  if (!confirm(`Zapisać tag "${tag}" w compose.yaml dla "${container}"?\n\nTo tylko zapisuje plik — restart / aktualizację stosu wciąż trzeba zrobić ręcznie w Dockge.`)) {
    return;
  }

  const originalLabel = btnEl.textContent;
  btnEl.disabled = true;
  btnEl.textContent = "Zapisywanie...";

  try {
    const res = await request("/api/docker/update-compose", {
      method: "POST",
      body: JSON.stringify({ container, tag })
    });
    alert(res.message || "Zapisano nowy tag w compose.yaml.");
  } catch (error) {
    alert("Błąd: " + error.message);
  } finally {
    btnEl.disabled = false;
    btnEl.textContent = originalLabel;
  }
}
