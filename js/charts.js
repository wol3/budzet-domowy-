// Widok "Wykresy" — ten sam język wizualny co Plan roczny:
// donut z sumą w środku + własna legenda, poziome porównanie osób,
// gradientowy trend oszczędności i ranking największych kategorii.
import { money, percent, monthLabel, esc } from "./util.js";
import { computeSummary } from "./calc.js";
import { eyebrow } from "./ui.js";
import { categoryIcon } from "./icons.js";

const PALETTE = [
  "#0071e3", "#34c759", "#ff9f0a", "#ff375f", "#5e5ce6", "#64d2ff",
  "#bf5af2", "#ffd60a", "#30d158", "#ff6482", "#a2845e", "#8e8e93",
];
const FONT = { family: "-apple-system, 'SF Pro Text', Inter, sans-serif", size: 11 };

let instances = [];
const destroyAll = () => { instances.forEach((c) => c.destroy()); instances = []; };

// Etykiety osi: tysiące skracamy do "k", bez brzydkich końcówek typu 7.48k.
const axisMoney = (v) => {
  const a = Math.abs(v);
  if (a >= 1000) {
    const k = v / 1000;
    return (Number.isInteger(k) ? k : Number(k.toFixed(1))) + "k zł";
  }
  return Math.round(v) + " zł";
};

const tooltipStyle = {
  backgroundColor: "rgba(29,29,31,.92)", padding: 12, cornerRadius: 10,
  usePointStyle: true, titleFont: { ...FONT, size: 12 }, bodyFont: { ...FONT, size: 12 },
};

function card(parent, eyebrowText, title) {
  const s = document.createElement("section");
  s.className = "card";
  s.appendChild(eyebrow(eyebrowText));
  s.insertAdjacentHTML("beforeend", `<h3>${esc(title)}</h3>`);
  parent.appendChild(s);
  return s;
}

function emptyNote(parent, text) {
  const p = document.createElement("p");
  p.className = "empty";
  p.textContent = text;
  parent.appendChild(p);
}

