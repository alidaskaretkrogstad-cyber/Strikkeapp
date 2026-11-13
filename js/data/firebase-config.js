// =========================================================
// FIREBASE-INNSTILLINGER
// Lim inn verdiene fra Firebase-konsollen her
// (Project settings → General → Your apps → SDK setup and configuration → Config).
// Se README.md for steg-for-steg-oppsett.
//
// Disse verdiene er IKKE hemmelige – de forteller bare appen hvilket
// Firebase-prosjekt den skal snakke med. Det er sikkerhetsreglene i
// Firestore som sørger for at bare du får se dine data.
// =========================================================
export const firebaseConfig = {
  apiKey: 'AIzaSyDot7pvs-1ilDhHcCNnaOUS-5A_N4Ko5c0',
  authDomain: 'strikkeapp-aa150.firebaseapp.com',
  projectId: 'strikkeapp-aa150',
  storageBucket: 'strikkeapp-aa150.firebasestorage.app',
  messagingSenderId: '432698971904',
  appId: '1:432698971904:web:ce467d8f4a94257e5785e5',
};

// Er innstillingene fylt ut?
export const erKonfigurert = !Object.values(firebaseConfig).includes('LIM-INN-HER');
