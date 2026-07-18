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

// --- Plan roczny ---------------------------------------------------------

export function emptyYear(y) {
  return {
    startBalance: 0,
    months: Array.from({ length: 12 }, (_, i) => ({
      m: i + 1, planned: 0, assumption: null, actual: null,
    })),
    oneOffs: [],
  };
}

export async function loadYear(yearId) {
  const snap = await getDoc(doc(db, "years", String(yearId)));
  return snap.exists() ? { ...emptyYear(yearId), ...snap.data() } : null;
}

export async function saveYear(yearId, data) {
  await setDoc(doc(db, "years", String(yearId)), data);
}

// Które lata mają już plan — do podpowiedzi w przełączniku.
export async function listYears() {
  const snap = await getDocs(collection(db, "years"));
  return snap.docs.map((d) => d.id).sort();
}

// Nowy rok na bazie poprzedniego: przenosimy miesięczne cele i wydatki
// jednorazowe, a jako punkt startowy bierzemy ostatni znany stan z tamtego
// roku (faktyczny, a gdy go brak — założenie).
export async function createYearFrom(sourceId, targetId) {
  const src = await loadYear(sourceId);
  const base = emptyYear(targetId);
  if (src) {
    const months = src.months || [];
    const rev = [...months].reverse();
    const lastActual = rev.find((m) => m.actual !== null && m.actual !== undefined);
    const lastAssum = rev.find((m) => m.assumption !== null && m.assumption !== undefined);
    base.startBalance = lastActual?.actual ?? lastAssum?.assumption ?? 0;
    base.months = base.months.map((m, i) => ({ ...m, planned: months[i]?.planned ?? 0 }));
    base.oneOffs = (src.oneOffs || []).map((o) => ({ ...o, id: newId() }));
  }
  await saveYear(targetId, base);
  return base;
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
