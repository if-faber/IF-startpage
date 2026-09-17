// tab-admin-theme.js — Moduł Zakładki „Wygląd Zaplecza” (Edytor CSS Zaplecza z obsługą tła i natychmiastowym Live Preview)

const ADMIN_CSS_MAP = {
  adminThemeAccent: "--accent",
  adminThemeAccentAlt: "--accent-alt",
  adminThemeSurfaceColor: "--surface-color",
  adminThemeBg: "--page-bg",
  adminThemeCardRadius: "--card-radius",
  adminThemeCardGap: "--card-gap",
  adminThemePanelColor: "--admin-panel-rgb",
  adminThemePanelAlpha: "--admin-panel-alpha",
  adminThemeGlassBlur: "--glass-blur",

  // Tło obrazowe
  adminThemeBackgroundImage: "--background-image",
  adminThemeBackgroundDim: "--background-image-dim",
  adminThemeBackgroundBlur: "--background-image-blur",
  adminThemeBackgroundOpacity: "--background-image-opacity",

  // Ustawienia Menu Bocznego Admina
  adminSidebarColor: "--admin-sidebar-rgb",
  adminSidebarAlpha: "--admin-sidebar-alpha",
  adminSidebarWidth: "--admin-sidebar-width",
  adminMenuTextColor: "--admin-menu-text-color",
  adminMenuBtnBg: "--admin-menu-btn-bg",
  adminMenuBtnText: "--admin-menu-btn-text",
  adminMenuBtnActiveBg: "--admin-menu-btn-active-bg",
  adminMenuBtnActiveText: "--admin-menu-btn-active-text",
  adminMenuBtnHoverBg: "--admin-menu-btn-hover-bg",
  adminMenuBtnHoverText: "--admin-menu-btn-hover-text",

  // Przyciski akcji
  adminBtnRadius: "--btn-radius",
  adminBtnGlow: "--btn-glow",
  adminBtnGlowColor: "--btn-glow-color",
  adminBtnBorderWidth: "--btn-border-width",
  adminBtnBorderColor: "--btn-border-color",
  adminBtnNormalBg: "--btn-normal-bg",
  adminBtnNormalText: "--btn-normal-text",
  adminBtnNormalHoverBg: "--btn-normal-hover-bg",
  adminBtnNormalHoverText: "--btn-normal-hover-text",
  adminBtnDangerBg: "--btn-danger-bg",
  adminBtnDangerText: "--btn-danger-text",
  adminBtnDangerHoverBg: "--btn-danger-hover-bg",
  adminBtnDangerHoverText: "--btn-danger-hover-text",
  adminBtnDangerGlowColor: "--btn-danger-glow-color"
};

