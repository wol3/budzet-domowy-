# 💰 Budżet Domowy

Aplikacja webowa do zarządzania budżetem domowym dla dwuosobowej rodziny (Mati &amp; Kinia).
Czysty HTML/CSS/JavaScript (moduły ES), Chart.js, Firebase (Firestore + Auth), hosting na GitHub Pages.

## Funkcje

- **Ten miesiąc** — dochody (pensje + 800+), hipoteka z pokryciem z 800+, dwie kolumny wydatków (Mati/Kinia) edytowalne inline ze statusem płatności i opcjonalnym limitem, podsumowanie na żywo + hero-sekcja.
- **Wykresy** — donut struktury wydatków, słupki Dochody/Wydatki/Oszczędności, liniowy trend oszczędności w czasie. Przełączanie miesięcy + „nowy miesiąc na podstawie poprzedniego”.
- **Cele** — cele oszczędnościowe z paskiem postępu, datą docelową i celem „domyślnym” pokazywanym na dashboardzie.

Wszystkie wartości pochodne (sumy, %, stopa oszczędności, postępy) liczone są **na żywo w JS** — w bazie trzymamy tylko dane wejściowe.

## Struktura

```
index.html            # struktura + ekran logowania + 3 widoki
css/styles.css        # styl inspirowany apple.com
js/config.js          # firebaseConfig (uzupełnione)
js/firebase.js        # init App/Auth/Firestore
js/auth.js            # logowanie
js/store.js           # warstwa danych Firestore
js/calc.js            # obliczenia budżetu
js/util.js            # formatowanie (PLN, %, miesiące)
js/budget.js          # widok „Ten miesiąc”
js/charts.js          # widok „Wykresy”
js/goals.js           # widok „Cele”
js/app.js             # orkiestracja (auth, nawigacja, stan, akcje)
firestore.rules       # reguły bezpieczeństwa do wklejenia w konsoli
.github/workflows/deploy.yml  # auto-deploy na GitHub Pages
```

## Konfiguracja Firebase

Projekt: **budzet-domowy-42855**. Config jest już wpisany w `js/config.js`.
W [konsoli Firebase](https://console.firebase.google.com) upewnij się, że masz:

1. **Firestore Database** — Build → Firestore Database → *Create database* (tryb produkcyjny, region `eur3`).
2. **Authentication → Sign-in method → Google** — włączone.
3. **Reguły bezpieczeństwa** — skopiuj zawartość `firestore.rules` do Firestore Database → *Reguły* → **Opublikuj**. Reguły ograniczają dostęp do jednego adresu e-mail (`wolowiczmateusz1@gmail.com`) — jeśli logujesz się innym kontem Google, zmień ten adres w `firestore.rules`.
4. **Authorized domains** — po wdrożeniu na GitHub Pages dodaj domenę `wol3.github.io` w Authentication → Settings → *Authorized domains* (inaczej logowanie Google zablokuje domenę).

## Uruchomienie lokalne

Ze względu na moduły ES trzeba serwować przez HTTP (nie `file://`):

```bash
python3 -m http.server 8000
# otwórz http://localhost:8000
```

## Deploy na GitHub Pages

1. `git push` na branch `main`.
2. W repo: **Settings → Pages → Source: „Deploy from a branch" → Branch: `main` / `/ (root)` → Save**.
3. Poczekaj ~1 min, odśwież stronę Settings → Pages — pojawi się link do apki.
4. Adres apki: `https://wol3.github.io/budzet-domowy-/`

> Repo z GitHub Pages na darmowym planie musi być **publiczne**.
> Ścieżki w kodzie są **względne**, więc apka działa również w podkatalogu (`/nazwa-repo/`).
> Plik `koszty.xlsx` jest w `.gitignore` i nie jest publikowany.
