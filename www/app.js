const dashboard = document.documentElement.dataset.dashboard;
const dashboardConfig = {
  apiUrl: window.location.origin,
  title: "Homelab NAS",
  subtitle: "Usługi, narzędzia i administracja serwera NAS",
  logo: "./images/logo.png",
  defaultHost: window.location.hostname || "localhost"
};
const state = {
  data: null,
  theme: {},
  activeSectionId: null,
  view: "links",
  query: "",
  systemStatsTimer: null,
  editingLink: null,
  adminPin: null,
  pendingAdminPanel: null,
  alertsData: null,
  sidebarHidden: localStorage.getItem("homedash.nas.sidebarHidden") === "true"
};

function getStoredAdminPin() {
  try {
    return localStorage.getItem("myhome.admin.pin") 
      || sessionStorage.getItem("homedash.admin.pin") 
      || state.adminPin 
      || "";
  } catch {
    return state.adminPin || "";
  }
}

function setStoredAdminPin(pin) {
  const clean = String(pin || "").trim();
  try {
    if (clean) {
      localStorage.setItem("myhome.admin.pin", clean);
      sessionStorage.setItem("homedash.admin.pin", clean);
    } else {
      clearStoredAdminPin();
    }
  } catch {}
  state.adminPin = clean || null;
}

function clearStoredAdminPin() {
  try {
    localStorage.removeItem("myhome.admin.pin");
    sessionStorage.removeItem("homedash.admin.pin");
  } catch {}
  state.adminPin = null;
}

const fontOptions = [
  ["system", "Systemowa"],
  ["Inter", "Inter"],
  ["Poppins", "Poppins"],
  ["Montserrat", "Montserrat"],
  ["Nunito", "Nunito"],
  ["Lato", "Lato"],
  ["Roboto", "Roboto"],
  ["Source Sans 3", "Source Sans 3"]
];

function renderFontOptions() {
  return fontOptions.map(([value, label]) => `<option value="${value}">${label}</option>`).join("");
}

function fontStack(value) {
  if (!value || value === "system") return "ui-sans-serif, system-ui, sans-serif";
  return `"${value}", ui-sans-serif, system-ui, sans-serif`;
}

function fontValueFromStack(value) {
  const normalized = String(value || "").replaceAll('"', "").trim();
  const match = fontOptions.find(([font]) => font !== "system" && normalized.startsWith(font));
  return match?.[0] || "system";
}

const PORT_HINTS = {
  system: { label: "System & Sieć", range: "2000-2099", typicalPorts: [2022, 2080, 2443], description: "Usługi bazowe i sieciowe" },
  dashboard: { label: "Dashboard & Aplikacje", range: "3000-3099", typicalPorts: [3000, 3010, 3100], description: "Gitea Web, MyHome Helper, Homebox" },
  media: { label: "Media & Galeria", range: "4000-4099", typicalPorts: [4000, 4080, 2283], description: "Immich, strumieniowanie, odtwarzacze" },
  administracja: { label: "Administracja & Narzędzia", range: "5000-5099", typicalPorts: [5000, 5001, 5090], description: "Gitea Registry, Dockge, Cockpit" },
  monitoring: { label: "Monitoring & ESP", range: "6000-6099", typicalPorts: [6052, 6090, 6100], description: "ESPHome, telemetria, sensory" },
  ha_iot: { label: "Smart Home & IoT", range: "7000-7099", typicalPorts: [7000, 7123, 8123], description: "Home Assistant, MQTT, automatyzacje" },
  ai_testy: { label: "Dokumentacja & Usługi", range: "8000-8099", typicalPorts: [8000, 8010, 8080, 8085, 8090], description: "DokuWiki, Paperless, Memos, Stirling" }
};

function brandIcon() {
  return `<img src="${dashboardConfig.logo}" alt="" loading="eager">`;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

async function request(url, options = {}) {
  let targetUrl = url;
  if (targetUrl.startsWith("http://") || targetUrl.startsWith("https://")) {
    try {
      const parsed = new URL(targetUrl);
      if (parsed.hostname === window.location.hostname || parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost" || parsed.port === "3010") {
        targetUrl = parsed.pathname + parsed.search;
      }
    } catch {}
  }
  const adminPin = getStoredAdminPin();
  const headers = {
    "content-type": "application/json",
    ...(adminPin ? { "x-admin-pin": adminPin } : {}),
    ...(options.headers || {})
  };
  const response = await fetch(targetUrl, {
    ...options,
    headers
  });
  const text = await response.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }
  if (!response.ok) throw new Error(data.message || data.error || `HTTP ${response.status}`);
  return data;
}

async function reloadData() {
  const response = await request(`${dashboardConfig.apiUrl}/api/services`);
  state.data = {
    title: dashboardConfig.title,
    subtitle: dashboardConfig.subtitle,
    sections: (response.sections || []).map((section) => ({
      id: section.id,
      name: section.name,
      links: (section.groups || []).flatMap((group) => group.items || []).map((item) => ({
        id: item.id,
        name: item.name,
        url: item.url,
        description: item.description || "",
        icon: item.icon || "",
        openMode: item.kind === "iframe" ? "iframe" : "new-tab"
      }))
    }))
  };
  if (!state.activeSectionId || !state.data.sections.some((item) => item.id === state.activeSectionId)) {
    state.activeSectionId = state.data.sections[0]?.id || null;
  }
}

