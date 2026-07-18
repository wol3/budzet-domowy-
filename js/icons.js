// Automatyczny dobór ikony na podstawie nazwy kategorii.
// Dzięki temu użytkownik nic nie wybiera — lista sama staje się czytelna.
// Kolejność ma znaczenie — pierwsza pasująca reguła wygrywa, więc bardziej
// szczegółowe wzorce muszą stać przed ogólnymi. Krótkie skróty (OC/AC) mają
// granice słów, żeby nie łapały przypadkowych fragmentów ("wAKACje").
const RULES = [
  [/wakacj|podróż|podroz|urlop|hotel|majówk|majowk|wyjazd|góry|gory|narty/i, "✈️"],
  [/ubezpiecz|polisa|\boc\b|\bac\b/i, "🛡️"],
  [/hipotek|kredyt|nadpłat|nadplat|\bbank\b/i, "🏦"],
  [/podatek|urząd|urzad|zus|skarbow/i, "🧾"],
  [/remont|meble|wyposaż|wyposaz|narzędzi|narzedzi|malowan/i, "🔧"],
  [/czynsz|mieszkan|najem|wynajem|\bdom\b/i, "🏠"],
  [/prąd|prad|energia|\bgaz\b|ogrzewan|woda|śmieci|smieci|media/i, "⚡"],
  [/internet|wifi|światłowód|swiatlowod/i, "🌐"],
  [/telefon|abonament|komórk|komork/i, "📱"],
  [/paliwo|benzyn|diesel|tankow/i, "⛽"],
  [/opon|samoch|serwis|cupra|myjnia|parking|\bauto\b/i, "🚗"],
  [/dentyst|zdrow|lekarz|apteka|leki|rehabilitac/i, "💊"],
  [/spożyw|spozyw|zakupy|market|jedzenie|życie|zycie|biedronka|lidl|auchan/i, "🛒"],
  [/restaur|kawa|pizza|obiad|na mieście|na miescie/i, "🍽️"],
  [/rower|siłown|silown|trener|fitness|sport|basen/i, "🏋️"],
  [/chrzest|komuni|wesel|urodzin|prezent|święt|swiet|imprez|rocznic/i, "🎁"],
  [/dziecko|dzieci|żłobek|zlobek|przedszkol|szkoł|szkol|zabawk|ignaś|ignas/i, "🧸"],
  [/netflix|spotify|hbo|disney|youtube|subskryp|prenumerat/i, "📺"],
  [/ubrani|odzież|odziez|buty|obuwie/i, "👕"],
  [/oszczędn|oszczedn|inwest|fundusz|emerytur/i, "💰"],
  [/kino|rozrywk|\bgry\b|książk|ksiazk|koncert/i, "🎬"],
  [/transport|bilet|komunikacj|pociąg|pociag|autobus|uber/i, "🚌"],
  [/pies|\bkot\b|zwierz|weterynar|karma/i, "🐾"],
  [/fryzjer|kosmetyk|uroda|paznokc/i, "💅"],
  [/edukacj|kurs|studia|szkolen/i, "🎓"],
  [/inne|różne|rozne|pozostał|pozostal/i, "📦"],
];

export function categoryIcon(name) {
  for (const [re, icon] of RULES) if (re.test(name || "")) return icon;
  return "🏷️";
}
