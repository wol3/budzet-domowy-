// Warstwa danych: Firestore CRUD dla budżetów (per miesiąc) i celów.
import { db } from "./firebase.js";
import {
  doc, getDoc, setDoc, collection, getDocs,
  addDoc, updateDoc, deleteDoc, query, orderBy,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

export function currentMonthId(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function emptyBudget() {
  return {
    income: { matiSalary: 0, kiniaSalary: 0, benefit800: 0 },
    mortgage: { totalInstallment: 0, coveredBy800: 0 },
    buffer: 0,
    expensesMati: [],
    expensesKinia: [],
  };
}

export function newId() {
  return "e" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// --- Budżety -------------------------------------------------------------

export async function loadBudget(monthId) {
  const snap = await getDoc(doc(db, "budgets", monthId));
  if (!snap.exists()) return null;
  return { ...emptyBudget(), ...snap.data() };
}

export async function saveBudget(monthId, budget) {
  await setDoc(doc(db, "budgets", monthId), budget);
}

// Lista istniejących miesięcy (posortowana rosnąco).
export async function listMonths() {
  const snap = await getDocs(collection(db, "budgets"));
  return snap.docs.map((d) => d.id).sort();
}

// Nowy miesiąc na podstawie poprzedniego: kopiujemy strukturę, kasujemy
// statusy "zapłacono", zachowujemy kategorie/limity/kwoty jako punkt startowy.
export async function createMonthFrom(sourceId, targetId) {
  const src = (await loadBudget(sourceId)) || emptyBudget();
  const clone = JSON.parse(JSON.stringify(src));
  const resetPaid = (list) =>
    (list || []).map((e) => ({ ...e, id: newId(), paid: false }));
  clone.expensesMati = resetPaid(clone.expensesMati);
  clone.expensesKinia = resetPaid(clone.expensesKinia);
  await saveBudget(targetId, clone);
  return clone;
}

// Snapshot podsumowań wszystkich miesięcy — do wykresu trendu.
export async function loadAllBudgets() {
  const snap = await getDocs(collection(db, "budgets"));
  return snap.docs
    .map((d) => ({ id: d.id, ...emptyBudget(), ...d.data() }))
    .sort((a, b) => a.id.localeCompare(b.id));
}

// --- Cele ----------------------------------------------------------------

export async function loadGoals() {
  const snap = await getDocs(query(collection(db, "goals"), orderBy("name")));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function addGoal(goal) {
  const ref = await addDoc(collection(db, "goals"), goal);
  return ref.id;
}

export async function updateGoal(id, patch) {
  await updateDoc(doc(db, "goals", id), patch);
}

export async function deleteGoal(id) {
  await deleteDoc(doc(db, "goals", id));
}
