# IF-startpage

Samodzielna, lekka strona startowa domowego serwera — Strona Główna (SPA),
Zaplecze administracyjne z funkcjami systemowymi i Kiosk statusu serwera.
Część pakietu **IdeaForge** dla serwerów domowych, kompatybilna z
instalatorem `IF-homeserver` (dawniej `home-server`), ale w pełni
samodzielna: instaluje się i działa niezależnie, bez żadnej zależności od
modułów rodzinnych `IF-MyHome`.

## Pochodzenie

Wydzielona 2026-09-17 z dojrzałego kodu `myhome` (Etap 3 podziału na
projekty) — kopia kodu odchudzona do warstwy bazowej: bez modułów
rodzinnych (Karteczki/Memos, Homedocs). Pełna historia sprzed wydzielenia
pozostaje w repo `IF-MyHome` (dawniej `myhome`).

**Robocza nazwa podczas wydzielania to była „Homepage".** Zmieniona na
`IF-startpage`, żeby uniknąć podszywania się pod istniejący, znany projekt
open source o tej samej nazwie (gethomepage.dev) oraz inne dashboardy tej
niszy (Homarr, Heimdall, Dashy, Homer, Flame).

## Funkcje

- **Strona Główna** — kafelki linków w stylu Glassmorphism, motyw dzień/noc,
  chowany sidebar.
- **Zaplecze** (CMS, chronione PIN-em) — zakładki systemowe:
  - Centrum Alertów (stan kontenerów, sprzęt)
  - Diagnostyka Serwera / Top (CPU, RAM, dyski, sieć, procesy)
  - Aktualizacje (pakiety systemowe apt + wersje kontenerów Docker)
  - Helper & System, Wygląd Zaplecza (edytor CSS)
- **Kiosk statusu serwera** — 4 zakładki: Status serwera, Live (podgląd
  zużycia per-kontener w stylu `ctop`, natywnie, bez iframe), Status
  kontenerów, Radio.

## Uruchomienie

```sh
docker compose up -d
```

Domyślnie (`compose.yaml`) obraz startuje na porcie bocznym `8091` (do
testów na serwerze roboczym `iflab`, `192.168.50.126`) — produkcyjny port
ustala się osobno przy realnym wdrożeniu, zgodnie z dwufolderową
konwencją (`docker/app/if-startpage/` + `docker/app-data/if-startpage/`).

Wymaga zamontowania `/var/run/docker.sock` (Diagnostyka/Top, Status
kontenerów, Aktualizacje) — kontener ma więc pełny wgląd w Dockera hosta.

## Relacja z IF-MyHome

`IF-startpage` jest obrazem bazowym: `IF-MyHome` buduje się na nim
(multi-stage Docker build, `FROM .../if-startpage:vX AS base`) i dokłada
moduły rodzinne (Kiosk Kuchenny, Karteczki, Homedocs). Poprawka w kodzie
bazowym trafia do obu produktów przy najbliższym buildzie `IF-MyHome`.

## Status

🟡 Kod gotowy (v0.1.0), obraz jeszcze nie zbudowany ani nie wypchnięty do
rejestru Gitea. Repozytorium `IF-startpage` na Gitea (`gravi`) — w trakcie
zakładania. Szczegóły w `version-changelog.md` i `obrazy.md`.
