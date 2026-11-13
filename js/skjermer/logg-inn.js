// =========================================================
// INNLOGGING
// Du logger inn med e-post og passord. Da kommer prosjektene dine
// fram på alle enhetene du logger inn på.
// =========================================================
import { $ } from '../hjelpere.js';
import {
  auth,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
} from '../data/firebase.js';
import { skjulAlleSkjermer } from '../ui/navigasjon.js';
import { bekreft, visMelding } from '../ui/dialog.js';

const skjerm = $('logginn-skjerm');
const skjema = $('logginn-skjema');
const epostFelt = $('logginn-epost');
const passordFelt = $('logginn-passord');
const feilmelding = $('logginn-feil');

export function visLoggInn() {
  skjulAlleSkjermer();
  $('laster-skjerm').hidden = true;
  skjerm.hidden = false;
  feilmelding.hidden = true;
  passordFelt.value = '';
}

// Når Firebase ikke er satt opp ennå (se README.md)
export function visOppsettMelding() {
  visLoggInn();
  skjema.hidden = true;
  $('oppsett-melding').hidden = false;
}

// Gjør Firebase sine feilkoder om til forståelig tekst
function feilTekst(feil) {
  const tekster = {
    'auth/invalid-email': 'That email address does not look right.',
    'auth/invalid-credential': 'Wrong email or password.',
    'auth/wrong-password': 'Wrong email or password.',
    'auth/user-not-found': 'Wrong email or password.',
    'auth/missing-password': 'Please enter your password.',
    'auth/weak-password': 'The password must be at least 6 characters.',
    'auth/email-already-in-use': 'There is already an account with this email. Try logging in.',
    'auth/network-request-failed': 'No internet connection. Try again when you are online.',
    'auth/too-many-requests': 'Too many attempts. Wait a little and try again.',
  };
  return tekster[feil.code] || `Something went wrong (${feil.code || feil.message}).`;
}

function visFeil(feil) {
  console.error(feil);
  feilmelding.textContent = feilTekst(feil);
  feilmelding.hidden = false;
}

// Låser knappene mens vi venter på svar, så man ikke trykker to ganger
async function medVenting(handling) {
  const knapper = skjerm.querySelectorAll('button');
  knapper.forEach((k) => (k.disabled = true));
  feilmelding.hidden = true;
  try {
    await handling();
  } catch (feil) {
    visFeil(feil);
  } finally {
    knapper.forEach((k) => (k.disabled = false));
  }
}

// "Log in"
skjema.addEventListener('submit', (hendelse) => {
  hendelse.preventDefault();
  medVenting(() =>
    signInWithEmailAndPassword(auth, epostFelt.value.trim(), passordFelt.value)
  );
});

// "Create account"
$('lag-konto-knapp').addEventListener('click', () => {
  if (!skjema.reportValidity()) return;
  medVenting(() =>
    createUserWithEmailAndPassword(auth, epostFelt.value.trim(), passordFelt.value)
  );
});

// "Forgot password?"
$('glemt-knapp').addEventListener('click', () => {
  const epost = epostFelt.value.trim();
  if (!epost) {
    feilmelding.textContent = 'Write your email address first, then tap "Forgot password?" again.';
    feilmelding.hidden = false;
    return;
  }
  medVenting(async () => {
    await sendPasswordResetEmail(auth, epost);
    await visMelding(`We sent an email to ${epost} with a link to choose a new password.`);
  });
});

// "Log out" (nederst på forsiden)
$('logg-ut-knapp').addEventListener('click', async () => {
  if (!(await bekreft('Log out? Your projects are safe and will be here when you log in again.', 'Log out'))) return;
  await signOut(auth);
});
