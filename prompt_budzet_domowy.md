# Prompt dla Claude Code — Aplikacja "Budżet Domowy"

Skopiuj poniższy prompt w całości i wklej do Claude Code w nowym, pustym repo.

---

## PROMPT

Chcę zbudować **profesjonalną aplikację webową do zarządzania budżetem domowym** dla dwuosobowej rodziny (Mati i Kinia). Bazą wyjściową jest logika mojego arkusza Excel (zakładka MAIN_v2 + elementy z zakładek "Dashboard 2026" i "Kalkulacja samochodu"), ale nie chcę zwykłego "kalkulatora online" — chcę apkę zbudowaną z sensownym podejściem produktowym, wzorowaną na tym, co robi dobrze rynek najlepszych aplikacji do budżetowania osobistego (YNAB, Copilot Money, Monarch Money), przeskalowaną do potrzeb dwóch osób, nie firmy.

### Stack technologiczny

- **Frontend**: czysty HTML/CSS/JavaScript (bez frameworka — analogicznie do mojej wcześniejszej apki "Typer Mundialu 2026"), podzielony na moduły JS (np. `dashboard.js`, `budget.js`, `charts.js`, `goals.js`) — nie jeden monolityczny plik, bo apka będzie miała kilka widoków
- **Wykresy**: Chart.js (z CDN) — używany świadomie w kilku konkretnych, użytecznych miejscach (patrz sekcja "Wykresy i wizualizacje"), nie "wszędzie po trochu"
- **Backend/baza danych**: Firebase (Firestore) — ten sam projekt-wzorzec jak w Typer Mundialu 2026
- **Autoryzacja**: Firebase Auth, email/hasło, **tylko 1 konto (Mati)**
- **Hosting**: GitHub Pages, deployowane z mojego repo na GitHubie (bez Netlify) — GitHub Actions do auto-deployu przy pushu na `main`
- **Styl wizualny**: inspirowany apple.com — dużo białej przestrzeni, typografia systemowa (`-apple-system, "SF Pro Display", "SF Pro Text", "Inter", sans-serif`), duże spokojne nagłówki, subtelne cienie i zaokrąglenia, delikatne animacje przy przełączaniu widoków, paleta biało-szara z jednym akcentowym kolorem — bez agresywnych barw korporacyjnych

### Podejście produktowe — czym się inspirujemy i czego NIE robimy

Weź z rynkowych liderów budżetowania domowego to, co faktycznie działa dla dwuosobowej rodziny:

- **Z YNAB** — ideę **budżetowania kategoriami z limitem miesięcznym** (nie tylko zapis "co wydałem", ale też "ile planowałem wydać") i wizualny progres "wydane / limit" per kategoria.
- **Z Copilot Money** — czysty, spokojny wizualny język: karty z dużymi liczbami, donut chart struktury wydatków, wykres trendu w czasie, kolorowanie "na plusie / na minusie" zamiast tabelek pełnych liczb.
- **Z Monarch Money** — koncept **celów oszczędnościowych** (np. "fundusz na samochód", "fundusz wakacyjny" — dokładnie to, co masz w zakładkach "Kalkulacja samochodu" i "Dashboard 2026") z prostym paskiem postępu do celu i datą docelową.

Celowo **NIE** implementujemy (to byłaby armata na wróble dla budżetu 2-osobowego):
- integracji bankowej / Open Banking / importu wyciągów,
- automatycznej kategoryzacji transakcji przez AI/ML,
- wielu kont użytkowników z rolami i uprawnieniami,
- wielowalutowości,
- natywnej aplikacji mobilnej (wystarczy responsywna PWA-lite w przeglądarce),
- powiadomień push / e-mail.

### Kontekst domenowy (na podstawie mojego arkusza)

**Dochody:**
- Pensja Mati, Pensja Kinia, Świadczenie 800+, Suma dochodów (automatyczna)

**Hipoteka & 800+:**
- Rata hipoteczna (łączna), Pokrycie z 800+, Część Mati (do budżetu) = Rata − Pokrycie z 800+ (trafia jako pierwsza pozycja do wydatków Mati)

**Wydatki — dwie równoległe listy (Mati / Kinia):**
Każda pozycja: Kategoria, Kwota, **Limit miesięczny (opcjonalny, per kategoria)**, automatycznie liczony % udziału w sumie wydatków danej osoby, Status (Zapłacono / Nie zapłacono). Kategorie w pełni edytowalne (dodawanie/usuwanie/zmiana), nie zamknięta lista.

