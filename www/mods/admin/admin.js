// admin.js — Główne Zaplecze Administracyjne MyHome (Router i Inicjalizacja: mods/admin)

const state = {
  adminPin: null,
  activeTab: "helper", // helper, alerts, homepage, modules, kiosk, updates, admin-theme
  theme: {},
  settings: {},

  // Admin Theme State (Uproszczony - pojedynczy motyw)
  adminTheme: {}
};

window.state = state;

const TAB_IDS = ["helper", "alerts", "live", "homepage", "modules", "kiosk", "updates", "admin-theme"];

// Zakładki-moduły dostępne wyłącznie przez hub "Moduły" (tab-modules.js) —
// nie mają własnego przycisku w sidebarze, więc podświetlają przycisk "tab-modules".
const MODULE_SUBTAB_IDS = ["kiosk"];

// Tab Switching Router
function switchTab(tabId) {
  // Zakładki mogą uruchamiać własne odpytywanie na żywo (np. Statystyki Live);
  // sprzątamy po poprzedniej zakładce, zanim podmienimy #tabContent.
  if (typeof window.__activeTabCleanup === "function") {
    window.__activeTabCleanup();
  }
  window.__activeTabCleanup = null;

  state.activeTab = tabId;
  sessionStorage.setItem("homedash.admin.activeTab", tabId);

  const activeNavId = MODULE_SUBTAB_IDS.includes(tabId) ? "modules" : tabId;
  TAB_IDS.forEach((id) => {
    const btn = document.querySelector(`#tab-${id}`);
    if (btn) btn.classList.toggle("active", id === activeNavId);
  });

  const content = document.querySelector("#tabContent");
  const title = document.querySelector("#tabTitle");

  if (tabId === "helper") {
    title.textContent = "⚙️ Helper & Ustawienia Ogólne";
    content.innerHTML = renderHelperTab();
    bindHelperEvents();
  } else if (tabId === "alerts") {
    title.textContent = "🔔 Centrum Alertów & Diagnostyka";
    content.innerHTML = renderAlertsTab();
    bindAlertsEvents();
  } else if (tabId === "live") {
    title.textContent = "📊 Statystyki Live";
    content.innerHTML = renderLiveTab();
    bindLiveEvents();
  } else if (tabId === "homepage") {
    title.textContent = "🏠 Homepage — Ustawienia i Sekcje";
    content.innerHTML = renderHomepageTab();
    bindHomepageEvents();
  } else if (tabId === "modules") {
    title.textContent = "🧩 Moduły";
    content.innerHTML = renderModulesHubTab();
    bindModulesHubEvents();
  } else if (tabId === "kiosk") {
    title.textContent = "🖥️ Kiosk Serwera — Ustawienia i Wygląd";
    content.innerHTML = renderKioskTab();
    bindKioskEvents();
  } else if (tabId === "updates") {
    title.textContent = "📦 Aktualizacje Systemu & Docker";
    content.innerHTML = renderUpdatesTab();
    bindUpdatesEvents();
  } else if (tabId === "admin-theme") {
    title.textContent = "⚙️ Wygląd Zaplecza";
    content.innerHTML = renderAdminThemeTab();
    bindAdminThemeEvents();
  }
}

function init() {
  const pinInput = document.querySelector("#adminPinInput");
  if (pinInput) {
    pinInput.value = "";
  }

  document.querySelector("#adminPinForm")?.addEventListener("submit", unlockAdmin);

  TAB_IDS.forEach((id) => {
    document.querySelector(`#tab-${id}`)?.addEventListener("click", () => switchTab(id));
  });

  // Globalna obsługa zamykania modali
  document.querySelectorAll("[data-close]").forEach((btn) => {
    btn.addEventListener("click", () => {
      btn.closest("dialog")?.close();
    });
  });

  document.querySelectorAll("dialog").forEach((dialog) => {
    dialog.addEventListener("click", (e) => {
      if (e.target === dialog) dialog.close();
    });
  });

  // Obsługa bezpośredniego przejścia z URL np. ?tab=alerts lub #alerts
  const urlParams = new URLSearchParams(window.location.search);
  const requestedTab = urlParams.get("tab") || window.location.hash.replace("#", "");
  if (requestedTab && TAB_IDS.includes(requestedTab)) {
    state.activeTab = requestedTab;
    sessionStorage.setItem("homedash.admin.activeTab", requestedTab);
  }

  // Wczytanie motywu dla spójnego wyglądu ekranu blokady i modali
  Promise.all([
    request("/api/dashboard/theme").catch(() => ({ theme: {} })),
    request("/api/admin/theme").catch(() => ({ theme: {} }))
  ]).then(([themeData, adminThemeData]) => {
    state.theme = themeData.theme || {};
    state.adminTheme = adminThemeData.theme || {};
    if (typeof applyAdminThemeStyles === "function") {
      applyAdminThemeStyles(state.adminTheme);
    }
  }).catch(() => {});

  if (typeof autoUnlockIfStored === "function") {
    autoUnlockIfStored();
  }
}

window.addEventListener("DOMContentLoaded", init);
