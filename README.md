IF-startpage
Samodzielna, lekka strona startowa domowego serwera — Strona Główna (SPA),
Zaplecze administracyjne z funkcjami systemowymi i Kiosk statusu serwera.
Część pakietu IdeaForge dla serwerów domowych.
Nazewnictwo: robocza nazwa podczas wydzielania z myhome to była
„Homepage" — zmieniona na IF-startpage, żeby uniknąć podszywania się
pod istniejący, znany projekt open source o tej samej nazwie
(gethomepage.dev) oraz inne dashboardy tej niszy (Homarr, Heimdall,
Dashy, Homer, Flame).
Ścisła relacja z IF-home-server
IF-startpage nie jest projektem w pełni oderwanym od reszty pakietu
IdeaForge — jest ściśle powiązana z instalatorem
IF-home-server.
IF-home-server stawia bazowy system serwera domowego (Cockpit, Samba,
serwer druku, Dockge), a IF-startpage jest jego stroną startową —
punktem wejścia, z którego korzysta się z tego, co instalator postawił.
Razem tworzą kompletny pakiet: strona startowa + panel administracyjny +
udostępnianie plików + serwer druku.
Da się uruchomić IF-startpage samodzielnie, na dowolnym Dockerze, bez
IF-home-server — ale docelowe, zamierzone środowisko dla tego projektu to
serwer postawiony przez IF-home-server. Zależność jest jednokierunkowa:
IF-startpage nie wymaga niczego z IF-home-server do działania (brak
twardych zależności w kodzie), ale filozofia, konwencje (struktura
docker/app/ + docker/app-data/, zarządzanie stosami przez Dockge) i
docelowy kontekst użycia są wspólne i celowo spójne.
Funkcje
Strona Główna — kafelki linków w stylu Glassmorphism, motyw dzień/noc,
chowany sidebar.
Zaplecze (CMS, chronione PIN-em) — zakładki systemowe:
Centrum Alertów (stan kontenerów, sprzęt)
Diagnostyka Serwera / Top (CPU, RAM, dyski, sieć, procesy) — panel
inline, bez okien modalnych
Statystyki Live (ten sam silnik diagnostyki, jako osobna zakładka)
Aktualizacje (pakiety systemowe apt + wersje kontenerów Docker —
odczytuje i podmienia tag wersji bezpośrednio w compose.yaml innych
stosów, patrz wymagany wolumen /host-apps niżej)
Helper & System, Wygląd Zaplecza (edytor CSS)
Kiosk statusu serwera — 4 zakładki: Status serwera (z rozwijanym
panelem szczegółowej diagnostyki), Live (podgląd zużycia per-kontener w
stylu ctop, natywnie, bez iframe), Status kontenerów, Radio.
Wymagania
Docker + Docker Compose (zalecane zarządzanie stosem przez
Dockge, zgodnie z konwencją
pakietu IdeaForge — zobacz IF-home-server).
Zamontowany /var/run/docker.sock — potrzebny do Diagnostyki/Top,
Statusu kontenerów i zakładki Aktualizacje (kontener ma wgląd w Dockera
hosta).
Zamontowany katalog docker/app/ hosta jako /host-apps (wymagane
przez zakładkę Aktualizacje — bez tego wolumenu podmiana wersji
kontenera w UI zwróci błąd 404, bo backend nie znajdzie pliku
compose.yaml stosu, który ma zaktualizować).
Uwaga: dostęp do docker.sock i zapis do docker/app/ daje kontenerowi praktycznie pełną kontrolę nad serwerem. Ustaw silny DASHBOARD_PIN i nie wystawiaj zaplecza do internetu.
Obraz kontenera
IF-startpage to gotowy obraz kontenera — nie buduje się go lokalnie przy
każdej instalacji. Obraz jest budowany i publikowany automatycznie przez
GitHub Actions (.github/workflows/docker-publish.yml) przy każdym
tagu wersji (vX.Y.Z) i wypychany do GitHub Container Registry:
Publiczny, wersjonowany obraz — do pobrania skądkolwiek (nie tylko z sieci
domowej), zgodnie z tym, że IF-startpage jest częścią publicznego pakietu
IdeaForge. Wdrożenie odbywa się przez Dockge,
zgodnie z konwencją dwufolderową pakietu (docker/app/ + docker/app-data/,
zobacz IF-home-server).
Uruchomienie
Zanim wdrożysz ten stos przez Dockge, utwórz najpierw foldery na dane
trwałe i nadaj uprawnienia (poniżej i w przykładzie compose.yaml zamień
TWOJA-NAZWA-UZYTKOWNIKA na swoją prawdziwą nazwę użytkownika — sprawdź
komendą echo $HOME, np. /home/marek):
W pliku compose.yaml używaj pełnych ścieżek (/home/<Twoja-nazwa>/...),
a nie ścieżek względnych (../../app-data/...) — pełne ścieżki zawsze
wskazują na właściwe miejsce, niezależnie od tego, jak Dockge akurat widzi
swój katalog stosów (patrz sekcja "Jak bezpiecznie dodać nowy kontener
(stos) przez Dockge" w README IF-home-server):
