// Widok "Hipoteka" — rejestr zmian raty kredytu w czasie.
// Świadomie NIE jest powiązany z ratą w budżecie miesięcznym: to osobna
// historia, którą korygujesz ręcznie. Wszystkie różnice liczone na żywo —
// w arkuszu były wpisywane z palca, tutaj wynikają z danych.
import { money, percent, esc } from "./util.js";
import { amountInput, eyebrow } from "./ui.js";

const FONT = { family: "-apple-system, 'SF Pro Text', Inter, sans-serif", size: 11 };
const tooltipStyle = {
  backgroundColor: "rgba(29,29,31,.92)", padding: 12, cornerRadius: 10,
  usePointStyle: true, titleFont: { ...FONT, size: 12 }, bodyFont: { ...FONT, size: 12 },
  displayColors: false,
};

let chart = null;

// Kolejność tablicy jest źródłem prawdy (arkusz miał ją chronologiczną),
// bo najstarsze wpisy nie mają daty i nie da się ich posortować.
export function computeMortgage(history) {
  const entries = (history?.entries || []).map((e, i) => ({ ...e, idx: i }));
  if (!entries.length) return { entries: [], rows: [], first: null, current: null, peak: null };

  const first = entries[0];
  const current = entries[entries.length - 1];
  const peak = entries.reduce((a, b) => (+b.amount > +a.amount ? b : a), entries[0]);

  const rows = entries.map((e, i) => {
    const prev = i > 0 ? entries[i - 1] : null;
    // Dodatnia zmiana = rata SPADŁA (tak jak kolumna "O ILE" w arkuszu).
    const fromPrev = prev ? (+prev.amount) - (+e.amount) : null;
    const fromStart = (+e.amount) - (+first.amount);
    return { ...e, fromPrev, fromStart };
  });

  const dated = rows.filter((r) => r.date);
  return { entries, rows, first, current, peak, dated, undatedCount: rows.length - dated.length };
}

