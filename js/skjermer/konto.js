// =========================================================
// KONTO-SIDEN (Account)
// Viser informasjon om kontoen, lar deg endre passord og logge ut.
// =========================================================
import { $ } from '../hjelpere.js';
import { tilstand } from '../tilstand.js';
import {
  auth,
  signOut,
  updatePassword,
  reauthenticateWithCredential,
  EmailAuthProvider,
  sendEmailVerification,
  deleteUser,
} from '../data/firebase.js';
import { slettAlleData } from '../data/prosjekter.js';
import { registrerSkjerm } from '../ui/navigasjon.js';
import { bekreft, visMelding } from '../ui/dialog.js';
import { feilTekst } from './logg-inn.js';
import { t, flertall, datoSprak } from '../sprak.js';

const passordSkjema = $('passord-skjema');
const passordFeil = $('passord-feil');
const slettSkjema = $('slett-konto-skjema');
const slettFeil = $('slett-konto-feil');

// Sjekker passordet på nytt (Firebase krever det før passordbytte og sletting)
function bekreftPassord(passord) {
  const bruker = auth.currentUser;
  return reauthenticateWithCredential(bruker, EmailAuthProvider.credential(bruker.email, passord));
}

// Gjør et tidspunkt fra Firebase om til f.eks. "17 Nov 2026"
function dato(tekst) {
  if (!tekst) return '';
  return new Date(tekst).toLocaleDateString(datoSprak(), { day: 'numeric', month: 'short', year: 'numeric' });
}

function visKonto() {
  const bruker = auth.currentUser;
  if (!bruker) return;

  // Fyll listen med informasjon om kontoen
  const dl = $('konto-liste');
  dl.innerHTML = '';
  const antall = tilstand.prosjekter.length;
  const linjer = [
    [t('Email'), bruker.email],
    [t('Email verified'), t(bruker.emailVerified ? 'Yes ✓' : 'No')],
    [t('Member since'), dato(bruker.metadata.creationTime)],
    [t('Last login'), dato(bruker.metadata.lastSignInTime)],
    [t('Projects'), flertall(antall, '{n} project', '{n} projects')],
  ];
  for (const [overskrift, verdi] of linjer) {
    const dt = document.createElement('dt');
    dt.textContent = overskrift;
    const dd = document.createElement('dd');
    dd.textContent = verdi;
    dl.append(dt, dd);
  }

  $('bekreft-epost-knapp').hidden = bruker.emailVerified;
  passordSkjema.reset();
  passordFeil.hidden = true;
  slettSkjema.reset();
  slettSkjema.hidden = true;
  $('vis-slett-konto-knapp').hidden = false;
}

registrerSkjerm('konto', visKonto);

// --- Bekrefte e-posten ---
$('bekreft-epost-knapp').addEventListener('click', async () => {
  try {
    await sendEmailVerification(auth.currentUser);
    await visMelding(
      t('We sent an email to {epost}. Open the link in it to verify your email.', { epost: auth.currentUser.email })
    );
  } catch (feil) {
    console.error(feil);
    await visMelding(feilTekst(feil));
  }
});

// --- Endre passord ---
passordSkjema.addEventListener('submit', async (hendelse) => {
  hendelse.preventDefault();
  passordFeil.hidden = true;

  const gammelt = $('passord-gammelt').value;
  const nytt = $('passord-nytt').value;
  if (nytt !== $('passord-gjenta').value) {
    passordFeil.textContent = t('The new passwords are not the same.');
    passordFeil.hidden = false;
    return;
  }

  const knapp = passordSkjema.querySelector('button[type="submit"]');
  knapp.disabled = true;
  try {
    await bekreftPassord(gammelt);
    await updatePassword(auth.currentUser, nytt);
    passordSkjema.reset();
    await visMelding(t('Your password has been changed.'));
  } catch (feil) {
    console.error(feil);
    passordFeil.textContent =
      feil.code === 'auth/invalid-credential' || feil.code === 'auth/wrong-password'
        ? t('The current password is wrong.')
        : feilTekst(feil);
    passordFeil.hidden = false;
  } finally {
    knapp.disabled = false;
  }
});

// --- Logge ut ---
$('logg-ut-knapp').addEventListener('click', async () => {
  if (!(await bekreft(t('Log out? Your projects are safe and will be here when you log in again.'), 'Log out'))) return;
  await signOut(auth);
});

// --- Slette kontoen ---
$('vis-slett-konto-knapp').addEventListener('click', () => {
  $('vis-slett-konto-knapp').hidden = true;
  slettSkjema.hidden = false;
  $('slett-konto-passord').focus();
});

$('avbryt-slett-konto').addEventListener('click', () => {
  slettSkjema.reset();
  slettSkjema.hidden = true;
  slettFeil.hidden = true;
  $('vis-slett-konto-knapp').hidden = false;
});

slettSkjema.addEventListener('submit', async (hendelse) => {
  hendelse.preventDefault();
  slettFeil.hidden = true;

  // Siste sjanse: spør én gang til
  const antall = tilstand.prosjekter.length;
  const sporsmal = flertall(
    antall,
    'Are you completely sure? Your account and your {n} project will be deleted forever.',
    'Are you completely sure? Your account and all {n} projects will be deleted forever.'
  );
  if (!(await bekreft(sporsmal, 'Delete forever'))) return;

  const knapper = slettSkjema.querySelectorAll('button');
  knapper.forEach((k) => (k.disabled = true));
  try {
    await bekreftPassord($('slett-konto-passord').value);
    await slettAlleData(); // først dataene (krever at man er logget inn) ...
    await deleteUser(auth.currentUser); // ... så selve kontoen. Da logges man ut.
    await visMelding(t('Your account has been deleted.'));
  } catch (feil) {
    console.error(feil);
    slettFeil.textContent =
      feil.code === 'auth/invalid-credential' || feil.code === 'auth/wrong-password'
        ? t('Wrong password.')
        : feilTekst(feil);
    slettFeil.hidden = false;
  } finally {
    knapper.forEach((k) => (k.disabled = false));
  }
});