function renderAdminThemeTab() {
  return `
    <div class="admin-tab-container">
      <section class="admin-section-card">
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; margin-bottom: 8px;">
          <h2 style="margin: 0;">⚙️ Edytor Wyglądu Zaplecza (CSS)</h2>
        </div>
        <p class="settings-note">Niezależne ustawienia wyglądu, tapety tła, kolorów i efektów Glassmorphism dla panelu administracyjnego z natychmiastowym podglądem na żywo.</p>

        <form id="adminAppearanceForm" class="admin-form-panel">
          
          <!-- 1. Stylistyka Ogólna i Karty Zaplecza -->
          <div class="preset-manager-box" style="margin-top: 14px; padding: 18px; border: 1px solid var(--line); border-radius: 14px; background: rgba(255, 255, 255, 0.02);">
            <h4 style="margin-top: 0; margin-bottom: 6px; color: var(--accent);">🎨 1. Stylistyka Ogólna, Tło i Karty Zaplecza</h4>
            <p style="margin: 0 0 14px 0; font-size: 12px; color: var(--muted);">Akcenty, kolorystyka tła, czcionki, tapeta obrazowa oraz parametry szkła paneli i kart.</p>

            <div class="admin-form-grid three-cols">
              <label>Akcent główny Zaplecza<input id="adminThemeAccent" type="color"></label>
              <label>Akcent pomocniczy<input id="adminThemeAccentAlt" type="color"></label>
              <label>Kolor bazowy powierzchni<input id="adminThemeSurfaceColor" type="color"></label>
              
              <label>Czcionka menu Admina<select id="adminThemeFontMenu">${renderFontOptions()}</select></label>
              <label>Czcionka kart Admina<select id="adminThemeFontCard">${renderFontOptions()}</select></label>
              <label>Czcionka opisów Admina<select id="adminThemeFontDescription">${renderFontOptions()}</select></label>
              
              <label>Tło strony Zaplecza<input id="adminThemeBg" type="color"></label>
              <label>Zaokrąglenie kart Admina<input id="adminThemeCardRadius" type="range" min="8" max="34" step="1"><span></span></label>
              <label>Odstęp kart Admina<input id="adminThemeCardGap" type="range" min="8" max="28" step="1"><span></span></label>
              
              <label>Kolor paneli Admina<input id="adminThemePanelColor" type="color"></label>
              <label>Krycie paneli Admina (Glass)<input id="adminThemePanelAlpha" type="range" min="5" max="95" step="1"><span></span></label>
              <label>Rozmycie paneli (Blur)<input id="adminThemeGlassBlur" type="range" min="0" max="60" step="1"><span></span></label>
            </div>

            <!-- Sterowanie Tłem Obrazowym jak na Stronie Głównej -->
            <span style="font-size: 11px; font-weight: bold; display: block; margin: 16px 0 8px; color: var(--accent);">🖼️ Tapeta Obrazowa i Efekty Tła Zaplecza</span>
            <div class="admin-form-grid three-cols">
              <label>Obraz tła
                <select id="adminThemeBackgroundImage">
                  <option value="">Wyłączony (Tylko kolor tła)</option>
                  <option value="default">Domyślne tło MyHome (background.jpg)</option>
                  <option value="custom">Własny upload (plik z dysku)</option>
                </select>
              </label>
              <label>Upload nowego obrazu tła<input id="adminThemeBackgroundUpload" type="file" accept="image/png,image/jpeg,image/webp"></label>
              <label>Przyciemnienie tła (Dim)<input id="adminThemeBackgroundDim" type="range" min="0" max="85" step="1"><span></span></label>
              <label>Rozmycie tła / Blur<input id="adminThemeBackgroundBlur" type="range" min="0" max="40" step="1"><span></span></label>
              <label>Widoczność / Opacity tła<input id="adminThemeBackgroundOpacity" type="range" min="0" max="100" step="1"><span></span></label>
            </div>
          </div>

          <!-- 2. Menu Boczne Zaplecza -->
          <div class="preset-manager-box" style="margin-top: 10px; padding: 18px; border: 1px solid var(--line); border-radius: 14px; background: rgba(255, 255, 255, 0.02);">
            <h4 style="margin-top: 0; margin-bottom: 6px; color: var(--accent);">📑 2. Pasek Boczny i Nawigacja Zaplecza</h4>
            <p style="margin: 0 0 14px 0; font-size: 12px; color: var(--muted);">Dedykowana konfiguracja koloru tła, szerokości oraz przycisków w lewym menu Zaplecza.</p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 16px;">
              <label style="font-size: 11px; display: grid; gap: 2px;">Kolor tła menu Admina<input id="adminSidebarColor" type="color" style="width:100%; height:32px; background: transparent; border: 0; cursor: pointer;"></label>
              <label style="font-size: 11px; display: grid; gap: 2px;">Krycie tła menu Admina<input id="adminSidebarAlpha" type="range" min="5" max="95" step="1"><span></span></label>

              <label style="font-size: 11px; display: grid; gap: 2px;">Kolor czcionki menu<input id="adminMenuTextColor" type="color" style="width:100%; height:32px; background: transparent; border: 0; cursor: pointer;"></label>
              <label style="font-size: 11px; display: grid; gap: 2px;">Szerokość menu Admina<input id="adminSidebarWidth" type="range" min="220" max="380" step="5"><span></span></label>
            </div>

            <span style="font-size: 11px; font-weight: bold; display: block; margin: 12px 0 8px; color: var(--accent);">Styl Przycisków Nawigacji Menu</span>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
              <label style="font-size: 11px;">Tło zwykłe przycisków<input id="adminMenuBtnBg" type="color" style="width:100%; height:28px; background: transparent; border: 0;"></label>
              <label style="font-size: 11px;">Tekst zwykły przycisków<input id="adminMenuBtnText" type="color" style="width:100%; height:28px; background: transparent; border: 0;"></label>
              <label style="font-size: 11px;">Tło aktywnego przycisku<input id="adminMenuBtnActiveBg" type="color" style="width:100%; height:28px; background: transparent; border: 0;"></label>
              <label style="font-size: 11px;">Tekst aktywnego przycisku<input id="adminMenuBtnActiveText" type="color" style="width:100%; height:28px; background: transparent; border: 0;"></label>
              <label style="font-size: 11px;">Tło Hover przycisków<input id="adminMenuBtnHoverBg" type="color" style="width:100%; height:28px; background: transparent; border: 0;"></label>
              <label style="font-size: 11px;">Tekst Hover przycisków<input id="adminMenuBtnHoverText" type="color" style="width:100%; height:28px; background: transparent; border: 0;"></label>
            </div>
          </div>

          <!-- 3. Stylistyka Przycisków Akcji Zaplecza -->
          <div class="preset-manager-box" style="margin-top: 10px; padding: 18px; border: 1px solid var(--line); border-radius: 14px; background: rgba(255, 255, 255, 0.02);">
            <h4 style="margin-top: 0; margin-bottom: 14px; color: var(--accent);">🔘 3. Stylistyka Przycisków Akcji Zaplecza</h4>
            
            <div class="admin-form-grid three-cols" style="margin-bottom: 16px;">
              <label>Zaokrąglenie przycisków<input id="adminBtnRadius" type="range" min="0" max="30" step="1"><span></span></label>
              <label>Grubość ramki przycisków<input id="adminBtnBorderWidth" type="range" min="0" max="4" step="1"><span></span></label>
              <label>Kolor ramki przycisków<input id="adminBtnBorderColor" type="color"></label>
              
              <label>Wielkość poświaty/cienia<input id="adminBtnGlow" type="range" min="0" max="30" step="1"><span></span></label>
              <label>Kolor poświaty Primary<input id="adminBtnGlowColor" type="color"></label>
              <label>Kolor poświaty Danger<input id="adminBtnDangerGlowColor" type="color"></label>
            </div>

            <div class="admin-form-grid" style="grid-template-columns: 1fr 1fr; gap: 18px; align-items: start;">
              <!-- Przycisk Zwykły (Primary) -->
              <div style="padding: 14px; border: 1px solid var(--line); border-radius: 10px; background: rgba(0,0,0,0.12);">
                <h5 style="margin: 0 0 10px 0; font-size: 13px;">Przycisk Główny (Primary)</h5>
                <div style="margin-bottom: 12px; display: flex; justify-content: center; align-items: center; min-height: 48px;">
                  <button type="button" id="previewBtnNormal" class="button primary" style="padding: 10px 20px; font-size: 13px; font-weight: bold; cursor: pointer;">💾 Przykładowy Primary</button>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                  <label style="font-size: 11px;">Tło zwykłe<input id="adminBtnNormalBg" type="color"></label>
                  <label style="font-size: 11px;">Tekst zwykły<input id="adminBtnNormalText" type="color"></label>
                  <label style="font-size: 11px;">Tło Hover<input id="adminBtnNormalHoverBg" type="color"></label>
                  <label style="font-size: 11px;">Tekst Hover<input id="adminBtnNormalHoverText" type="color"></label>
                </div>
              </div>

              <!-- Przycisk Danger -->
              <div style="padding: 14px; border: 1px solid rgba(220, 38, 38, 0.4); border-radius: 10px; background: rgba(220, 38, 38, 0.05);">
                <h5 style="margin: 0 0 10px 0; font-size: 13px; color: #ff6b6b;">⚠️ Przycisk Niebezpieczny (Danger)</h5>
                <div style="margin-bottom: 12px; display: flex; justify-content: center; align-items: center; min-height: 48px;">
                  <button type="button" id="previewBtnDanger" class="button danger" style="padding: 10px 20px; font-size: 13px; font-weight: bold; cursor: pointer;">🗑️ Przykładowy Danger</button>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                  <label style="font-size: 11px;">Tło zwykłe<input id="adminBtnDangerBg" type="color"></label>
                  <label style="font-size: 11px;">Tekst zwykły<input id="adminBtnDangerText" type="color"></label>
                  <label style="font-size: 11px;">Tło Hover<input id="adminBtnDangerHoverBg" type="color"></label>
                  <label style="font-size: 11px;">Tekst Hover<input id="adminBtnDangerHoverText" type="color"></label>
                </div>
              </div>
            </div>
          </div>

          <menu style="margin-top: 18px; display: flex; justify-content: flex-end; gap: 12px;">
            <button id="resetAdminAppearance" class="button danger" type="button">Przywróć domyślne Zaplecza</button>
            <button class="button primary" type="submit">💾 Zapisz motyw Zaplecza</button>
          </menu>
        </form>
      </section>
    </div>
  `;
}

