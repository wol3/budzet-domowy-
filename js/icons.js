// Automatyczny dobór ikony na podstawie nazwy kategorii.
// Dzięki temu użytkownik nic nie wybiera — lista sama staje się czytelna.
const RULES = [
  [/hipotek|kredyt|bank/i, "🏦"],
  [/czynsz|mieszkan|najem|wynajem|dom/i, "🏠"],
  [/prąd|prad|energia|gaz|ogrzewan|woda|śmieci|smieci|media/i, "⚡"],
  [/internet|wifi|światłowód|swiatlowod/i, "🌐"],
  [/telefon|abonament|komórk|komork/i, "📱"],
  [/paliwo|benzyn|diesel|tankow/i, "⛽"],
  [/samoch|auto|serwis|opony|myjnia|parking/i, "🚗"],
  [/ubezpiecz|polisa|oc|ac/i, "🛡️"],
  [/spożyw|spozyw|zakupy|market|jedzenie|życie|zycie|biedronka|lidl|auchan/i, "🛒"],
  [/restaur|kawa|pizza|obiad|na mieście|na miescie/i, "🍽️"],
  [/siłown|silown|trener|fitness|sport|basen|rower/i, "🏋️"],
  [/dziecko|dzieci|żłobek|zlobek|przedszkol|szkoł|szkol|zabawk/i, "🧸"],
  [/zdrow|lekarz|apteka|dentyst|leki|rehabilitac/i, "💊"],
  [/netflix|spotify|hbo|disney|youtube|subskryp|prenumerat/i, "📺"],
  [/ubrani|odzież|odziez|buty|obuwie/i, "👕"],
  [/wakacj|podróż|podroz|urlop|hotel|lot/i, "✈️"],
  [/oszczędn|oszczedn|inwest|fundusz|emerytur/i, "💰"],
  [/prezent|urodzin|święt|swiet|wesel/i, "🎁"],
  [/kino|rozrywk|gry|książk|ksiazk|koncert/i, "🎬"],
  [/transport|bilet|komunikacj|pociąg|pociag|autobus|uber/i, "🚌"],
  [/pies|kot|zwierz|weterynar|karma/i, "🐾"],
  [/fryzjer|kosmetyk|uroda|paznokc/i, "💅"],
  [/remont|meble|wyposaż|wyposaz|narzędzi|narzedzi/i, "🔧"],
  [/edukacj|kurs|studia|szkolen/i, "🎓"],
  [/inne|różne|rozne|pozostał|pozostal/i, "📦"],
];

export function categoryIcon(name) {
  for (const [re, icon] of RULES) if (re.test(name || "")) return icon;
  return "🏷️";
}