function appShell() {
  document.querySelector("#app").innerHTML = `
    <div class="shell${state.sidebarHidden ? " sidebar-hidden" : ""}" id="shell">
      <button class="menu-toggle" id="menuToggle" type="button" aria-label="Pokaż lub ukryj menu" title="Pokaż lub ukryj menu">☰</button>
      <aside class="sidebar">
        <div class="brand">
          <div><strong>${escapeHtml(state.data.title)}</strong></div>
        </div>
        <nav id="navigation"></nav>
        <div class="sidebar-actions">
          <div class="sidebar-icon-menu">
            <button type="button" class="sidebar-icon-btn" id="sidebarIconAlerts" title="Centrum Powiadomień i Alertów">🔔<span class="sidebar-alert-badge" id="sidebarAlertBadge" style="display:none;">0</span></button>
            <button type="button" class="sidebar-icon-btn" id="sidebarIconTheme" title="Edytor wyglądu (CSS)">🎨</button>
            <a href="./mods/admin/" class="sidebar-icon-btn" id="sidebarIconAdmin" title="Zaplecze Administratora (CMS)">🛠️</a>
            <button type="button" class="sidebar-icon-btn" id="sidebarIconLock" title="Zablokuj sesję">🔒</button>
          </div>
        </div>
      </aside>
      <main class="main">
        <header class="toolbar">
          <div class="page-title">
            <div class="system-title">
              <span class="system-logo">${brandIcon()}</span>
              <div><strong>${escapeHtml(state.data.title)}</strong><p>${escapeHtml(state.data.subtitle)}</p></div>
            </div>
            <h1 id="viewTitle"></h1>
          </div>
          <div class="header-stats" id="systemStatsWidget" aria-label="Statystyki systemu">
            <div class="header-stat is-loading"><span>CPU</span><strong>--</strong></div>
            <div class="header-stat is-loading"><span>Temp</span><strong>--</strong></div>
            <div class="header-stat is-loading"><span>RAM</span><strong>--</strong></div>
          </div>
          <div class="toolbar-actions" id="toolbarActions"></div>
        </header>
        <div id="headerAlert" class="header-alert-box" style="display: none;"></div>
        <section id="content"></section>
      </main>
    </div>
    <dialog id="linkDialog" class="wide-dialog">
      <form id="linkForm" class="modal-panel">
        <header class="modal-heading">
          <div><span class="eyebrow">Zarządzanie</span><h2 id="linkDialogTitle">Nowy link</h2></div>
          <button type="button" data-close aria-label="Zamknij">×</button>
        </header>
        <div class="settings-grid">
          <label>Sekcja<select id="linkSection"></select></label>
          <label>Nazwa<input id="linkName" required></label>
          <label style="grid-column: 1 / -1;">URL<input id="linkUrl" type="url" required placeholder="https://..."></label>
          <label style="grid-column: 1 / -1;">Opis<input id="linkDescription"></label>
          <label>Ikona<input id="linkIcon" placeholder="Litera lub URL obrazu"></label>
          <label>Otwieranie<select id="linkOpenMode"><option value="new-tab">Nowa karta</option><option value="iframe">W dashboardzie</option></select></label>
        </div>
        <menu><button type="button" data-close>Anuluj</button><button class="primary">Zapisz link</button></menu>
      </form>
    </dialog>
    <dialog id="pinDialog">
      <form id="pinForm" class="modal-panel">
        <header class="modal-heading">
          <div><span class="eyebrow">Autoryzacja</span><h2>Dostęp do Zaplecza</h2></div>
          <button type="button" data-close aria-label="Zamknij">×</button>
        </header>
        <label>Kod PIN<input id="adminPinInput" type="password" inputmode="numeric" autocomplete="current-password" required placeholder="Podaj PIN"></label>
        <menu><button type="button" data-close>Anuluj</button><button class="primary">Odblokuj</button></menu>
      </form>
    </dialog>
    <dialog id="settingsDialog" class="wide-dialog">
      <form id="settingsForm" class="modal-panel">
        <header class="modal-heading">
          <div><span class="eyebrow">Zaplecze</span><h2>Ustawienia strony</h2></div>
          <button type="button" data-close aria-label="Zamknij">×</button>
        </header>
        <div class="settings-grid">
          <label>Nazwa<input id="settingTitle" required></label>
          <label>Opis<input id="settingSubtitle" required></label>
          <label>Adres helpera<input id="settingApiUrl" required></label>
          <label>Domyślny host<input id="settingDefaultHost" required></label>
          <label>Nowy PIN backendu<input id="settingNewPin" type="password" inputmode="numeric" placeholder="Puste = bez zmiany"></label>
          <label>Upload logo<input id="settingLogo" type="file" accept="image/png,image/jpeg,image/webp"></label>
        </div>
        <p class="settings-note">Statystyki systemu pobierane są lokalnie z helpera.</p>
        <menu><button type="button" data-close>Anuluj</button><button class="primary">Zapisz ustawienia</button></menu>
      </form>
    </dialog>
    <dialog id="appearanceDialog" class="wide-dialog preview-dialog">
      <form id="appearanceForm" class="modal-panel">
        <header class="modal-heading">
          <div><span class="eyebrow">Zaplecze</span><h2>Wygląd i Style CSS</h2></div>
          <button type="button" data-close aria-label="Zamknij">×</button>
        </header>
        <div class="appearance-sections">
          <!-- 1. Ogólne i tło -->
          <section class="appearance-section">
            <div class="appearance-section-title">🎨 Ogólne i Tło</div>
            <div class="appearance-section-grid">
              <label>Akcent<input id="themeAccent" type="color"></label>
              <label>Akcent 2<input id="themeAccentAlt" type="color"></label>
              <label>Tło strony<input id="themeBg" type="color"></label>
              <label>Kolor motywu<input id="themeSurfaceColor" type="color"></label>
              <label>Obraz tła<select id="themeBackgroundImage"><option value="">Wyłączony</option><option value="default">./images/background.jpg</option><option value="custom">Własny upload (zachód słońca)</option></select></label>
              <label>Upload tła<input id="themeBackgroundUpload" type="file" accept="image/png,image/jpeg,image/webp"></label>
              <label>Przyciemnienie tła<input id="themeBackgroundDim" type="range" min="0" max="85" step="1"><span></span></label>
              <label>Blur obrazu<input id="themeBackgroundBlur" type="range" min="0" max="40" step="1"><span></span></label>
              <label>Widoczność obrazu<input id="themeBackgroundOpacity" type="range" min="0" max="100" step="1"><span></span></label>
            </div>
          </section>

          <!-- 2. Header / Nagłówek -->
          <section class="appearance-section">
            <div class="appearance-section-title">🏷️ Nagłówek (Header)</div>
            <div class="appearance-section-grid">
              <label>Kolor nazwy serwisu<input id="themeTitleColor" type="color"></label>
              <label>Wielkość nazwy serwisu<input id="themeTitleSize" type="range" min="16" max="52" step="1"><span></span></label>
              <label>Cień nazwy serwisu<input id="themeTitleShadowBlur" type="range" min="0" max="30" step="1"><span></span></label>
              <label>Kolor sloganu<input id="themeSubtitleColor" type="color"></label>
              <label>Wielkość sloganu<input id="themeSubtitleSize" type="range" min="11" max="28" step="1"><span></span></label>
              <label>Cień sloganu<input id="themeSubtitleShadowBlur" type="range" min="0" max="30" step="1"><span></span></label>
              <label>Rozmiar logo (do 260px)<input id="themeLogoSize" type="range" min="32" max="260" step="2"><span></span></label>
              <label>Wielkość tytułu strony<input id="themePageTitleSize" type="range" min="16" max="52" step="1"><span></span></label>
              <label>Cień tytułu strony<input id="themePageTitleShadowBlur" type="range" min="0" max="30" step="1"><span></span></label>
            </div>
          </section>

          <!-- 3. Sidebar / Pasek boczny -->
          <section class="appearance-section">
            <div class="appearance-section-title">📑 Pasek boczny (Sidebar)</div>
            <div class="appearance-section-grid">
              <label>Kolor tła menu<input id="themeSidebarPanelColor" type="color"></label>
              <label>Glass / Krycie menu<input id="themeSidebarPanelAlpha" type="range" min="0" max="95" step="1"><span></span></label>
              <label>Szerokość menu<input id="themeSidebarWidth" type="range" min="240" max="360" step="5"><span></span></label>
              <label>Kolor ikony menu (☰)<input id="themeSidebarToggleColor" type="color"></label>
              <label>Wielkość ikony menu (☰)<input id="themeSidebarToggleSize" type="range" min="16" max="44" step="1"><span></span></label>
              <label>Czcionka menu<select id="themeFontMenu">${renderFontOptions()}</select></label>
            </div>
          </section>

          <!-- 4. Kafelki i Strona -->
          <section class="appearance-section">
            <div class="appearance-section-title">🎴 Kafelki i Zawartość Strony</div>
            <div class="appearance-section-grid">
              <label>Kolor kafelków linków<input id="themePanelColor" type="color"></label>
              <label>Glass kafelków linków<input id="themePanelAlpha" type="range" min="5" max="85" step="1"><span></span></label>
              <label>Wysokość kafelków<input id="themeTileHeight" type="range" min="108" max="180" step="2"><span></span></label>
              <label>Kolor kart statusu/admin<input id="themeAdminPanelColor" type="color"></label>
              <label>Krycie kart statusu/admin<input id="themeAdminPanelAlpha" type="range" min="5" max="90" step="1"><span></span></label>
              <label>Obramowanie kart<input id="themeBorderAlpha" type="range" min="0" max="35" step="1"><span></span></label>
              <label>Zaokrąglenie kart<input id="themeCardRadius" type="range" min="8" max="34" step="1"><span></span></label>
              <label>Odstęp kart<input id="themeCardGap" type="range" min="8" max="28" step="1"><span></span></label>
              <label>Blur glass<input id="themeGlassBlur" type="range" min="0" max="60" step="1"><span></span></label>
              <label>Saturacja glass<input id="themeGlassSaturation" type="range" min="60" max="260" step="1"><span></span></label>
              <label>Czcionka kafelków<select id="themeFontCard">${renderFontOptions()}</select></label>
              <label>Czcionka opisów<select id="themeFontDescription">${renderFontOptions()}</select></label>
            </div>
          </section>

          <!-- 5. Okna modalne (Modale) -->
          <section class="appearance-section">
            <div class="appearance-section-title">🪟 Okna Modalne (Modale)</div>
            <div class="appearance-section-grid">
              <label>Kolor modali<input id="themeModalBg" type="color"></label>
              <label>Krycie modali<input id="themeModalAlpha" type="range" min="10" max="100" step="1"><span></span></label>
              <label>Blur modali<input id="themeModalGlassBlur" type="range" min="0" max="60" step="1"><span></span></label>
              <label>Zaokrąglenie modali<input id="themeModalRadius" type="range" min="8" max="36" step="1"><span></span></label>
              <label>Przyciemnienie tła modali<input id="themeModalBackdropAlpha" type="range" min="0" max="95" step="1"><span></span></label>
              <label>Blur przyciemnienia tła<input id="themeModalBackdropBlur" type="range" min="0" max="25" step="1"><span></span></label>
            </div>
          </section>
        </div>
        <menu><button id="resetAppearance" type="button">Reset</button><button type="button" data-close>Anuluj</button><button class="primary">Zapisz wygląd</button></menu>
      </form>
    </dialog>
    <dialog id="alertsQuickModal" class="wide-dialog">
      <div class="modal-panel">
        <header class="modal-heading">
          <div><span class="eyebrow">Diagnostyka</span><h2>🔔 Szybki Podgląd Alertów</h2></div>
          <button type="button" data-close aria-label="Zamknij">×</button>
        </header>
        <div id="quickAlertsContent" style="display: grid; gap: 10px; max-height: 50vh; overflow-y: auto; padding-right: 4px;">
          <div class="empty">Pobieranie stanu alertów...</div>
        </div>
        <menu>
          <button type="button" data-close>Zamknij</button>
          <button type="button" id="btnQuickRefresh" class="button">🔄 Odśwież</button>
          <a href="./mods/admin/?tab=alerts" class="button primary" style="display: inline-flex; align-items: center; text-decoration: none;">Centrum Alertów & Narzędzia →</a>
        </menu>
      </div>
    </dialog>
    <dialog id="helperDialog" class="wide-dialog">
      <div class="modal-panel">
        <header class="modal-heading">
          <div><span class="eyebrow">Pomoc</span><h2>Helper i komendy</h2></div>
          <button type="button" data-close aria-label="Zamknij">×</button>
        </header>
        <div class="command-list">
          <article><strong>Status helpera</strong><code>sudo systemctl status www-helper.service</code></article>
          <article><strong>Restart helpera</strong><code>sudo systemctl restart www-helper.service</code></article>
          <article><strong>Logi helpera</strong><code>sudo journalctl -u www-helper.service -n 50 --no-pager</code></article>
          <article><strong>Status strony nginx</strong><code>docker ps --filter name=homepage</code></article>
          <article><strong>Restart strony nginx</strong><code>docker restart homepage</code></article>
          <article><strong>Pliki strony</strong><code>ls -l /home/darek/www/index.html /home/darek/www/app.js /home/darek/www/styles.css</code></article>
          <article><strong>Uprawnienia strony</strong><code>chmod 644 /home/darek/www/index.html /home/darek/www/app.js /home/darek/www/styles.css</code></article>
          <article><strong>Port helpera</strong><code>sudo ss -lptn 'sport = :3010'</code></article>
        </div>
      </div>
    </dialog>
    <dialog id="sectionsDialog" class="wide-dialog">
      <div class="modal-panel">
        <header class="modal-heading">
          <div><span class="eyebrow">Zaplecze</span><h2>Sekcje</h2></div>
          <button type="button" data-close aria-label="Zamknij">×</button>
        </header>
        <form id="sectionCreateForm" class="inline-form">
          <label>Nowa sekcja<input id="sectionName" required placeholder="Nazwa sekcji"></label>
          <button class="primary" type="submit">Dodaj</button>
        </form>
        <div class="section-manager" id="sectionManager"></div>
      </div>
    </dialog>
    <div class="toast" id="toast"></div>
  `;
  bindShell();
  render();
}

