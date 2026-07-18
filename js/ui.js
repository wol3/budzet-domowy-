// Wspólne atomy UI — jedno miejsce, w którym definiujemy jak wygląda pole
// kwoty. Dzięki temu waluta "zł" jest konsekwentnie WSZĘDZIE, a nie tylko
// w niektórych sekcjach.
import { esc } from "./util.js";

export function amountInput(value, placeholder = "0") {
  const input = document.createElement("input");
  input.type = "number";
  input.inputMode = "decimal";
  input.step = "1";
  input.placeholder = placeholder;
  input.value = value ?? "";
  return input;
}

// Pole kwoty z sufiksem waluty — używane w kartach (Dochody, Hipoteka, Bufor).
export function moneyField(parent, label, value, onInput, opts = {}) {
  const wrap = document.createElement("label");
  wrap.className = "field" + (opts.compact ? " compact" : "");
  wrap.innerHTML = `<span>${esc(label)}</span>`;
  const box = document.createElement("div");
  box.className = "field-money";
  const input = amountInput(value, opts.placeholder ?? "0");
  const cur = document.createElement("span");
  cur.className = "field-cur";
  cur.textContent = "zł";
  box.append(input, cur);
  wrap.appendChild(box);
  parent.appendChild(wrap);
  input.addEventListener("input", () => onInput(parseFloat(input.value) || 0));
  return input;
}

// Mała etykieta-nadtytuł (Copilot Money używa ich nad sekcjami).
export function eyebrow(text) {
  const el = document.createElement("div");
  el.className = "eyebrow";
  el.textContent = text;
  return el;
}
