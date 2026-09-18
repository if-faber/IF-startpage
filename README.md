# IF-startpage

Samodzielna, lekka strona startowa domowego serwera — Strona Główna (SPA),
Zaplecze administracyjne z funkcjami systemowymi i Kiosk statusu serwera.
Część pakietu **IdeaForge** dla serwerów domowych.

> **Nazewnictwo:** robocza nazwa podczas wydzielania z `myhome` to była
> „Homepage" — zmieniona na `IF-startpage`, żeby uniknąć podszywania się
> pod istniejący, znany projekt open source o tej samej nazwie
> (gethomepage.dev) oraz inne dashboardy tej niszy (Homarr, Heimdall,
> Dashy, Homer, Flame).

## Ścisła relacja z IF-home-server

**`IF-startpage` nie jest projektem w pełni oderwanym od reszty pakietu
IdeaForge — jest ściśle powiązana z instalatorem
[`IF-home-server`](https://github.com/if-faber/IF-home-server).**
`IF-home-server` stawia bazowy system serwera domowego (Cockpit, Samba,
serwer druku, Dockge), a `IF-startpage` jest jego stroną startową —
punktem wejścia, z którego korzysta się z tego, co instalator postawił.
Razem tworzą kompletny pakiet: strona startowa + panel administracyjny +
udostępnianie plików + serwer druku.

Da się uruchomić `IF-startpage` samodzielnie, na dowolnym Dockerze, bez
`IF-home-server` — ale docelowe, zamierzone środowisko dla tego projektu to
serwer postawiony przez `IF-home-server`. Zależność jest jednokierunkowa:
`IF-startpage` nie wymaga niczego z `IF-home-server` do działania (brak
twardych zależności w kodzie), ale filozofia, konwencje (struktura
`docker/app/` + `docker/app-data/`, zarządzanie stosami przez Dockge) i
docelowy kontekst użycia są wspólne i celowo spójne.

## Funkcje

- **Strona Główna** — kafelki linków w stylu Glassmorphism, motyw dzień/noc,
  chowany sidebar.
- **Zaplecze** (CMS, chronione PIN-em) — zakładki systemowe:
  - Centrum Alertów (stan kontenerów, sprzęt)
  - Diagnostyka Serwera / Top (CPU, RAM, dyski, sieć, procesy) — panel
    inline, bez okien modalnych
  - Statystyki Live (ten sam silnik diagnostyki, jako osobna zakładka)
  - Aktualizacje (pakiety systemowe apt + wersje kontenerów Docker)
  - Helper & System, Wygląd Zaplecza (edytor CSS)
- **Kiosk statusu serwera** — 4 zakładki: Status serwera (z rozwijanym
  panelem szczegółowej diagnostyki), Live (podgląd zużycia per-kontener w
  stylu `ctop`, natywnie, bez iframe), Status kontenerów, Radio.

## Wymagania

- Docker + Docker Compose (zalecane zarządzanie stosem przez
  [Dockge](https://github.com/louislam/dockge), zgodnie z konwencją
  pakietu IdeaForge — zobacz `IF-home-server`).
- Zamontowany `/var/run/docker.sock` — potrzebny do Diagnostyki/Top,
  Statusu kontenerów i zakładki Aktualizacje (kontener ma wgląd w Dockera
  hosta).

## Uruchomienie

`IF-startpage` to gotowy obraz kontenera — buduje się go raz, wypycha do
rejestru IdeaForge i wdraża przez [Dockge](https://github.com/louislam/dockge),
zgodnie z konwencją pakietu (`docker/app/` + `docker/app-data/`, zobacz
`IF-home-server`). Nie buduje się go od nowa przy każdej instalacji.

```yaml
services:
  if-startpage:
    image: 192.168.50.126:3000/gravi/if-startpage:v0.1.2
    container_name: if-startpage
    restart: unless-stopped
    ports:
      - "80:3010"
    environment:
      - DASHBOARD_PIN=1234
      - APP_BASE_DIR=/app
      - CONFIG_DIR=/app/config
      - WWW_DIR=/app/www
      - HELPER_DIR=/app/www-helper
      - BACKUP_DIR=/app/backups
    volumes:
      - /home/gravi/docker/app-data/if-startpage/config:/app/config
      - /home/gravi/docker/app-data/if-startpage/backups:/app/backups
      - /var/run/docker.sock:/var/run/docker.sock
```

Powyższy `image:` wskazuje na rejestr kontenerów IdeaForge w sieci
domowej — poza tą siecią obraz nie jest dziś publicznie pobieralny.
Zmień `DASHBOARD_PIN` na własny PIN administracyjny przed wystawieniem
serwera poza zaufaną sieć domową.

## Relacja z IF-MyHome

`IF-startpage` jest też obrazem bazowym dla pełnej, rodzinnej wersji
pakietu: `IF-MyHome` buduje się na nim (multi-stage Docker build,
`FROM ... AS base`) i dokłada moduły rodzinne (Kiosk Kuchenny, Karteczki,
Homedocs). Poprawka w kodzie bazowym trafia do obu produktów przy
najbliższym buildzie `IF-MyHome`.

## Dokumentacja

Ten README to skrócone wprowadzenie. Pełna, szczegółowa dokumentacja
(instrukcje krok po kroku, zrzuty ekranu, opisy poszczególnych modułów)
docelowo mieszka na [ideaforge.pl](https://ideaforge.pl).

## Licencja

MIT — zobacz [LICENSE](./LICENSE).

## Status

Kod na bieżąco rozwijany — pełna historia zmian w
[`version-changelog.md`](./version-changelog.md).
