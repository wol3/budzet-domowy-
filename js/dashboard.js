// Widok "Pulpit" — chart-forward, wzorowany na Copilot Money.
// Zasada: dashboard pokazuje KSZTAŁT danych (trend, proporcje, postęp).
// Po surowe liczby są pozostałe zakładki — tutaj mają rządzić wykresy.
import { money, percent, monthLabel, monthLocative, shiftMonth, esc } from "./util.js";
import { computeSummary, limitStatus } from "./calc.js";
import { computeYear } from "./year.js";
import { eyebrow } from "./ui.js";
import { categoryIcon } from "./icons.js";

const FONT = { family: "-apple-system, 'SF Pro Text', Inter, sans-serif", size: 11 };
const PALETTE = ["#0071e3", "#34c759", "#ff9f0a", "#ff375f", "#5e5ce6",
  "#64d2ff", "#bf5af2", "#ffd60a"];
const LEVEL_COLOR = { green: "#34c759", amber: "#ff9f0a", red: "#ff3b30" };

const tooltipStyle = {
  backgroundColor: "rgba(29,29,31,.92)", padding: 12, cornerRadius: 10,
  usePointStyle: true, titleFont: { ...FONT, size: 12 }, bodyFont: { ...FONT, size: 12 },
  displayColors: false,
};
const axisMoney = (v) => {
  const a = Math.abs(v);
  if (a >= 1000) {
    const k = v / 1000;
    return (Number.isInteger(k) ? k : Number(k.toFixed(1))) + "k";
  }
  return Math.round(v);
};

let charts = [];
const destroyCharts = () => { charts.forEach((c) => c.destroy()); charts = []; };

const RING_R = 26, RING_C = 2 * Math.PI * RING_R;
function ringSvg(ratio, color) {
  const off = RING_C * (1 - Math.max(0, Math.min(1, ratio)));
  return `<svg class="ring" viewBox="0 0 64 64" aria-hidden="true">
    <circle class="ring-bg" cx="32" cy="32" r="${RING_R}"></circle>
    <circle class="ring-fg" cx="32" cy="32" r="${RING_R}" stroke="${color}"
      stroke-dasharray="${RING_C.toFixed(1)}" stroke-dashoffset="${off.toFixed(1)}"></circle>
  </svg>`;
}

function card(parent, eyebrowText, title, cls = "") {
  const s = document.createElement("section");
  s.className = "card " + cls;
  if (eyebrowText) s.appendChild(eyebrow(eyebrowText));
  if (title) s.insertAdjacentHTML("beforeend", `<h3>${esc(title)}</h3>`);
  parent.appendChild(s);
  return s;
}

const allExpenses = (b) => [
  ...(b.expensesMati || []).map((e) => ({ ...e, who: "M" })),
  ...(b.expensesKinia || []).map((e) => ({ ...e, who: "K" })),
];

