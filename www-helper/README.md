# WWW Helper – MyHome Backend API

Backend działa na porcie `3010` (zmapowany na hoście na port `80`).

## Środowisko (`iflab` Fujitsu Q920)

- **Lokalizacja Live:** `/home/gravi/docker/app-data/myhome/www-helper`
- **Użytkownik:** `gravi`

## Instalacja lokalna

```bash
cd /home/gravi/docker/app-data/myhome/www-helper
npm ci
```

## Konfiguracja środowiskowa

Pliki konfiguracyjne znajdują się w `/home/gravi/docker/app-data/myhome/config/`:
- `dashboard.env` — kod PIN administratora (`DASHBOARD_PIN`)
- `services.json` — sekcje i linki
- `theme.json` — motyw CSS Strony Głównej
- `admin-theme.json` — motyw CSS Zaplecza

## Uruchomienie ręczne

```bash
npm start
```