export function renderCharts(container, budget, allBudgets) {
  destroyAll();
  container.innerHTML = "";
  const s = computeSummary(budget);

  // Kategorie z obu kolumn + rata hipoteki, posortowane malejąco.
  const cats = [];
  if (s.matiPart > 0) cats.push({ label: "Rata hipoteki", who: "M", value: s.matiPart });
  (budget.expensesMati || []).forEach((e) =>
    +e.amount > 0 && cats.push({ label: e.category || "Bez nazwy", who: "M", value: +e.amount }));
  (budget.expensesKinia || []).forEach((e) =>
    +e.amount > 0 && cats.push({ label: e.category || "Bez nazwy", who: "K", value: +e.amount }));
  cats.sort((a, b) => b.value - a.value);
  const catTotal = cats.reduce((a, c) => a + c.value, 0);

  const grid = document.createElement("div");
  grid.className = "grid-2";
  container.appendChild(grid);

  // ---------- 1. DONUT + legenda ----------
  const donutCard = card(grid, "Bieżący miesiąc", "Struktura wydatków");
  donutCard.classList.add("donut-card");
  if (!cats.length) {
    emptyNote(donutCard, "Brak wydatków w tym miesiącu.");
  } else {
    const wrap = document.createElement("div");
    wrap.className = "donut-wrap";
    wrap.innerHTML = `<canvas id="c-donut"></canvas>
      <div class="donut-center"><span>Razem</span><strong>${money(catTotal)}</strong></div>`;
    donutCard.appendChild(wrap);

    const legend = document.createElement("div");
    legend.className = "legend";
    cats.slice(0, 8).forEach((c, i) => {
      const row = document.createElement("div");
      row.className = "legend-row";
      row.innerHTML = `
        <span class="legend-dot" style="background:${PALETTE[i % PALETTE.length]}"></span>
        <span class="legend-name">${esc(c.label)}</span>
        <span class="legend-who ${c.who === "M" ? "m" : "k"}">${c.who}</span>
        <span class="legend-val">${money(c.value)}</span>
        <span class="legend-pct">${percent(c.value / catTotal)}</span>`;
      legend.appendChild(row);
    });
    if (cats.length > 8) {
      const rest = cats.slice(8).reduce((a, c) => a + c.value, 0);
      const row = document.createElement("div");
      row.className = "legend-row muted";
      row.innerHTML = `<span class="legend-dot" style="background:#c7c7cc"></span>
        <span class="legend-name">Pozostałe (${cats.length - 8})</span><span></span>
        <span class="legend-val">${money(rest)}</span>
        <span class="legend-pct">${percent(rest / catTotal)}</span>`;
      legend.appendChild(row);
    }
    donutCard.appendChild(legend);

    instances.push(new Chart(document.getElementById("c-donut"), {
      type: "doughnut",
      data: {
        labels: cats.map((c) => c.label),
        datasets: [{
          data: cats.map((c) => c.value),
          backgroundColor: cats.map((_, i) => PALETTE[i % PALETTE.length]),
          borderWidth: 3, borderColor: "#fff", hoverOffset: 6,
        }],
      },
      options: {
        cutout: "72%", maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { ...tooltipStyle, callbacks: {
            label: (ctx) => ` ${money(ctx.parsed)} · ${percent(ctx.parsed / catTotal)}` } },
        },
      },
    }));
  }

  // ---------- 2. Porównanie osób (poziome słupki) ----------
  const cmpCard = card(grid, "Kto ile", "Dochody, wydatki, oszczędności");
  cmpCard.classList.add("cmp-card");
  const cmpWrap = document.createElement("div");
  cmpWrap.className = "chart-wrap short";
  cmpWrap.innerHTML = `<canvas id="c-cmp"></canvas>`;
  cmpCard.appendChild(cmpWrap);

  instances.push(new Chart(document.getElementById("c-cmp"), {
    type: "bar",
    data: {
      labels: ["Mati", "Kinia", "Razem"],
      datasets: [
        { label: "Dochody", backgroundColor: "#0071e3", borderRadius: 6,
          data: [s.matiSalary, s.kiniaSalary, s.totalIncome] },
        { label: "Wydatki", backgroundColor: "#ff9f0a", borderRadius: 6,
          data: [s.totalMati, s.totalKinia, s.totalCosts] },
        { label: "Oszczędności", backgroundColor: "#34c759", borderRadius: 6,
          data: [s.leftMati, s.leftKinia, s.savings] },
      ],
    },
    options: {
      indexAxis: "y", maintainAspectRatio: false,
      plugins: {
        legend: { position: "top", align: "end",
          labels: { usePointStyle: true, pointStyle: "circle", boxWidth: 7, padding: 14, font: FONT } },
        tooltip: { ...tooltipStyle, callbacks: { label: (c) => ` ${c.dataset.label}: ${money(c.parsed.x)}` } },
      },
      scales: {
        x: { border: { display: false }, grid: { color: "#f0f0f2" },
          ticks: { font: FONT, color: "#8e8e93", maxTicksLimit: 5,
            callback: axisMoney } },
        y: { border: { display: false }, grid: { display: false },
          ticks: { font: { ...FONT, size: 13 }, color: "#1d1d1f" } },
      },
    },
  }));

  // ---------- 3. Trend oszczędności ----------
  const trendCard = card(container, "Ostatnie miesiące", "Trend oszczędności");
  const months = (allBudgets || []).map((b) => {
    const cs = computeSummary(b);
    return { id: b.id, savings: cs.savings, rate: cs.rateTotal };
  }).slice(-12);

  if (months.length < 2) {
    emptyNote(trendCard, "Trend pojawi się, gdy będziesz mieć dane z co najmniej 2 miesięcy.");
  } else {
    const wrap = document.createElement("div");
    wrap.className = "chart-wrap";
    wrap.innerHTML = `<canvas id="c-trend"></canvas>`;
    trendCard.appendChild(wrap);

    const ctx = document.getElementById("c-trend");
    const grad = ctx.getContext("2d").createLinearGradient(0, 0, 0, 260);
    grad.addColorStop(0, "rgba(52,199,89,.25)");
    grad.addColorStop(1, "rgba(52,199,89,0)");

    instances.push(new Chart(ctx, {
      type: "line",
      data: {
        labels: months.map((m) => monthLabel(m.id).replace(/ \d{4}$/, "")),
        datasets: [{
          label: "Oszczędności", data: months.map((m) => m.savings),
          borderColor: "#34c759", backgroundColor: grad, fill: true,
          tension: .4, borderWidth: 2.5, pointRadius: 3, pointHoverRadius: 6,
          pointBackgroundColor: "#34c759",
        }],
      },
      options: {
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { display: false },
          tooltip: { ...tooltipStyle, callbacks: {
            label: (c) => ` ${money(c.parsed.y)} · stopa ${percent(months[c.dataIndex].rate)}` } },
        },
        scales: {
          y: { border: { display: false }, grid: { color: "#f0f0f2" },
            ticks: { font: FONT, color: "#8e8e93", maxTicksLimit: 6,
              callback: axisMoney } },
          x: { border: { display: false }, grid: { display: false },
            ticks: { font: FONT, color: "#8e8e93" } },
        },
      },
    }));
  }

  // ---------- 4. Ranking kategorii ----------
  const topCard = card(container, "Gdzie idzie najwięcej", "Największe kategorie");
  if (!cats.length) {
    emptyNote(topCard, "Brak wydatków do porównania.");
  } else {
    const max = cats[0].value;
    const list = document.createElement("div");
    list.className = "top-list";
    cats.slice(0, 6).forEach((c) => {
      const row = document.createElement("div");
      row.className = "top-row";
      row.innerHTML = `
        <span class="exp-ico">${categoryIcon(c.label)}</span>
        <span class="top-name">${esc(c.label)}</span>
        <span class="top-val">${money(c.value)}</span>
        <span class="top-pct">${percent(c.value / catTotal)}</span>
        <div class="top-bar"><i style="width:${(c.value / max * 100).toFixed(1)}%"></i></div>`;
      list.appendChild(row);
    });
    topCard.appendChild(list);
  }
}