**Logika dochodów vs wydatków:** nie zakładamy równego podziału — "zostaje" per osoba to jej pensja minus jej własne wydatki (Mati: pensja Mati − wydatki Mati; Kinia: pensja Kinia − wydatki Kinia), tak jak w arkuszu.

**Podsumowanie budżetu (liczone na żywo):**
- Suma wydatków Mati / Kinia, Zostaje Mati / Kinia
- Suma kosztów łącznie, Zostaje (przed buforem), Bufor na sytuacje losowe (edytowalny), Oszczędności miesięczne
- Stopa oszczędności: Mati, Kinia, łączna (%)
- Hero-sekcja na górze: Dochód łączny / Koszty łączne / Zostaje / Stopa oszczędności łącznie

**Cele oszczędnościowe (nowy moduł, inspirowany Twoimi zakładkami "Kalkulacja samochodu" i "Dashboard 2026"):**
- Lista celów: nazwa (np. "Fundusz samochodowy", "Wakacje 2026"), kwota docelowa, kwota zebrana (aktualizowana ręcznie albo przez "dopisanie" części miesięcznych oszczędności do celu), opcjonalna data docelowa
- Pasek postępu per cel (% do celu)
- Jeden z celów może być oznaczony jako "domyślny" i pojawiać się na dashboardzie głównym

### Wykresy i wizualizacje (konkretne, nie "na hurra")

1. **Donut chart struktury wydatków** (bieżący miesiąc) — kategorie Mati + Kinia razem, z legendą i wartościami procentowymi (jak Twoja zakładka "Wykresy" → "Struktura wydatków").
2. **Wykres słupkowy Dochody vs Wydatki vs Oszczędności** — Mati / Kinia / Razem, dla bieżącego miesiąca (jak Twoja zakładka "Wykresy").
3. **Wykres liniowy trendu** — stopa oszczędności i kwota oszczędności w czasie (ostatnie 6–12 miesięcy), żeby widzieć kierunek, nie tylko snapshot.
4. **Pasek postępu "budżet vs rzeczywistość"** per kategoria wydatku, jeśli ustawiono limit — kolor zielony/żółty/czerwony zależnie od tego, jak blisko limitu jesteś.
5. **Pasek postępu per cel oszczędnościowy** (moduł Cele).

Nie dodawaj więcej wykresów niż te 5 typów — to ma pokrywać realne potrzeby, nie "dashboard dla dashboardu".

### Funkcjonalności aplikacji — podział na fazy

**Faza 1 (core, zrób najpierw):**
1. Logowanie (Firebase Auth, 1 konto).
2. Widok główny "Ten miesiąc": dochody, hipoteka/800+, dwie kolumny wydatków edytowalne inline ze statusem płatności, podsumowanie na żywo, hero-sekcja.
3. Dodawanie/edycja/usuwanie pozycji bez przeładowania strony (Firestore).

**Faza 2 (historia i wizualizacje):**
4. Przełączanie miesięcy (dokument per miesiąc w Firestore) + "Nowy miesiąc na podstawie poprzedniego".
5. Donut chart struktury wydatków + wykres słupkowy Dochody/Wydatki/Oszczędności (punkty 1–2 z sekcji wykresów).
6. Wykres liniowy trendu oszczędności w czasie (punkt 3).

**Faza 3 (budżetowanie kategoriami i cele):**
7. Limity miesięczne per kategoria wydatku + pasek postępu budżet vs rzeczywistość.
8. Moduł Cele oszczędnościowe z paskiem postępu.

**Cały czas:** responsywność mobile-first (dwie kolumny wydatków składają się w jedną na wąskim ekranie).

### Model danych Firestore

```
budgets/{YYYY-MM}
  income: { matiSalary, kiniaSalary, benefit800 }
  mortgage: { totalInstallment, coveredBy800 }
  buffer: number
  expensesMati: [{ id, category, amount, monthlyLimit, paid }]
  expensesKinia: [{ id, category, amount, monthlyLimit, paid }]

goals/{goalId}
  name: string
  targetAmount: number
  currentAmount: number
  targetDate: string | null
  isDefault: boolean
```