export function renderMortgage(container, history, actions) {
  container.innerHTML = "";
  if (chart) { chart.destroy(); chart = null; }

  const m = computeMortgage(history);

  if (!m.entries.length) {
    const box = document.createElement("section");
    box.className = "card empty-year";
    box.innerHTML = `
      <div class="empty-ico">🏦</div>
      <h3>Brak historii raty</h3>
      <p>Możesz wczytać historię z arkusza (20 zmian od 2017 roku)
         albo zacząć od pierwszego wpisu.</p>
      <div class="empty-actions">
        <button class="btn-primary" id="m-import">Wczytaj z arkusza</button>
        <button class="btn-ghost" id="m-add">Dodaj pierwszy wpis</button>
      </div>`;
    container.appendChild(box);
    box.querySelector("#m-import").addEventListener("click", () => actions.importFromExcel());
    box.querySelector("#m-add").addEventListener("click", () => actions.addEntry());
    return;
  }

  // refresh() jest zdefiniowane niżej; handlery pól odwołują się do niego przez domknięcie.
  let refresh = () => {};
  const rowRefs = [];

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
  const tCur = tile("Aktualna rata");
  const tStart = tile("Wobec startu");
  const tPeak = tile("Wobec szczytu", "good");
  const tCount = tile("Zmian w historii", "accent");
  container.appendChild(hero);

  function fillHero(mm) {
    const cur = +mm.current.amount, start = +mm.first.amount;
    const vsStart = cur - start, vsPeak = cur - (+mm.peak.amount);
    tCur.val.textContent = money(cur);
    tCur.sub.textContent = mm.current.date ? `od ${mm.current.date}` : "brak daty";
    tStart.val.textContent = (vsStart >= 0 ? "+" : "") + money(vsStart);
    tStart.sub.textContent = `${percent(Math.abs(vsStart) / (start || 1))} ${vsStart >= 0 ? "wyżej" : "niżej"} niż ${money(start)}`;
    tStart.card.className = "hero-card " + (vsStart <= 0 ? "good" : "bad");
    tPeak.val.textContent = money(vsPeak);
    tPeak.sub.textContent = `szczyt ${money(+mm.peak.amount)}${mm.peak.date ? ` w ${mm.peak.date}` : ""}`;
    tCount.val.textContent = String(mm.rows.length);
    tCount.sub.textContent = "wpisów od początku kredytu";
  }
  fillHero(m);

  // ---------- WYKRES ----------
  const chartCard = document.createElement("section");
  chartCard.className = "card chart-card";
  chartCard.appendChild(eyebrow("Przebieg w czasie"));
  chartCard.insertAdjacentHTML("beforeend", `<h3>Jak zmieniała się rata</h3>`);
  if (m.undatedCount) {
    chartCard.insertAdjacentHTML("beforeend",
      `<p class="card-hint">${m.undatedCount} najstarsze wpisy nie mają daty —
       uzupełnij je w tabeli poniżej, a dołączą do wykresu.</p>`);
  }
  const wrap = document.createElement("div");
  wrap.className = "chart-wrap";
  wrap.innerHTML = `<canvas id="c-mortgage"></canvas>`;
  chartCard.appendChild(wrap);
  container.appendChild(chartCard);

  if (m.dated.length >= 2 && typeof Chart !== "undefined") {
    const ctx = document.getElementById("c-mortgage");
    const g = ctx.getContext("2d").createLinearGradient(0, 0, 0, 260);
    g.addColorStop(0, "rgba(0,113,227,.22)");
    g.addColorStop(1, "rgba(0,113,227,0)");

    chart = new Chart(ctx, {
      type: "line",
      data: {
        labels: m.dated.map((r) => r.date),
        datasets: [{
          data: m.dated.map((r) => +r.amount),
          borderColor: "#0071e3", backgroundColor: g, fill: true,
          stepped: "after", borderWidth: 2.5,
          // Nadpłaty (wpisy z notatką) wyróżniamy większym, zielonym punktem.
          pointRadius: m.dated.map((r) => (r.note ? 6 : 2.5)),
          pointBackgroundColor: m.dated.map((r) => (r.note ? "#34c759" : "#0071e3")),
          pointBorderColor: "#fff", pointBorderWidth: 2,
        }],
      },
      options: {
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { ...tooltipStyle, callbacks: {
            label: (i) => {
              const r = m.dated[i.dataIndex];
              const parts = [` Rata: ${money(+r.amount)}`];
              if (r.fromPrev !== null && r.fromPrev !== 0) {
                parts.push(r.fromPrev > 0 ? ` Spadek o ${money(r.fromPrev)}`
                                          : ` Wzrost o ${money(-r.fromPrev)}`);
              }
              if (r.note) parts.push(` ${r.note}`);
              return parts;
            } } },
        },
        scales: {
          x: { border: { display: false }, grid: { display: false },
            ticks: { font: FONT, color: "#8e8e93", maxRotation: 0, autoSkipPadding: 20 } },
          y: { border: { display: false }, grid: { color: "#f2f2f4" },
            ticks: { font: FONT, color: "#8e8e93", maxTicksLimit: 5,
              callback: (v) => Math.round(v) + " zł" } },
        },
      },
    });
    // Zabezpieczenie: gdyby kontener nie miał jeszcze wymiarów w momencie
    // tworzenia wykresu (np. zakładka dopiero się pokazuje), Chart.js zapamięta
    // zerową szerokość i punkty skleją się przy lewej krawędzi.
    requestAnimationFrame(() => { try { chart?.resize(); } catch { /* ignore */ } });
  } else {
    wrap.remove();
    chartCard.insertAdjacentHTML("beforeend",
      `<p class="empty">Wykres pojawi się, gdy co najmniej 2 wpisy będą miały datę.</p>`);
  }

  // ---------- TABELA ----------
  const tableCard = document.createElement("section");
  tableCard.className = "card";
  tableCard.appendChild(eyebrow("Rejestr zmian"));
  tableCard.insertAdjacentHTML("beforeend", `<h3>Wszystkie wpisy</h3>`);

  const head = document.createElement("div");
  head.className = "mh-head";
  head.innerHTML = `<span>Data</span><span>Rata</span><span>Zmiana</span>
    <span>Od startu</span><span>Uwagi</span><span></span>`;
  tableCard.appendChild(head);

  const list = document.createElement("div");
  list.className = "mh-list";
  // Najnowsze na górze — tak się to czyta w praktyce.
  [...m.rows].reverse().forEach((r) => {
    const row = document.createElement("div");
    row.className = "mh-row" + (r.note ? " highlight" : "");

    const dateI = document.createElement("input");
    dateI.type = "date"; dateI.className = "mh-date"; dateI.value = r.date || "";
    // Data to zdarzenie "change" (po zatwierdzeniu) — pełny render jest OK,
    // bo może zmienić, które wpisy trafiają na wykres.
    dateI.addEventListener("change", () =>
      actions.updateEntry(r.id, { date: dateI.value || null }, actions.rerender));

    const amtBox = document.createElement("div");
    amtBox.className = "field-money mini";
    const amtI = amountInput(r.amount, "0");
    const cur2 = document.createElement("span");
    cur2.className = "field-cur"; cur2.textContent = "zł";
    amtBox.append(amtI, cur2);
    // Kwota to pisanie znak po znaku — liczymy w miejscu, bez re-renderu,
    // żeby pole nie traciło focusu.
    amtI.addEventListener("input", () =>
      actions.updateEntry(r.id, { amount: parseFloat(amtI.value) || 0 }, refresh));

    const chg = document.createElement("span");
    chg.className = "mh-chg";
    if (r.fromPrev === null) {
      chg.textContent = "—"; chg.classList.add("muted");
    } else {
      chg.textContent = (r.fromPrev > 0 ? "▼ " : r.fromPrev < 0 ? "▲ " : "") + money(Math.abs(r.fromPrev));
      chg.classList.add(r.fromPrev > 0 ? "good" : r.fromPrev < 0 ? "bad" : "muted");
    }

    const fs = document.createElement("span");
    fs.className = "mh-start " + (r.fromStart <= 0 ? "good" : "bad");
    fs.textContent = (r.fromStart >= 0 ? "+" : "") + money(r.fromStart);

    const noteI = document.createElement("input");
    noteI.type = "text"; noteI.className = "mh-note";
    noteI.placeholder = "np. nadpłata, zmiana WIBOR";
    noteI.value = r.note || "";
    noteI.addEventListener("input", () => actions.updateEntry(r.id, { note: noteI.value }));

    const del = document.createElement("button");
    del.className = "exp-del"; del.title = "Usuń wpis"; del.textContent = "✕";
    del.addEventListener("click", () => {
      if (confirm(`Usunąć wpis ${r.date || ""} ${money(+r.amount)}?`)) actions.deleteEntry(r.id);
    });

    row.append(dateI, amtBox, chg, fs, noteI, del);
    list.appendChild(row);
    rowRefs.push({ id: r.id, chg, fs });
  });
  tableCard.appendChild(list);

  // Przeliczenie w miejscu: hero, kolumny "Zmiana"/"Od startu" i wykres —
  // bez odtwarzania pól input.
  refresh = () => {
    const mm = computeMortgage(history);
    fillHero(mm);
    const byId = new Map(mm.rows.map((r) => [r.id, r]));
    rowRefs.forEach((ref) => {
      const r = byId.get(ref.id);
      if (!r) return;
      if (r.fromPrev === null) {
        ref.chg.textContent = "—"; ref.chg.className = "mh-chg muted";
      } else {
        ref.chg.textContent = (r.fromPrev > 0 ? "▼ " : r.fromPrev < 0 ? "▲ " : "") + money(Math.abs(r.fromPrev));
        ref.chg.className = "mh-chg " + (r.fromPrev > 0 ? "good" : r.fromPrev < 0 ? "bad" : "muted");
      }
      ref.fs.textContent = (r.fromStart >= 0 ? "+" : "") + money(r.fromStart);
      ref.fs.className = "mh-start " + (r.fromStart <= 0 ? "good" : "bad");
    });
    if (chart) {
      chart.data.datasets[0].data = mm.dated.map((r) => +r.amount);
      chart.update();
    }
  };

  const add = document.createElement("button");
  add.className = "btn-add"; add.textContent = "+ Dodaj zmianę raty";
  add.addEventListener("click", () => actions.addEntry());
  tableCard.appendChild(add);
  container.appendChild(tableCard);
}
