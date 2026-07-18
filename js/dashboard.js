// Widok "Pulpit" — synteza tego, co rozproszone po innych zakładkach.
// Układ informacji wzorowany na Copilot Money, ale na naszych danych:
// nie mamy transakcji, więc zamiast "do przejrzenia" pokazujemy niezapłacone
// pozycje, pierścienie limitów i porównanie z poprzednim miesiącem.
import { money, percent, monthLabel, monthLocative, shiftMonth, esc } from "./util.js";
import { computeSummary, limitStatus } from "./calc.js";
import { computeYear } from "./year.js";
import { eyebrow } from "./ui.js";
import { categoryIcon } from "./icons.js";

const RING_R = 26;
const RING_C = 2 * Math.PI * RING_R;

function ring(ratio, color) {
  const off = RING_C * (1 - Math.max(0, Math.min(1, ratio)));
  return `<svg class="ring" viewBox="0 0 64 64" aria-hidden="true">
    <circle class="ring-bg" cx="32" cy="32" r="${RING_R}"></circle>
    <circle class="ring-fg" cx="32" cy="32" r="${RING_R}" stroke="${color}"
      stroke-dasharray="${RING_C.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"></circle>
  </svg>`;
}

const LEVEL_COLOR = { green: "#34c759", amber: "#ff9f0a", red: "#ff3b30" };

function card(parent, eyebrowText, title, extraClass = "") {
  const s = document.createElement("section");
  s.className = "card " + extraClass;
  if (eyebrowText) s.appendChild(eyebrow(eyebrowText));
  if (title) s.insertAdjacentHTML("beforeend", `<h3>${esc(title)}</h3>`);
  parent.appendChild(s);
  return s;
}

// Wszystkie pozycje wydatków obu osób w jednej liście.
function allExpenses(budget) {
  return [
    ...(budget.expensesMati || []).map((e) => ({ ...e, who: "M" })),
    ...(budget.expensesKinia || []).map((e) => ({ ...e, who: "K" })),
  ];
}

