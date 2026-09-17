// tab-helper.js — Moduł Zakładki „Helper & System” (mods/admin)

function renderHelperTab() {
  const config = state.settings || {};
  return `
    <div class="admin-tab-container">
      <section class="admin-section-card">
        <h2>⚙️ Ustawienia Ogólne Systemu</h2>
        <form id="settingsForm" class="admin-form-panel">
          <div class="admin-form-grid">
            <label>Nazwa serwera<input id="settingTitle" value="${escapeHtml(config.title ?? "")}" required></label>
            <label>Opis / Podtytuł<input id="settingSubtitle" value="${escapeHtml(config.subtitle ?? "")}" required></label>
            <label>Adres helpera API<input id="settingApiUrl" value="${escapeHtml(config.apiUrl ?? "")}" required></label>
            <label>Domyślny host<input id="settingDefaultHost" value="${escapeHtml(config.defaultHost ?? "")}" required></label>
            <label>Nowy PIN administratora<input id="settingNewPin" type="password" inputmode="numeric" placeholder="Pozostaw puste = bez zmian"></label>
            <label>Upload logo (PNG/JPG)<input id="settingLogo" type="file" accept="image/png,image/jpeg,image/webp"></label>
          </div>
          <menu style="margin-top: 15px;">
            <button class="button primary" type="submit">💾 Zapisz Ustawienia Ogólne</button>
          </menu>
        </form>
      </section>
    </div>
  `;
}

function bindHelperEvents() {
  document.querySelector("#settingsForm")?.addEventListener("submit", saveSettings);
}

async function saveSettings(e) {
  e.preventDefault();
  const settings = {
    title: document.querySelector("#settingTitle").value.trim(),
    subtitle: document.querySelector("#settingSubtitle").value.trim(),
    apiUrl: document.querySelector("#settingApiUrl").value.trim(),
    defaultHost: document.querySelector("#settingDefaultHost").value.trim(),
    logo: state.settings.logo,
    newPin: document.querySelector("#settingNewPin").value.trim()
  };

  const logoFile = document.querySelector("#settingLogo").files[0];
  if (logoFile) {
    settings.logoData = await fileToDataUrl(logoFile);
  }

  try {
    const data = await request("/api/dashboard/settings", {
      method: "PUT",
      body: JSON.stringify(settings)
    });
    state.settings = data.settings || settings;
    showToast("Ustawienia Ogólne zostały zapisane.");
  } catch (error) {
    showToast(error.message);
  }
}
