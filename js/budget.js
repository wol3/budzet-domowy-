// Widok "Ten miesiąc": hero, dochody, hipoteka/800+, dwie kolumny wydatków,
// podsumowanie na żywo. Renderuje do #view-budget.
import { money, percent, esc } from "./util.js";
import { computeSummary, shareOf, limitStatus, mortgageMatiPart } from "./calc.js";

// Pojedyncze pole liczbowo-edytowalne (dochody / hipoteka / bufor).
function field(label, value, onInput) {
  const wrap = document.createElement("label");
  wrap.className = "field";
  wrap.innerHTML = `<span>${esc(label)}</span>`;
  const input = document.createElement("input");
  input.type = "number";
  input.inputMode = "decimal";
  input.step = "1";
  input.value = value ?? 0;
  input.addEventListener("input", () => onInput(parseFloat(input.value) || 0));
  wrap.appendChild(input);
  return wrap;
}

function expenseRow(item, personTotal, actions, person) {
  const row = document.createElement("div");
  row.className = "exp-row" + (item.paid ? " paid" : "");

  const st = limitStatus(item.amount, item.monthlyLimit);
  const share = shareOf(item.amount, personTotal);

  row.innerHTML = `
    <input class="exp-cat" type="text" value="${esc(item.category)}" placeholder="Kategoria" />
    <input class="exp-amt" type="number" inputmode="decimal" value="${item.amount ?? 0}" />
    <input class="exp-lim" type="number" inputmode="decimal" value="${item.monthlyLimit || ""}" placeholder="limit" />
    <span class="exp-share">${percent(share)}</span>
    <button class="exp-paid ${item.paid ? "on" : ""}" title="Status płatności">${item.paid ? "✓ Zapłacono" : "Nie zapłacono"}</button>
    <button class="exp-del" title="Usuń">✕</button>
  `;

  if (st.level) {
    const bar = document.createElement("div");
    bar.className = `limit-bar ${st.level}`;
    bar.innerHTML = `<i style="width:${Math.min(100, st.ratio * 100).toFixed(0)}%"></i>`;
    row.appendChild(bar);
  }

  row.querySelector(".exp-cat").addEventListener("input", (e) =>
    actions.updateExpense(person, item.id, { category: e.target.value }));
  row.querySelector(".exp-amt").addEventListener("input", (e) =>
    actions.updateExpense(person, item.id, { amount: parseFloat(e.target.value) || 0 }, true));
  row.querySelector(".exp-lim").addEventListener("input", (e) =>
    actions.updateExpense(person, item.id, { monthlyLimit: parseFloat(e.target.value) || 0 }, true));
  row.querySelector(".exp-paid").addEventListener("click", () =>
    actions.updateExpense(person, item.id, { paid: !item.paid }, true));
  row.querySelector(".exp-del").addEventListener("click", () =>
    actions.deleteExpense(person, item.id));

  return row;
}

function expenseColumn(title, person, list, personTotal, isMati, matiPart, actions) {
  const col = document.createElement("section");
  col.className = "exp-col card";
  col.innerHTML = `<header><h3>${esc(title)}</h3>
    <span class="exp-total">${money(personTotal)}</span></header>`;

  // Rata hipoteki jako pierwsza (nieedytowalna) pozycja wydatków Mati.
  if (isMati && matiPart) {
    const fixed = document.createElement("div");
    fixed.className = "exp-row fixed";
    fixed.innerHTML = `
      <span class="exp-cat-fixed">🏠 Rata hipoteki (część Mati)</span>
      <span class="exp-amt-fixed">${money(matiPart)}</span>
      <span class="exp-share">${percent(shareOf(matiPart, personTotal))}</span>`;
    col.appendChild(fixed);
  }

  const body = document.createElement("div");
  body.className = "exp-body";
  (list || []).forEach((item) =>
    body.appendChild(expenseRow(item, personTotal, actions, person)));
  col.appendChild(body);

  const add = document.createElement("button");
  add.className = "btn-add";
  add.textContent = "+ Dodaj pozycję";
  add.addEventListener("click", () => actions.addExpense(person));
  col.appendChild(add);

  return col;
}

function heroCard(label, value, cls = "") {
  return `<div class="hero-card ${cls}"><span class="hero-label">${esc(label)}</span>
    <strong class="hero-value">${value}</strong></div>`;
}

