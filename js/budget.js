// Widok "Ten miesiąc": hero, dochody, hipoteka/800+, dwie kolumny wydatków,
// podsumowanie na żywo. Renderuje do #view-budget.
//
// WAŻNE: pola input budujemy JEDEN raz. Przy pisaniu NIE przebudowujemy DOM
// (to gubiło focus po jednym znaku) — wywołujemy tylko refresh(), które
// aktualizuje wartości pochodne (sumy, %, paski, podsumowanie) w miejscu.
import { money, amount, percent, esc } from "./util.js";
import { computeSummary, shareOf, limitStatus, mortgageMatiPart } from "./calc.js";
import { categoryIcon } from "./icons.js";
import { moneyField } from "./ui.js";

function moneyInput(value, placeholder = "") {
  const input = document.createElement("input");
  input.type = "number";
  input.inputMode = "decimal";
  // Kwoty mają grosze — bez tego 714,25 jest formalnie niepoprawne.
  input.step = "0.01";
  if (placeholder) input.placeholder = placeholder;
  input.value = value ?? "";
  return input;
}

export function renderBudget(container, budget, actions) {
  container.innerHTML = "";
  const rowRefs = { expensesMati: [], expensesKinia: [] };

  // refresh() jest definiowane niżej, ale handlery odwołują się do niego przez domknięcie.
  let refresh = () => {};
  const onEdit = (fn) => () => { fn(); refresh(); };

  // ---------- HERO ----------
  const hero = document.createElement("div");
  hero.className = "hero";
  const heroCard = (label, cls = "") => {
    const card = document.createElement("div");
    card.className = "hero-card " + cls;
    card.innerHTML = `<span class="hero-label">${esc(label)}</span><strong class="hero-value"></strong>`;
    hero.appendChild(card);
    return card.querySelector(".hero-value");
  };
  const hIncome = heroCard("Dochód łączny");
  const hCosts = heroCard("Koszty łączne");
  const hLeft = heroCard("Zostaje");
  const hRate = heroCard("Stopa oszczędności", "accent");
  const hLeftCardEl = hLeft.closest(".hero-card");
  container.appendChild(hero);

  // ---------- DOCHODY + HIPOTEKA ----------
  // Wspólne pole kwoty (z sufiksem "zł") — spójna waluta w całej apce.
  const numberField = (parent, label, value, onInput) =>
    moneyField(parent, label, value, (v) => { onInput(v); refresh(); });

  const top = document.createElement("div");
  top.className = "grid-2";

  const inc = document.createElement("section");
  inc.className = "card";
  inc.innerHTML = `<h3><span class="sec-ico">💵</span>Dochody</h3>`;
  numberField(inc, "Pensja Mati", budget.income.matiSalary, (v) => actions.updateIncome({ matiSalary: v }));
  numberField(inc, "Pensja Kinia", budget.income.kiniaSalary, (v) => actions.updateIncome({ kiniaSalary: v }));
  numberField(inc, "Świadczenie 800+", budget.income.benefit800, (v) => actions.updateIncome({ benefit800: v }));
  const incFoot = document.createElement("div");
  incFoot.className = "card-foot";
  incFoot.innerHTML = `<span>Suma dochodów</span><b></b>`;
  inc.appendChild(incFoot);

  const mort = document.createElement("section");
  mort.className = "card";
  mort.innerHTML = `<h3><span class="sec-ico">🏦</span>Hipoteka &amp; 800+</h3>`;
  numberField(mort, "Rata hipoteczna (łączna)", budget.mortgage.totalInstallment, (v) => actions.updateMortgage({ totalInstallment: v }));
  numberField(mort, "Pokrycie z 800+", budget.mortgage.coveredBy800, (v) => actions.updateMortgage({ coveredBy800: v }));
  const mortFoot = document.createElement("div");
  mortFoot.className = "card-foot";
  mortFoot.innerHTML = `<span>Część Mati (do budżetu)</span><b></b>`;
  mort.appendChild(mortFoot);

  top.append(inc, mort);
  container.appendChild(top);

  // ---------- WYDATKI ----------
  // Wiersz: [ikona] [nazwa ......] [KWOTA zł] [✓] [✕]
  //         [meta: % udziału ........... limit (opcjonalny)]
  //         [pasek postępu — tylko gdy ustawiono limit]
  function buildRow(person, item) {
    const row = document.createElement("div");
    row.className = "exp-row" + (item.paid ? " paid" : "");

    const main = document.createElement("div");
    main.className = "exp-main";

    const ico = document.createElement("span");
    ico.className = "exp-ico";
    ico.textContent = categoryIcon(item.category);

    const cat = document.createElement("input");
    cat.type = "text"; cat.className = "exp-cat"; cat.placeholder = "Nazwa kategorii";
    cat.value = item.category || "";
    cat.addEventListener("input", () => {
      actions.updateExpense(person, item.id, { category: cat.value });
      ico.textContent = categoryIcon(cat.value); // ikona nadąża za nazwą
    });

    const amtWrap = document.createElement("div");
    amtWrap.className = "exp-amt-wrap";
    const amt = moneyInput(item.amount, "0"); amt.className = "exp-amt";
    amt.addEventListener("input", onEdit(() =>
      actions.updateExpense(person, item.id, { amount: parseFloat(amt.value) || 0 })));
    const cur = document.createElement("span");
    cur.className = "exp-cur"; cur.textContent = "zł";
    amtWrap.append(amt, cur);

    const check = document.createElement("button");
    check.className = "exp-check" + (item.paid ? " on" : "");
    check.textContent = "✓";
    check.title = item.paid ? "Zapłacone — kliknij, by cofnąć" : "Oznacz jako zapłacone";
    check.addEventListener("click", () => {
      const next = !item.paid;
      actions.updateExpense(person, item.id, { paid: next });
      row.classList.toggle("paid", next);
      check.classList.toggle("on", next);
      check.title = next ? "Zapłacone — kliknij, by cofnąć" : "Oznacz jako zapłacone";
    });

    const del = document.createElement("button");
    del.className = "exp-del"; del.title = "Usuń pozycję"; del.textContent = "✕";
    del.addEventListener("click", () => actions.deleteExpense(person, item.id));

    main.append(ico, cat, amtWrap, check, del);

    // --- meta: udział % + opcjonalny limit ---
    const meta = document.createElement("div");
    meta.className = "exp-meta";
    const share = document.createElement("span");
    share.className = "exp-share";
    const limWrap = document.createElement("label");
    limWrap.className = "exp-lim-wrap";
    limWrap.title = "Opcjonalny limit miesięczny — pokaże pasek postępu";
    // Etykieta "limit" pojawia się dopiero, gdy limit jest ustawiony —
    // pusty limit zostaje samym dyskretnym placeholderem.
    const limLabel = document.createElement("span");
    limLabel.className = "exp-lim-label"; limLabel.textContent = "limit";
    const lim = moneyInput(item.monthlyLimit || "", "limit"); lim.className = "exp-lim";
    lim.addEventListener("input", onEdit(() =>
      actions.updateExpense(person, item.id, { monthlyLimit: parseFloat(lim.value) || 0 })));
    limWrap.append(limLabel, lim);
    meta.append(share, limWrap);

    const bar = document.createElement("div");
    bar.className = "limit-bar"; bar.innerHTML = "<i></i>"; bar.hidden = true;

    row.append(main, meta, bar);
    return { row, item, share, limLabel, bar, barI: bar.querySelector("i") };
  }

  function buildColumn(title, person, list, isMati) {
    const col = document.createElement("section");
    col.className = "exp-col card";
    const head = document.createElement("header");
    head.innerHTML = `
      <div class="col-head">
        <span class="avatar ${isMati ? "m" : "k"}">${isMati ? "M" : "K"}</span>
        <h3>${esc(title)}</h3>
      </div>
      <span class="exp-total"></span>`;
    col.appendChild(head);
    const totalEl = head.querySelector(".exp-total");

    let fixed = null, fixedAmt = null, fixedShare = null;
    if (isMati) {
      fixed = document.createElement("div");
      fixed.className = "exp-row fixed";
      fixed.innerHTML = `
        <div class="exp-main">
          <span class="exp-ico">🏦</span>
          <span class="exp-cat-fixed">Rata hipoteki <em>(część Mati)</em></span>
          <div class="exp-amt-wrap"><span class="exp-amt-fixed"></span><span class="exp-cur">zł</span></div>
        </div>
        <div class="exp-meta"><span class="exp-share"></span></div>`;
      fixedAmt = fixed.querySelector(".exp-amt-fixed");
      fixedShare = fixed.querySelector(".exp-share");
      col.appendChild(fixed);
    }

    const body = document.createElement("div");
    body.className = "exp-body";
    (list || []).forEach((item) => {
      const r = buildRow(person, item);
      rowRefs[person].push(r);
      body.appendChild(r.row);
    });
    col.appendChild(body);

    const add = document.createElement("button");
    add.className = "btn-add"; add.textContent = "+ Dodaj pozycję";
    add.addEventListener("click", () => actions.addExpense(person));
    col.appendChild(add);

    return { col, totalEl, fixed, fixedAmt, fixedShare };
  }

  const cols = document.createElement("div");
  cols.className = "grid-2 expenses";
  const colMati = buildColumn("Wydatki Mati", "expensesMati", budget.expensesMati, true);
  const colKinia = buildColumn("Wydatki Kinia", "expensesKinia", budget.expensesKinia, false);
  cols.append(colMati.col, colKinia.col);
  container.appendChild(cols);

  // ---------- PODSUMOWANIE ----------
  const summary = document.createElement("section");
  summary.className = "card summary";
  summary.innerHTML = `<h3><span class="sec-ico">📊</span>Podsumowanie budżetu</h3>`;
  const grid = document.createElement("div");
  grid.className = "sum-grid";
  const sumRow = (label, cls = "") => {
    const div = document.createElement("div");
    div.className = "sum-row " + cls;
    div.innerHTML = `<span>${esc(label)}</span><b></b>`;
    grid.appendChild(div);
    return div.querySelector("b");
  };
  const sMatiExp = sumRow("Suma wydatków Mati");
  const sKiniaExp = sumRow("Suma wydatków Kinia");
  const sLeftMati = sumRow("Zostaje Mati", "signed");
  const sLeftKinia = sumRow("Zostaje Kinia", "signed");
  const sCosts = sumRow("Suma kosztów łącznie");
  const sLeftBuf = sumRow("Zostaje (przed buforem)", "signed");
  summary.appendChild(grid);

  const bufWrap = document.createElement("div");
  bufWrap.className = "buffer-row";
  numberField(bufWrap, "Bufor na sytuacje losowe", budget.buffer, (v) => actions.updateBuffer(v));
  summary.appendChild(bufWrap);

  const savings = document.createElement("div");
  savings.className = "savings-row";
  savings.innerHTML = `
    <div class="save-big"><span>Oszczędności miesięczne</span><strong></strong></div>
    <div class="rates">
      <span>Stopa Mati <b class="r-mati"></b></span>
      <span>Stopa Kinia <b class="r-kinia"></b></span>
      <span>Stopa łączna <b class="r-total"></b></span>
    </div>`;
  const saveBig = savings.querySelector(".save-big");
  const saveVal = savings.querySelector(".save-big strong");
  const rMati = savings.querySelector(".r-mati");
  const rKinia = savings.querySelector(".r-kinia");
  const rTotal = savings.querySelector(".r-total");
  summary.appendChild(savings);
  container.appendChild(summary);

  // ---------- REFRESH (tylko wartości pochodne, bez ruszania inputów) ----------
  const signed = (el, v) => {
    el.textContent = money(v);
    el.classList.toggle("pos", v >= 0);
    el.classList.toggle("neg", v < 0);
  };
  const updateRow = (r, personTotal) => {
    r.share.textContent = percent(shareOf(r.item.amount, personTotal)) + " wydatków";
    const st = limitStatus(r.item.amount, r.item.monthlyLimit);
    r.limLabel.hidden = !(Number(r.item.monthlyLimit) > 0);
    if (st.level) {
      r.bar.hidden = false;
      r.bar.className = "limit-bar " + st.level;
      r.barI.style.width = Math.min(100, st.ratio * 100).toFixed(0) + "%";
    } else {
      r.bar.hidden = true;
    }
  };

  refresh = () => {
    const s = computeSummary(budget);

    hIncome.textContent = money(s.totalIncome);
    hCosts.textContent = money(s.totalCosts);
    hLeft.textContent = money(s.leftBeforeBuffer);
    hLeftCardEl.classList.toggle("good", s.leftBeforeBuffer >= 0);
    hLeftCardEl.classList.toggle("bad", s.leftBeforeBuffer < 0);
    hRate.textContent = percent(s.rateTotal);

    incFoot.querySelector("b").textContent = money(s.totalIncome);
    mortFoot.querySelector("b").textContent = money(mortgageMatiPart(budget.mortgage));

    colMati.totalEl.textContent = money(s.totalMati);
    colKinia.totalEl.textContent = money(s.totalKinia);
    if (colMati.fixed) {
      colMati.fixed.hidden = !s.matiPart;
      colMati.fixedAmt.textContent = amount(s.matiPart);
      colMati.fixedShare.textContent = percent(shareOf(s.matiPart, s.totalMati)) + " wydatków";
    }

    rowRefs.expensesMati.forEach((r) => updateRow(r, s.totalMati));
    rowRefs.expensesKinia.forEach((r) => updateRow(r, s.totalKinia));

    sMatiExp.textContent = money(s.totalMati);
    sKiniaExp.textContent = money(s.totalKinia);
    signed(sLeftMati, s.leftMati);
    signed(sLeftKinia, s.leftKinia);
    sCosts.textContent = money(s.totalCosts);
    signed(sLeftBuf, s.leftBeforeBuffer);

    saveVal.textContent = money(s.savings);
    saveBig.classList.toggle("pos", s.savings >= 0);
    saveBig.classList.toggle("neg", s.savings < 0);
    rMati.textContent = percent(s.rateMati);
    rKinia.textContent = percent(s.rateKinia);
    rTotal.textContent = percent(s.rateTotal);
  };

  refresh();
}
