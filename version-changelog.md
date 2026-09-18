# 📋 Version & Changelog — IF-startpage (version-changelog.md)

Ten plik jest rejestrem wersji i historii zmian dla projektu **IF-startpage** (robocza nazwa podczas wydzielania: „Homepage”) — samodzielnej, lekkiej strony startowej domowego serwera (Strona Główna + Zaplecze z funkcjami systemowymi + Kiosk Serwera), wydzielonej z projektu `myhome` 2026-09-17. Pełna historia sprzed wydzielenia (moduły rodzinne — Karteczki, Homedocs — oraz starsze wersje 0.1.0–0.4.2) pozostaje w `Projekty/MyHome/version-changelog.md`, ponieważ dotyczy innego, rozszerzonego produktu.

---

## 📌 Instrukcja i Format Wpisu w Nagłówku

Przed zbudowaniem nowego obrazu Docker agent ma obowiązek wpisać nową wersję na górze sekcji wydań według poniższego wzorca:

```markdown
### 🏷️ [vX.Y.Z] — YYYY-MM-DD (Nazwa Modułu / Etapu)
- **Moduł:** [Homepage / Zaplecze / Kiosk / Ogólny]
- **Opis zmian:** Zwięzłe podsumowanie dodanych funkcji, zmian w UI i naprawionych błędów.
- **Autor / Commit:** Autor zmiany oraz identyfikator komitu / rewizji.
```

---

