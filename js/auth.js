// Logowanie przez konto Google (Firebase Auth).
import { auth } from "./firebase.js";
import {
  onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut,
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

const provider = new GoogleAuthProvider();

export function watchAuth(onIn, onOut) {
  onAuthStateChanged(auth, (user) => (user ? onIn(user) : onOut()));
}

export async function loginWithGoogle() {
  await signInWithPopup(auth, provider);
}

export async function logout() {
  await signOut(auth);
}

// Zamiana kodów błędów Firebase na czytelne komunikaty PL.
export function authErrorMessage(code) {
  const map = {
    "auth/popup-closed-by-user": "Okno logowania zostało zamknięte.",
    "auth/cancelled-popup-request": "",
    "auth/popup-blocked": "Przeglądarka zablokowała okno logowania — zezwól na wyskakujące okna.",
    "auth/operation-not-allowed": "Logowanie Google nie jest włączone w Firebase (Authentication → Sign-in method).",
    "auth/unauthorized-domain": "Ta domena nie jest autoryzowana w Firebase (Authentication → Settings → Authorized domains).",
    "auth/network-request-failed": "Brak połączenia z siecią.",
  };
  return map[code] ?? "Nie udało się zalogować. Spróbuj ponownie.";
}