function populateAdminAppearanceForm(t) {
  if (!t) t = {};
  if (t.saveTheme?.themeSettings) t = t.saveTheme.themeSettings;
  if (t.themeSettings) t = t.themeSettings;
  if (t.theme) t = t.theme;

  const setVal = (id, val) => {
    const el = document.querySelector(`#${id}`);
    if (el) {
      el.value = val;
      if (typeof updateRangeValue === "function") updateRangeValue(el);
    }
  };

  setVal("adminThemeAccent", t.accent || "#54ffb2");
  setVal("adminThemeAccentAlt", t.accentAlt || "#3390ff");
  setVal("adminThemeSurfaceColor", t.surfaceColor || "#0e181d");
  setVal("adminThemeFontMenu", t.fontMenu || "Inter");
  setVal("adminThemeFontCard", t.fontCard || "Inter");
  setVal("adminThemeFontDescription", t.fontDescription || "Inter");
  setVal("adminThemeBg", t.bg || "#071014");
  setVal("adminThemeCardRadius", parseInt(t.cardRadius) || 16);
  setVal("adminThemeCardGap", parseInt(t.cardGap) || 14);
  setVal("adminThemePanelColor", t.panelColor || "#ffffff");
  setVal("adminThemePanelAlpha", Math.round(Number(t.panelAlpha || 0.85) * 100));
  setVal("adminThemeGlassBlur", parseInt(t.glassBlur) || 12);

  // Tło obrazowe
  setVal("adminThemeBackgroundImage", t.backgroundImage || "");
  setVal("adminThemeBackgroundDim", Math.round(Number(t.backgroundDim ?? 0.34) * 100));
  setVal("adminThemeBackgroundBlur", parseInt(t.backgroundBlur ?? 10, 10));
  setVal("adminThemeBackgroundOpacity", Math.round(Number(t.backgroundOpacity ?? 0.55) * 100));
  const uploadInput = document.querySelector("#adminThemeBackgroundUpload");
  if (uploadInput) uploadInput.value = "";

  // Menu Boczna Zaplecza
  setVal("adminSidebarColor", t.sidebarColor || "#0d171c");
  setVal("adminSidebarAlpha", Math.round(Number(t.sidebarAlpha || 0.85) * 100));
  setVal("adminMenuTextColor", t.menuTextColor || "#94a3b8");
  setVal("adminSidebarWidth", parseInt(t.sidebarWidth) || 280);

  setVal("adminMenuBtnBg", t.menuBtnBg || "#0d171c");
  setVal("adminMenuBtnText", t.menuBtnText || "#94a3b8");
  setVal("adminMenuBtnActiveBg", t.menuBtnActiveBg || "#54ffb2");
  setVal("adminMenuBtnActiveText", t.menuBtnActiveText || "#071014");
  setVal("adminMenuBtnHoverBg", t.menuBtnHoverBg || "#16242c");
  setVal("adminMenuBtnHoverText", t.menuBtnHoverText || "#54ffb2");

  // Przycisk Zwykły
  setVal("adminBtnNormalBg", t.btnNormalBg || "#54ffb2");
  setVal("adminBtnNormalText", t.btnNormalText || "#071014");
  setVal("adminBtnNormalHoverBg", t.btnNormalHoverBg || "#3ce89f");
  setVal("adminBtnNormalHoverText", t.btnNormalHoverText || "#071014");

  // Przycisk Danger
  setVal("adminBtnDangerBg", t.btnDangerBg || "#dc2626");
  setVal("adminBtnDangerText", t.btnDangerText || "#ffffff");
  setVal("adminBtnDangerHoverBg", t.btnDangerHoverBg || "#b91c1c");
  setVal("adminBtnDangerHoverText", t.btnDangerHoverText || "#ffffff");

  // Cechy ogólne przycisków
  setVal("adminBtnRadius", parseInt(t.btnRadius) || 12);
  setVal("adminBtnGlow", parseInt(t.btnGlow) || 10);
  setVal("adminBtnGlowColor", t.btnGlowColor || "#54ffb2");
  setVal("adminBtnDangerGlowColor", t.btnDangerGlowColor || "#dc2626");
  setVal("adminBtnBorderWidth", parseInt(t.btnBorderWidth) || 1);
  setVal("adminBtnBorderColor", t.btnBorderColor || "rgba(255,255,255,0.15)");

  updateAdminButtonPreviews();
}

