// Widok "Ten miesiąc": hero, dochody, hipoteka/800+, dwie kolumny wydatków,
// podsumowanie na żywo. Renderuje do #view-budget.
//
// WAŻNE: pola input budujemy JEDEN raz. Przy pisaniu NIE przebudowujemy DOM
// (to gubiło focus po jednym znaku) — wywołujemy tylko refresh(), które
// aktualizuje wartości pochodne (sumy, %, paski, podsumowanie) w miejscu.
import { money, amount, percent, esc } from "./util.js";
import { computeSummary, shareOf, mortgageMatiPart, num, isActiveIn } from "./calc.js";
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

export function renderBudget(container, budget, actions, recurring = { itemsMati: [], itemsKinia: [] }, monthId = null) {
  container.innerHTML = "";
  const rowRefs = { expensesMati: [], expensesKinia: [] };
  const fixedRefs = { itemsMati: [], itemsKinia: [] };

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
  const hLeft = heroCard("Zostaje po buforze");
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
  // Wiersz: [ikona] [nazwa ......] [% udziału] [KWOTA zł] [✓] [✕]
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

    // Wszystko w jednej linii — wiersz zostaje niski.
    const share = document.createElement("span");
    share.className = "exp-share";

    main.append(ico, cat, share, amtWrap, check, del);
    row.append(main);
    return { row, item, share };
  }

  // Wiersz pozycji STAŁEJ — bez limitu i statusu (stałe są "zawsze"),
  // z pinezką. Edycja idzie do wspólnego dokumentu `recurring`.
  function buildFixedRow(person, item) {
    const row = document.createElement("div");
    row.className = "exp-row fixed-item";
    const main = document.createElement("div");
    main.className = "exp-main";
    const ico = document.createElement("span");
    ico.className = "exp-ico"; ico.textContent = categoryIcon(item.category);
    const cat = document.createElement("input");
    cat.type = "text"; cat.className = "exp-cat"; cat.placeholder = "Nazwa pozycji";
    cat.value = item.category || "";
    cat.addEventListener("input", () => {
      actions.updateRecurring(person, item.id, { category: cat.value });
      ico.textContent = categoryIcon(cat.value);
    });
    // Chip zakresu: klik rozwija inline edytor "od / do". Bez zakresu pokazuje
    // samą pinezkę (obowiązuje zawsze).
    const pin = document.createElement("button");
    pin.className = "pin range-chip";
    const rangeLabel = () => {
      const f = item.from, t = item.to;
      if (!f && !t) return "📌";
      const short = (m) => m ? m.split("-")[1] + "." + m.split("-")[0].slice(2) : "";
      if (f && t) return `📌 ${short(f)}–${short(t)}`;
      if (t) return `📌 do ${short(t)}`;
      return `📌 od ${short(f)}`;
    };
    pin.textContent = rangeLabel();
    pin.title = "Od kiedy do kiedy obowiązuje — kliknij, by ustawić";
    const amtWrap = document.createElement("div");
    amtWrap.className = "exp-amt-wrap";
    const amt = moneyInput(item.amount, "0"); amt.className = "exp-amt";
    amt.addEventListener("input", onEdit(() =>
      actions.updateRecurring(person, item.id, { amount: parseFloat(amt.value) || 0 })));
    const cur = document.createElement("span");
    cur.className = "exp-cur"; cur.textContent = "zł";
    amtWrap.append(amt, cur);
    const share = document.createElement("span");
    share.className = "exp-share";

    // Ptaszek "zapłacone" — status per miesiąc (z budget.recurringPaid).
    const paidNow = !!(budget.recurringPaid && budget.recurringPaid[item.id]);
    if (paidNow) row.classList.add("paid");
    const check = document.createElement("button");
    check.className = "exp-check" + (paidNow ? " on" : "");
    check.textContent = "✓";
    check.title = paidNow ? "Zapłacone — kliknij, by cofnąć" : "Oznacz jako zapłacone";
    check.addEventListener("click", () => {
      const next = !row.classList.contains("paid");
      actions.toggleRecurringPaid(item.id, next);
      row.classList.toggle("paid", next);
      check.classList.toggle("on", next);
      check.title = next ? "Zapłacone — kliknij, by cofnąć" : "Oznacz jako zapłacone";
    });

    const del = document.createElement("button");
    del.className = "exp-del"; del.title = "Usuń pozycję"; del.textContent = "✕";
    del.addEventListener("click", () => actions.deleteRecurring(person, item.id));
    main.append(ico, cat, share, pin, amtWrap, check, del);

    const range = document.createElement("div");
    range.className = "range-editor"; range.hidden = true;
    range.innerHTML = `
      <label>od <input type="month" class="r-from" value="${item.from || ""}"></label>
      <label>do <input type="month" class="r-to" value="${item.to || ""}"></label>
      <span class="range-hint">puste = bez ograniczenia</span>`;
    const rFrom = range.querySelector(".r-from");
    const rTo = range.querySelector(".r-to");
    const onRange = () => {
      actions.updateRecurring(person, item.id, { from: rFrom.value || null, to: rTo.value || null });
      pin.textContent = rangeLabel();
      // Zmiana zakresu może wyrzucić pozycję z bieżącego miesiąca — przerysuj.
      actions.rerender();
    };
    rFrom.addEventListener("change", onRange);
    rTo.addEventListener("change", onRange);
    pin.addEventListener("click", () => { range.hidden = !range.hidden; });

    row.append(main, range);
    return { row, item, share };
  }

  function buildFixedColumn(title, person, list, isMati) {
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

    // Rata hipoteki to stała pozycja Mati — liczona z pól hipoteki, nieedytowalna tutaj.
    let rataAmt = null, rataShare = null;
    if (isMati) {
      const rata = document.createElement("div");
      rata.className = "exp-row fixed-item rata";
      rata.innerHTML = `<div class="exp-main">
        <span class="exp-ico">🏦</span>
        <span class="exp-cat-fixed" title="Część raty hipotecznej obciążająca budżet Mati (po pokryciu z 800+)">Rata hipoteki <em>(Mati)</em></span>
        <span class="exp-share rata-share"></span>
        <span class="pin">📌</span>
        <div class="exp-amt-wrap"><span class="exp-amt-fixed"></span><span class="exp-cur">zł</span></div>
        <button class="exp-check rata-check" title="Oznacz jako zapłacone">✓</button>
        <span class="exp-del-spacer" aria-hidden="true"></span></div>`;
      rataAmt = rata.querySelector(".exp-amt-fixed");
      rataShare = rata.querySelector(".rata-share");
      const rataCheck = rata.querySelector(".rata-check");
      if (budget.recurringPaid && budget.recurringPaid.rata) {
        rata.classList.add("paid"); rataCheck.classList.add("on");
      }
      rataCheck.addEventListener("click", () => {
        const next = !rata.classList.contains("paid");
        actions.toggleRecurringPaid("rata", next);
        rata.classList.toggle("paid", next);
        rataCheck.classList.toggle("on", next);
        rataCheck.title = next ? "Zapłacone — kliknij, by cofnąć" : "Oznacz jako zapłacone";
      });
      col.appendChild(rata);
    }

    const body = document.createElement("div");
    body.className = "exp-body";
    (list || []).forEach((item) => {
      const r = buildFixedRow(person, item);
      fixedRefs[person].push(r);
      body.appendChild(r.row);
    });
    col.appendChild(body);

    const add = document.createElement("button");
    add.className = "btn-add"; add.textContent = "+ Dodaj stałą pozycję";
    add.addEventListener("click", () => actions.addRecurring(person));
    col.appendChild(add);

    return { col, totalEl: head.querySelector(".exp-total"), rataAmt, rataShare };
  }

  function buildColumn(title, person, list) {
    const isMati = person === "expensesMati";
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

    const body = document.createElement("div");
    body.className = "exp-body";
    (list || []).forEach((item) => {
      const r = buildRow(person, item);
      rowRefs[person].push(r);
      body.appendChild(r.row);
    });
    col.appendChild(body);

    const add = document.createElement("button");
    add.className = "btn-add"; add.textContent = "+ Dodaj zmienną pozycję";
    add.addEventListener("click", () => actions.addExpense(person));
    col.appendChild(add);

    return { col, totalEl };
  }

  // ---------- KARTA WYDATKÓW STAŁYCH ----------
  const fixedCard = document.createElement("section");
  fixedCard.className = "card fixed-card";
  fixedCard.innerHTML = `
    <div class="fixed-head"><span class="fixed-badge">📌 stałe</span>
      <h3>Wydatki stałe (co miesiąc)</h3></div>
    <p class="fixed-note">Definiujesz raz — apka dolicza je do <b>każdego</b> miesiąca.
       Zmiana kwoty tutaj działa we wszystkich miesiącach.</p>`;
  const fgrid = document.createElement("div");
  fgrid.className = "grid-2 expenses";
  // Pokazujemy tylko pozycje obowiązujące w tym miesiącu — inaczej lista
  // pęczniałaby o wszystko, co kiedykolwiek istniało.
  const actMati = (recurring.itemsMati || []).filter((i) => isActiveIn(i, monthId));
  const actKinia = (recurring.itemsKinia || []).filter((i) => isActiveIn(i, monthId));
  const hiddenCount = (recurring.itemsMati || []).length + (recurring.itemsKinia || []).length
    - actMati.length - actKinia.length;
  const fMati = buildFixedColumn("Stałe Mati", "itemsMati", actMati, true);
  const fKinia = buildFixedColumn("Stałe Kinia", "itemsKinia", actKinia, false);
  fgrid.append(fMati.col, fKinia.col);
  fixedCard.appendChild(fgrid);
  if (hiddenCount > 0) {
    fixedCard.insertAdjacentHTML("beforeend",
      `<p class="fixed-hidden">${hiddenCount} ${hiddenCount === 1 ? "pozycja nie obowiązuje" : "pozycji nie obowiązuje"} w tym miesiącu (poza zakresem dat).</p>`);
  }
  container.appendChild(fixedCard);

  // ---------- PASEK PRZEPŁYWU: stałe + zmienne = koszty ----------
  const flow = document.createElement("div");
  flow.className = "sum-flow";
  flow.innerHTML = `
    <span class="flow-chip fixed">Stałe (co miesiąc) <b class="f-fixed"></b></span>
    <span class="flow-op">+</span>
    <span class="flow-chip var">Zmienne (ten miesiąc) <b class="f-var"></b></span>
    <span class="flow-op">=</span>
    <span class="flow-chip sum">Wydatki Mati + Kinia <b class="f-sum"></b></span>`;
  container.appendChild(flow);

  // ---------- ZMIENNE WYDATKI ----------
  const cols = document.createElement("div");
  cols.className = "grid-2 expenses";
  const colMati = buildColumn("Zmienne Mati", "expensesMati", budget.expensesMati);
  const colKinia = buildColumn("Zmienne Kinia", "expensesKinia", budget.expensesKinia);
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
  const sFixed = sumRow("Wydatki stałe (co miesiąc)");
  const sVar = sumRow("Zmienne w tym miesiącu");
  const sCosts = sumRow("Suma kosztów łącznie");
  const sLeftMati = sumRow("Zostaje Mati", "signed");
  const sLeftKinia = sumRow("Zostaje Kinia", "signed");
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
    r.share.textContent = percent(shareOf(r.item.amount, personTotal));
  };

  refresh = () => {
    const s = computeSummary(budget, recurring, monthId);

    hIncome.textContent = money(s.totalIncome);
    hCosts.textContent = money(s.totalCosts);
    // Ta sama definicja co na Pulpicie i w arkuszu: po odjęciu bufora.
    // Wersja przed buforem została w podsumowaniu niżej, jako osobny wiersz.
    hLeft.textContent = money(s.savings);
    hLeftCardEl.classList.toggle("good", s.savings >= 0);
    hLeftCardEl.classList.toggle("bad", s.savings < 0);
    hRate.textContent = percent(s.rateTotal);

    incFoot.querySelector("b").textContent = money(s.totalIncome);
    mortFoot.querySelector("b").textContent = money(mortgageMatiPart(budget.mortgage));

    // Karta stałych: rata + suma pozycji stałych per osoba + udziały %.
    if (fMati.rataAmt) fMati.rataAmt.textContent = amount(s.matiPart);
    if (fMati.rataShare) fMati.rataShare.textContent = percent(shareOf(s.matiPart, s.totalMati));
    fMati.totalEl.textContent = money(s.matiPart + s.fixedMati);
    fKinia.totalEl.textContent = money(s.fixedKinia);
    fixedRefs.itemsMati.forEach((r) => { r.share.textContent = percent(shareOf(r.item.amount, s.totalMati)); });
    fixedRefs.itemsKinia.forEach((r) => { r.share.textContent = percent(shareOf(r.item.amount, s.totalKinia)); });

    // Kolumny zmiennych: tylko sumy zmienne.
    colMati.totalEl.textContent = money(s.varMati);
    colKinia.totalEl.textContent = money(s.varKinia);

    // Pasek przepływu — sumuje dokładnie to, co widać na kartach (część Mati raty,
    // nie pełną). Pełne "Koszty łączne" (z całą ratą) są w hero i podsumowaniu.
    flow.querySelector(".f-fixed").textContent = money(s.fixedTotal);
    flow.querySelector(".f-var").textContent = money(s.varTotal);
    flow.querySelector(".f-sum").textContent = money(s.totalMati + s.totalKinia);

    // Udział % zmiennych liczymy względem całkowitych wydatków osoby.
    rowRefs.expensesMati.forEach((r) => updateRow(r, s.totalMati));
    rowRefs.expensesKinia.forEach((r) => updateRow(r, s.totalKinia));

    sFixed.textContent = money(s.fixedTotal);
    sVar.textContent = money(s.varTotal);
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