function bindShell() {
  document.querySelector("#menuToggle")?.addEventListener("click", toggleSidebar);
  document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => button.closest("dialog")?.close()));
  document.querySelector("#pinForm")?.addEventListener("submit", unlockAdminPanel);
  document.querySelector("#settingsForm")?.addEventListener("submit", saveDashboardSettings);
  document.querySelector("#appearanceForm")?.addEventListener("submit", saveThemeSettings);
  document.querySelector("#appearanceForm")?.addEventListener("input", (event) => {
    if (event.target && event.target.matches("input[type=range]")) {
      updateRangeValue(event.target);
    }
    const liveTheme = collectTheme();
    applyTheme(liveTheme);
  });
  document.querySelector("#appearanceForm")?.addEventListener("change", (event) => {
    if (event.target && event.target.matches("input[type=range]")) {
      updateRangeValue(event.target);
    }
    const liveTheme = collectTheme();
    applyTheme(liveTheme);
  });
  document.querySelector("#themeBackgroundUpload")?.addEventListener("change", async (event) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const dataUrl = await readFileAsDataUrl(file);
        const bgSelect = document.querySelector("#themeBackgroundImage");
        if (bgSelect) bgSelect.value = "custom";
        if (!state.theme) state.theme = {};
        state.theme.backgroundUrl = dataUrl;
        state.theme.backgroundImage = "custom";
        const liveTheme = collectTheme();
        liveTheme.backgroundImage = "custom";
        liveTheme.backgroundUrl = dataUrl;
        applyTheme(liveTheme);
      } catch (err) {
        console.error("Błąd odczytu pliku tła:", err);
      }
    }
  });
  document.querySelector("#resetAppearance")?.addEventListener("click", resetThemeSettings);
  document.querySelector("#sectionCreateForm")?.addEventListener("submit", saveSection);
  document.querySelector("#linkForm")?.addEventListener("submit", saveLink);
  document.querySelector("#sidebarIconAlerts")?.addEventListener("click", openQuickAlertsModal);
  document.querySelector("#btnQuickRefresh")?.addEventListener("click", renderQuickAlertsContent);
  document.querySelector("#systemStatsWidget")?.addEventListener("click", () => {
    if (typeof openTopModal === "function") {
      openTopModal();
    }
  });
  document.querySelector("#sidebarIconTheme")?.addEventListener("click", () => {
    const pin = getStoredAdminPin();
    if (!pin) {
      requestAdminPin("appearance");
    } else {
      openAppearancePanel();
    }
  });
  document.querySelector("#sidebarIconLock")?.addEventListener("click", () => {
    clearStoredAdminPin();
    showToast("Sesja została zablokowana 🔒");
    if (state.view === "admin") {
      state.view = "links";
      render();
    }
  });
  document.addEventListener("visibilitychange", syncSystemStatsPolling);
  window.addEventListener("storage", (e) => {
    if (e.key === "homedash_services_updated") {
      reloadData().then(() => render());
    }
  });
  try {
    if (typeof BroadcastChannel !== "undefined") {
      const syncChannel = new BroadcastChannel("homedash_sync");
      syncChannel.onmessage = (event) => {
        if (event.data?.type === "services_updated") {
          reloadData().then(() => render());
        }
      };
    }
  } catch {}
}

function toggleSidebar() {
  state.sidebarHidden = !state.sidebarHidden;
  document.querySelector("#shell").classList.toggle("sidebar-hidden", state.sidebarHidden);
  localStorage.setItem("homedash.nas.sidebarHidden", String(state.sidebarHidden));
}

function render() {
  renderNavigation();
  if (state.view === "admin") renderAdmin();
  else if (state.view === "status") renderServerStatus();
  else renderLinks();
  syncSystemStatsPolling();
}

function renderNavigation() {
  const nav = document.querySelector("#navigation");
  nav.innerHTML = "";
  state.data.sections.forEach((section) => {
    const row = document.createElement("div");
    row.className = "nav-row";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "nav-button";
    button.dataset.active = String(state.view === "links" && section.id === state.activeSectionId);
    button.innerHTML = `<span>${escapeHtml(section.name)}</span><small>${section.links.length}</small>`;
    button.addEventListener("click", () => {
      state.view = "links";
      state.activeSectionId = section.id;
      render();
    });
    row.append(button);
    nav.appendChild(row);
  });
  const separator = document.createElement("div");
  separator.className = "nav-separator";
  nav.appendChild(separator);

  const statusBtn = document.createElement("button");
  statusBtn.type = "button";
  statusBtn.className = "nav-button";
  statusBtn.dataset.active = String(state.view === "status");
  statusBtn.innerHTML = "<span>Status Serwera</span>";
  statusBtn.addEventListener("click", () => {
    state.view = "status";
    render();
  });
  nav.appendChild(statusBtn);
}

function activeSection() {
  return state.data.sections.find((item) => item.id === state.activeSectionId);
}

function renderLinks() {
  stopStatusTopDiagnostics();
  const section = activeSection();
  document.querySelector("#viewTitle").textContent = section?.name || "Brak sekcji";
  document.querySelector("#toolbarActions").innerHTML = `
    <input id="search" type="search" value="${escapeHtml(state.query)}" placeholder="Szukaj linku...">
  `;
  document.querySelector("#content").innerHTML = `
    <div class="link-grid" id="linkGrid"></div>
    ${section ? '<div class="section-footer"><button id="addLink" class="primary" type="button">+ Dodaj link</button></div>' : ""}
  `;
  document.querySelector("#search").addEventListener("input", (event) => {
    state.query = event.target.value;
    renderLinkCards();
  });
  document.querySelector("#addLink")?.addEventListener("click", () => openLinkDialog());
  renderLinkCards();
}

function renderLinkCards() {
  const section = activeSection();
  const grid = document.querySelector("#linkGrid");
  if (!section) {
    grid.innerHTML = '<div class="empty">Dodaj pierwszą sekcję.</div>';
    return;
  }
  const query = state.query.trim().toLowerCase();
  const links = section.links.filter((link) => `${link.name} ${link.url} ${link.description}`.toLowerCase().includes(query));
  grid.innerHTML = "";
  for (const link of links) {
    const card = document.createElement("article");
    card.className = "link-card";
    const icon = /^https?:\/\//i.test(link.icon)
      ? `<img src="${escapeHtml(link.icon)}" alt="">`
      : /\.(svg|png|jpe?g|webp|gif|ico)$/i.test(link.icon)
        ? `<img src="./icons/${escapeHtml(link.icon.replace(/^[/\\]+/, ""))}" alt="">`
        : escapeHtml(link.icon || link.name.slice(0, 1).toUpperCase());
    card.innerHTML = `
      <button class="link-main" type="button">
        <span class="link-icon">${icon}</span>
        <span class="link-copy"><strong>${escapeHtml(link.name)}</strong><span>${escapeHtml(link.description || link.url)}</span></span>
        <span class="open-mark">↗</span>
      </button>
      <div class="card-actions"><button data-edit type="button" aria-label="Edytuj link" title="Edytuj">✎</button><button data-delete type="button" aria-label="Usuń link" title="Usuń">🗑</button></div>
    `;
    card.querySelector(".link-main").addEventListener("click", () => openLink(link));
    card.querySelector("[data-edit]").addEventListener("click", () => openLinkDialog(link));
    card.querySelector("[data-delete]").addEventListener("click", () => deleteLink(link));
    card.querySelector(".link-icon img")?.addEventListener("error", (event) => {
      event.currentTarget.replaceWith(document.createTextNode(link.name.slice(0, 1).toUpperCase()));
    });
    grid.appendChild(card);
  }
  if (!links.length) {
    grid.innerHTML = '<div class="empty">Brak kafelków w tej sekcji.</div>';
  }
}

