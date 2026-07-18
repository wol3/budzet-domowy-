// Orkiestracja: auth, nawigacja, przełączanie miesięcy, stan i akcje.
import { watchAuth, loginWithGoogle, logout, authErrorMessage } from "./auth.js";
import * as store from "./store.js";
import { renderBudget } from "./budget.js";
import { renderCharts } from "./charts.js";
import { renderGoals } from "./goals.js";
import { renderYear } from "./year.js";
import { YEAR_SEEDS, SEED_YEARS } from "./year-seed.js";
import { el, money, percent, monthLabel, shiftMonth, esc } from "./util.js";
import { computeSummary } from "./calc.js";

const state = {
  monthId: store.currentMonthId(),
  budget: store.emptyBudget(),
  goals: [],
  allBudgets: [],
  yearId: new Date().getFullYear(),
  year: null,
  knownYears: [],
  view: "budget",
  saveTimer: null,
  yearTimer: null,
};

// --- Zapis z debounce (nie zapisujemy przy każdym wciśnięciu klawisza) ---
function scheduleSave() {
  clearTimeout(state.saveTimer);
  setSaveStatus("saving");
  state.saveTimer = setTimeout(async () => {
    try {
      await store.saveBudget(state.monthId, state.budget);
      setSaveStatus("saved");
    } catch (e) {
      console.error(e);
      setSaveStatus("error");
    }
  }, 600);
}

function setSaveStatus(s) {
  const map = { saving: "Zapisywanie…", saved: "Zapisano ✓", error: "Błąd zapisu" };
  const n = el("save-status");
  if (n) { n.textContent = map[s] || ""; n.dataset.state = s; }
}

// --- Akcje mutujące budżet ------------------------------------------------
const actions = {
  // Edycje pól: zapisujemy stan i planujemy zapis, ale NIE przebudowujemy widoku
  // — budget.js sam odświeża wartości pochodne (inaczej input gubił focus).
  updateIncome(patch) { Object.assign(state.budget.income, patch); scheduleSave(); },
  updateMortgage(patch) { Object.assign(state.budget.mortgage, patch); scheduleSave(); },
  updateBuffer(v) { state.budget.buffer = v; scheduleSave(); },
  updateExpense(person, id, patch) {
    const item = state.budget[person].find((e) => e.id === id);
    if (!item) return;
    Object.assign(item, patch);
    scheduleSave();
  },
  // Zmiany strukturalne (dodanie/usunięcie wiersza) wymagają pełnego renderu.
  addExpense(person) {
    state.budget[person].push({ id: store.newId(), category: "", amount: 0, monthlyLimit: 0, paid: false });
    scheduleSave(); renderCurrent();
  },
  deleteExpense(person, id) {
    state.budget[person] = state.budget[person].filter((e) => e.id !== id);
    scheduleSave(); renderCurrent();
  },
  // --- Cele ---
  async addGoal(goal) { await store.addGoal(goal); await reloadGoals(); },
  async updateGoal(id, patch) { await store.updateGoal(id, patch); await reloadGoals(); },
  async deleteGoal(id) { await store.deleteGoal(id); await reloadGoals(); },
  async setDefaultGoal(id) {
    await Promise.all(state.goals.map((g) =>
      store.updateGoal(g.id, { isDefault: g.id === id })));
    await reloadGoals();
  },
};

// --- Plan roczny ----------------------------------------------------------
function scheduleYearSave() {
  clearTimeout(state.yearTimer);
  setSaveStatus("saving");
  state.yearTimer = setTimeout(async () => {
    try {
      await store.saveYear(state.yearId, state.year);
      setSaveStatus("saved");
    } catch (e) { console.error(e); setSaveStatus("error"); }
  }, 600);
}

const yearActions = {
  updateYear(patch) { Object.assign(state.year, patch); scheduleYearSave(); },
  updateMonth(i, patch) { Object.assign(state.year.months[i], patch); scheduleYearSave(); },
  updateOneOff(id, patch) {
    const o = state.year.oneOffs.find((x) => x.id === id);
    if (o) { Object.assign(o, patch); scheduleYearSave(); }
  },
  addOneOff() {
    state.year.oneOffs.push({ id: store.newId(), name: "", amount: 0 });
    scheduleYearSave(); renderCurrent();
  },
  deleteOneOff(id) {
    state.year.oneOffs = state.year.oneOffs.filter((x) => x.id !== id);
    scheduleYearSave(); renderCurrent();
  },
  // Jednorazowy import planu z arkusza (zakładka "Rok 2026").
  async importFromExcel() {
    const seed = YEAR_SEEDS[state.yearId];
    if (!seed) return;
    state.year = JSON.parse(JSON.stringify(seed));
    await store.saveYear(state.yearId, state.year);
    state.knownYears = await store.listYears();
    setSaveStatus("saved");
    renderCurrent();
  },
};