function updateAdminButtonPreviews() {
  const normalBg = document.querySelector("#adminBtnNormalBg")?.value || "#54ffb2";
  const normalText = document.querySelector("#adminBtnNormalText")?.value || "#071014";
  const normalHoverBg = document.querySelector("#adminBtnNormalHoverBg")?.value || "#3ce89f";
  const normalHoverText = document.querySelector("#adminBtnNormalHoverText")?.value || "#071014";

  const dangerBg = document.querySelector("#adminBtnDangerBg")?.value || "#dc2626";
  const dangerText = document.querySelector("#adminBtnDangerText")?.value || "#ffffff";
  const dangerHoverBg = document.querySelector("#adminBtnDangerHoverBg")?.value || "#b91c1c";
  const dangerHoverText = document.querySelector("#adminBtnDangerHoverText")?.value || "#ffffff";

  const radius = `${document.querySelector("#adminBtnRadius")?.value || 12}px`;
  const glow = `${document.querySelector("#adminBtnGlow")?.value || 10}px`;
  const glowColor = document.querySelector("#adminBtnGlowColor")?.value || "#54ffb2";
  const dangerGlowColor = document.querySelector("#adminBtnDangerGlowColor")?.value || "#dc2626";
  const borderWidth = `${document.querySelector("#adminBtnBorderWidth")?.value || 1}px`;
  const borderColor = document.querySelector("#adminBtnBorderColor")?.value || "rgba(255,255,255,0.15)";
  const fontCard = document.querySelector("#adminThemeFontCard")?.value || "Inter";

  const btnNormal = document.querySelector("#previewBtnNormal");
  if (btnNormal) {
    btnNormal.style.setProperty("background", normalBg, "important");
    btnNormal.style.setProperty("background-color", normalBg, "important");
    btnNormal.style.setProperty("color", normalText, "important");
    btnNormal.style.setProperty("border-radius", radius, "important");
    btnNormal.style.setProperty("font-family", fontCard, "important");
    btnNormal.style.setProperty("border", `${borderWidth} solid ${borderColor}`, "important");
    btnNormal.style.setProperty("box-shadow", `0 4px ${glow} ${glowColor}66`, "important");
    
    btnNormal.onmouseenter = () => {
      btnNormal.style.setProperty("background", normalHoverBg, "important");
      btnNormal.style.setProperty("background-color", normalHoverBg, "important");
      btnNormal.style.setProperty("color", normalHoverText, "important");
    };
    btnNormal.onmouseleave = () => {
      btnNormal.style.setProperty("background", normalBg, "important");
      btnNormal.style.setProperty("background-color", normalBg, "important");
      btnNormal.style.setProperty("color", normalText, "important");
    };
  }

  const btnDanger = document.querySelector("#previewBtnDanger");
  if (btnDanger) {
    btnDanger.style.setProperty("background", dangerBg, "important");
    btnDanger.style.setProperty("background-color", dangerBg, "important");
    btnDanger.style.setProperty("color", dangerText, "important");
    btnDanger.style.setProperty("border-radius", radius, "important");
    btnDanger.style.setProperty("font-family", fontCard, "important");
    btnDanger.style.setProperty("border", `${borderWidth} solid ${borderColor}`, "important");
    btnDanger.style.setProperty("box-shadow", `0 4px ${glow} ${dangerGlowColor}66`, "important");

    btnDanger.onmouseenter = () => {
      btnDanger.style.setProperty("background", dangerHoverBg, "important");
      btnDanger.style.setProperty("background-color", dangerHoverBg, "important");
      btnDanger.style.setProperty("color", dangerHoverText, "important");
    };
    btnDanger.onmouseleave = () => {
      btnDanger.style.setProperty("background", dangerBg, "important");
      btnDanger.style.setProperty("background-color", dangerBg, "important");
      btnDanger.style.setProperty("color", dangerText, "important");
    };
  }
}

