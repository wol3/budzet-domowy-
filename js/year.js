// Widok "Rok" — roczny plan oszczędnościowy (odpowiednik zakładki "Rok 2026"
// z arkusza): start roku, miesięczne cele, skumulowane założenie vs stan
// faktyczny, odchylenie oraz duże wydatki jednorazowe planowane na rok.
//
// Jak w budget.js: pola budujemy RAZ, przy pisaniu odświeżamy tylko liczby.
import { money, percent, esc } from "./util.js";
import { amountInput, eyebrow } from "./ui.js";
import { categoryIcon } from "./icons.js";

const MONTHS = ["styczeń","luty","marzec","kwiecień","maj","czerwiec",
  "lipiec","sierpień","wrzesień","październik","listopad","grudzień"];

const num = (v) => (Number.isFinite(+v) && v !== null && v !== "" ? +v : null);

export function computeYear(year) {
  const months = year.months || [];
  const oneOffs = year.oneOffs || [];
  const start = +year.startBalance || 0;

  const rows = months.map((m) => {
    const assumption = num(m.assumption);
    const actual = num(m.actual);
    const gap = assumption !== null && actual !== null ? actual - assumption : null;
    return { ...m, assumption, actual, gap };
  });

  const withActual = rows.filter((r) => r.actual !== null);
  const last = withActual[withActual.length - 1] || null;
  const planEnd = rows.length ? rows[rows.length - 1].assumption : null;
  const plannedTotal = rows.reduce((s, r) => s + (+r.planned || 0), 0);
  const oneOffTotal = oneOffs.reduce((s, o) => s + (+o.amount || 0), 0);

  return { start, rows, last, planEnd, plannedTotal, oneOffTotal, oneOffs };
}

let chart = null;

