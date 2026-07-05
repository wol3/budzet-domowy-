// Widok "Wykresy": donut struktury wydatków, słupki Dochody/Wydatki/Oszcz.,
// oraz liniowy trend oszczędności w czasie. Chart.js jako globalny `Chart`.
import { money, percent, monthLabel } from "./util.js";
import { computeSummary } from "./calc.js";

const PALETTE = [
  "#0071e3", "#34c759", "#ff9f0a", "#ff375f", "#5e5ce6", "#64d2ff",
  "#bf5af2", "#ffd60a", "#30d158", "#ff6482", "#a2845e", "#8e8e93",
];

let instances = [];
function destroyAll() {
  instances.forEach((c) => c.destroy());
  instances = [];
}

const baseFont = { family: "-apple-system, 'SF Pro Text', Inter, sans-serif" };

export function renderCharts(container, budget, allBudgets) {
  destroyAll();
  container.innerHTML = `
    <div class="grid-2">
      <section class="card"><h3>Struktura wydatków</h3><canvas id="c-donut"></canvas></section>
      <section class="card"><h3>Dochody / Wydatki / Oszczędności</h3><canvas id="c-bars"></canvas></section>
    </div>
    <section class="card"><h3>Trend oszczędności w czasie</h3><canvas id="c-line"></canvas></section>`;

  const s = computeSummary(budget);

  // --- Donut: kategorie Mati + Kinia razem ---
  const cats = [];
  if (s.matiPart > 0) cats.push({ label: "Rata hipoteki (Mati)", value: s.matiPart });
  (budget.expensesMati || []).forEach((e) =>
    e.amount > 0 && cats.push({ label: `${e.category || "?"} (M)`, value: +e.amount }));
  (budget.expensesKinia || []).forEach((e) =>
    e.amount > 0 && cats.push({ label: `${e.category || "?"} (K)`, value: +e.amount }));

  const donutCtx = document.getElementById("c-donut");
  if (cats.length) {
    instances.push(new Chart(donutCtx, {
      type: "doughnut",
      data: {
        labels: cats.map((c) => c.label),
        datasets: [{ data: cats.map((c) => c.value), backgroundColor: PALETTE, borderWidth: 2, borderColor: "#fff" }],
      },
      options: {
        cutout: "62%",
        plugins: {
          legend: { position: "right", labels: { font: baseFont, boxWidth: 12, padding: 10 } },
          tooltip: {
            callbacks: {
              label: (ctx) => {
                const total = cats.reduce((a, c) => a + c.value, 0);
                return ` ${ctx.label}: ${money(ctx.parsed)} (${percent(ctx.parsed / total)})`;
              },
            },
          },
        },
      },
    }));
  } else {
    donutCtx.replaceWith(Object.assign(document.createElement("p"),
      { className: "empty", textContent: "Brak wydatków w tym miesiącu." }));
  }

  // --- Słupki: Mati / Kinia / Razem ---
  instances.push(new Chart(document.getElementById("c-bars"), {
    type: "bar",
    data: {
      labels: ["Mati", "Kinia", "Razem"],
      datasets: [
        { label: "Dochody", backgroundColor: "#0071e3",
          data: [s.matiSalary, s.kiniaSalary, s.totalIncome] },
        { label: "Wydatki", backgroundColor: "#ff9f0a",
          data: [s.totalMati, s.totalKinia, s.totalCosts] },
        { label: "Oszczędności", backgroundColor: "#34c759",
          data: [s.leftMati, s.leftKinia, s.savings] },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { labels: { font: baseFont } },
        tooltip: { callbacks: { label: (c) => ` ${c.dataset.label}: ${money(c.parsed.y)}` } } },
      scales: { y: { ticks: { font: baseFont, callback: (v) => money(v) } },
        x: { ticks: { font: baseFont } } },
    },
  }));

  // --- Trend: kwota oszczędności + stopa (%) w czasie ---
  const months = (allBudgets || []).map((b) => {
    const cs = computeSummary(b);
    return { id: b.id, savings: cs.savings, rate: cs.rateTotal };
  });
  const lineCtx = document.getElementById("c-line");
  if (months.length >= 2) {
    instances.push(new Chart(lineCtx, {
      type: "line",
      data: {
        labels: months.map((m) => monthLabel(m.id)),
        datasets: [
          { label: "Oszczędności (zł)", data: months.map((m) => m.savings),
            borderColor: "#0071e3", backgroundColor: "rgba(0,113,227,.1)",
            fill: true, tension: 0.35, yAxisID: "y" },
          { label: "Stopa oszczędności (%)", data: months.map((m) => m.rate * 100),
            borderColor: "#34c759", tension: 0.35, yAxisID: "y1" },
        ],
      },
      options: {
        interaction: { mode: "index", intersect: false },
        plugins: { legend: { labels: { font: baseFont } } },
        scales: {
          y: { position: "left", ticks: { font: baseFont, callback: (v) => money(v) } },
          y1: { position: "right", grid: { drawOnChartArea: false },
            ticks: { font: baseFont, callback: (v) => v + "%" } },
          x: { ticks: { font: baseFont } },
        },
      },
    }));
  } else {
    lineCtx.replaceWith(Object.assign(document.createElement("p"),
      { className: "empty", textContent: "Trend pojawi się, gdy będziesz mieć co najmniej 2 miesiące danych." }));
  }
}