function bindAdminThemeEvents() {
  const adminForm = document.querySelector("#adminAppearanceForm");
  if (adminForm) {
    const applyLive = (e) => {
      if (e && e.target && typeof updateRangeValue === "function") {
        updateRangeValue(e.target);
      }
      const current = collectAdminTheme();
      applyAdminThemeStyles(current);
      updateAdminButtonPreviews();
    };

    adminForm.addEventListener("input", applyLive);
    adminForm.addEventListener("change", applyLive);

    const uploadInput = document.querySelector("#adminThemeBackgroundUpload");
    if (uploadInput) {
      uploadInput.addEventListener("change", async () => {
        if (uploadInput.files && uploadInput.files[0]) {
          try {
            const dataUrl = await fileToDataUrl(uploadInput.files[0]);
            const bgSelect = document.querySelector("#adminThemeBackgroundImage");
            if (bgSelect) bgSelect.value = "custom";
            if (!state.adminTheme) state.adminTheme = {};
            state.adminTheme.backgroundImageDataUrl = dataUrl;
            state.adminTheme.backgroundImage = "custom";
            
            const current = collectAdminTheme();
            current.backgroundImage = "custom";
            current.backgroundImageDataUrl = dataUrl;
            applyAdminThemeStyles(current);
          } catch (err) {
            console.error("Błąd odczytu pliku tła:", err);
          }
        }
      });
    }
  }

  document.querySelector("#adminAppearanceForm")?.addEventListener("submit", saveAdminAppearance);
  document.querySelector("#resetAdminAppearance")?.addEventListener("click", resetAdminAppearance);

  // Pierwsze załadowanie wartości do formularza
  populateAdminAppearanceForm(state.adminTheme || {});
}