export function renderYear(container, year, actions) {
  container.innerHTML = "";
  if (chart) { chart.destroy(); chart = null; }

  let refresh = () => {};
  const refs = { rows: [], oneOffs: [] };

  // ---------- HERO ----------
  const hero = document.createElement("div");
  hero.className = "hero";
  const tile = (label, cls = "") => {
    const c = document.createElement("div");
    c.className = "hero-card " + cls;
    c.innerHTML = `<span class="hero-label">${esc(label)}</span><strong class="hero-value"></strong><span class="hero-sub"></span>`;
    hero.appendChild(c);
    return { card: c, val: c.querySelector(".hero-value"), sub: c.querySelector(".hero-sub") };
  };
  const tStart = tile("Start roku");
  const tPlan = tile("Plan na koniec roku");
  const tActual = tile("Stan faktyczny");
  const tGap = tile("Odchylenie od planu");
  container.appendChild(hero);

  // ---------- WYKRES ----------
  const chartCard = document.createElement("section");
  chartCard.className = "card chart-card";
  chartCard.appendChild(eyebrow("Przebieg roku"));
  chartCard.insertAdjacentHTML("beforeend",
    `<h3>Plan vs rzeczywistość</h3><div class="chart-wrap"><canvas id="c-year"></canvas></div>`);
  container.appendChild(chartCard);

  // ---------- START ROKU ----------
  const startCard = document.createElement("section");
  startCard.className = "card start-card";
  startCard.appendChild(eyebrow("Punkt wyjścia"));
  const startRow = document.createElement("div");
  startRow.className = "start-row";
  startRow.innerHTML = `<div class="start-txt"><strong>Stan oszczędności na start roku</strong>
    <span>Od tej kwoty liczony jest cały plan</span></div>`;
  const startBox = document.createElement("div");
  startBox.className = "field-money big";
  const startInput = amountInput(year.startBalance, "0");
  const startCur = document.createElement("span");
  startCur.className = "field-cur"; startCur.textContent = "zł";
  startBox.append(startInput, startCur);
  startInput.addEventListener("input", () => {
    actions.updateYear({ startBalance: parseFloat(startInput.value) || 0 });
    refresh();
  });
  startRow.appendChild(startBox);
  startCard.appendChild(startRow);
  container.appendChild(startCard);

  // ---------- MIESIĄCE ----------
  const monthsCard = document.createElement("section");
  monthsCard.className = "card";
  monthsCard.appendChild(eyebrow("Miesiąc po miesiącu"));
  monthsCard.insertAdjacentHTML("beforeend", `<h3>Cele i realizacja</h3>`);

  const head = document.createElement("div");
  head.className = "yr-head";
  head.innerHTML = `<span>Miesiąc</span><span>Odłożone</span><span>Założenie</span><span>Stan faktyczny</span><span>Różnica</span>`;
  monthsCard.appendChild(head);

  const list = document.createElement("div");
  list.className = "yr-list";
  (year.months || []).forEach((m, i) => {
    const row = document.createElement("div");
    row.className = "yr-row";

    const name = document.createElement("span");
    name.className = "yr-month"; name.textContent = MONTHS[i] || m.m;

    const mk = (val, key, ph) => {
      const box = document.createElement("div");
      box.className = "field-money mini";
      const inp = amountInput(val ?? "", ph);
      const cur = document.createElement("span");
      cur.className = "field-cur"; cur.textContent = "zł";
      box.append(inp, cur);
      inp.addEventListener("input", () => {
        const v = inp.value === "" ? null : (parseFloat(inp.value) || 0);
        actions.updateMonth(i, { [key]: v });
        refresh();
      });
      return box;
    };

    const planned = mk(m.planned, "planned", "0");
    const assumption = mk(m.assumption, "assumption", "0");
    const actual = mk(m.actual, "actual", "—");

    const gap = document.createElement("span");
    gap.className = "yr-gap";

    row.append(name, planned, assumption, actual, gap);
    list.appendChild(row);
    refs.rows.push({ row, gap, i });
  });
  monthsCard.appendChild(list);
  container.appendChild(monthsCard);

  // ---------- WYDATKI JEDNORAZOWE ----------
  const oneCard = document.createElement("section");
  oneCard.className = "card";
  oneCard.appendChild(eyebrow("Duże wydatki zaplanowane na rok"));
  const oneHead = document.createElement("div");
  oneHead.className = "one-head";
  oneHead.innerHTML = `<h3>Wydatki jednorazowe</h3><span class="one-total"></span>`;
  oneCard.appendChild(oneHead);

  const oneList = document.createElement("div");
  oneList.className = "one-list";
  (year.oneOffs || []).forEach((o) => {
    const row = document.createElement("div");
    row.className = "one-row";

    const ico = document.createElement("span");
    ico.className = "exp-ico"; ico.textContent = categoryIcon(o.name);

    const nameI = document.createElement("input");
    nameI.type = "text"; nameI.className = "one-name"; nameI.value = o.name || "";
    nameI.placeholder = "Nazwa wydatku";
    nameI.addEventListener("input", () => {
      actions.updateOneOff(o.id, { name: nameI.value });
      ico.textContent = categoryIcon(nameI.value);
    });

    const box = document.createElement("div");
    box.className = "field-money";
    const amt = amountInput(o.amount, "0");
    const cur = document.createElement("span");
    cur.className = "field-cur"; cur.textContent = "zł";
    box.append(amt, cur);
    amt.addEventListener("input", () => {
      actions.updateOneOff(o.id, { amount: parseFloat(amt.value) || 0 });
      refresh();
    });

    const share = document.createElement("span");
    share.className = "one-share";

    const del = document.createElement("button");
    del.className = "exp-del"; del.textContent = "✕"; del.title = "Usuń";
    del.addEventListener("click", () => actions.deleteOneOff(o.id));

    row.append(ico, nameI, box, share, del);
    oneList.appendChild(row);
    refs.oneOffs.push({ item: o, share });
  });
  oneCard.appendChild(oneList);

  const addOne = document.createElement("button");
  addOne.className = "btn-add"; addOne.textContent = "+ Dodaj wydatek jednorazowy";
  addOne.addEventListener("click", () => actions.addOneOff());
  oneCard.appendChild(addOne);
  container.appendChild(oneCard);

  // ---------- REFRESH ----------
  refresh = () => {
    const y = computeYear(year);

    tStart.val.textContent = money(y.start);
    tStart.sub.textContent = "";
    tPlan.val.textContent = y.planEnd !== null ? money(y.planEnd) : "—";
    tPlan.sub.textContent = y.plannedTotal ? `cel odkładania ${money(y.plannedTotal)}` : "";
    tActual.val.textContent = y.last ? money(y.last.actual) : "—";
    tActual.sub.textContent = y.last ? `ostatni wpis: ${MONTHS[y.rows.indexOf(y.last)]}` : "brak wpisów";

    const gapVal = y.last ? y.last.gap : null;
    tGap.val.textContent = gapVal === null ? "—" : money(gapVal);
    tGap.card.classList.toggle("good", gapVal !== null && gapVal >= 0);
    tGap.card.classList.toggle("bad", gapVal !== null && gapVal < 0);
    tGap.sub.textContent = gapVal === null ? ""
      : gapVal >= 0 ? "powyżej planu" : "poniżej planu";

    refs.rows.forEach((r) => {
      const row = y.rows[r.i];
      if (!row || row.gap === null) {
        r.gap.textContent = "—";
        r.gap.className = "yr-gap";
      } else {
        r.gap.textContent = (row.gap >= 0 ? "+" : "") + money(row.gap);
        r.gap.className = "yr-gap " + (row.gap >= 0 ? "pos" : "neg");
      }
      r.row.classList.toggle("has-actual", row && row.actual !== null);
    });

    oneCard.querySelector(".one-total").textContent = money(y.oneOffTotal);
    refs.oneOffs.forEach((o) => {
      o.share.textContent = y.oneOffTotal > 0
        ? percent((+o.item.amount || 0) / y.oneOffTotal) : "";
    });

    drawChart(y);
  };

  function drawChart(y) {
    const ctx = document.getElementById("c-year");
    if (!ctx || typeof Chart === "undefined") return;
    if (chart) { chart.destroy(); chart = null; }

    const grad = ctx.getContext("2d").createLinearGradient(0, 0, 0, 260);
    grad.addColorStop(0, "rgba(0,113,227,.22)");
    grad.addColorStop(1, "rgba(0,113,227,0)");

    chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: MONTHS.map((m) => m.slice(0, 3)),
        datasets: [
          {
            label: "Założenie",
            data: y.rows.map((r) => r.assumption),
            borderColor: "#0071e3", backgroundColor: grad,
            fill: true, tension: .4, borderWidth: 2.5,
            pointRadius: 0, pointHoverRadius: 5, spanGaps: true,
          },
          {
            label: "Stan faktyczny",
            data: y.rows.map((r) => r.actual),
            borderColor: "#34c759", backgroundColor: "#34c759",
            fill: false, tension: .4, borderWidth: 2.5,
            pointRadius: 4, pointHoverRadius: 6, spanGaps: true,
          },
        ],
      },
      options: {
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { position: "top", align: "end",
            labels: { usePointStyle: true, pointStyle: "circle", boxWidth: 7, padding: 16,
              font: { family: "-apple-system, 'SF Pro Text', Inter, sans-serif", size: 12 } } },
          tooltip: {
            backgroundColor: "rgba(29,29,31,.92)", padding: 12, cornerRadius: 10,
            displayColors: true, usePointStyle: true,
            callbacks: { label: (c) => c.parsed.y === null ? null : ` ${c.dataset.label}: ${money(c.parsed.y)}` },
          },
        },
        scales: {
          y: { border: { display: false }, grid: { color: "#f0f0f2" },
            ticks: { font: { size: 11 }, color: "#8e8e93", maxTicksLimit: 6,
              callback: (v) => (v >= 1000 ? (v / 1000) + "k" : v) + " zł" } },
          x: { border: { display: false }, grid: { display: false },
            ticks: { font: { size: 11 }, color: "#8e8e93" } },
        },
      },
    });
  }

  refresh();
}