async function reloadGoals() {
  state.goals = await store.loadGoals();
  if (state.view === "goals") renderGoals(el("view-goals"), state.goals, actions);
  renderDefaultGoalBanner();
}

// Baner domyślnego celu na dashboardzie (widok "Ten miesiąc").
function renderDefaultGoalBanner() {
  const host = el("default-goal");
  if (!host) return;
  const g = state.goals.find((x) => x.isDefault);
  if (!g) { host.innerHTML = ""; host.hidden = true; return; }
  host.hidden = false;
  const ratio = g.targetAmount > 0 ? Math.min(1, (g.currentAmount || 0) / g.targetAmount) : 0;
  host.innerHTML = `
    <div class="dg-top"><span>🎯 ${esc(g.name)}</span>
      <b>${money(g.currentAmount || 0)} / ${money(g.targetAmount || 0)} · ${percent(ratio)}</b></div>
    <div class="goal-bar"><i style="width:${(ratio * 100).toFixed(1)}%"></i></div>`;
}

// --- Render bieżącego widoku ---------------------------------------------
function renderCurrent() {
  if (state.view === "budget") {
    renderBudget(el("view-budget"), state.budget, actions);
    renderDefaultGoalBanner();
  } else if (state.view === "charts") {
    renderCharts(el("view-charts"), state.budget, state.allBudgets);
  } else if (state.view === "goals") {
    renderGoals(el("view-goals"), state.goals, actions);
  } else if (state.view === "year") {
    renderYearView();
  }
}

// Przełącznik lat — bez niego apka "wygasa" z końcem roku.
async function loadYearData(yearId) {
  state.yearId = yearId;
  try {
    state.year = await store.loadYear(yearId);
  } catch (e) {
    console.error("Nie udało się wczytać planu rocznego:", e);
    state.year = null;
  }
  renderCurrent();
}

function yearSwitcher() {
  const nav = document.createElement("div");
  nav.className = "year-switch";
  nav.innerHTML = `
    <button class="btn-round" id="y-prev" aria-label="Poprzedni rok">‹</button>
    <div class="year-label"><h2>${state.yearId}</h2></div>
    <button class="btn-round" id="y-next" aria-label="Następny rok">›</button>`;
  nav.querySelector("#y-prev").addEventListener("click", () => loadYearData(state.yearId - 1));
  nav.querySelector("#y-next").addEventListener("click", () => loadYearData(state.yearId + 1));
  return nav;
}

// Rok: jeśli nie ma jeszcze planu, proponujemy sensowne drogi startu.
function renderYearView() {
  const host = el("view-year");
  host.innerHTML = "";
  host.appendChild(yearSwitcher());

  if (!state.year) {
    const prev = state.yearId - 1;
    const hasPrev = state.knownYears.includes(String(prev));
    const isSheetYear = SEED_YEARS.includes(state.yearId); // lata dostępne w arkuszu

    const box = document.createElement("section");
    box.className = "card empty-year";
    box.innerHTML = `
      <div class="empty-ico">📅</div>
      <h3>Brak planu na ${state.yearId}</h3>
      <p>${isSheetYear
        ? `Ten rok jest w Twoim arkuszu — możesz wczytać go w całości
           (start roku, cele miesięczne i wydatki jednorazowe).`
        : hasPrev
        ? `Możesz przenieść cele miesięczne i wydatki jednorazowe z ${prev} —
           jako punkt startowy weźmiemy ostatni znany stan z tamtego roku.`
        : "Zacznij nowy plan: start roku, cele miesięczne i duże wydatki."}</p>
      <div class="empty-actions">
        ${isSheetYear ? `<button class="btn-primary" id="y-import">Wczytaj plan z arkusza</button>` : ""}
        ${hasPrev ? `<button class="${isSheetYear ? "btn-ghost" : "btn-primary"}" id="y-from-prev">Utwórz na podstawie ${prev}</button>` : ""}
        <button class="btn-ghost" id="y-empty">Zacznij od zera</button>
      </div>`;
    host.appendChild(box);

    const imp = el("y-import");
    if (imp) imp.addEventListener("click", () => yearActions.importFromExcel());
    const fromPrev = el("y-from-prev");
    if (fromPrev) fromPrev.addEventListener("click", async () => {
      state.year = await store.createYearFrom(prev, state.yearId);
      state.knownYears = await store.listYears();
      renderCurrent();
    });
    el("y-empty").addEventListener("click", async () => {
      state.year = store.emptyYear(state.yearId);
      await store.saveYear(state.yearId, state.year);
      state.knownYears = await store.listYears();
      renderCurrent();
    });
    return;
  }

  const body = document.createElement("div");
  host.appendChild(body);
  renderYear(body, state.year, yearActions);
}