Wszystkie wartości pochodne (suma, %, zostaje, stopa oszczędności, postęp do limitu/celu) licz **w JS na żywo**, nie zapisuj ich do bazy jako statyczne liczby.

### Deployment

1. Zainicjuj repo Git, `.gitignore` dla plików z sekretami.
2. Skonfiguruj Firebase (Firestore + Auth) — plik konfiguracyjny z placeholderami.
3. GitHub Pages: workflow GitHub Actions (`.github/workflows/deploy.yml`) publikujący przy pushu na `main`.
4. `README.md`: jak podłączyć projekt Firebase, jak dodać konto Mati w Auth, jak włączyć GitHub Pages, jak wygląda docelowy URL.

### Priorytety

Rób to fazami zgodnie z podziałem wyżej — nie zaczynaj Fazy 3, dopóki Faza 1 nie działa w 100%. Na końcu wypisz mi jasno, czego potrzebujesz od mnie (dane z konsoli Firebase, nazwa repo GitHub itd.) — nie zgaduj tych wartości, zostaw czytelne placeholdery z komentarzem co tam wkleić.

---

## Co Ty (Mateusz) będziesz musiał przygotować i podać

Ta sekcja nie jest częścią promptu do Claude Code — to ściągawka dla Ciebie.

### 1. Firebase — nowy projekt

Wejdź na [console.firebase.google.com](https://console.firebase.google.com) → "Dodaj projekt" (np. `budzet-domowy`).

Z konsoli skopiujesz do apki (Project Settings → Ogólne → "Twoje aplikacje" → dodaj aplikację webową `</>`) obiekt konfiguracyjny:

```js
const firebaseConfig = {
  apiKey: "...",
  authDomain: "budzet-domowy-xxxx.firebaseapp.com",
  projectId: "budzet-domowy-xxxx",
  storageBucket: "budzet-domowy-xxxx.appspot.com",
  messagingSenderId: "...",
  appId: "..."
};
```

Te wartości wklejasz lokalnie do pliku konfiguracyjnego z placeholderami, który przygotuje Claude Code. Nie są to sekrety w sensie hasła (są i tak widoczne w kodzie frontendu), ale mimo to wklejaj je lokalnie w repo, nie na czacie.

Dodatkowo w konsoli Firebase:
- **Włącz Firestore Database** (Build → Firestore Database → Create database, tryb produkcyjny, region np. `eur3`).
- **Włącz Authentication → Sign-in method → Email/Password**.
- **Dodaj jednego użytkownika** (Authentication → Users → Add user) — Twój e-mail i hasło.
- **Ustaw reguły bezpieczeństwa Firestore** — Claude Code wygeneruje `firestore.rules`, Ty wklejasz je w konsoli (zakładka "Reguły") i klikasz "Opublikuj".

### 2. GitHub — repozytorium

- Nowe repo na Twoim GitHubie (np. `budzet-domowy`).
- Jeśli masz **darmowe konto GitHub**, repo z GitHub Pages musi być **publiczne** (prywatne + Pages wymaga płatnego planu).
- Po dodaniu kodu i workflow: `git push`, potem w repo **Settings → Pages** ustaw źródło na `GitHub Actions` (lub odpowiedni branch/katalog), poczekaj na zielony workflow w zakładce **Actions** — link do apki pojawi się w Settings → Pages jako `https://<twoj-login>.github.io/budzet-domowy/`.

### 3. Podsumowanie — co przygotować

| Co | Skąd | Kiedy potrzebne |
|---|---|---|
| Obiekt `firebaseConfig` (6 wartości) | Firebase Console → Project Settings → Twoje aplikacje | Zaraz po utworzeniu projektu |
| Włączony Firestore (tryb produkcyjny) | Firebase Console → Build → Firestore Database | Przed pierwszym zapisem danych |
| Włączony Email/Password w Auth | Firebase Console → Authentication → Sign-in method | Przed pierwszym logowaniem |
| Jedno konto użytkownika (e-mail + hasło) | Firebase Console → Authentication → Users | Przed pierwszym logowaniem |
| Nazwa repo GitHub (publiczne, jeśli plan darmowy) | Twoje ustawienia GitHub | Na starcie, do `git remote` |
| Włączony GitHub Pages w ustawieniach repo | Repo → Settings → Pages | Po pierwszym pushu kodu |

---

*(koniec promptu)*
