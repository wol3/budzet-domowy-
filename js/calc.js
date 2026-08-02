// Wszystkie wartości pochodne liczymy tutaj, na żywo — nic z tego nie trafia
// do bazy jako statyczna liczba.

export const num = (v) => (Number.isFinite(+v) ? +v : 0);

export function sumExpenses(list) {
  return (list || []).reduce((s, e) => s + num(e.amount), 0);
}

// Część raty hipoteki, która obciąża budżet Mati (reszta pokryta z 800+).
export function mortgageMatiPart(mortgage) {
  return num(mortgage?.totalInstallment) - num(mortgage?.coveredBy800);
}

// Czy pozycja stała obowiązuje w danym miesiącu?
// from/to to "YYYY-MM" (puste = bez ograniczenia). Dzięki temu przedszkole może
// skończyć się w sierpniu, a szkoła zacząć we wrześniu z inną kwotą.
export function isActiveIn(item, monthId) {
  if (!monthId) return true;              // brak kontekstu miesiąca = licz wszystko
  const from = item?.from || null;
  const to = item?.to || null;
  if (from && monthId < from) return false;
  if (to && monthId > to) return false;
  return true;
}

// Pozycje stałe obowiązujące w danym miesiącu.
export function activeRecurring(recurring, monthId) {
  return {
    itemsMati: (recurring?.itemsMati || []).filter((i) => isActiveIn(i, monthId)),
    itemsKinia: (recurring?.itemsKinia || []).filter((i) => isActiveIn(i, monthId)),
  };
}

// Pełne podsumowanie budżetu dla danego miesiąca.
// `recurring` = wydatki stałe ({ itemsMati, itemsKinia }); `monthId` ogranicza
// je do tych, które w tym miesiącu faktycznie obowiązują.
export function computeSummary(budget, recurring = null, monthId = null) {
  if (recurring && monthId) recurring = activeRecurring(recurring, monthId);
  const income = budget.income || {};
  const matiSalary = num(income.matiSalary);
  const kiniaSalary = num(income.kiniaSalary);
  const benefit800 = num(income.benefit800);
  // 800+ NIE jest dochodem — to świadczenie earmarkowane na hipotekę. Zmniejsza
  // ratę do części Mati (mortgage.coveredBy800) i nie wchodzi ani do dochodu,
  // ani do kosztów. Dochód łączny = same pensje.
  const totalIncome = matiSalary + kiniaSalary;

  const matiPart = mortgageMatiPart(budget.mortgage);

  // Zmienne (per miesiąc) i stałe (wspólne) trzymamy osobno — UI je rozdziela,
  // ale w kosztach sumują się tak samo.
  const varMati = sumExpenses(budget.expensesMati);
  const varKinia = sumExpenses(budget.expensesKinia);
  const fixedMati = sumExpenses(recurring?.itemsMati);
  const fixedKinia = sumExpenses(recurring?.itemsKinia);
  const expMati = varMati + fixedMati;
  const expKinia = varKinia + fixedKinia;

  // Rata hipoteczna wchodzi jako pierwsza (stała) pozycja wydatków Mati.
  const totalMati = matiPart + expMati;
  const totalKinia = expKinia;

  const leftMati = matiSalary - totalMati;
  const leftKinia = kiniaSalary - totalKinia;

  // Koszty = to, co para płaci z własnej kieszeni: część Mati raty + wydatki.
  // Część raty pokryta z 800+ NIE jest kosztem.
  const totalCosts = totalMati + totalKinia;
  const leftBeforeBuffer = totalIncome - totalCosts;
  const buffer = num(budget.buffer);
  const savings = leftBeforeBuffer - buffer;

  const rate = (part, whole) => (whole > 0 ? part / whole : 0);

  return {
    matiSalary, kiniaSalary, benefit800, totalIncome,
    matiPart, expMati, expKinia,
    varMati, varKinia, fixedMati, fixedKinia,
    fixedTotal: matiPart + fixedMati + fixedKinia,
    varTotal: varMati + varKinia,
    totalMati, totalKinia,
    leftMati, leftKinia,
    totalCosts, leftBeforeBuffer, buffer, savings,
    rateMati: rate(leftMati, matiSalary),
    rateKinia: rate(leftKinia, kiniaSalary),
    rateTotal: rate(savings, totalIncome),
  };
}

// % udziału pozycji w sumie wydatków danej osoby.
export function shareOf(amount, personTotal) {
  return personTotal > 0 ? num(amount) / personTotal : 0;
}

// Status paska "budżet vs rzeczywistość" dla pozycji z limitem.
// Zwraca { ratio, level } gdzie level: green | amber | red | null (brak limitu).
export function limitStatus(amount, limit) {
  const lim = num(limit);
  if (lim <= 0) return { ratio: 0, level: null };
  const ratio = num(amount) / lim;
  let level = "green";
  if (ratio >= 1) level = "red";
  else if (ratio >= 0.8) level = "amber";
  return { ratio, level };
}
