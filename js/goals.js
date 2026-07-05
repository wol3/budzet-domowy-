// Widok "Cele" oszczędnościowe: lista celów z paskiem postępu, dodawanie,
// dopisywanie kwoty, edycja, oznaczanie domyślnego, usuwanie.
import { money, percent, esc } from "./util.js";

function goalCard(goal, actions) {
  const card = document.createElement("section");
  card.className = "card goal" + (goal.isDefault ? " is-default" : "");
  const ratio = goal.targetAmount > 0
    ? Math.min(1, (goal.currentAmount || 0) / goal.targetAmount) : 0;
  const done = ratio >= 1;

  card.innerHTML = `
    <header class="goal-head">
      <h3>${esc(goal.name)}</h3>
      ${goal.isDefault ? '<span class="badge">domyślny</span>' : ""}
    </header>
    <div class="goal-nums">
      <b>${money(goal.currentAmount || 0)}</b>
      <span>z ${money(goal.targetAmount || 0)}</span>
    </div>
    <div class="goal-bar ${done ? "done" : ""}"><i style="width:${(ratio * 100).toFixed(1)}%"></i></div>
    <div class="goal-meta">
      <span>${percent(ratio)}${done ? " · osiągnięty 🎉" : ""}</span>
      ${goal.targetDate ? `<span>do ${esc(goal.targetDate)}</span>` : ""}
    </div>
    <div class="goal-actions">
      <div class="add-amount">
        <input type="number" inputmode="decimal" placeholder="Dopisz kwotę" />
        <button class="btn-mini add">Dodaj</button>
      </div>
      <div class="goal-btns">
        <button class="btn-mini default" ${goal.isDefault ? "disabled" : ""}>Ustaw domyślny</button>
        <button class="btn-mini edit">Edytuj</button>
        <button class="btn-mini danger del">Usuń</button>
      </div>
    </div>`;

  const amtInput = card.querySelector(".add-amount input");
  card.querySelector(".add-amount .add").addEventListener("click", () => {
    const add = parseFloat(amtInput.value);
    if (!add) return;
    actions.updateGoal(goal.id, { currentAmount: (goal.currentAmount || 0) + add });
  });
  card.querySelector(".default").addEventListener("click", () =>
    actions.setDefaultGoal(goal.id));
  card.querySelector(".del").addEventListener("click", () => {
    if (confirm(`Usunąć cel "${goal.name}"?`)) actions.deleteGoal(goal.id);
  });
  card.querySelector(".edit").addEventListener("click", () => {
    const name = prompt("Nazwa celu:", goal.name);
    if (name === null) return;
    const target = prompt("Kwota docelowa:", goal.targetAmount || 0);
    if (target === null) return;
    const current = prompt("Kwota zebrana:", goal.currentAmount || 0);
    if (current === null) return;
    const date = prompt("Data docelowa (RRRR-MM-DD lub puste):", goal.targetDate || "");
    actions.updateGoal(goal.id, {
      name: name.trim() || goal.name,
      targetAmount: parseFloat(target) || 0,
      currentAmount: parseFloat(current) || 0,
      targetDate: date ? date.trim() : null,
    });
  });

  return card;
}

export function renderGoals(container, goals, actions) {
  container.innerHTML = `
    <div class="goals-head">
      <h2>Cele oszczędnościowe</h2>
      <button class="btn-primary" id="add-goal">+ Nowy cel</button>
    </div>`;
  container.querySelector("#add-goal").addEventListener("click", () => {
    const name = prompt("Nazwa celu (np. Fundusz samochodowy):");
    if (!name) return;
    const target = parseFloat(prompt("Kwota docelowa:", "0")) || 0;
    const date = prompt("Data docelowa (RRRR-MM-DD lub puste):", "");
    actions.addGoal({
      name: name.trim(),
      targetAmount: target,
      currentAmount: 0,
      targetDate: date ? date.trim() : null,
      isDefault: false,
    });
  });

  if (!goals.length) {
    const p = document.createElement("p");
    p.className = "empty";
    p.textContent = "Nie masz jeszcze żadnych celów. Dodaj pierwszy, np. „Fundusz samochodowy”.";
    container.appendChild(p);
    return;
  }

  const grid = document.createElement("div");
  grid.className = "grid-3 goals-grid";
  goals.forEach((g) => grid.appendChild(goalCard(g, actions)));
  container.appendChild(grid);
}
