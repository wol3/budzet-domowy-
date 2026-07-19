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

  // Rozkład jednorazowych na miesiące. Pozycje bez przypisanego miesiąca
  // trafiają do "nieprzypisane" — nie zgadujemy, kiedy wypadają.
  const oneOffByMonth = Array(12).fill(0);
  let oneOffUnassigned = 0;
  oneOffs.forEach((o) => {
    const amt = +o.amount || 0;
    const m = Number(o.month);
    if (m >= 1 && m <= 12) oneOffByMonth[m - 1] += amt;
    else oneOffUnassigned += amt;
  });

  // Prognoza: stan poprzedni + odłożone − wydatki przypisane na ten miesiąc.
  // Liczona na żywo, więc reaguje na zmianę miesiąca przy wydatku — w odróżnieniu
  // od kolumny "Założenie", którą wpisujesz ręcznie.
  let bal = start;
  const projection = rows.map((r, i) => {
    bal = bal + (+r.planned || 0) - oneOffByMonth[i];
    return Math.round(bal * 100) / 100;
  });

  return { start, rows, last, planEnd, plannedTotal, oneOffTotal, oneOffs,
    oneOffByMonth, oneOffUnassigned, projection };
}

// --- Rozpoznawanie wydatków, które wracają co roku -------------------------
// "Wakacje", "Ubezpieczenie samochodu" czy "Wymiana opon" to formalnie pozycje
// jednorazowe, ale w praktyce stały koszt roczny. Grupujemy je po znormalizowanej
// nazwie, żeby oddzielić je od faktycznie jednorazowych decyzji.
const STOPWORDS = new Set(["od", "do", "w", "z", "za", "na", "i", "dla", "the"]);
// Słowa zbyt ogólne, by same w sobie identyfikowały wydatek — dla nich bierzemy
// też drugie słowo (inaczej "ubezpieczenie samochodu" = "ubezpieczenie mieszkania").
const GENERIC = new Set(["ubezpieczenie", "serwis", "rata", "oplata", "podatek",
  "wyjazd", "remont", "naprawa", "zakup", "wymiana", "przeglad"]);

const stripName = (s) => String(s || "").toLowerCase()
  .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
  .replace(/ł/g, "l")
  .replace(/[^a-z0-9 ]/g, " ")
  .replace(/\s+/g, " ").trim();

export function recurKey(name) {
  const words = stripName(name).split(" ").filter((w) => w && !STOPWORDS.has(w));
  if (!words.length) return "";
  const first = words[0].slice(0, 9);
  if (!GENERIC.has(words[0])) return first;
  const second = (words[1] || "").slice(0, 5);
  return second ? `${first}|${second}` : first;
}

// Zwraca zbiór kluczy uznanych za powtarzalne + podział sum per rok.
export function analyseOneOffs(allYears) {
  const years = (allYears || []).filter((y) => (y.oneOffs || []).length);
  if (!years.length) return { recurring: new Set(), perYear: [] };

  const seen = new Map(); // klucz -> zbiór lat
  years.forEach((y) => (y.oneOffs || []).forEach((o) => {
    const k = recurKey(o.name);
    if (!k) return;
    if (!seen.has(k)) seen.set(k, new Set());
    seen.get(k).add(y.id);
  }));

  // Próg skaluje się z liczbą lat: przy 4 latach = 3, przy 2 latach = 2.
  const threshold = Math.max(2, Math.ceil(years.length * 0.6));
  const recurring = new Set([...seen].filter(([, ys]) => ys.size >= threshold).map(([k]) => k));

  const perYear = years.map((y) => {
    let rec = 0, once = 0;
    (y.oneOffs || []).forEach((o) => {
      const amt = +o.amount || 0;
      if (recurring.has(recurKey(o.name))) rec += amt; else once += amt;
    });
    return { id: y.id, rec, once, total: rec + once };
  });

  return { recurring, perYear };
}

const charts = {};
const destroyCharts = () => {
  Object.keys(charts).forEach((k) => { charts[k]?.destroy(); delete charts[k]; });
};