function sumRow(label, value, cls = "") {
  const good = Number(value) >= 0;
  return `<div class="sum-row ${cls}">
    <span>${esc(label)}</span>
    <b class="${cls === "signed" ? (good ? "pos" : "neg") : ""}">${money(value)}</b></div>`;
}

export function renderBudget(container, budget, actions) {
  const s = computeSummary(budget);
  container.innerHTML = "";

  // HERO
  const hero = document.createElement("div");
  hero.className = "hero";
  hero.innerHTML =
    heroCard("Dochód łączny", money(s.totalIncome)) +
    heroCard("Koszty łączne", money(s.totalCosts)) +
    heroCard("Zostaje", money(s.leftBeforeBuffer), s.leftBeforeBuffer >= 0 ? "good" : "bad") +
    heroCard("Stopa oszczędności", percent(s.rateTotal), "accent");
  container.appendChild(hero);

  // DOCHODY + HIPOTEKA
  const top = document.createElement("div");
  top.className = "grid-2";

  const inc = document.createElement("section");
  inc.className = "card";
  inc.innerHTML = "<h3>Dochody</h3>";
  inc.append(
    field("Pensja Mati", budget.income.matiSalary, (v) => actions.updateIncome({ matiSalary: v })),
    field("Pensja Kinia", budget.income.kiniaSalary, (v) => actions.updateIncome({ kiniaSalary: v })),
    field("Świadczenie 800+", budget.income.benefit800, (v) => actions.updateIncome({ benefit800: v })),
  );
  const incSum = document.createElement("div");
  incSum.className = "card-foot";
  incSum.innerHTML = `<span>Suma dochodów</span><b>${money(s.totalIncome)}</b>`;
  inc.appendChild(incSum);

  const mort = document.createElement("section");
  mort.className = "card";
  mort.innerHTML = "<h3>Hipoteka &amp; 800+</h3>";
  mort.append(
    field("Rata hipoteczna (łączna)", budget.mortgage.totalInstallment, (v) => actions.updateMortgage({ totalInstallment: v })),
    field("Pokrycie z 800+", budget.mortgage.coveredBy800, (v) => actions.updateMortgage({ coveredBy800: v })),
  );
  const mortFoot = document.createElement("div");
  mortFoot.className = "card-foot";
  mortFoot.innerHTML = `<span>Część Mati (do budżetu)</span><b>${money(mortgageMatiPart(budget.mortgage))}</b>`;
  mort.appendChild(mortFoot);

  top.append(inc, mort);
  container.appendChild(top);

  // WYDATKI — dwie kolumny
  const cols = document.createElement("div");
  cols.className = "grid-2 expenses";
  cols.append(
    expenseColumn("Wydatki Mati", "expensesMati", budget.expensesMati, s.totalMati, true, s.matiPart, actions),
    expenseColumn("Wydatki Kinia", "expensesKinia", budget.expensesKinia, s.totalKinia, false, 0, actions),
  );
  container.appendChild(cols);

  // PODSUMOWANIE
  const summary = document.createElement("section");
  summary.className = "card summary";
  summary.innerHTML = "<h3>Podsumowanie budżetu</h3>";
  const grid = document.createElement("div");
  grid.className = "sum-grid";
  grid.innerHTML =
    sumRow("Suma wydatków Mati", s.totalMati) +
    sumRow("Suma wydatków Kinia", s.totalKinia) +
    sumRow("Zostaje Mati", s.leftMati, "signed") +
    sumRow("Zostaje Kinia", s.leftKinia, "signed") +
    sumRow("Suma kosztów łącznie", s.totalCosts) +
    sumRow("Zostaje (przed buforem)", s.leftBeforeBuffer, "signed");
  summary.appendChild(grid);

  const bufWrap = document.createElement("div");
  bufWrap.className = "buffer-row";
  bufWrap.append(field("Bufor na sytuacje losowe", budget.buffer, (v) => actions.updateBuffer(v)));
  summary.appendChild(bufWrap);

  const savings = document.createElement("div");
  savings.className = "savings-row";
  savings.innerHTML = `
    <div class="save-big ${s.savings >= 0 ? "pos" : "neg"}">
      <span>Oszczędności miesięczne</span><strong>${money(s.savings)}</strong></div>
    <div class="rates">
      <span>Stopa Mati <b>${percent(s.rateMati)}</b></span>
      <span>Stopa Kinia <b>${percent(s.rateKinia)}</b></span>
      <span>Stopa łączna <b>${percent(s.rateTotal)}</b></span>
    </div>`;
  summary.appendChild(savings);

  container.appendChild(summary);
}
