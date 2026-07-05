// Logowanie (Firebase Auth, email/hasło, jedno konto).
import { auth } from "./firebase.js";
import {
  onAuthStateChanged, signInWithEmailAndPassword, signOut,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

export function watchAuth(onIn, onOut) {
  onAuthStateChanged(auth, (user) => (user ? onIn(user) : onOut()));
}

export async function login(email, password) {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function logout() {
  await signOut(auth);
}

// Zamiana kodów błędów Firebase na czytelne komunikaty PL.
export function authErrorMessage(code) {
  const map = {
    "auth/invalid-email": "Nieprawidłowy adres e-mail.",
    "auth/invalid-credential": "Nieprawidłowy e-mail lub hasło.",
    "auth/wrong-password": "Nieprawidłowe hasło.",
    "auth/user-not-found": "Nie znaleziono takiego konta.",
    "auth/too-many-requests": "Za dużo prób. Spróbuj za chwilę.",
    "auth/operation-not-allowed": "Logowanie e-mail/hasło nie jest włączone w Firebase (Authentication → Sign-in method).",
    "auth/network-request-failed": "Brak połączenia z siecią.",
  };
  return map[code] || "Nie udało się zalogować. Spróbuj ponownie.";
}