export function renderDashboard(container, ctx) {
  const { budget, allBudgets, monthId, year, yearId, goals } = ctx;
  destroyCharts();
  container.innerHTML = "";

  const s = computeSummary(budget);
  const items = allExpenses(budget);
  const prevId = shiftMonth(monthId, -1);
  const prevBudget = (allBudgets || []).find((b) => b.id === prevId);
  const prev = prevBudget ? computeSummary(prevBudget) : null;
  const diff = prev ? s.totalCosts - prev.totalCosts : null;

  // Historia miesięcy do trendu (bieżący bierzemy ze stanu na żywo).
  const history = [...(allBudgets || []).filter((b) => b.id !== monthId),
    { ...budget, id: monthId }]
    .sort((a, b) => String(a.id).localeCompare(String(b.id)))
    .slice(-12)
    .map((b) => ({ id: b.id, ...computeSummary(b) }));

  // ================= 1. HERO z trendem oszczędności =================
  const hero = card(container, monthLabel(monthId), "", "dash-hero");
  hero.insertAdjacentHTML("beforeend", `
    <div class="dash-hero-top">
      <div class="dash-hero-num">
        <strong>${money(s.savings)}</strong>
        <span>zostaje po buforze</span>
        ${diff === null ? "" : `<span class="delta ${diff <= 0 ? "good" : "bad"}">
          ${diff <= 0 ? "▼" : "▲"} ${money(Math.abs(diff))} kosztów
          ${diff <= 0 ? "mniej" : "więcej"} niż w ${monthLocative(prevId)}</span>`}
      </div>
      <div class="dash-stats">
        <div><span>Dochód</span><b>${money(s.totalIncome)}</b></div>
        <div><span>Koszty</span><b>${money(s.totalCosts)}</b></div>
        <div><span>Stopa oszczędności</span><b class="accent-num">${percent(s.rateTotal)}</b></div>
      </div>
    </div>`);

  if (history.length >= 2) {
    const wrap = document.createElement("div");
    wrap.className = "chart-wrap hero-chart";
    wrap.innerHTML = `<canvas id="d-trend"></canvas>`;
    hero.appendChild(wrap);

    const c = document.getElementById("d-trend");
    const g = c.getContext("2d").createLinearGradient(0, 0, 0, 190);
    g.addColorStop(0, "rgba(52,199,89,.28)");
    g.addColorStop(1, "rgba(52,199,89,0)");

    charts.push(new Chart(c, {
      type: "line",
      data: {
        labels: history.map((h) => monthLabel(h.id).replace(/ \d{4}$/, "")),
        datasets: [{
          data: history.map((h) => h.savings),
          borderColor: "#34c759", backgroundColor: g, fill: true,
          tension: .38, borderWidth: 2.5,
          pointRadius: history.map((_, i) => (i === history.length - 1 ? 5 : 0)),
          pointBackgroundColor: "#34c759", pointBorderColor: "#fff", pointBorderWidth: 2.5,
        }],
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { ...tooltipStyle, callbacks: {
            label: (i) => ` Oszczędności: ${money(i.parsed.y)}` } },
        },
        scales: {
          x: { border: { display: false }, grid: { display: false },
            ticks: { font: FONT, color: "#8e8e93", maxRotation: 0, autoSkipPadding: 12 } },
          y: { border: { display: false }, grid: { color: "#f2f2f4" },
            ticks: { font: FONT, color: "#8e8e93", maxTicksLimit: 4, callback: axisMoney } },
        },
      },
    }));
  } else {
    hero.insertAdjacentHTML("beforeend",
      `<p class="empty tight">Trend pojawi się, gdy będziesz mieć dane z co najmniej 2 miesięcy.</p>`);
  }

  // ================= 2. Struktura wydatków + Plan roczny =================
  const grid = document.createElement("div");
  grid.className = "grid-2";
  container.appendChild(grid);

  const cats = [];
  if (s.matiPart > 0) cats.push({ label: "Rata hipoteki", value: s.matiPart });
  items.forEach((e) => +e.amount > 0 && cats.push({ label: e.category || "Bez nazwy", value: +e.amount }));
  cats.sort((a, b) => b.value - a.value);
  const catTotal = cats.reduce((a, c) => a + c.value, 0);

  const donutCard = card(grid, "Na co idą pieniądze", "Struktura wydatków", "dash-donut");
  if (!cats.length) {
    donutCard.insertAdjacentHTML("beforeend", `<p class="empty">Brak wydatków w tym miesiącu.</p>`);
  } else {
    const top = cats.slice(0, 5);
    const restVal = cats.slice(5).reduce((a, c) => a + c.value, 0);
    const slices = restVal > 0 ? [...top, { label: `Pozostałe (${cats.length - 5})`, value: restVal }] : top;

    const wrap = document.createElement("div");
    wrap.className = "donut-wrap small";
    wrap.innerHTML = `<canvas id="d-donut"></canvas>
      <div class="donut-center"><span>Razem</span><strong>${money(catTotal)}</strong></div>`;
    donutCard.appendChild(wrap);

    const leg = document.createElement("div");
    leg.className = "mini-legend";
    slices.forEach((c, i) => {
      const row = document.createElement("div");
      row.className = "mini-legend-row";
      row.innerHTML = `<span class="legend-dot" style="background:${PALETTE[i % PALETTE.length]}"></span>
        <span class="mini-legend-name">${esc(c.label)}</span>
        <span class="mini-legend-pct">${percent(c.value / catTotal)}</span>`;
      leg.appendChild(row);
    });
    donutCard.appendChild(leg);

    charts.push(new Chart(document.getElementById("d-donut"), {
      type: "doughnut",
      data: { labels: slices.map((c) => c.label),
        datasets: [{ data: slices.map((c) => c.value),
          backgroundColor: slices.map((_, i) => PALETTE[i % PALETTE.length]),
          borderWidth: 3, borderColor: "#fff", hoverOffset: 5 }] },
      options: { cutout: "70%", maintainAspectRatio: false,
        plugins: { legend: { display: false },
          tooltip: { ...tooltipStyle, callbacks: {
            label: (i) => ` ${money(i.parsed)} · ${percent(i.parsed / catTotal)}` } } } },
    }));
  }

  const yearCard = card(grid, `Plan roczny ${yearId}`, "Jak idzie rok", "dash-year");
  if (!year) {
    yearCard.insertAdjacentHTML("beforeend",
      `<p class="empty">Brak planu na ${yearId}. Załóż go w zakładce „Plan roczny”.</p>`);
  } else {
    const y = computeYear(year);
    const now = y.last ? y.last.actual : null;
    const gap = y.last ? y.last.gap : null;
    yearCard.insertAdjacentHTML("beforeend", `
      <div class="dash-year-top">
        <div class="dash-hero-num compact">
          <strong>${now !== null ? money(now) : "—"}</strong>
          <span>${y.planEnd ? `cel na koniec roku ${money(y.planEnd)}` : "brak celu"}</span>
        </div>
        ${gap !== null ? `<span class="pill ${gap >= 0 ? "good" : "bad"}">
          ${gap >= 0 ? "+" : ""}${money(gap)} ${gap >= 0 ? "nad planem" : "pod planem"}</span>` : ""}
      </div>`);

    const wrap = document.createElement("div");
    wrap.className = "chart-wrap mini";
    wrap.innerHTML = `<canvas id="d-year"></canvas>`;
    yearCard.appendChild(wrap);

    const MS = ["sty","lut","mar","kwi","maj","cze","lip","sie","wrz","paź","lis","gru"];
    charts.push(new Chart(document.getElementById("d-year"), {
      type: "line",
      data: {
        labels: y.rows.map((_, i) => MS[i]),
        datasets: [
          { label: "Założenie", data: y.rows.map((r) => r.assumption),
            borderColor: "#c7c7cc", borderDash: [5, 4], borderWidth: 2,
            pointRadius: 0, tension: .35, fill: false },
          { label: "Faktycznie", data: y.rows.map((r) => r.actual),
            borderColor: "#0071e3", borderWidth: 2.5, tension: .35,
            pointRadius: 3, pointBackgroundColor: "#0071e3",
            pointBorderColor: "#fff", pointBorderWidth: 2, spanGaps: true, fill: false },
        ],
      },
      options: {
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { position: "top", align: "end", labels: { usePointStyle: true,
            pointStyle: "circle", boxWidth: 7, padding: 12, font: FONT } },
          tooltip: { ...tooltipStyle, displayColors: true, callbacks: {
            label: (i) => ` ${i.dataset.label}: ${i.parsed.y === null ? "—" : money(i.parsed.y)}` } },
        },
        scales: {
          x: { border: { display: false }, grid: { display: false },
            ticks: { font: FONT, color: "#8e8e93" } },
          y: { border: { display: false }, grid: { color: "#f2f2f4" },
            ticks: { font: FONT, color: "#8e8e93", maxTicksLimit: 4, callback: axisMoney } },
        },
      },
    }));
  }

  // ================= 3. Pierścienie limitów =================
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
          <div class="ring-wrap">${ringSvg(st.ratio, LEVEL_COLOR[st.level] || "#8e8e93")}
            <span class="ring-ico">${categoryIcon(e.category)}</span></div>
          <span class="ring-name">${esc(e.category || "Bez nazwy")}</span>
          <span class="ring-val ${left >= 0 ? "" : "over"}">${money(Math.abs(left))} ${left >= 0 ? "zostało" : "ponad"}</span>`;
        wrap.appendChild(cell);
      });
    ringCard.appendChild(wrap);
  }

  // ================= 4. Do zapłaty + Cele =================
  const grid2 = document.createElement("div");
  grid2.className = "grid-2";
  container.appendChild(grid2);

  const payCard = card(grid2, "Wymaga uwagi", "Do zapłaty");
  const unpaid = items.filter((e) => !e.paid && +e.amount > 0);
  const unpaidSum = unpaid.reduce((a, e) => a + (+e.amount || 0), 0);
  const paidCount = items.filter((e) => e.paid).length;
  const paidRatio = items.length ? paidCount / items.length : 0;

  if (!items.length) {
    payCard.insertAdjacentHTML("beforeend", `<p class="empty">Brak pozycji w tym miesiącu.</p>`);
  } else if (!unpaid.length) {
    payCard.insertAdjacentHTML("beforeend",
      `<div class="all-paid"><span>✓</span><p>Wszystko zapłacone w tym miesiącu.</p></div>`);
  } else {
    payCard.insertAdjacentHTML("beforeend", `
      <div class="pay-top">
        <strong>${money(unpaidSum)}</strong>
        <span>${unpaid.length} ${unpaid.length === 1 ? "pozycja" : "pozycji"} do zapłaty</span>
      </div>
      <div class="dash-bar green"><i style="width:${(paidRatio * 100).toFixed(1)}%"></i></div>
      <p class="pay-progress">Zapłacone ${paidCount} z ${items.length} pozycji</p>`);
    const list = document.createElement("div");
    list.className = "pay-list";
    unpaid.sort((a, b) => (+b.amount) - (+a.amount)).slice(0, 5).forEach((e) => {
      const row = document.createElement("div");
      row.className = "pay-row";
      row.innerHTML = `<span class="exp-ico">${categoryIcon(e.category)}</span>
        <span class="pay-name">${esc(e.category || "Bez nazwy")}</span>
        <span class="legend-who ${e.who === "M" ? "m" : "k"}">${e.who}</span>
        <span class="pay-val">${money(+e.amount)}</span>`;
      list.appendChild(row);
    });
    payCard.appendChild(list);
    if (unpaid.length > 5) {
      payCard.insertAdjacentHTML("beforeend", `<p class="pay-more">…i jeszcze ${unpaid.length - 5}</p>`);
    }
  }

  const active = (goals || []).filter((g) => +g.targetAmount > 0);
  const goalCard = card(grid2, "Cele oszczędnościowe", "Postęp");
  if (!active.length) {
    goalCard.insertAdjacentHTML("beforeend",
      `<p class="empty">Nie masz jeszcze celów. Dodaj pierwszy w zakładce „Cele”.</p>`);
  } else {
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
            <b>${percent(r)}</b>
          </div>
          <div class="goal-bar ${r >= 1 ? "done" : ""}"><i style="width:${(r * 100).toFixed(1)}%"></i></div>
          <span class="dash-goal-pct">${money(+g.currentAmount || 0)} z ${money(+g.targetAmount)}${g.targetDate ? ` · do ${esc(g.targetDate)}` : ""}</span>`;
        list.appendChild(row);
      });
    goalCard.appendChild(list);
  }
}
