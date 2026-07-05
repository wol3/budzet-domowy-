// Drobne helpery formatowania i DOM.
const plMoney = new Intl.NumberFormat("pl-PL", {
  style: "currency", currency: "PLN", maximumFractionDigits: 0,
});
const plMoney2 = new Intl.NumberFormat("pl-PL", {
  style: "currency", currency: "PLN", minimumFractionDigits: 2, maximumFractionDigits: 2,
});
const plPercent = new Intl.NumberFormat("pl-PL", {
  style: "percent", maximumFractionDigits: 1,
});

export const money = (v) => plMoney.format(Number(v) || 0);
export const money2 = (v) => plMoney2.format(Number(v) || 0);
export const percent = (v) => plPercent.format(Number(v) || 0);

// Nazwa miesiąca po polsku z id "YYYY-MM".
export function monthLabel(id) {
  const [y, m] = id.split("-").map(Number);
  const names = ["styczeń","luty","marzec","kwiecień","maj","czerwiec",
    "lipiec","sierpień","wrzesień","październik","listopad","grudzień"];
  return `${names[m - 1]} ${y}`;
}

// Poprzedni / następny miesiąc względem id.
export function shiftMonth(id, delta) {
  const [y, m] = id.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export const el = (id) => document.getElementById(id);

// Bezpieczne escapowanie tekstu wstawianego do innerHTML.
export function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
