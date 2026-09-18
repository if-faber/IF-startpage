# 🐳 Rejestr Obrazów Docker & Gitea — IF-startpage (obrazy.md)

Ten plik rejestruje przygotowane i zbudowane obrazy kontenerów Docker dla projektu **IF-startpage**, przeznaczone do wysyłki (`docker push`) do lokalnego repozytorium / rejestru Gitea w sieci domowej (host `iflab`).

IF-startpage (robocza nazwa podczas wydzielania: „Homepage”) to samodzielny projekt wydzielony z `myhome` 2026-09-17 — historia obrazów `myhome` (w tym wspólne pochodzenie kodu) pozostaje w `Projekty/MyHome/obrazy.md`.

---

## 📌 Instrukcja i Format Wpisu w Nagłówku

Przed zbudowaniem nowego obrazu Docker agent weryfikuje ten plik i wpisuje rekord planowanego obrazu na górze listy według poniższego wzorca:

```markdown
### 📦 Obraz: if-startpage:vX.Y.Z — YYYY-MM-DD
- **Pełny Tag Gitea:** `localhost:3000/gravi/if-startpage:vX.Y.Z` oraz `localhost:3000/gravi/if-startpage:latest`
- **Rejestr Docelowy:** Repozytorium Gitea w sieci domowej (host `iflab`, adres tylko lokalnie)
- **Data i czas budowania:** YYYY-MM-DD HH:MM
- **Status wysyłki (Push Status):** [ 🟡 Zaplanowany / 🟢 Wysłano na Gitea / 🔴 Błąd ]
- **Zakres wersji:** Opis modułu włączonego do wydania.
```

> **Uwaga o adresie rejestru:** rejestr Gitea działa pod `localhost:3000` (ten sam port co web UI Gitea), gdy `docker build`/`docker push` wykonywane jest bezpośrednio na serwerze `iflab`. Konkretny adres IP sieci domowej celowo nie jest tu publikowany (plik jest częścią publicznego repo).

---

## 📦 Rejestr Zbudowanych Obrazów Kontenera

### 📦 Obraz: if-startpage:v0.1.2 — 2026-09-17
- **Pełny Tag Gitea:** `localhost:3000/gravi/if-startpage:v0.1.2` oraz `localhost:3000/gravi/if-startpage:latest`
- **Rejestr Docelowy:** Repozytorium Gitea w sieci domowej (host `iflab`, adres tylko lokalnie)
- **Data i czas budowania:** 2026-09-17 19:01
- **Status wysyłki (Push Status):** 🟢 Wysłano na Gitea
- **Zakres wersji:** Status Serwera — karta Centrum Alertów, akordeon Szczegółowej Diagnostyki (Top), naprawa przycisku Odśwież (brak klasy CSS szablonu); Zaplecze — nowa karta „Statystyki Live”.