### 🏷️ [v0.1.3] — 2026-09-18 (Usunięcie modala diagnostyki — panel/zakładka jedynym miejscem)
- **Moduł:** Moduł Top (`www/mods/top/top.js`, `top.css`) / Homepage (`www/app.js`)
- **Opis zmian:**
  - Całkowicie usunięty kod modala diagnostyki (`<dialog>`, `ensureModal()`, `openTopModal()`/`closeTopModal()`, style `.top-dialog`/`.top-modal-panel`) — pierwotna intencja („zamiast modala zakładka") wymagała pełnego zastąpienia, nie dodania akordeonu obok modala.
  - Kliknięcie widżetu CPU/RAM/Temp w nagłówku nie otwiera już modala — przenosi na widok Status Serwera i rozwija panel „Szczegółowa Diagnostyka (Top)" (ten sam akordeon, co na Statusie Serwera).
  - Diagnostyka Top występuje odtąd wyłącznie jako panel inline: akordeon na Statusie Serwera i karta „Statystyki Live" w Zapleczu (obie z v0.1.2) — nigdy jako popup.
- **Status:** 🟡 Kod gotowy, obraz jeszcze nie zbudowany ani nie wypchnięty do rejestru Gitea.
- **Autor / Commit:** Claude (Cowork), 2026-09-18, na wyraźne polecenie użytkownika.

### 🏷️ [v0.1.2] — 2026-09-17 (Status Serwera: alerty + diagnostyka live, naprawa CSS przycisku)
- **Moduł:** Homepage (`www/app.js`, `www/styles.css`) / Moduł Top (`www/mods/top/`) / Zaplecze Administratora (`www/mods/admin/`)
- **Opis zmian:**
  - Naprawiony przycisk „Odśwież” na widoku Status Serwera — miał klasę `class="button"`, która nie istnieje w szablonie strony głównej (istnieje tylko w Zapleczu), więc renderował się bez żadnego stylu.
  - Usunięta karta „Skróty: Narzędzia i Zaplecze” ze Statusu Serwera — Zaplecze Administratora i Edytor Wyglądu są już dostępne przez ikonki w stopce sidebaru, więc dublowały nawigację.
  - Dodana karta „🔔 Centrum Alertów” bezpośrednio pod „Statystykami systemu” na Statusie Serwera — ten sam feed co dotychczasowy szybki podgląd alertów, ale widoczny bez klikania.
  - „Szczegółowa Diagnostyka (Top)” przeniesiona z modala do rozwijanego panelu (akordeon) pod Statusem Serwera — domyślnie zwinięty, dane pobierane tylko gdy panel jest rozwinięty.
  - Silnik diagnostyki Top (`mods/top/top.js`) przerobiony na reużywalny (`window.TopDiagnostics.mount()`) — ten sam kod obsługuje teraz modal (widżet CPU/RAM/Temp w nagłówku), akordeon na Statusie Serwera i nową kartę w Zapleczu, każdy z własnym, niezależnym cyklem odpytywania.
  - Nowa zakładka „📊 Statystyki Live” w Zapleczu Administracyjnym (`mods/admin/tab-live.js`) — pełna diagnostyka Top jako osobna karta w sidebarze.
  - Usunięta martwa klasa CSS `.tuning-list` (bez odwołań po usunięciu Skrótów).
- **Autor / Commit:** Claude (Cowork), 2026-09-17, na wyraźne polecenie użytkownika.

### 🏷️ [v0.1.0] — 2026-09-17 (Pierwsze wydanie Homepage jako samodzielnego projektu)
- **Moduł:** Ogólny / Kiosk (`www/kiosk/`) / Zaplecze Administratora (`www/mods/admin/`) / Backend Helper (`www-helper/server.js`) / Docker (`Dockerfile`, `compose.yaml`)
- **Opis zmian:**
  - **Wydzielenie z `myhome` (Etap 3):** Homepage startuje jako kopia dojrzałego kodu `myhome`, odchudzona do warstwy bazowej — Strona Główna SPA, Zaplecze z zakładkami systemowymi (Helper & System, Centrum Alertów, Homepage, Aktualizacje, Wygląd Zaplecza) i Kiosk. Bez modułów rodzinnych MyHome.
  - **Faza A — czyszczenie:** usunięte `www/sticky/` (Karteczki/Memos) i `homedocs/` (Paperless-ngx) w całości; wycięta natywna tablica notatek z Kiosku (HTML/JS/CSS); usunięte osierocone ustawienia Kiosku powiązane wyłącznie z notatkami; usunięte odniesienia do Karteczek/Homedocs z routingu Zaplecza (`admin.js`, `tab-modules.js`, `admin/index.html`).
  - **Faza B — Kiosk Serwera:** Kiosk przeprojektowany z kiosku rodzinnego/kuchennego na kiosk statusu serwera, 4 zakładki: **Status serwera** (temperatury CPU, RAM, dyski, alerty), **Live** (żywy podgląd CPU/RAM per kontener w stylu `ctop`, odświeżanie 2,5 s), **Status kontenerów** (lista + stan), **Radio** (bez zmian). Zrealizowane jako natywne panele w Kiosku (`www/kiosk/status-panels.js`), pobierające dane bezpośrednio z publicznych endpointów (`/api/system/top`, `/api/alerts/summary`, `/api/docker/containers`) — bez iframe'owania Zaplecza (uniknięto wejścia w ekran PIN na tablecie).
  - **Nowy backend `/api/kiosk/settings` (GET/PUT):** wcześniej w ogóle nie istniał mimo że korzystał z niego zarówno Kiosk, jak i jego zakładka w Zapleczu — panel ustawień Kiosku (motyw, timeout, przyciski menu) nigdy nic nie zapisywał. Dobudowany od zera wg wzorca istniejących endpointów (`/api/dashboard/settings`), z plikiem `config/kiosk.json` i wymogiem PIN przy zapisie.
  - **Pierwszy `Dockerfile` i `compose.yaml` dla Homepage:** obraz Node.js (Express + cors) z doinstalowanym CLI Dockera (do komunikacji z hostowym `dockerd` przez `/var/run/docker.sock`) i `procps` (polecenie `top` używane przez Diagnostykę Serwera). Poprawiona literówka z `compose.yaml` `myhome` (`BACKUPS_DIR` → poprawne `BACKUP_DIR`, zgodnie z tym, co faktycznie czyta `server.js`).
  - **Wersjonowanie:** Homepage startuje od `v0.1.0` jako nowy, niezależny projekt — nie kontynuuje numeracji `0.4.x` po `myhome`, mimo wspólnego pochodzenia kodu.
- **Status:** 🟡 Kod gotowy, obraz jeszcze nie zbudowany ani nie wypchnięty do rejestru Gitea. Repozytorium `IF-startpage` na Gitea — w trakcie zakładania.

### 🏷️ [v0.1.1] — 2026-09-17 (Likwidacja Beszela)
- **Modul:** Ogolny
- **Opis zmian:** Calkowicie usuniety martwy/nieuzywany kod zwiazany z Beszelem (statystyki serwera NAS): `www-helper/config/beszel.env` i `beszel.env.example` (server.js nigdy nie odczytywal tych zmiennych - orphaned config z prawdziwym haslem), kafelek "Beszel" z `services.json`, ikony `beszel.png`/`beszel-light.png`, wzmianka w opisie zakresu portow w `www/app.js`. Wykonane analogicznie w `IF-MyHome` (dawniej `myhome`), zeby uniknac rozjazdu.
- **Autor / Commit:** Claude (Cowork), 2026-09-17, na wyrazne polecenie uzytkownika.

### 🏷️ [rebranding] — 2026-09-17 (Nazwa projektu ustalona: IF-startpage)
- **Modul:** Ogolny
- **Opis zmian:** Robocza nazwa „Homepage” zmieniona na **IF-startpage**. Uzytkownik zastrzegl, ze "Homepage" to nazwa znanego, istniejacego projektu open source (gethomepage.dev) w tej samej niszy startpage/dashboard (obok Homarr, Heimdall, Dashy, Homer, Flame), wiec utrzymanie tej nazwy dla publicznego repo grozilo zarzutem podszywania sie pod cudza marke/zasiegi. Nowa nazwa nawiazuje do marki IdeaForge, pod ktora repo ma trafic na GitHub. Zaktualizowano compose.yaml (tag obrazu, container_name, sciezki wolumenow), obrazy.md, ten plik oraz www/README.md.
- **Autor / Commit:** Claude (Cowork), 2026-09-17, na wyrazne polecenie uzytkownika.
- **Autor / Commit:** Claude (Cowork), 2026-09-17, na wyraźne polecenie użytkownika.
