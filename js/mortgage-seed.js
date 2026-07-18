// Historia raty hipotecznej przeniesiona z arkusza (zakładka "Archive", kolumny S–W).
// Używane tylko przy imporcie — potem dane żyją w Firestore i edytujesz je w apce.
// Uwaga: cztery najstarsze wpisy nie miały w arkuszu daty (date: null).
// Zachowana jest ich kolejność, ale na wykresie pojawią się dopiero po uzupełnieniu daty.
export const MORTGAGE_SEED = {
  entries: [
    { id: "h01", date: "2017-02-01", amount: 1806.78, note: "" },
    { id: "h02", date: null, amount: 1529, note: "" },
    { id: "h03", date: null, amount: 1602.33, note: "" },
    { id: "h04", date: null, amount: 1989.92, note: "" },
    { id: "h05", date: null, amount: 2557.91, note: "" },
    { id: "h06", date: "2022-07-15", amount: 2842.48, note: "" },
    { id: "h07", date: "2022-10-18", amount: 2909.92, note: "" },
    { id: "h08", date: "2023-02-15", amount: 2827.4, note: "" },
    { id: "h09", date: "2023-04-15", amount: 2821.65, note: "" },
    { id: "h10", date: "2023-09-15", amount: 2807.51, note: "" },
    { id: "h11", date: "2023-11-15", amount: 2552.41, note: "" },
    { id: "h12", date: "2024-01-15", amount: 2552.71, note: "" },
    { id: "h13", date: "2024-02-15", amount: 2591.22, note: "" },
    { id: "h14", date: "2025-03-20", amount: 2191.15, note: "nadpłata 50.000 tys. zł" },
    { id: "h15", date: "2025-05-15", amount: 2143.33, note: "" },
    { id: "h16", date: "2025-08-15", amount: 2048.64, note: "" },
    { id: "h17", date: "2025-11-15", amount: 1968.64, note: "" },
    { id: "h18", date: "2026-02-15", amount: 1873.1, note: "" },
    { id: "h19", date: "2026-03-19", amount: 1526.46, note: "nadpłata 50.000 tys. zł" },
    { id: "h20", date: "2026-05-15", amount: 1511.62, note: "" },
  ],
};
