// tab-homepage.js — Moduł Zakładki „Homepage” (Zarządzanie Sekcjami i Linkami Strony Głównej)

let cachedAdminSections = [];
let editingAdminLink = null;
let collapsedAdminSections = {};

function renderHomepageTab() {
  return `
    <div class="admin-tab-container">
      <section class="admin-section-card">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 8px;">
          <h2 style="margin: 0;">🏠 Zarządzanie Sekcjami i Linkami Strony Głównej</h2>
          <a href="../../" class="button primary" target="_blank" style="padding: 6px 16px; font-size: 13px; font-weight: bold; text-decoration: none;">Otwórz Stronę Główną ↗</a>
        </div>
        <p class="settings-note">Tworzenie sekcji, zmiana kolejności sekcji, dodawanie, sortowanie strzałkami oraz zwijanie wpisów dla Strony Głównej.</p>

        <div id="adminSectionsManager" style="margin-top: 16px;">
          <div class="empty">Ładowanie sekcji i linków...</div>
        </div>
      </section>
    </div>
  `;
}

function bindHomepageEvents() {
  loadAdminSections();
  document.querySelector("#linkFormAdmin")?.addEventListener("submit", saveAdminLink);
}

// Funkcje obsługi sekcji i linków
async function loadAdminSections() {
  const container = document.querySelector("#adminSectionsManager");
  if (!container) return;

  try {
    const data = await request("/api/services");
    cachedAdminSections = data.sections || [];

    let html = `
      <form id="adminAddSectionForm" onsubmit="addSectionAdmin(event)" style="display: flex; gap: 12px; margin-bottom: 20px; align-items: center;">
        <input id="newSectionNameInput" placeholder="Nazwa nowej sekcji (np. Usługi Serwera)" style="flex: 1; padding: 10px 14px; border-radius: var(--card-radius, 10px); border: 1px solid var(--modal-panel-border, var(--line)); background: var(--input-bg, rgba(0,0,0,0.3)); color: var(--input-text-color, var(--text)); font-size: 14px;">
        <button type="submit" class="button primary" style="padding: 10px 18px; font-weight: bold;">+ Dodaj Sekcję</button>
      </form>
    `;

    if (!cachedAdminSections.length) {
      html += `<div class="empty">Brak zdefiniowanych sekcji. Dodaj pierwszą sekcję powyżej.</div>`;
    } else {
      html += cachedAdminSections.map((sec, idx) => {
        const items = sec.groups?.[0]?.items || [];
        const isCollapsed = Boolean(collapsedAdminSections[sec.id]);

        return `
          <div class="admin-section-card" style="margin-bottom: 16px; padding: 18px; border: 1px solid var(--modal-panel-border, var(--line)); border-radius: 14px; background: var(--modal-panel-bg, rgba(0,0,0,0.2));">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; margin-bottom: ${isCollapsed ? '0' : '12px'};">
              <strong style="font-size: 16px; display: flex; align-items: center; gap: 8px;">
                <span>📁</span> ${escapeHtml(sec.name)}
                <small style="color: var(--muted); font-weight normal; font-size: 12px;">(${items.length} wpisów)</small>
              </strong>
              <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
                <button type="button" class="button" onclick="toggleCollapseAdminSection('${sec.id}')" style="font-size: 12px; padding: 6px 12px;" title="${isCollapsed ? 'Rozwiń sekcję' : 'Zwiń sekcję'}">
                  ${isCollapsed ? '🔽 Rozwiń wpisy' : '🔼 Zwiń wpisy'}
                </button>
                <button type="button" class="button" onclick="renameSectionAdmin('${sec.id}', '${escapeHtml(sec.name)}')" style="font-size: 12px; padding: 6px 12px;">✏️ Zmień nazwę</button>
                ${idx > 0 ? `<button type="button" class="button" onclick="moveSectionAdmin('${sec.id}', 'up')" style="font-size: 12px; padding: 6px 10px;" title="Przesuń sekcję w górę">▲</button>` : ""}
                ${idx < cachedAdminSections.length - 1 ? `<button type="button" class="button" onclick="moveSectionAdmin('${sec.id}', 'down')" style="font-size: 12px; padding: 6px 10px;" title="Przesuń sekcję w dół">▼</button>` : ""}
                <button type="button" class="button primary" onclick="openAddLinkAdmin('${sec.id}')" style="font-size: 12px; padding: 6px 12px;">+ Dodaj link</button>
                <button type="button" class="button danger" onclick="deleteSectionAdmin('${sec.id}', '${escapeHtml(sec.name)}')" style="font-size: 12px; padding: 6px 12px;">Usuń sekcję</button>
              </div>
            </div>

            <div id="adminSectionContent_${sec.id}" style="display: ${isCollapsed ? 'none' : 'block'}; margin-top: 10px;">
              ${items.length === 0 ? `<div style="font-size: 13px; color: var(--muted); padding: 10px 0; font-style: italic;">Brak linków w tej sekcji.</div>` : `
                <div style="display: grid; gap: 8px; padding-left: 12px; border-left: 2px solid var(--line);">
                  ${items.map((item, itemIdx) => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 14px; border-radius: 8px; background: var(--input-bg, rgba(0,0,0,0.25)); border: 1px solid var(--modal-panel-border, var(--line));">
                      <div style="display: flex; align-items: center; gap: 10px; font-size: 13px; min-width: 0; overflow: hidden; text-overflow: ellipsis;">
                        <span>🔗</span>
                        <strong style="white-space: nowrap;">${escapeHtml(item.name)}</strong>
                        <span style="color: var(--muted); font-size: 11px; text-overflow: ellipsis; overflow: hidden; white-space: nowrap;">(${escapeHtml(item.url)})</span>
                      </div>
                      <div style="display: flex; gap: 6px; flex-shrink: 0; margin-left: 12px; align-items: center;">
                        ${itemIdx > 0 ? `<button type="button" class="button" onclick="moveLinkAdmin('${item.id}', 'up')" style="padding: 4px 8px; font-size: 11px;" title="Przesuń wpis w górę">▲</button>` : ""}
                        ${itemIdx < items.length - 1 ? `<button type="button" class="button" onclick="moveLinkAdmin('${item.id}', 'down')" style="padding: 4px 8px; font-size: 11px;" title="Przesuń wpis w dół">▼</button>` : ""}
                        <button type="button" class="button" onclick="openEditLinkAdmin('${sec.id}', '${item.id}')" style="padding: 4px 10px; font-size: 11px;">✏️ Edytuj</button>
                        <button type="button" class="button danger" onclick="deleteLinkAdmin('${item.id}', '${escapeHtml(item.name)}')" style="padding: 4px 10px; font-size: 11px;">Usuń</button>
                      </div>
                    </div>
                  `).join("")}
                </div>
              `}
            </div>
          </div>
        `;
      }).join("");
    }

    container.innerHTML = html;
  } catch (error) {
    container.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
  }
}

function toggleCollapseAdminSection(sectionId) {
  collapsedAdminSections[sectionId] = !collapsedAdminSections[sectionId];
  loadAdminSections();
}

function notifyServicesUpdated() {
  try {
    localStorage.setItem("homedash_services_updated", String(Date.now()));
  } catch (e) {}
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const channel = new BroadcastChannel("homedash_sync");
      channel.postMessage({ type: "services_updated" });
      channel.close();
    }
  } catch (e) {}
}

async function addSectionAdmin(e) {
  if (e && e.preventDefault) e.preventDefault();
  const input = document.querySelector("#newSectionNameInput");
  const name = input?.value.trim();
  if (!name) return showToast("Wpisz nazwę nowej sekcji.");
  try {
    await request("/api/services/section", { method: "POST", body: JSON.stringify({ name }) });
    showToast("Sekcja dodana.");
    if (input) input.value = "";
    notifyServicesUpdated();
    loadAdminSections();
  } catch (error) {
    showToast(error.message);
  }
}

async function renameSectionAdmin(id, oldName) {
  const newName = prompt("Wpisz nową nazwę sekcji:", oldName);
  if (!newName || !newName.trim() || newName.trim() === oldName) return;
  try {
    await request(`/api/services/section/${id}`, { method: "PUT", body: JSON.stringify({ name: newName.trim() }) });
    showToast("Nazwa sekcji zmieniona.");
    notifyServicesUpdated();
    loadAdminSections();
  } catch (error) {
    showToast(error.message);
  }
}

async function moveSectionAdmin(id, direction) {
  try {
    await request(`/api/services/section/${id}/move`, { method: "PUT", body: JSON.stringify({ direction }) });
    showToast("Kolejność sekcji została zmieniona.");
    notifyServicesUpdated();
    loadAdminSections();
  } catch (error) {
    showToast(error.message);
  }
}

async function moveLinkAdmin(id, direction) {
  try {
    await request(`/api/services/link/${id}/move`, { method: "PUT", body: JSON.stringify({ direction }) });
    showToast("Kolejność wpisu została zmieniona.");
    notifyServicesUpdated();
    loadAdminSections();
  } catch (error) {
    showToast(error.message);
  }
}

async function deleteSectionAdmin(id, name) {
  if (!confirm(`Czy na pewno chcesz usunąć sekcję „${name}” i wszystkie jej linki?`)) return;
  try {
    await request(`/api/services/section/${id}`, { method: "DELETE" });
    showToast("Sekcja usunięta.");
    notifyServicesUpdated();
    loadAdminSections();
  } catch (error) {
    showToast(error.message);
  }
}

function openAddLinkAdmin(sectionId) {
  editingAdminLink = null;
  const dialog = document.querySelector("#linkDialogAdmin");
  const title = document.querySelector("#linkDialogAdminTitle");
  const sectionSelect = document.querySelector("#linkSectionAdmin");

  if (!dialog) return;
  if (title) title.textContent = "Nowy link";
  if (sectionSelect) {
    sectionSelect.innerHTML = cachedAdminSections.map(s => `<option value="${s.id}" ${s.id === sectionId ? "selected" : ""}>${escapeHtml(s.name)}</option>`).join("");
  }
  const nameEl = document.querySelector("#linkNameAdmin");
  const urlEl = document.querySelector("#linkUrlAdmin");
  const iconEl = document.querySelector("#linkIconAdmin");
  const descEl = document.querySelector("#linkDescriptionAdmin");
  const modeEl = document.querySelector("#linkOpenModeAdmin");

  if (nameEl) nameEl.value = "";
  if (urlEl) urlEl.value = "";
  if (iconEl) iconEl.value = "";
  if (descEl) descEl.value = "";
  if (modeEl) modeEl.value = "new-tab";

  dialog.showModal();
}

function openEditLinkAdmin(sectionId, linkId) {
  const sec = cachedAdminSections.find(s => s.id === sectionId);
  const items = sec?.groups?.[0]?.items || [];
  const link = items.find(i => i.id === linkId);
  if (!link) return;

  editingAdminLink = link;
  const dialog = document.querySelector("#linkDialogAdmin");
  const title = document.querySelector("#linkDialogAdminTitle");
  const sectionSelect = document.querySelector("#linkSectionAdmin");

  if (!dialog) return;
  if (title) title.textContent = `Edytuj Link: ${link.name}`;
  if (sectionSelect) {
    sectionSelect.innerHTML = cachedAdminSections.map(s => `<option value="${s.id}" ${s.id === sectionId ? "selected" : ""}>${escapeHtml(s.name)}</option>`).join("");
  }
  const nameEl = document.querySelector("#linkNameAdmin");
  const urlEl = document.querySelector("#linkUrlAdmin");
  const iconEl = document.querySelector("#linkIconAdmin");
  const descEl = document.querySelector("#linkDescriptionAdmin");
  const modeEl = document.querySelector("#linkOpenModeAdmin");

  if (nameEl) nameEl.value = link.name || "";
  if (urlEl) urlEl.value = link.url || "";
  if (iconEl) iconEl.value = link.icon || "";
  if (descEl) descEl.value = link.description || "";
  if (modeEl) modeEl.value = link.openMode || "new-tab";

  dialog.showModal();
}

async function saveAdminLink(e) {
  e.preventDefault();
  const body = {
    sectionId: document.querySelector("#linkSectionAdmin")?.value,
    name: document.querySelector("#linkNameAdmin")?.value.trim(),
    url: document.querySelector("#linkUrlAdmin")?.value.trim(),
    icon: document.querySelector("#linkIconAdmin")?.value.trim(),
    description: document.querySelector("#linkDescriptionAdmin")?.value.trim(),
    openMode: document.querySelector("#linkOpenModeAdmin")?.value || "new-tab"
  };

  try {
    const path = editingAdminLink
      ? `/api/services/link/${editingAdminLink.id}`
      : "/api/services/link";
    await request(path, { method: editingAdminLink ? "PUT" : "POST", body: JSON.stringify(body) });
    document.querySelector("#linkDialogAdmin")?.close();
    showToast(editingAdminLink ? "Link zaktualizowany." : "Nowy link dodany.");
    notifyServicesUpdated();
    loadAdminSections();
  } catch (error) {
    showToast(error.message);
  }
}

async function deleteLinkAdmin(id, name) {
  if (!confirm(`Usunąć link „${name}”?`)) return;
  try {
    await request(`/api/services/link/${id}`, { method: "DELETE" });
    showToast("Link usunięty.");
    notifyServicesUpdated();
    loadAdminSections();
  } catch (error) {
    showToast(error.message);
  }
}

// Eksport funkcji do zakresu globalnego window
window.addSectionAdmin = addSectionAdmin;
window.renameSectionAdmin = renameSectionAdmin;
window.moveSectionAdmin = moveSectionAdmin;
window.moveLinkAdmin = moveLinkAdmin;
window.toggleCollapseAdminSection = toggleCollapseAdminSection;
window.deleteSectionAdmin = deleteSectionAdmin;
window.openAddLinkAdmin = openAddLinkAdmin;
window.openEditLinkAdmin = openEditLinkAdmin;
window.saveAdminLink = saveAdminLink;
window.deleteLinkAdmin = deleteLinkAdmin;