function collectAdminTheme() {
  return {
    accent: document.querySelector("#adminThemeAccent")?.value || "#54ffb2",
    accentAlt: document.querySelector("#adminThemeAccentAlt")?.value || "#3390ff",
    surfaceColor: document.querySelector("#adminThemeSurfaceColor")?.value || "#0e181d",
    fontMenu: document.querySelector("#adminThemeFontMenu")?.value || "Inter",
    fontCard: document.querySelector("#adminThemeFontCard")?.value || "Inter",
    fontDescription: document.querySelector("#adminThemeFontDescription")?.value || "Inter",
    bg: document.querySelector("#adminThemeBg")?.value || "#071014",
    cardRadius: `${document.querySelector("#adminThemeCardRadius")?.value || 16}px`,
    cardGap: `${document.querySelector("#adminThemeCardGap")?.value || 14}px`,
    panelColor: document.querySelector("#adminThemePanelColor")?.value || "#ffffff",
    panelAlpha: String(Number(document.querySelector("#adminThemePanelAlpha")?.value || 85) / 100),
    glassBlur: `${document.querySelector("#adminThemeGlassBlur")?.value || 12}px`,

    // Tło obrazowe
    backgroundImage: document.querySelector("#adminThemeBackgroundImage")?.value || "",
    backgroundDim: String(Number(document.querySelector("#adminThemeBackgroundDim")?.value || 34) / 100),
    backgroundBlur: `${document.querySelector("#adminThemeBackgroundBlur")?.value || 10}px`,
    backgroundOpacity: String(Number(document.querySelector("#adminThemeBackgroundOpacity")?.value || 55) / 100),
    backgroundUrl: state.adminTheme?.backgroundUrl || "",
    backgroundImageDataUrl: state.adminTheme?.backgroundImageDataUrl || "",

    sidebarColor: document.querySelector("#adminSidebarColor")?.value || "#0d171c",
    sidebarAlpha: String(Number(document.querySelector("#adminSidebarAlpha")?.value || 85) / 100),
    menuTextColor: document.querySelector("#adminMenuTextColor")?.value || "#94a3b8",
    sidebarWidth: `${document.querySelector("#adminSidebarWidth")?.value || 280}px`,
    menuBtnBg: document.querySelector("#adminMenuBtnBg")?.value || "#0d171c",
    menuBtnText: document.querySelector("#adminMenuBtnText")?.value || "#94a3b8",
    menuBtnActiveBg: document.querySelector("#adminMenuBtnActiveBg")?.value || "#54ffb2",
    menuBtnActiveText: document.querySelector("#adminMenuBtnActiveText")?.value || "#071014",
    menuBtnHoverBg: document.querySelector("#adminMenuBtnHoverBg")?.value || "#16242c",
    menuBtnHoverText: document.querySelector("#adminMenuBtnHoverText")?.value || "#54ffb2",

    btnNormalBg: document.querySelector("#adminBtnNormalBg")?.value || "#54ffb2",
    btnNormalText: document.querySelector("#adminBtnNormalText")?.value || "#071014",
    btnNormalHoverBg: document.querySelector("#adminBtnNormalHoverBg")?.value || "#3ce89f",
    btnNormalHoverText: document.querySelector("#adminBtnNormalHoverText")?.value || "#071014",

    btnDangerBg: document.querySelector("#adminBtnDangerBg")?.value || "#dc2626",
    btnDangerText: document.querySelector("#adminBtnDangerText")?.value || "#ffffff",
    btnDangerHoverBg: document.querySelector("#adminBtnDangerHoverBg")?.value || "#b91c1c",
    btnDangerHoverText: document.querySelector("#adminBtnDangerHoverText")?.value || "#ffffff",

    btnRadius: `${document.querySelector("#adminBtnRadius")?.value || 12}px`,
    btnGlow: `${document.querySelector("#adminBtnGlow")?.value || 10}px`,
    btnGlowColor: document.querySelector("#adminBtnGlowColor")?.value || "#54ffb2",
    btnDangerGlowColor: document.querySelector("#adminBtnDangerGlowColor")?.value || "#dc2626",
    btnBorderWidth: `${document.querySelector("#adminBtnBorderWidth")?.value || 1}px`,
    btnBorderColor: document.querySelector("#adminBtnBorderColor")?.value || "rgba(255,255,255,0.15)"
  };
}