export function renderDashboard(container, ctx, actions) {
  const { budget, allBudgets, monthId, year, yearId, goals } = ctx;
  container.innerHTML = "";

  const s = computeSummary(budget);
  const items = allExpenses(budget);

  // Poprzedni miesiąc — do porównania "czy idzie lepiej".
  const prevId = shiftMonth(monthId, -1);
  const prevBudget = (allBudgets || []).find((b) => b.id === prevId);
  const prev = prevBudget ? computeSummary(prevBudget) : null;

  // ---------- 1. HERO: ile zostaje ----------
  const heroCard = card(container, monthLabel(monthId), "", "dash-hero");
  const spentRatio = s.totalIncome > 0 ? s.totalCosts / s.totalIncome : 0;
  const diff = prev ? s.totalCosts - prev.totalCosts : null;

  heroCard.insertAdjacentHTML("beforeend", `
    <div class="dash-hero-main">
      <div class="dash-hero-num">
        <strong>${money(s.savings)}</strong>
        <span>zostaje po buforze</span>
      </div>
      <div class="dash-hero-side">
        <div><span>Dochód</span><b>${money(s.totalIncome)}</b></div>
        <div><span>Wydane</span><b>${money(s.totalCosts)}</b></div>
        <div><span>Stopa oszczędności</span><b>${percent(s.rateTotal)}</b></div>
      </div>
    </div>
    <div class="dash-bar" title="Udział kosztów w dochodzie">
      <i style="width:${Math.min(100, spentRatio * 100).toFixed(1)}%"></i>
    </div>
    <div class="dash-hero-foot">
      <span>${percent(spentRatio)} dochodu poszło na koszty</span>
      ${diff === null ? `<span class="muted">Brak danych z ${monthLabel(prevId)} do porównania</span>`
        : `<span class="delta ${diff <= 0 ? "good" : "bad"}">
             ${diff <= 0 ? "▼" : "▲"} ${money(Math.abs(diff))}
             ${diff <= 0 ? "mniej" : "więcej"} niż w ${monthLocative(prevId)}
           </span>`}
    </div>`);

  const grid = document.createElement("div");
  grid.className = "grid-2";
  container.appendChild(grid);

  // ---------- 2. DO ZAPŁATY ----------
  const payCard = card(grid, "Wymaga uwagi", "Do zapłaty");
  const unpaid = items.filter((e) => !e.paid && +e.amount > 0);
  const unpaidSum = unpaid.reduce((a, e) => a + (+e.amount || 0), 0);
  const paidCount = items.filter((e) => e.paid).length;

  if (!items.length) {
    payCard.insertAdjacentHTML("beforeend", `<p class="empty">Brak pozycji w tym miesiącu.</p>`);
  } else if (!unpaid.length) {
    payCard.insertAdjacentHTML("beforeend",
      `<div class="all-paid"><span>✓</span><p>Wszystko zapłacone w tym miesiącu.</p></div>`);
  } else {
    payCard.insertAdjacentHTML("beforeend", `
      <div class="pay-top">
        <strong>${money(unpaidSum)}</strong>
        <span>${unpaid.length} ${unpaid.length === 1 ? "pozycja" : "pozycji"} ·
              zapłacone ${paidCount} z ${items.length}</span>
      </div>`);
    const list = document.createElement("div");
    list.className = "pay-list";
    unpaid.sort((a, b) => (+b.amount) - (+a.amount)).slice(0, 6).forEach((e) => {
      const row = document.createElement("div");
      row.className = "pay-row";
      row.innerHTML = `
        <span class="exp-ico">${categoryIcon(e.category)}</span>
        <span class="pay-name">${esc(e.category || "Bez nazwy")}</span>
        <span class="legend-who ${e.who === "M" ? "m" : "k"}">${e.who}</span>
        <span class="pay-val">${money(+e.amount)}</span>`;
      list.appendChild(row);
    });
    payCard.appendChild(list);
    if (unpaid.length > 6) {
      payCard.insertAdjacentHTML("beforeend",
        `<p class="pay-more">…i jeszcze ${unpaid.length - 6}</p>`);
    }
  }

  // ---------- 3. PLAN ROCZNY W SKRÓCIE ----------
  const yearCard = card(grid, `Plan roczny ${yearId}`, "Jak idzie rok");
  if (!year) {
    yearCard.insertAdjacentHTML("beforeend",
      `<p class="empty">Brak planu na ${yearId}. Załóż go w zakładce „Plan roczny”.</p>`);
  } else {
    const y = computeYear(year);
    const target = y.planEnd;
    const now = y.last ? y.last.actual : null;
    const prog = target > 0 && now !== null ? now / target : null;
    yearCard.insertAdjacentHTML("beforeend", `
      <div class="yr-mini">
        <div class="yr-mini-num">
          <strong>${now !== null ? money(now) : "—"}</strong>
          <span>${target ? `z ${money(target)} na koniec roku` : "brak celu na koniec roku"}</span>
        </div>
        ${y.last && y.last.gap !== null ? `
          <div class="yr-mini-gap ${y.last.gap >= 0 ? "good" : "bad"}">
            ${y.last.gap >= 0 ? "+" : ""}${money(y.last.gap)}
            <span>${y.last.gap >= 0 ? "powyżej planu" : "poniżej planu"}</span>
          </div>` : ""}
      </div>
      ${prog !== null ? `<div class="dash-bar green">
        <i style="width:${Math.min(100, prog * 100).toFixed(1)}%"></i></div>
        <p class="pay-more">${percent(prog)} celu na koniec roku</p>` : ""}
      <div class="yr-mini-foot">
        <span>Wydatki jednorazowe zaplanowane na rok</span>
        <b>${money(y.oneOffTotal)}</b>
      </div>`);
  }

  // ---------- 4. PIERŚCIENIE LIMITÓW ----------
  const withLimit = items.filter((e) => +e.monthlyLimit > 0);
  const ringCard = card(container, "Limity miesięczne", "Ile zostało w kategoriach");
  if (!withLimit.length) {
    ringCard.insertAdjacentHTML("beforeend", `
      <p class="empty">Nie masz jeszcze ustawionych limitów. Ustaw je przy pozycjach
      w zakładce „Ten miesiąc”, a tutaj pojawią się pierścienie postępu.</p>`);
  } else {
    const wrap = document.createElement("div");
    wrap.className = "rings";
    withLimit
      .sort((a, b) => (+b.amount / +b.monthlyLimit) - (+a.amount / +a.monthlyLimit))
      .forEach((e) => {
        const st = limitStatus(e.amount, e.monthlyLimit);
        const left = (+e.monthlyLimit) - (+e.amount);
        const cell = document.createElement("div");
        cell.className = "ring-cell";
        cell.innerHTML = `
          <div class="ring-wrap">
            ${ring(st.ratio, LEVEL_COLOR[st.level] || "#8e8e93")}
            <span class="ring-ico">${categoryIcon(e.category)}</span>
          </div>
          <span class="ring-name">${esc(e.category || "Bez nazwy")}</span>
          <span class="ring-val ${left >= 0 ? "" : "over"}">
            ${money(Math.abs(left))} ${left >= 0 ? "zostało" : "ponad"}
          </span>`;
        wrap.appendChild(cell);
      });
    ringCard.appendChild(wrap);
  }

  // ---------- 5. CELE ----------
  const active = (goals || []).filter((g) => +g.targetAmount > 0);
  if (active.length) {
    const goalCard = card(container, "Cele oszczędnościowe", "Postęp");
    const list = document.createElement("div");
    list.className = "dash-goals";
    active
      .sort((a, b) => (b.isDefault ? 1 : 0) - (a.isDefault ? 1 : 0))
      .slice(0, 4)
      .forEach((g) => {
        const r = Math.min(1, (+g.currentAmount || 0) / +g.targetAmount);
        const row = document.createElement("div");
        row.className = "dash-goal";
        row.innerHTML = `
          <div class="dash-goal-top">
            <span>${g.isDefault ? '<span class="goal-star">🎯</span>' : ""}${esc(g.name)}</span>
            <b>${money(+g.currentAmount || 0)} / ${money(+g.targetAmount)}</b>
          </div>
          <div class="goal-bar ${r >= 1 ? "done" : ""}"><i style="width:${(r * 100).toFixed(1)}%"></i></div>
          <span class="dash-goal-pct">${percent(r)}${g.targetDate ? ` · do ${esc(g.targetDate)}` : ""}</span>`;
        list.appendChild(row);
      });
    goalCard.appendChild(list);
  }
}
