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

### 🏷️ [rebranding] — 2026-09-17 (Nazwa projektu ustalona: IF-startpage)
- **Modul:** Ogolny
- **Opis zmian:** Robocza nazwa „Homepage” zmieniona na **IF-startpage**. Uzytkownik zastrzegl, ze "Homepage" to nazwa znanego, istniejacego projektu open source (gethomepage.dev) w tej samej niszy startpage/dashboard (obok Homarr, Heimdall, Dashy, Homer, Flame), wiec utrzymanie tej nazwy dla publicznego repo grozilo zarzutem podszywania sie pod cudza marke/zasiegi. Nowa nazwa nawiazuje do marki IdeaForge, pod ktora repo ma trafic na GitHub. Zaktualizowano compose.yaml (tag obrazu, container_name, sciezki wolumenow), obrazy.md, ten plik oraz www/README.md.
- **Autor / Commit:** Claude (Cowork), 2026-09-17, na wyrazne polecenie uzytkownika.
- **Autor / Commit:** Claude (Cowork), 2026-09-17, na wyraźne polecenie użytkownika.