function switchView(view) {
  state.view = view;
  // Przełącznik miesięcy dotyczy tylko widoków miesięcznych.
  const ms = document.querySelector(".month-switch");
  if (ms) ms.hidden = (view === "year" || view === "goals");
  document.querySelectorAll(".nav-btn").forEach((b) =>
    b.classList.toggle("active", b.dataset.view === view));
  document.querySelectorAll(".view").forEach((v) =>
    v.classList.toggle("active", v.id === `view-${view}`));
  renderCurrent();
}

// --- Miesiące -------------------------------------------------------------
async function loadMonth(monthId, { createIfMissing = false } = {}) {
  state.monthId = monthId;
  el("month-label").textContent = monthLabel(monthId);
  let b = await store.loadBudget(monthId);
  if (!b && createIfMissing) { b = store.emptyBudget(); await store.saveBudget(monthId, b); }
  state.budget = b || store.emptyBudget();
  el("month-missing").hidden = !!b;
  state.allBudgets = await store.loadAllBudgets();
  setSaveStatus(b ? "saved" : "");
  renderCurrent();
}

function wireHeader() {
  el("prev-month").addEventListener("click", () => loadMonth(shiftMonth(state.monthId, -1)));
  el("next-month").addEventListener("click", () => loadMonth(shiftMonth(state.monthId, 1)));
  el("create-month").addEventListener("click", async () => {
    const prev = shiftMonth(state.monthId, -1);
    const src = (await store.listMonths()).includes(prev) ? prev : null;
    if (src) await store.createMonthFrom(src, state.monthId);
    else await store.saveBudget(state.monthId, store.emptyBudget());
    await loadMonth(state.monthId);
  });
  document.querySelectorAll(".nav-btn").forEach((b) =>
    b.addEventListener("click", () => switchView(b.dataset.view)));
  el("logout").addEventListener("click", () => logout());
}

// --- Logowanie ------------------------------------------------------------
function wireLogin() {
  el("login-google").addEventListener("click", async () => {
    el("login-error").textContent = "";
    try {
      await loginWithGoogle();
    } catch (err) {
      el("login-error").textContent = authErrorMessage(err.code);
    }
  });
}

// --- Start ----------------------------------------------------------------
function boot() {
  wireLogin();
  wireHeader();
  watchAuth(
    async (user) => {
      el("login-screen").hidden = true;
      el("app").hidden = false;
      el("user-email").textContent = user.email;
      renderCurrent(); // od razu pokaż widok (pusty stan), zanim dojdą dane
      // Budżet ładujemy jako pierwszy i niezależnie — błąd celów nie może go blokować.
      try {
        await loadMonth(store.currentMonthId());
      } catch (e) {
        console.error("Nie udało się wczytać miesiąca:", e);
        renderCurrent();
      }
      try {
        state.goals = await store.loadGoals();
        renderDefaultGoalBanner();
        if (state.view === "goals") renderCurrent();
      } catch (e) {
        console.error("Nie udało się wczytać celów:", e);
      }
      try {
        state.year = await store.loadYear(state.yearId);
        state.knownYears = await store.listYears();
        if (state.view === "year") renderCurrent();
      } catch (e) {
        console.error("Nie udało się wczytać planu rocznego:", e);
      }
    },
    () => {
      el("app").hidden = true;
      el("login-screen").hidden = false;
    },
  );
}

boot();
