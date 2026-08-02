// Konfiguracja Firebase.
// Te wartości NIE są sekretami w sensie hasła (i tak są widoczne w kodzie
// frontendu), ale trzymamy je lokalnie w repo — nie wklejaj ich na czatach.
// Konta z dostępem do aplikacji. To TYLKO wygodna blokada w interfejsie —
// prawdziwą barierą są reguły Firestore (firestore.rules), bo kod frontendu
// każdy może obejść. Oba miejsca muszą wymieniać te same adresy.
export const ALLOWED_EMAILS = [
  "wolowiczmateusz1@gmail.com",
];

export const firebaseConfig = {
  apiKey: "AIzaSyDJdnqzzZ9bA7amrO8meSPRwILxu6qluPQ",
  authDomain: "budzet-domowy-42855.firebaseapp.com",
  projectId: "budzet-domowy-42855",
  storageBucket: "budzet-domowy-42855.firebasestorage.app",
  messagingSenderId: "994774784717",
  appId: "1:994774784717:web:e60f3befa2b23a48a16784",
  measurementId: "G-104P73B4BG",
};