async function saveAdminAppearance(e) {
  e.preventDefault();
  try {
    const themeSettings = collectAdminTheme();
    const backgroundData = state.adminTheme?.backgroundImageDataUrl || null;

    const data = await request("/api/admin/theme", {
      method: "PUT",
      body: JSON.stringify({
        themeSettings,
        backgroundData
      })
    });

    state.adminTheme = data.theme || themeSettings;
    applyAdminThemeStyles(state.adminTheme);
    showToast("Zapisano motyw i tło Zaplecza 💾");
  } catch (error) {
    showToast(error.message);
  }
}

async function resetAdminAppearance() {
  if (!confirm("Czy na pewno chcesz zresetować motyw Zaplecza do domyślnego?")) return;
  try {
    const data = await request("/api/admin/theme", {
      method: "PUT",
      body: JSON.stringify({ reset: true })
    });
    state.adminTheme = data.theme || {};
    applyAdminThemeStyles(data.theme);
    populateAdminAppearanceForm(data.theme);
    showToast("Motyw Zaplecza zresetowany do domyślnego.");
  } catch (error) {
    showToast(error.message);
  }
}

function applyAdminThemeStyles(theme) {
  const root = document.body || document.documentElement;

  if (theme && typeof theme === "object") {
    if (theme.saveTheme?.themeSettings) theme = theme.saveTheme.themeSettings;
    if (theme.themeSettings) theme = theme.themeSettings;
    if (theme.theme) theme = theme.theme;

    if (theme.accent) {
      root.style.setProperty("--accent", theme.accent);
      root.style.setProperty("--accent-soft", `color-mix(in srgb, ${theme.accent} 16%, transparent)`);
      root.style.setProperty("--glow-start", `color-mix(in srgb, ${theme.accent} 12%, transparent)`);
    }
    if (theme.accentAlt) {
      root.style.setProperty("--accent-alt", theme.accentAlt);
      root.style.setProperty("--glow-end", `color-mix(in srgb, ${theme.accentAlt} 10%, transparent)`);
    }
    if (theme.surfaceColor) {
      root.style.setProperty("--surface-color", theme.surfaceColor);
      root.style.setProperty("--surface-base-rgb", hexToRgbChannels(theme.surfaceColor));
      root.style.setProperty("--tile-panel-rgb", hexToRgbChannels(theme.surfaceColor));
    }
    if (theme.bg) {
      root.style.setProperty("--page-bg", theme.bg);
    }
    if (theme.fontMenu) root.style.setProperty("--font-menu", fontStack(theme.fontMenu));
    if (theme.fontCard) root.style.setProperty("--font-card", fontStack(theme.fontCard));
    if (theme.fontDescription) root.style.setProperty("--font-description", fontStack(theme.fontDescription));
    if (theme.cardRadius) root.style.setProperty("--card-radius", theme.cardRadius);
    if (theme.cardGap) root.style.setProperty("--card-gap", theme.cardGap);
    if (theme.panelColor) root.style.setProperty("--admin-panel-rgb", hexToRgbChannels(theme.panelColor));
    if (theme.panelAlpha) root.style.setProperty("--admin-panel-alpha", theme.panelAlpha);
    if (theme.glassBlur) root.style.setProperty("--glass-blur", theme.glassBlur);

    // Tło obrazowe
    let backgroundUrl = "/images/background.jpg";
    if (theme.backgroundImageDataUrl) {
      backgroundUrl = theme.backgroundImageDataUrl;
    } else if (theme.backgroundImage === "custom") {
      backgroundUrl = theme.backgroundUrl || "/images/background-admin-custom.jpg";
      if (backgroundUrl.startsWith("./")) backgroundUrl = "/" + backgroundUrl.slice(2);
      if (backgroundUrl.startsWith("../../")) backgroundUrl = "/" + backgroundUrl.slice(6);
    } else if (theme.backgroundImage === "default") {
      backgroundUrl = "/images/background.jpg";
    }

    const hasBackgroundImage = ["default", "custom"].includes(theme.backgroundImage) || Boolean(theme.backgroundImageDataUrl);
    root.style.setProperty("--background-image", hasBackgroundImage ? `url("${backgroundUrl}")` : "none");
    root.style.setProperty("--background-image-opacity", hasBackgroundImage ? (theme.backgroundOpacity || "0.55") : "0");
    root.style.setProperty("--background-image-blur", hasBackgroundImage ? (theme.backgroundBlur || "10px") : "0px");
    root.style.setProperty("--background-image-dim", hasBackgroundImage ? (theme.backgroundDim || "0.34") : "0");

    // Sidebar & Menu
    if (theme.sidebarColor) root.style.setProperty("--admin-sidebar-rgb", hexToRgbChannels(theme.sidebarColor));
    if (theme.sidebarAlpha) root.style.setProperty("--admin-sidebar-alpha", theme.sidebarAlpha);
    if (theme.sidebarWidth) root.style.setProperty("--admin-sidebar-width", theme.sidebarWidth);
    if (theme.menuTextColor) root.style.setProperty("--admin-menu-text-color", theme.menuTextColor);
    if (theme.menuBtnBg) root.style.setProperty("--admin-menu-btn-bg", theme.menuBtnBg);
    if (theme.menuBtnText) root.style.setProperty("--admin-menu-btn-text", theme.menuBtnText);
    if (theme.menuBtnActiveBg) root.style.setProperty("--admin-menu-btn-active-bg", theme.menuBtnActiveBg);
    if (theme.menuBtnActiveText) root.style.setProperty("--admin-menu-btn-active-text", theme.menuBtnActiveText);
    if (theme.menuBtnHoverBg) root.style.setProperty("--admin-menu-btn-hover-bg", theme.menuBtnHoverBg);
    if (theme.menuBtnHoverText) root.style.setProperty("--admin-menu-btn-hover-text", theme.menuBtnHoverText);

    // Przyciski
    if (theme.btnNormalBg) root.style.setProperty("--btn-normal-bg", theme.btnNormalBg);
    if (theme.btnNormalText) root.style.setProperty("--btn-normal-text", theme.btnNormalText);
    if (theme.btnNormalHoverBg) root.style.setProperty("--btn-normal-hover-bg", theme.btnNormalHoverBg);
    if (theme.btnDangerBg) root.style.setProperty("--btn-danger-bg", theme.btnDangerBg);
    if (theme.btnDangerText) root.style.setProperty("--btn-danger-text", theme.btnDangerText);
    if (theme.btnDangerHoverBg) root.style.setProperty("--btn-danger-hover-bg", theme.btnDangerHoverBg);
    if (theme.btnRadius) root.style.setProperty("--btn-radius", theme.btnRadius);
    if (theme.btnGlow) root.style.setProperty("--btn-glow", theme.btnGlow);
    if (theme.btnGlowColor) root.style.setProperty("--btn-glow-color", theme.btnGlowColor);
    if (theme.btnDangerGlowColor) root.style.setProperty("--btn-danger-glow-color", theme.btnDangerGlowColor);
    if (theme.btnBorderWidth) root.style.setProperty("--btn-border-width", theme.btnBorderWidth);
    if (theme.btnBorderColor) root.style.setProperty("--btn-border-color", theme.btnBorderColor);

    // Ujednolicone zmienne Modali z motywu MyHome
    const modalSource = (typeof state !== "undefined" && state && state.theme) ? state.theme : theme;
    if (modalSource) {
      if (modalSource.modalBg) root.style.setProperty("--modal-bg-rgb", hexToRgbChannels(modalSource.modalBg));
      if (modalSource.modalAlpha) root.style.setProperty("--modal-alpha", modalSource.modalAlpha);
      if (modalSource.modalGlassBlur) root.style.setProperty("--modal-glass-blur", String(modalSource.modalGlassBlur).endsWith("px") ? modalSource.modalGlassBlur : `${modalSource.modalGlassBlur}px`);
      if (modalSource.modalBackdropBlur) root.style.setProperty("--modal-backdrop-blur", String(modalSource.modalBackdropBlur).endsWith("px") ? modalSource.modalBackdropBlur : `${modalSource.modalBackdropBlur}px`);
      if (modalSource.modalBackdropAlpha) root.style.setProperty("--modal-backdrop-alpha", modalSource.modalBackdropAlpha);
      if (modalSource.modalRadius) root.style.setProperty("--modal-radius", String(modalSource.modalRadius).endsWith("px") ? modalSource.modalRadius : `${modalSource.modalRadius}px`);
    }
  }
}
