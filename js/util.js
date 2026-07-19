// Drobne helpery formatowania i DOM.
// Jedna konwencja kwot w całej apce: złote z groszami (1 511,62 zł).
// Grupujemy tysiące ręcznie, bo polska lokalizacja w Intl NIE grupuje liczb
// czterocyfrowych ("4540,47" obok "10 959,53"), a opcja minimumGroupingDigits
// nie jest wszędzie obsługiwana. W kolumnie kwot spójność jest ważniejsza
// niż wierność domyślnym regułom CLDR.
const NBSP = " "; // twarda spacja — kwota nie łamie się na końcu linii
function group(v) {
  const n = Number(v) || 0;
  const [int, frac] = Math.abs(n).toFixed(2).split(".");
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
  return (n < 0 ? "-" : "") + grouped + "," + frac;
}

const plPercent = new Intl.NumberFormat("pl-PL", {
  style: "percent", maximumFractionDigits: 1,
});

export const money = (v) => group(v) + NBSP + "zł";
// Sama liczba, bez "zł" — tam, gdzie walutę wyświetla osobny element obok pola.
export const amount = (v) => group(v);
export const percent = (v) => plPercent.format(Number(v) || 0);
// Zachowane dla zgodności — money() ma już grosze.
export const money2 = money;

// Nazwa miesiąca po polsku z id "YYYY-MM".
export function monthLabel(id) {
  const [y, m] = id.split("-").map(Number);
  const names = ["styczeń","luty","marzec","kwiecień","maj","czerwiec",
    "lipiec","sierpień","wrzesień","październik","listopad","grudzień"];
  return `${names[m - 1]} ${y}`;
}

// Miejscownik nazwy miesiąca — "w czerwcu", nie "w czerwiec".
const LOCATIVE = ["styczniu","lutym","marcu","kwietniu","maju","czerwcu",
  "lipcu","sierpniu","wrześniu","październiku","listopadzie","grudniu"];
export function monthLocative(id) {
  const m = Number(String(id).split("-")[1]);
  return LOCATIVE[m - 1] || "";
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
