// =========================================================
// FIREBASE
// Starter Firebase og samler alt vi bruker fra Firebase på ett sted,
// så versjonsnummeret bare står her. De andre filene importerer herfra.
// =========================================================
import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js';
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  doc,
  getDoc,
  getDocFromCache,
  setDoc,
  deleteDoc,
  onSnapshot,
  Bytes,
} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
import { firebaseConfig, erKonfigurert } from './firebase-config.js';

export let auth = null;
export let db = null;

if (erKonfigurert) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);

  // Firestore med lokal lagring: appen virker uten nett, og endringer
  // sendes opp automatisk når telefonen får nett igjen.
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    ignoreUndefinedProperties: true, // felt som er "undefined" hoppes over i stedet for å gi feil
  });
}

// ID-en til brukeren som er logget inn
export function brukerId() {
  return auth && auth.currentUser ? auth.currentUser.uid : null;
}

export {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  collection,
  doc,
  getDoc,
  getDocFromCache,
  setDoc,
  deleteDoc,
  onSnapshot,
  Bytes,
};