function openLink(link) {
  if (link.openMode === "iframe") {
    state.view = "iframe";
    document.querySelector("#content").innerHTML = `
      <div class="frame-panel">
        <div>
          <strong>${escapeHtml(link.name)}</strong>
          <button id="closeFrame" type="button">Zamknij</button>
          <a href="${escapeHtml(link.url)}" target="_blank" rel="noreferrer">Otwórz w karcie ↗</a>
        </div>
        <iframe src="${escapeHtml(link.url)}" title="${escapeHtml(link.name)}"></iframe>
      </div>
    `;
    document.querySelector("#closeFrame").addEventListener("click", () => {
      state.view = "links";
      render();
    });
    return;
  }
  window.open(link.url, "_blank", "noreferrer");
}

function openLinkDialog(link = null) {
  state.editingLink = link;
  const dialog = document.querySelector("#linkDialog");
  const sectionSelect = document.querySelector("#linkSection");
  sectionSelect.innerHTML = state.data.sections.map((section) => `<option value="${section.id}">${escapeHtml(section.name)}</option>`).join("");
  sectionSelect.value = state.activeSectionId;
  document.querySelector("#linkDialogTitle").textContent = link ? "Edytuj link" : "Nowy link";
  document.querySelector("#linkName").value = link?.name || "";
  document.querySelector("#linkUrl").value = link?.url || "";
  document.querySelector("#linkDescription").value = link?.description || "";
  document.querySelector("#linkIcon").value = link?.icon || "";
  document.querySelector("#linkOpenMode").value = link?.openMode || "new-tab";
  dialog.showModal();
}

async function saveLink(event) {
  event.preventDefault();
  const sectionId = document.querySelector("#linkSection").value;
  const payload = {
    sectionId,
    name: document.querySelector("#linkName").value.trim(),
    url: document.querySelector("#linkUrl").value.trim(),
    description: document.querySelector("#linkDescription").value.trim(),
    icon: document.querySelector("#linkIcon").value.trim(),
    openMode: document.querySelector("#linkOpenMode").value
  };
  const isEditing = Boolean(state.editingLink);
  const endpoint = isEditing
    ? `${dashboardConfig.apiUrl}/api/services/link/${state.editingLink.id}`
    : `${dashboardConfig.apiUrl}/api/services/link`;
  try {
    await request(endpoint, {
      method: isEditing ? "PUT" : "POST",
      body: JSON.stringify(payload)
    });
    document.querySelector("#linkDialog").close();
    await reloadData();
    state.activeSectionId = sectionId;
    render();
    showToast(isEditing ? "Link zaktualizowany." : "Link dodany.");
  } catch (error) {
    showToast(error.message);
  }
}

async function deleteLink(link) {
  if (!confirm(`Usunąć link „${link.name}”?`)) return;
  try {
    await request(`${dashboardConfig.apiUrl}/api/services/link/${link.id}`, { method: "DELETE" });
    await reloadData();
    render();
    showToast("Link usunięty.");
  } catch (error) {
    showToast(error.message);
  }
}

function requestAdminPin(panel) {
  state.pendingAdminPanel = panel;
  document.querySelector("#adminPinInput").value = "";
  document.querySelector("#pinDialog").showModal();
}

async function unlockAdminPanel(event) {
  event.preventDefault();
  const pin = document.querySelector("#adminPinInput").value.trim();
  try {
    await request(`${dashboardConfig.apiUrl}/api/admin/unlock`, {
      method: "POST",
      body: JSON.stringify({ pin })
    });
    setStoredAdminPin(pin);
    document.querySelector("#pinDialog").close();
    showToast("Zaplecze odblokowane 🔓");
    if (state.pendingAdminPanel === "settings") openSettingsPanel();
    else if (state.pendingAdminPanel === "appearance") openAppearancePanel();
    else if (state.pendingAdminPanel === "sections") openSectionsPanel();
    else if (state.pendingAdminPanel === "admin-view") {
      state.view = "admin";
      render();
    }
  } catch (error) {
    showToast("Błędny kod PIN.");
  }
}

function openSettingsPanel() {
  document.querySelector("#settingTitle").value = dashboardConfig.title;
  document.querySelector("#settingSubtitle").value = dashboardConfig.subtitle;
  document.querySelector("#settingApiUrl").value = dashboardConfig.apiUrl;
  document.querySelector("#settingDefaultHost").value = dashboardConfig.defaultHost;
  document.querySelector("#settingNewPin").value = "";
  document.querySelector("#settingLogo").value = "";
  document.querySelector("#settingsDialog").showModal();
}

async function saveDashboardSettings(event) {
  event.preventDefault();
  const logoFile = document.querySelector("#settingLogo").files[0];
  const logoData = logoFile ? await readFileAsDataUrl(logoFile) : null;
  const payload = {
    title: document.querySelector("#settingTitle").value.trim(),
    subtitle: document.querySelector("#settingSubtitle").value.trim(),
    apiUrl: document.querySelector("#settingApiUrl").value.trim(),
    defaultHost: document.querySelector("#settingDefaultHost").value.trim(),
    newPin: document.querySelector("#settingNewPin").value.trim(),
    logoData
  };
  try {
    const data = await request(`${dashboardConfig.apiUrl}/api/dashboard/settings`, {
      method: "PUT",
      body: JSON.stringify(payload)
    });
    if (payload.newPin) setStoredAdminPin(payload.newPin);
    applyDashboardSettings(data.settings);
    document.querySelector("#settingsDialog").close();
    showToast("Ustawienia zapisane.");
  } catch (error) {
    showToast(error.message);
  }
}

async function loadDashboardSettings() {
  try {
    const data = await request(`${dashboardConfig.apiUrl}/api/dashboard/settings`);
    applyDashboardSettings(data.settings);
  } catch {}
}

function applyDashboardSettings(settings) {
  if (!settings) return;
  if (settings.title) dashboardConfig.title = settings.title;
  if (settings.subtitle) dashboardConfig.subtitle = settings.subtitle;
  if (settings.apiUrl) dashboardConfig.apiUrl = settings.apiUrl;
  if (settings.defaultHost) dashboardConfig.defaultHost = settings.defaultHost;
  if (settings.logo) dashboardConfig.logo = settings.logo;
  if (state.data) {
    state.data.title = dashboardConfig.title;
    state.data.subtitle = dashboardConfig.subtitle;
  }
}

