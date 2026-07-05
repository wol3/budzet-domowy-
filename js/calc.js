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

// Pełne podsumowanie budżetu dla danego miesiąca.
export function computeSummary(budget) {
  const income = budget.income || {};
  const matiSalary = num(income.matiSalary);
  const kiniaSalary = num(income.kiniaSalary);
  const benefit800 = num(income.benefit800);
  const totalIncome = matiSalary + kiniaSalary + benefit800;

  const matiPart = mortgageMatiPart(budget.mortgage);
  const expMati = sumExpenses(budget.expensesMati);
  const expKinia = sumExpenses(budget.expensesKinia);

  // Rata hipoteczna wchodzi jako pierwsza pozycja wydatków Mati.
  const totalMati = matiPart + expMati;
  const totalKinia = expKinia;

  const leftMati = matiSalary - totalMati;
  const leftKinia = kiniaSalary - totalKinia;

  // Koszty łączne obejmują pełną ratę (bo 800+ liczymy jako dochód).
  const totalCosts = num(budget.mortgage?.totalInstallment) + expMati + expKinia;
  const leftBeforeBuffer = totalIncome - totalCosts;
  const buffer = num(budget.buffer);
  const savings = leftBeforeBuffer - buffer;

  const rate = (part, whole) => (whole > 0 ? part / whole : 0);

  return {
    matiSalary, kiniaSalary, benefit800, totalIncome,
    matiPart, expMati, expKinia,
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
