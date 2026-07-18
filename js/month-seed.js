// Bieżący miesiąc przeniesiony z arkusza (zakładka "MAIN_v2").
// Uwaga: pozycji "Kredyt mieszkanie" NIE ma na liście — apka wylicza część
// Mati raty automatycznie z pól Hipoteka & 800+, więc trzymanie jej też jako
// zwykłego wydatku podwajałoby koszt.
export const MONTH_SEED = {
  income: { matiSalary: 11800.0, kiniaSalary: 9500.0, benefit800: 800.0 },
  mortgage: { totalInstallment: 1511.62, coveredBy800: 800.0 },
  buffer: 400.0,
  expensesMati: [
    { id: "m01", category: "Czynsz mieszkanie", amount: 714.25, monthlyLimit: 0, paid: true },
    { id: "m02", category: "Internet", amount: 80.6, monthlyLimit: 0, paid: true },
    { id: "m03", category: "Abonament telefon", amount: 150.0, monthlyLimit: 0, paid: true },
    { id: "m04", category: "Trener siłownia", amount: 600.0, monthlyLimit: 0, paid: true },
    { id: "m05", category: "Prąd", amount: 230.0, monthlyLimit: 0, paid: true },
    { id: "m06", category: "Paliwo", amount: 500.0, monthlyLimit: 0, paid: false },
    { id: "m07", category: "Zajęcia sportowe Ignaś", amount: 0.0, monthlyLimit: 0, paid: false },
    { id: "m08", category: "Fryzjer", amount: 80.0, monthlyLimit: 0, paid: true },
    { id: "m09", category: "Przedszkole", amount: 240.0, monthlyLimit: 0, paid: true },
    { id: "m10", category: "Konto Ignaśka", amount: 100.0, monthlyLimit: 0, paid: true },
    { id: "m11", category: "Inne", amount: 350.0, monthlyLimit: 0, paid: false },
    { id: "m12", category: "Rata Cupra", amount: 784.0, monthlyLimit: 0, paid: true },
  ],
  expensesKinia: [
    { id: "k01", category: "Życie", amount: 4000.0, monthlyLimit: 0, paid: false },
    { id: "k02", category: "Inne", amount: 400.0, monthlyLimit: 0, paid: false },
    { id: "k03", category: "Dziecko", amount: 400.0, monthlyLimit: 0, paid: false },
    { id: "k04", category: "Angielski Ignaś", amount: 0.0, monthlyLimit: 0, paid: false },
    { id: "k05", category: "Trener siłownia", amount: 600.0, monthlyLimit: 0, paid: false },
  ],
};