function openAppearancePanel() {
  const backgroundCss = cssValue("--background-image");
  const backgroundImageValue = backgroundCss.includes("background-custom") ? "custom" : backgroundCss.includes("background.jpg") ? "default" : "";
  const fields = {
    themeAccent: rgbToHex(cssValue("--accent")),
    themeAccentAlt: rgbToHex(cssValue("--accent-alt")),
    themeSurfaceColor: rgbToHex(`rgb(${cssValue("--surface-base-rgb").replaceAll(" ", ", ")})`),
    themeSidebarPanelColor: rgbToHex(`rgb(${cssValue("--sidebar-panel-rgb").replaceAll(" ", ", ") || cssValue("--surface-base-rgb").replaceAll(" ", ", ")})`),
    themeSidebarPanelAlpha: Math.round(Number(cssValue("--sidebar-panel-alpha") || "0.16") * 100),
    themeSidebarToggleColor: rgbToHex(cssValue("--sidebar-toggle-color") || cssValue("--accent")),
    themeSidebarToggleSize: parseInt(cssValue("--sidebar-toggle-size") || "20", 10),
    themeFontMenu: fontValueFromStack(cssValue("--font-menu")),
    themeFontCard: fontValueFromStack(cssValue("--font-card")),
    themeFontDescription: fontValueFromStack(cssValue("--font-description")),
    themeBg: rgbToHex(cssValue("--page-bg")),
    themeBackgroundImage: backgroundImageValue,
    themeBackgroundBlur: backgroundImageValue ? (parseInt(cssValue("--background-image-blur"), 10) || 10) : 10,
    themeBackgroundOpacity: backgroundImageValue ? (Math.round(Number(cssValue("--background-image-opacity")) * 100) || 55) : 55,
    themeBackgroundDim: backgroundImageValue ? (Math.round(Number(cssValue("--background-image-dim")) * 100) || 34) : 34,
    themeSidebarWidth: parseInt(cssValue("--sidebar-width") || "300", 10),
    themeLogoSize: parseInt(cssValue("--logo-size") || "71", 10),
    themeTitleSize: parseInt(cssValue("--title-size") || "29", 10),
    themeTitleColor: rgbToHex(cssValue("--title-color") || cssValue("--text")),
    themeTitleShadowBlur: parseInt(cssValue("--title-shadow-blur") || "0", 10),
    themeSubtitleSize: parseInt(cssValue("--subtitle-size") || "13", 10),
    themeSubtitleColor: rgbToHex(cssValue("--subtitle-color") || cssValue("--muted")),
    themeSubtitleShadowBlur: parseInt(cssValue("--subtitle-shadow-blur") || "0", 10),
    themePageTitleSize: parseInt(cssValue("--page-title-size") || "32", 10),
    themePageTitleShadowBlur: parseInt(cssValue("--page-title-shadow-blur") || "0", 10),
    themeCardRadius: parseInt(cssValue("--card-radius") || "22", 10),
    themeCardGap: parseInt(cssValue("--card-gap") || "14", 10),
    themeTileHeight: parseInt(cssValue("--tile-height") || "132", 10),
    themePanelColor: rgbToHex(`rgb(${cssValue("--tile-panel-rgb").replaceAll(" ", ", ")})`),
    themePanelAlpha: Math.round(Number(cssValue("--tile-panel-alpha") || "0.08") * 100),
    themeGlassBlur: parseInt(cssValue("--glass-blur") || "12", 10),
    themeGlassSaturation: parseInt(cssValue("--glass-saturation") || "100", 10),
    themeBorderAlpha: Math.round(Number(cssValue("--border-alpha") || "0.11") * 100),
    themeAdminPanelColor: rgbToHex(`rgb(${cssValue("--admin-panel-rgb").replaceAll(" ", ", ")})`),
    themeAdminPanelAlpha: Math.round(Number(cssValue("--admin-panel-alpha") || "0.08") * 100),
    themeModalBg: rgbToHex(`rgb(${cssValue("--modal-bg-rgb").replaceAll(" ", ", ") || cssValue("--surface-base-rgb").replaceAll(" ", ", ")})`),
    themeModalAlpha: Math.round(Number(cssValue("--modal-alpha") || "0.92") * 100),
    themeModalGlassBlur: parseInt(cssValue("--modal-glass-blur") || "16", 10),
    themeModalBackdropBlur: parseInt(cssValue("--modal-backdrop-blur") || "3", 10),
    themeModalBackdropAlpha: Math.round(Number(cssValue("--modal-backdrop-alpha") || "0.62") * 100),
    themeModalRadius: parseInt(cssValue("--modal-radius") || "20", 10)
  };
  Object.entries(fields).forEach(([id, value]) => {
    const input = document.querySelector(`#${id}`);
    if (input) {
      input.value = value;
      updateRangeValue(input);
    }
  });
  document.querySelector("#appearanceDialog").showModal();
}

function updateRangeValue(input) {
  const label = input.closest("label");
  const target = label?.querySelector("span");
  if (!target) return;
  const percentFields = new Set(["themeBackgroundOpacity", "themeBackgroundDim", "themeSidebarPanelAlpha", "themePanelAlpha", "themeGlassSaturation", "themeBorderAlpha", "themeAdminPanelAlpha", "themeModalAlpha", "themeModalBackdropAlpha"]);
  target.textContent = percentFields.has(input.id) ? `${input.value}%` : `${input.value}px`;
}

function collectTheme() {
  return {
    accent: document.querySelector("#themeAccent").value,
    accentAlt: document.querySelector("#themeAccentAlt").value,
    surfaceColor: document.querySelector("#themeSurfaceColor").value,
    sidebarPanelColor: document.querySelector("#themeSidebarPanelColor").value,
    sidebarPanelAlpha: String(Number(document.querySelector("#themeSidebarPanelAlpha").value) / 100),
    sidebarToggleColor: document.querySelector("#themeSidebarToggleColor").value,
    sidebarToggleSize: `${document.querySelector("#themeSidebarToggleSize").value}px`,
    fontMenu: document.querySelector("#themeFontMenu").value,
    fontCard: document.querySelector("#themeFontCard").value,
    fontDescription: document.querySelector("#themeFontDescription").value,
    bg: document.querySelector("#themeBg").value,
    backgroundImage: document.querySelector("#themeBackgroundImage").value,
    backgroundBlur: `${document.querySelector("#themeBackgroundBlur").value}px`,
    backgroundOpacity: String(Number(document.querySelector("#themeBackgroundOpacity").value) / 100),
    backgroundDim: String(Number(document.querySelector("#themeBackgroundDim").value) / 100),
    sidebarWidth: `${document.querySelector("#themeSidebarWidth").value}px`,
    logoSize: `${document.querySelector("#themeLogoSize").value}px`,
    titleSize: `${document.querySelector("#themeTitleSize").value}px`,
    titleColor: document.querySelector("#themeTitleColor").value,
    titleShadowBlur: document.querySelector("#themeTitleShadowBlur").value,
    subtitleSize: `${document.querySelector("#themeSubtitleSize").value}px`,
    subtitleColor: document.querySelector("#themeSubtitleColor").value,
    subtitleShadowBlur: document.querySelector("#themeSubtitleShadowBlur").value,
    pageTitleSize: `${document.querySelector("#themePageTitleSize").value}px`,
    pageTitleShadowBlur: document.querySelector("#themePageTitleShadowBlur").value,
    cardRadius: `${document.querySelector("#themeCardRadius").value}px`,
    cardGap: `${document.querySelector("#themeCardGap").value}px`,
    tileHeight: `${document.querySelector("#themeTileHeight").value}px`,
    panelColor: document.querySelector("#themePanelColor").value,
    panelAlpha: String(Number(document.querySelector("#themePanelAlpha").value) / 100),
    glassBlur: `${document.querySelector("#themeGlassBlur").value}px`,
    glassSaturation: `${document.querySelector("#themeGlassSaturation").value}%`,
    borderAlpha: String(Number(document.querySelector("#themeBorderAlpha").value) / 100),
    adminPanelColor: document.querySelector("#themeAdminPanelColor").value,
    adminPanelAlpha: String(Number(document.querySelector("#themeAdminPanelAlpha").value) / 100),
    modalBg: document.querySelector("#themeModalBg").value,
    modalAlpha: String(Number(document.querySelector("#themeModalAlpha").value) / 100),
    modalGlassBlur: `${document.querySelector("#themeModalGlassBlur").value}px`,
    modalBackdropBlur: `${document.querySelector("#themeModalBackdropBlur").value}px`,
    modalBackdropAlpha: String(Number(document.querySelector("#themeModalBackdropAlpha").value) / 100),
    modalRadius: `${document.querySelector("#themeModalRadius").value}px`
  };
}

async function saveThemeSettings(event) {
  event.preventDefault();
  const theme = collectTheme();
  const backgroundFile = document.querySelector("#themeBackgroundUpload").files[0];
  const backgroundData = backgroundFile ? await readFileAsDataUrl(backgroundFile) : null;
  try {
    const data = await request(`${dashboardConfig.apiUrl}/api/dashboard/theme`, {
      method: "PUT",
      body: JSON.stringify({ ...theme, backgroundData })
    });
    state.theme = data.theme || {};
    applyTheme(state.theme);
    document.querySelector("#appearanceDialog").close();
    showToast("Wygląd zapisany.");
  } catch (error) {
    showToast(error.message);
  }
}

async function resetThemeSettings() {
  if (!confirm("Przywrócić domyślny wygląd?")) return;
  try {
    await request(`${dashboardConfig.apiUrl}/api/dashboard/theme`, {
      method: "PUT",
      body: JSON.stringify({ reset: true })
    });
    state.theme = {};
    clearTheme();
    document.querySelector("#appearanceDialog").close();
    showToast("Przywrócono domyślny wygląd.");
  } catch (error) {
    showToast(error.message);
  }
}

async function loadThemeSettings() {
  try {
    const data = await request(`${dashboardConfig.apiUrl}/api/dashboard/theme`);
    state.theme = data.theme || {};
    applyTheme(data.theme || {});
  } catch {
    state.theme = {};
    applyTheme({});
  }
}