export function renderYear(container, year, actions, allYears = [], yearId = null) {
  container.innerHTML = "";
  destroyCharts();

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

    // Miesiąc, na który wydatek przypada — opcjonalny, ale bez niego
    // nie wiadomo, kiedy obciąża budżet.
    const monthSel = document.createElement("select");
    monthSel.className = "one-month";
    monthSel.title = "Miesiąc, w którym wypada ten wydatek";
    monthSel.innerHTML = `<option value="">— miesiąc —</option>` +
      MONTHS.map((n, i) => `<option value="${i + 1}">${n}</option>`).join("");
    monthSel.value = o.month ? String(o.month) : "";
    monthSel.addEventListener("change", () => {
      actions.updateOneOff(o.id, { month: monthSel.value ? Number(monthSel.value) : null });
      refresh();
    });

    const share = document.createElement("span");
    share.className = "one-share";

    const del = document.createElement("button");
    del.className = "exp-del"; del.textContent = "✕"; del.title = "Usuń";
    del.addEventListener("click", () => actions.deleteOneOff(o.id));

    row.append(ico, nameI, monthSel, box, share, del);
    oneList.appendChild(row);
    refs.oneOffs.push({ item: o, share });
  });
  oneCard.appendChild(oneList);

  // Rozkład w roku — od razu widać, które miesiące są obciążone.
  const dist = document.createElement("div");
  dist.className = "oo-dist";
  const distCols = MONTHS.map((n, i) => {
    const col = document.createElement("div");
    col.className = "oo-col";
    col.innerHTML = `<div class="oo-bar"><i></i></div><span class="oo-m">${n.slice(0, 3)}</span><b class="oo-v"></b>`;
    dist.appendChild(col);
    return { col, bar: col.querySelector("i"), val: col.querySelector(".oo-v") };
  });
  oneCard.appendChild(dist);
  const distNote = document.createElement("p");
  distNote.className = "oo-note";
  oneCard.appendChild(distNote);

  const addOne = document.createElement("button");
  addOne.className = "btn-add"; addOne.textContent = "+ Dodaj wydatek jednorazowy";
  addOne.addEventListener("click", () => actions.addOneOff());
  oneCard.appendChild(addOne);
  container.appendChild(oneCard);

  // ---------- B. Ranking pozycji w tym roku ----------
  const rankCard = document.createElement("section");
  rankCard.className = "card";
  rankCard.appendChild(eyebrow("Co dominuje w tym roku"));
  rankCard.insertAdjacentHTML("beforeend", `<h3>Największe pozycje</h3>`);
  const rankList = document.createElement("div");
  rankList.className = "top-list";
  rankCard.appendChild(rankList);
  container.appendChild(rankCard);

  // ---------- A. Rok do roku: powtarzalne vs jednorazowe ----------
  const yoyCard = document.createElement("section");
  yoyCard.className = "card";
  yoyCard.appendChild(eyebrow("Porównanie lat"));
  yoyCard.insertAdjacentHTML("beforeend",
    `<h3>Jednorazowe rok do roku</h3>
     <p class="card-hint">Część „jednorazowych” wraca co roku (wakacje, ubezpieczenia,
     opony) — to de facto stały koszt. Ciemniejszy słupek to właśnie one.</p>`);
  const yoyWrap = document.createElement("div");
  yoyWrap.className = "chart-wrap";
  yoyWrap.innerHTML = `<canvas id="c-yoy"></canvas>`;
  yoyCard.appendChild(yoyWrap);
  const yoyNote = document.createElement("p");
  yoyNote.className = "card-note";
  yoyCard.appendChild(yoyNote);
  container.appendChild(yoyCard);

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

    const maxM = Math.max(...y.oneOffByMonth, 1);
    distCols.forEach((c, i) => {
      const v = y.oneOffByMonth[i];
      c.bar.style.height = v > 0 ? Math.max(6, (v / maxM) * 100) + "%" : "0%";
      c.col.classList.toggle("empty", v === 0);
      // Poniżej tysiąca pokazujemy pełną kwotę — "0k" wprowadzało w błąd.
      c.val.textContent = v <= 0 ? "" : v >= 1000 ? Math.round(v / 1000) + "k" : String(Math.round(v));
      c.col.title = v > 0 ? `${MONTHS[i]}: ${money(v)}` : `${MONTHS[i]}: brak`;
    });
    distNote.textContent = y.oneOffUnassigned > 0
      ? `${money(y.oneOffUnassigned)} bez przypisanego miesiąca — ustaw go przy pozycjach powyżej.`
      : "Wszystkie wydatki mają przypisany miesiąc.";
    distNote.classList.toggle("warn", y.oneOffUnassigned > 0);
    refs.oneOffs.forEach((o) => {
      o.share.textContent = y.oneOffTotal > 0
        ? percent((+o.item.amount || 0) / y.oneOffTotal) : "";
    });

    drawChart(y);
    drawRanking(y);
    drawYoY(y);
  };

  // B. Ranking — paski proporcji, od razu widać pozycję dominującą.
  function drawRanking(y) {
    const items = [...(y.oneOffs || [])]
      .filter((o) => +o.amount > 0)
      .sort((a, b) => (+b.amount) - (+a.amount));
    rankList.innerHTML = "";
    if (!items.length) {
      rankList.innerHTML = `<p class="empty">Dodaj wydatki jednorazowe, żeby zobaczyć ranking.</p>`;
      return;
    }
    const max = +items[0].amount;
    items.slice(0, 8).forEach((o) => {
      const row = document.createElement("div");
      row.className = "top-row";
      row.innerHTML = `
        <span class="exp-ico">${categoryIcon(o.name)}</span>
        <span class="top-name">${esc(o.name || "Bez nazwy")}</span>
        <span class="top-val">${money(+o.amount)}</span>
        <span class="top-pct">${y.oneOffTotal ? percent(+o.amount / y.oneOffTotal) : ""}</span>
        <div class="top-bar"><i style="width:${(+o.amount / max * 100).toFixed(1)}%"></i></div>`;
      rankList.appendChild(row);
    });
  }

  // A. Rok do roku — słupki skumulowane: powtarzalne + naprawdę jednorazowe.
  function drawYoY() {
    const ctx = document.getElementById("c-yoy");
    if (!ctx || typeof Chart === "undefined") return;
    charts.yoy?.destroy();

    // Bieżący rok bierzemy ze stanu na żywo, pozostałe z bazy.
    const cur = yearId ?? new Date().getFullYear();
    const merged = [
      ...(allYears || []).filter((y) => y.id !== cur),
      { id: cur, oneOffs: year.oneOffs || [] },
    ].sort((a, b) => a.id - b.id);

    const { perYear } = analyseOneOffs(merged);
    if (perYear.length < 2) {
      yoyWrap.hidden = true;
      yoyNote.textContent = "Porównanie pojawi się, gdy wczytasz co najmniej 2 lata.";
      return;
    }
    yoyWrap.hidden = false;

    const avgRec = perYear.reduce((s, p) => s + p.rec, 0) / perYear.length;
    const first = perYear[0], last = perYear[perYear.length - 1];
    const growth = first.total > 0 ? (last.total - first.total) / first.total : 0;
    yoyNote.textContent =
      `Powtarzalne to średnio ${money(avgRec)} rocznie. ` +
      `Całość ${growth >= 0 ? "wzrosła" : "spadła"} o ${percent(Math.abs(growth))} ` +
      `między ${first.id} a ${last.id}.`;

    charts.yoy = new Chart(ctx, {
      type: "bar",
      data: {
        labels: perYear.map((p) => p.id),
        datasets: [
          { label: "Wraca co roku", data: perYear.map((p) => p.rec),
            backgroundColor: "#0071e3", borderRadius: 6, stack: "a" },
          { label: "Naprawdę jednorazowe", data: perYear.map((p) => p.once),
            backgroundColor: "#a5d0ff", borderRadius: 6, stack: "a" },
        ],
      },
      options: {
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: { position: "top", align: "end",
            labels: { usePointStyle: true, pointStyle: "circle", boxWidth: 7, padding: 14,
              font: { family: "-apple-system, 'SF Pro Text', Inter, sans-serif", size: 12 } } },
          tooltip: { backgroundColor: "rgba(29,29,31,.92)", padding: 12, cornerRadius: 10,
            usePointStyle: true,
            callbacks: {
              label: (c) => ` ${c.dataset.label}: ${money(c.parsed.y)}`,
              footer: (items) => "Razem: " + money(items.reduce((s, i) => s + i.parsed.y, 0)),
            } },
        },
        scales: {
          x: { stacked: true, border: { display: false }, grid: { display: false },
            ticks: { font: { size: 13 }, color: "#1d1d1f" } },
          y: { stacked: true, border: { display: false }, grid: { color: "#f0f0f2" },
            ticks: { font: { size: 11 }, color: "#8e8e93", maxTicksLimit: 6,
              callback: (v) => (Math.abs(v) >= 1000 ? v / 1000 + "k" : v) + " zł" } },
        },
      },
    });
  }

  function drawChart(y) {
    const ctx = document.getElementById("c-year");
    if (!ctx || typeof Chart === "undefined") return;
    charts.year?.destroy();

    const grad = ctx.getContext("2d").createLinearGradient(0, 0, 0, 260);
    grad.addColorStop(0, "rgba(0,113,227,.22)");
    grad.addColorStop(1, "rgba(0,113,227,0)");

    charts.year = new Chart(ctx, {
      type: "line",
      data: {
        labels: MONTHS.map((m) => m.slice(0, 3)),
        datasets: [
          {
            // Liczona z przypisanych miesięcy — rusza się, gdy przesuwasz
            // wydatek na inny miesiąc. To odpowiedź na "martwy wykres".
            label: "Prognoza",
            data: y.projection,
            borderColor: "#ff9f0a", borderDash: [6, 4],
            fill: false, tension: .4, borderWidth: 2,
            pointRadius: 0, pointHoverRadius: 5,
          },
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
