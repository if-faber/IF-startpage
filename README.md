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
  - Aktualizacje (pakiety systemowe apt + wersje kontenerów Docker —
    odczytuje i podmienia tag wersji bezpośrednio w `compose.yaml` innych
    stosów, patrz wymagany wolumen `/host-apps` niżej)
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
- Zamontowany katalog `docker/app/` hosta jako `/host-apps` (**wymagane**
  przez zakładkę Aktualizacje — bez tego wolumenu podmiana wersji
  kontenera w UI zwróci błąd 404, bo backend nie znajdzie pliku
  `compose.yaml` stosu, który ma zaktualizować).

## Obraz kontenera

`IF-startpage` to gotowy obraz kontenera — nie buduje się go lokalnie przy
każdej instalacji. Obraz jest budowany i publikowany automatycznie przez
**GitHub Actions** (`.github/workflows/docker-publish.yml`) przy każdym
tagu wersji (`vX.Y.Z`) i wypychany do **GitHub Container Registry**:

```
ghcr.io/if-faber/if-startpage:vX.Y.Z
ghcr.io/if-faber/if-startpage:latest
```

Publiczny, wersjonowany obraz — do pobrania skądkolwiek (nie tylko z sieci
domowej), zgodnie z tym, że `IF-startpage` jest częścią publicznego pakietu
IdeaForge. Wdrożenie odbywa się przez [Dockge](https://github.com/louislam/dockge),
zgodnie z konwencją dwufolderową pakietu (`docker/app/` + `docker/app-data/`,
zobacz `IF-home-server`).

## Uruchomienie

```yaml
services:
  if-startpage:
    image: ghcr.io/if-faber/if-startpage:v0.1.4
    container_name: if-startpage
    restart: unless-stopped
    ports:
      - "80:3010"
    environment:
      - DASHBOARD_PIN=1234   # ZMIEŃ przed wystawieniem serwera poza zaufaną sieć domową
      - APP_BASE_DIR=/app
      - CONFIG_DIR=/app/config
      - WWW_DIR=/app/www
      - HELPER_DIR=/app/www-helper
      - BACKUP_DIR=/app/backups
      - HOST_APPS_DIR=/host-apps
    volumes:
      # Konwencja dwufolderowa: ten plik leży w docker/app/if-startpage/,
      # dane trwałe w ../../app-data/if-startpage/.
      - ../../app-data/if-startpage/config:/app/config
      - ../../app-data/if-startpage/backups:/app/backups
      # Wymagane przez zakładkę Aktualizacje (patrz "Wymagania" wyżej).
      - ../../app:/host-apps
      - /var/run/docker.sock:/var/run/docker.sock
```

## Relacja z IF-MyHome

`IF-startpage` jest też obrazem bazowym dla pełnej, rodzinnej wersji
pakietu: `IF-MyHome` buduje się na nim (multi-stage Docker build,
`FROM ... AS base`) i dokłada moduły rodzinne (Kiosk Kuchenny, Karteczki,
Homedocs). Poprawka w kodzie bazowym trafia do obu produktów przy
najbliższym buildzie `IF-MyHome`.

## Dokumentacja

Ten README to na razie **jedyna i pełna** dokumentacja projektu. Docelowo
szczegółowa dokumentacja (instrukcje krok po kroku, zrzuty ekranu, opisy
poszczególnych modułów) ma powstać na [ideaforge.pl](https://ideaforge.pl) —
strona istnieje, ale nie ma tam jeszcze treści dotyczącej `IF-startpage`.
Ten README zostanie zaktualizowany o link do konkretnej podstrony dopiero
wtedy, gdy ta treść tam faktycznie powstanie.

## Licencja

MIT — zobacz [LICENSE](./LICENSE).

## Status

Kod na bieżąco rozwijany — pełna historia zmian w
[`version-changelog.md`](./version-changelog.md).