function applyTheme(theme) {
  const root = document.body || document.documentElement;
  const map = {
    accent: "--accent",
    accentAlt: "--accent-alt",
    bg: "--page-bg",
    sidebarWidth: "--sidebar-width",
    titleSize: "--title-size",
    cardRadius: "--card-radius",
    cardGap: "--card-gap",
    tileHeight: "--tile-height",
    logoSize: "--logo-size",
    glassBlur: "--glass-blur",
    glassSaturation: "--glass-saturation"
  };
  Object.entries(map).forEach(([key, cssVar]) => {
    if (theme[key]) {
      let val = theme[key];
      if (["sidebarWidth", "titleSize", "cardRadius", "cardGap", "tileHeight", "logoSize", "glassBlur"].includes(key)) {
        val = String(val).endsWith("px") ? val : `${val}px`;
      }
      root.style.setProperty(cssVar, val);
    }
  });
  if (theme.titleColor) root.style.setProperty("--title-color", theme.titleColor);
  if (theme.titleShadowBlur != null && theme.titleShadowBlur !== "") {
    const blur = parseInt(theme.titleShadowBlur, 10) || 0;
    root.style.setProperty("--title-shadow", blur > 0 ? `0 2px ${blur}px rgba(0,0,0,0.85)` : "none");
    root.style.setProperty("--title-shadow-blur", `${blur}px`);
  }
  if (theme.subtitleSize) root.style.setProperty("--subtitle-size", String(theme.subtitleSize).endsWith("px") ? theme.subtitleSize : `${theme.subtitleSize}px`);
  if (theme.subtitleColor) root.style.setProperty("--subtitle-color", theme.subtitleColor);
  if (theme.subtitleShadowBlur != null && theme.subtitleShadowBlur !== "") {
    const blur = parseInt(theme.subtitleShadowBlur, 10) || 0;
    root.style.setProperty("--subtitle-shadow", blur > 0 ? `0 1px ${blur}px rgba(0,0,0,0.75)` : "none");
    root.style.setProperty("--subtitle-shadow-blur", `${blur}px`);
  }
  if (theme.pageTitleSize) root.style.setProperty("--page-title-size", String(theme.pageTitleSize).endsWith("px") ? theme.pageTitleSize : `${theme.pageTitleSize}px`);
  if (theme.pageTitleShadowBlur != null && theme.pageTitleShadowBlur !== "") {
    const blur = parseInt(theme.pageTitleShadowBlur, 10) || 0;
    root.style.setProperty("--page-title-shadow", blur > 0 ? `0 2px ${blur}px rgba(0,0,0,0.85)` : "none");
    root.style.setProperty("--page-title-shadow-blur", `${blur}px`);
  }
  const backgroundUrl = theme.backgroundImage === "custom" ? (theme.backgroundUrl || "./images/background-custom.jpg") : "./images/background.jpg";
  const hasBackgroundImage = ["default", "custom"].includes(theme.backgroundImage);
  root.style.setProperty("--background-image", hasBackgroundImage ? `url("${backgroundUrl}")` : "none");
  root.style.setProperty("--background-image-opacity", hasBackgroundImage ? (theme.backgroundOpacity || "0.55") : "0");
  root.style.setProperty("--background-image-blur", hasBackgroundImage ? (theme.backgroundBlur || "10px") : "0px");
  root.style.setProperty("--background-image-dim", hasBackgroundImage ? (theme.backgroundDim || "0.34") : "0");
  if (theme.accent) {
    root.style.setProperty("--accent-soft", `color-mix(in srgb, ${theme.accent} 16%, transparent)`);
    root.style.setProperty("--glow-start", `color-mix(in srgb, ${theme.accent} 12%, transparent)`);
  }
  if (theme.accentAlt) {
    root.style.setProperty("--glow-end", `color-mix(in srgb, ${theme.accentAlt} 10%, transparent)`);
  }
  if (theme.surfaceColor) {
    root.style.setProperty("--surface-base-rgb", hexToRgb(theme.surfaceColor));
  }
  if (theme.sidebarPanelColor) root.style.setProperty("--sidebar-panel-rgb", hexToRgb(theme.sidebarPanelColor));
  if (theme.sidebarPanelAlpha) root.style.setProperty("--sidebar-panel-alpha", theme.sidebarPanelAlpha);
  if (theme.sidebarToggleColor) root.style.setProperty("--sidebar-toggle-color", theme.sidebarToggleColor);
  if (theme.sidebarToggleSize) root.style.setProperty("--sidebar-toggle-size", String(theme.sidebarToggleSize).endsWith("px") ? theme.sidebarToggleSize : `${theme.sidebarToggleSize}px`);
  if (theme.fontMenu) root.style.setProperty("--font-menu", fontStack(theme.fontMenu));
  if (theme.fontCard) root.style.setProperty("--font-card", fontStack(theme.fontCard));
  if (theme.fontDescription) root.style.setProperty("--font-description", fontStack(theme.fontDescription));
  if (theme.bg) {
    root.style.setProperty("--glow-start", "transparent");
    root.style.setProperty("--glow-end", "transparent");
  }
  if (theme.panelColor) root.style.setProperty("--tile-panel-rgb", hexToRgb(theme.panelColor));
  if (theme.panelAlpha) root.style.setProperty("--tile-panel-alpha", theme.panelAlpha);
  if (theme.adminPanelColor) root.style.setProperty("--admin-panel-rgb", hexToRgb(theme.adminPanelColor));
  if (theme.adminPanelAlpha) root.style.setProperty("--admin-panel-alpha", theme.adminPanelAlpha);
  if (theme.borderAlpha) {
    root.style.setProperty("--border-alpha", theme.borderAlpha);
    const lineRgb = root.classList.contains("theme-guard") ? "255 214 222" : "255 255 255";
    root.style.setProperty("--line", `rgb(${lineRgb} / ${theme.borderAlpha})`);
  }
  if (theme.modalBg) root.style.setProperty("--modal-bg-rgb", hexToRgb(theme.modalBg));
  if (theme.modalAlpha) root.style.setProperty("--modal-alpha", theme.modalAlpha);
  if (theme.modalGlassBlur) root.style.setProperty("--modal-glass-blur", String(theme.modalGlassBlur).endsWith("px") ? theme.modalGlassBlur : `${theme.modalGlassBlur}px`);
  if (theme.modalBackdropBlur) root.style.setProperty("--modal-backdrop-blur", String(theme.modalBackdropBlur).endsWith("px") ? theme.modalBackdropBlur : `${theme.modalBackdropBlur}px`);
  if (theme.modalBackdropAlpha) root.style.setProperty("--modal-backdrop-alpha", theme.modalBackdropAlpha);
  if (theme.modalRadius) root.style.setProperty("--modal-radius", String(theme.modalRadius).endsWith("px") ? theme.modalRadius : `${theme.modalRadius}px`);
}

function clearTheme() {
  ["--accent", "--accent-alt", "--surface-base-rgb", "--sidebar-panel-rgb", "--sidebar-panel-alpha", "--sidebar-toggle-color", "--sidebar-toggle-size", "--font-menu", "--font-card", "--font-description", "--page-bg", "--background-image", "--background-image-opacity", "--background-image-blur", "--background-image-dim", "--sidebar-width", "--title-size", "--title-color", "--title-shadow", "--title-shadow-blur", "--subtitle-size", "--subtitle-color", "--subtitle-shadow", "--subtitle-shadow-blur", "--page-title-size", "--page-title-shadow", "--page-title-shadow-blur", "--card-radius", "--card-gap", "--tile-height", "--logo-size", "--accent-soft", "--glow-start", "--glow-end", "--tile-panel-rgb", "--tile-panel-alpha", "--admin-panel-rgb", "--admin-panel-alpha", "--glass-blur", "--glass-saturation", "--border-alpha", "--line", "--modal-bg-rgb", "--modal-alpha", "--modal-glass-blur", "--modal-backdrop-blur", "--modal-backdrop-alpha", "--modal-radius"]
    .forEach((name) => (document.body || document.documentElement)?.style.removeProperty(name));
}

function cssValue(name) {
  return getComputedStyle(document.body || document.documentElement).getPropertyValue(name).trim();
}

function rgbToHex(value) {
  if (value.startsWith("#")) return value.slice(0, 7);
  const match = value.match(/\d+/g);
  if (!match) return "#000000";
  return "#" + match.slice(0, 3).map((part) => Number(part).toString(16).padStart(2, "0")).join("");
}

function hexToRgb(value) {
  const hex = value.replace("#", "");
  const number = parseInt(hex, 16);
  return `${(number >> 16) & 255} ${(number >> 8) & 255} ${number & 255}`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function openSectionsPanel() {
  renderSectionsManager();
  document.querySelector("#sectionsDialog").showModal();
}

function renderSectionsManager() {
  const target = document.querySelector("#sectionManager");
  target.innerHTML = "";
  state.data.sections.forEach((section, index) => {
    const row = document.createElement("div");
    row.className = "section-editor-row";
    row.innerHTML = `
      <input class="section-edit-name" value="${escapeHtml(section.name)}">
      <span>${section.links.length} linków</span>
      <div class="section-editor-actions">
        <button class="btn-move-up" type="button"${index === 0 ? " disabled" : ""}>↑</button>
        <button class="btn-move-down" type="button"${index === state.data.sections.length - 1 ? " disabled" : ""}>↓</button>
        <button class="primary btn-save-section" type="button">Zapisz</button>
        <button class="danger btn-del-section" type="button">Usuń</button>
      </div>
    `;
    row.querySelector(".btn-move-up").addEventListener("click", () => moveSection(section.id, "up"));
    row.querySelector(".btn-move-down").addEventListener("click", () => moveSection(section.id, "down"));
    row.querySelector(".btn-save-section").addEventListener("click", () => {
      const newName = row.querySelector(".section-edit-name").value;
      updateSection(section.id, newName);
    });
    row.querySelector(".btn-del-section").addEventListener("click", () => deleteSection(section));
    target.appendChild(row);
  });
  if (!state.data.sections.length) {
    target.innerHTML = '<div class="empty">Brak sekcji. Dodaj pierwszą powyżej.</div>';
  }
}

async function saveSection(event) {
  event.preventDefault();
  const name = document.querySelector("#sectionName").value.trim();
  if (!name) return showToast("Podaj nazwę sekcji.");
  try {
    await request(`${dashboardConfig.apiUrl}/api/services/section`, {
      method: "POST",
      body: JSON.stringify({ name })
    });
    event.target.reset();
    await reloadData();
    render();
    renderSectionsManager();
    showToast("Sekcja dodana.");
  } catch (error) {
    showToast(error.message);
  }
}

async function updateSection(sectionId, name) {
  const cleanName = name.trim();
  if (!cleanName) return showToast("Podaj nazwę sekcji.");
  try {
    await request(`${dashboardConfig.apiUrl}/api/services/section/${sectionId}`, {
      method: "PUT",
      body: JSON.stringify({ name: cleanName })
    });
    await reloadData();
    render();
    renderSectionsManager();
    showToast("Nazwa sekcji zmieniona.");
  } catch (error) {
    showToast(error.message);
  }
}

async function moveSection(sectionId, direction) {
  try {
    await request(`${dashboardConfig.apiUrl}/api/services/section/${sectionId}/move`, {
      method: "PUT",
      body: JSON.stringify({ direction })
    });
    await reloadData();
    render();
    renderSectionsManager();
    showToast("Kolejność sekcji zmieniona.");
  } catch (error) {
    showToast(error.message);
  }
}

async function deleteSection(section) {
  if (!confirm(`Usunąć sekcję „${section.name}” i wszystkie jej linki?`)) return;
  try {
    await request(`${dashboardConfig.apiUrl}/api/services/section/${section.id}`, { method: "DELETE" });
    await reloadData();
    render();
    renderSectionsManager();
    showToast("Sekcja usunięta.");
  } catch (error) {
    showToast(error.message);
  }
}

let statusTopController = null;

function stopStatusTopDiagnostics() {
  if (statusTopController) {
    statusTopController.stop();
    statusTopController = null;
  }
}

function renderServerStatus() {
  stopStatusTopDiagnostics();
  document.querySelector("#viewTitle").textContent = "Status Serwera";
  document.querySelector("#toolbarActions").innerHTML = `
    <button type="button" class="primary" id="btnRefreshServerStatus">🔄 Odśwież</button>
  `;
  document.querySelector("#content").innerHTML = `
    <div class="admin-grid">
      <section class="admin-card system-stats-card">
        <div class="panel-heading">
          <div><span class="eyebrow">Monitoring</span><h2>Statystyki systemu</h2></div>
          <div class="panel-heading-actions">
            <span id="systemStatsUpdated">Oczekiwanie</span>
          </div>
        </div>
        <div class="cockpit-stats" id="systemStats"><div class="empty">Pobieranie danych…</div></div>
      </section>
      <section class="admin-card alerts-status-card">
        <div class="panel-heading">
          <div><span class="eyebrow">Diagnostyka</span><h2>🔔 Centrum Alertów</h2></div>
          <div class="panel-heading-actions"><a href="./mods/admin/?tab=alerts">Pełny widok →</a></div>
        </div>
        <div id="serverStatusAlerts" style="display:grid; gap:10px;"><div class="empty">Pobieranie stanu alertów...</div></div>
      </section>
      <section class="admin-card ports-card">
        <div class="panel-heading"><div><span class="eyebrow">Narzędzia</span><h2>Wyszukiwanie i test portów</h2></div></div>
        <div id="portTool"></div>
      </section>
      <section class="admin-card top-accordion-card" style="grid-column: 1 / -1;">
        <details class="top-accordion" id="topAccordion">
          <summary class="top-accordion-summary">
            <span>📊 Szczegółowa Diagnostyka (Top)</span>
            <span class="top-accordion-chevron">›</span>
          </summary>
          <div class="top-accordion-body" id="topAccordionMount"></div>
        </details>
      </section>
    </div>
  `;
  renderPortTool();
  loadSystemStats();
  renderAlertsInto("#serverStatusAlerts");
  document.querySelector("#btnRefreshServerStatus")?.addEventListener("click", () => {
    loadSystemStats();
    renderAlertsInto("#serverStatusAlerts");
    statusTopController?.refresh();
  });
  document.querySelector("#topAccordion")?.addEventListener("toggle", (event) => {
    const details = event.target;
    if (details.open) {
      if (!statusTopController) {
        statusTopController = TopDiagnostics.mount(document.querySelector("#topAccordionMount"));
      }
      statusTopController.start();
    } else {
      statusTopController?.stop();
    }
  });
}

function renderAdmin() {
  renderServerStatus();
}

function renderPortTool() {
  const target = document.querySelector("#portTool");
  target.innerHTML = `
    <div class="port-layout">
      <label>Kategoria<select id="hintCategory">${Object.entries(PORT_HINTS).map(([id, hint]) => `<option value="${id}">${hint.label}</option>`).join("")}</select></label>
      <div class="port-result is-info" id="hintResult"></div>
      <label>Host<input id="checkHost" value="${dashboardConfig.defaultHost}"></label>
      <label>Port hosta<input id="checkPort" inputmode="numeric" placeholder="3050"></label>
      <button class="primary" id="checkPortButton" type="button">Sprawdź port</button>
      <div class="port-result" id="portResult"><strong>Czeka</strong><span>Wpisz host i port.</span></div>
    </div>
  `;
  const category = document.querySelector("#hintCategory");
  const renderHint = () => {
    const hint = PORT_HINTS[category.value];
    const typicalText = hint.typicalPorts && hint.typicalPorts.length ? ` | Przykłady w tej puli: ${hint.typicalPorts.join(", ")}` : "";
    const descText = hint.description ? ` (${hint.description})` : "";
    setPortResult(document.querySelector("#hintResult"), "is-info", hint.label, `Pula hosta: ${hint.range}${typicalText}${descText}`);
  };
  category.addEventListener("change", renderHint);
  document.querySelector("#checkPortButton").addEventListener("click", runPortCheck);
  renderHint();
}

function setPortResult(box, tone, title, message) {
  box.className = `port-result ${tone}`;
  box.innerHTML = `<strong>${escapeHtml(title)}</strong><span>${escapeHtml(message)}</span>`;
}

async function checkPortAvailability(host, port) {
  const payload = {
    category: "manual",
    hostPort: port,
    containerPort: 80,
    host,
    port
  };
  return request(`${dashboardConfig.apiUrl}/api/ports/check`, { method: "POST", body: JSON.stringify(payload) });
}

async function runPortCheck() {
  const host = document.querySelector("#checkHost").value.trim();
  const rawPort = document.querySelector("#checkPort").value.trim();
  const port = Number(rawPort);
  const box = document.querySelector("#portResult");
  if (!host) return setPortResult(box, "is-error", "Brak hosta", "Wpisz adres IP albo nazwę hosta.");
  if (rawPort === "" || !Number.isInteger(port) || port < 1 || port > 65535) {
    return setPortResult(box, "is-error", "Niepoprawny port", "Port TCP/UDP musi mieć zakres 1–65535.");
  }
  const button = document.querySelector("#checkPortButton");
  button.disabled = true;
  setPortResult(box, "is-pending", "Sprawdzam", `${host}:${port}`);
  try {
    const data = await checkPortAvailability(host, port);
    const status = data.status || data.result || data.state;
    if (["busy", "used", "occupied", "open"].includes(status) || data.busy === true || data.open === true) {
      return setPortResult(box, "is-busy", "Port zajęty", `${host}:${port}`);
    }
    if (["free", "available", "closed"].includes(status) || data.busy === false || data.open === false) {
      return setPortResult(box, "is-free", "Port wolny", `${host}:${port}`);
    }
    if (data.ok === true) return setPortResult(box, "is-free", "Port sprawdzony", `${host}:${port}`);
    setPortResult(box, "is-error", "Nieznany status", "Backend nie zwrócił rozpoznawanego statusu.");
  } catch (error) {
    setPortResult(box, "is-error", "Błąd sprawdzania", error.message);
  } finally {
    button.disabled = false;
  }
}

async function loadAlertsSummary() {
  const badge = document.querySelector("#sidebarAlertBadge");
  const headerAlert = document.querySelector("#headerAlert");
  try {
    const data = await request(`${dashboardConfig.apiUrl}/api/alerts/summary`);
    state.alertsData = data;
    const total = data.summary?.total || 0;
    const critical = data.summary?.critical || 0;

    if (badge) {
      if (total > 0) {
        badge.textContent = String(total);
        badge.style.display = "flex";
      } else {
        badge.style.display = "none";
      }
    }

    if (headerAlert) {
      if (critical > 0) {
        const criticalAlerts = (data.alerts || []).filter((a) => a.severity === "critical");
        const names = criticalAlerts.map((a) => a.resource || a.title).join(", ");
        headerAlert.innerHTML = `
          <a href="./mods/admin/?tab=alerts" class="header-alert-item" title="Kliknij, aby otworzyć szczegóły diagnostyki">
            <span class="alert-icon">⚠️</span>
            <span><strong>Uwaga — wykryto awarię usług:</strong> ${escapeHtml(names || "Problemy z kontenerami/sprzętem")}</span>
            <span class="header-alert-link">Szczegóły →</span>
          </a>
        `;
        headerAlert.style.display = "flex";
      } else {
        headerAlert.innerHTML = "";
        headerAlert.style.display = "none";
      }
    }
  } catch (error) {
    if (badge) badge.style.display = "none";
    if (headerAlert) headerAlert.style.display = "none";
  }
}

function openQuickAlertsModal() {
  const dialog = document.querySelector("#alertsQuickModal");
  if (!dialog) return;
  renderQuickAlertsContent();
  dialog.showModal();
}

function renderQuickAlertsContent() {
  return renderAlertsInto("#quickAlertsContent");
}

async function renderAlertsInto(selector) {
  const container = document.querySelector(selector);
  if (!container) return;
  container.innerHTML = '<div class="empty">Pobieranie alertów...</div>';
  try {
    const data = await request(`${dashboardConfig.apiUrl}/api/alerts/summary`);
    state.alertsData = data;
    const alerts = data.alerts || [];
    if (alerts.length === 0) {
      container.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding: 24px; text-align:center; background: rgba(16,185,129,0.06); border:1px solid rgba(16,185,129,0.25); border-radius:14px;">
          <span style="font-size:32px; margin-bottom:8px;">✅</span>
          <strong style="color:#34d399; font-size:15px;">Wszystkie usługi i kontenery działają stabilnie.</strong>
          <span style="color:var(--muted); font-size:12px; margin-top:4px;">Brak aktywnych awarii w Homelabie.</span>
        </div>
      `;
      return;
    }
    container.innerHTML = alerts.map((a) => `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px 14px; border-radius:12px; background: ${a.severity === "critical" ? "rgba(239,68,68,0.12)" : "rgba(245,158,11,0.12)"}; border:1px solid ${a.severity === "critical" ? "rgba(239,68,68,0.35)" : "rgba(245,158,11,0.35)"};">
        <div>
          <strong style="display:block; font-size:13px; color:#fff;">${escapeHtml(a.title)}</strong>
          <span style="font-size:11px; color:var(--muted);">${escapeHtml(a.message)}</span>
        </div>
        <span style="font-size:11px; font-weight:bold; color:${a.severity === "critical" ? "#f87171" : "#fbbf24"}; text-transform:uppercase;">${escapeHtml(a.severity)}</span>
      </div>
    `).join("");
  } catch (err) {
    container.innerHTML = `<div class="empty" style="color:var(--danger);">Błąd pobierania alertów: ${escapeHtml(err.message)}</div>`;
  }
}

async function loadSystemStats() {
  const widget = document.querySelector("#systemStatsWidget");
  if (!widget) return;
  const container = document.querySelector("#systemStats");
  const updatedLabel = document.querySelector("#systemStatsUpdated");

  try {
    const data = await request(`${dashboardConfig.apiUrl}/api/system/stats`);
    widget.innerHTML = renderHeaderStats(data);
    widget.dataset.status = "online";
    const updated = data.updated ? new Date(data.updated) : null;
    const updatedText = updated && !Number.isNaN(updated.getTime())
      ? `Akt. ${updated.toLocaleTimeString("pl-PL")}`
      : "Połączono";
    widget.title = updatedText;
    if (container) container.innerHTML = renderSystemStats(data);
    if (updatedLabel) updatedLabel.textContent = updatedText;
  } catch (error) {
    widget.dataset.status = "error";
    widget.title = error.message;
    widget.innerHTML = `
      <div class="header-stat is-error"><span>CPU</span><strong>--</strong></div>
      <div class="header-stat is-error"><span>Temp</span><strong>--</strong></div>
      <div class="header-stat is-error"><span>RAM</span><strong>--</strong></div>
    `;
    if (container) container.innerHTML = `<div class="empty">${escapeHtml(error.message)}</div>`;
    if (updatedLabel) updatedLabel.textContent = "Brak danych";
  }
}

function renderHeaderStats(data) {
  const cpuUsage = data.cpu?.usage == null ? null : Number(data.cpu.usage);
  const temperature = data.cpu?.temperature == null ? null : Number(data.cpu.temperature);
  const memoryPercent = data.memory?.percent == null ? null : Number(data.memory.percent);
  return `
    <div class="header-stat"><span>CPU</span><strong>${percentLabel(cpuUsage)}</strong></div>
    <div class="header-stat"><span>Temp</span><strong>${temperature == null || Number.isNaN(temperature) ? "—" : `${Math.round(temperature)}°C`}</strong></div>
    <div class="header-stat"><span>RAM</span><strong>${percentLabel(memoryPercent)}</strong></div>
  `;
}

function renderSystemStats(data) {
  const cpuUsage = data.cpu?.usage == null ? 0 : Number(data.cpu.usage);
  const memoryPercent = data.memory?.percent == null ? 0 : Number(data.memory.percent);
  const swapPercent = data.swap?.percent == null ? 0 : Number(data.swap.percent);
  const disks = Array.isArray(data.disks) ? data.disks.slice(0, 5) : [];

  return `
    <article class="cockpit-stat-card">
      <header><h3>Procesor</h3><strong>${data.cpu?.temperature == null ? "—" : `${Math.round(data.cpu.temperature)} °C`}</strong></header>
      <div class="stat-line"><strong>${escapeHtml(String(data.cpu?.count ?? "—"))} procesory</strong><span>użycie: ${percentLabel(cpuUsage)}</span></div>
      ${renderProgress(cpuUsage)}
      <p><strong>Obciążenie</strong> 1 minuta: ${numberLabel(data.cpu?.load1)}, 5 minut: ${numberLabel(data.cpu?.load5)}, 15 minut: ${numberLabel(data.cpu?.load15)}</p>
    </article>
    <article class="cockpit-stat-card">
      <header><h3>Pamięć</h3></header>
      <div class="stat-line"><strong>RAM</strong><span>${bytesLabel(data.memory?.available)} dostępne</span></div>
      ${renderProgress(memoryPercent)}
      <div class="stat-line"><strong>Partycja wymiany</strong><span>${bytesLabel(data.swap?.available)} dostępne</span></div>
      ${renderProgress(swapPercent)}
    </article>
    <article class="cockpit-stat-card">
      <header><h3>Dyski</h3></header>
      ${disks.length ? disks.map((disk) => `
        <div class="disk-row">
          <div class="stat-line"><strong>${escapeHtml(disk.mount)}</strong><span>${bytesLabel(disk.available)} wolne</span></div>
          ${renderProgress(disk.percent)}
        </div>
      `).join("") : `<div class="empty">Brak danych dysków.</div>`}
    </article>
  `;
}

function renderProgress(value) {
  const safeValue = Math.max(0, Math.min(100, Number(value) || 0));
  return `<div class="stat-progress"><span style="width: ${safeValue}%"></span></div>`;
}

function numberLabel(value) {
  return value == null || Number.isNaN(Number(value)) ? "—" : Number(value).toFixed(2);
}

function bytesLabel(value) {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let size = bytes;
  let unit = 0;
  while (size >= 1024 && unit < units.length - 1) {
    size /= 1024;
    unit += 1;
  }
  return `${size >= 10 || unit < 2 ? Math.round(size) : size.toFixed(1).replace(".", ",")} ${units[unit]}`;
}

function percentLabel(value) {
  return value == null ? "—" : `${Math.round(Number(value))}%`;
}

function statusLabel(value) {
  const status = String(value || "unknown").toLowerCase();
  if (["up", "online", "ok", "healthy"].includes(status)) return "Online";
  if (["down", "offline", "error"].includes(status)) return "Offline";
  return value || "Nieznany";
}

function syncSystemStatsPolling() {
  const shouldPoll = document.visibilityState === "visible";
  if (shouldPoll && !state.systemStatsTimer) {
    loadSystemStats();
    loadAlertsSummary();
    state.systemStatsTimer = window.setInterval(() => {
      loadSystemStats();
      loadAlertsSummary();
    }, 15000);
  } else if (!shouldPoll && state.systemStatsTimer) {
    clearInterval(state.systemStatsTimer);
    state.systemStatsTimer = null;
  }
}

function showToast(message) {
  const toast = document.querySelector("#toast");
  toast.textContent = message;
  toast.classList.add("visible");
  setTimeout(() => toast.classList.remove("visible"), 2200);
}

async function init() {
  try {
    await loadDashboardSettings();
    await reloadData();
    appShell();
    await loadThemeSettings();
    loadAlertsSummary();
  } catch (error) {
    document.querySelector("#app").innerHTML = `
      <div class="startup-error">
        <strong>Nie udało się uruchomić Homelab NAS</strong>
        <span>${escapeHtml(error.message)}</span>
      </div>
    `;
  }
}

init();
