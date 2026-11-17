// =========================================================
// INNSTILLINGER-SKJERMEN (Settings)
// Selve innstillingene lagres og tas i bruk i js/innstillinger.js.
// =========================================================
import { $ } from '../hjelpere.js';
import { innstillinger, lagreInnstilling, stotterVaakenLas } from '../innstillinger.js';
import { auth } from '../data/firebase.js';
import { registrerSkjerm, naviger, oppdaterSkjerm } from '../ui/navigasjon.js';
import { oversettSide, t } from '../sprak.js';
import { settValg, lesValg } from '../ui/valg.js';

const temaValg = $('tema-valg');
const holdVaaken = $('hold-vaaken');
const sprakValg = $('sprak-valg');

function visInnstillinger() {
  $('konto-rad-epost').textContent = auth?.currentUser?.email || '';
  settValg(temaValg, innstillinger.tema);
  settValg(sprakValg, innstillinger.sprak);
  holdVaaken.checked = innstillinger.holdVaaken;

  // Eldre telefoner/nettlesere kan ikke holde skjermen våken
  if (!stotterVaakenLas) {
    holdVaaken.disabled = true;
    $('vaaken-hint').textContent = t(
      'Your phone or browser does not support this. Try updating it to the newest version.'
    );
  }
}

registrerSkjerm('innstillinger', visInnstillinger);

// ui/valg.js har allerede markert knappen man trykket på; vi lagrer valget
temaValg.querySelectorAll('button').forEach((knapp) => {
  knapp.addEventListener('click', () => lagreInnstilling('tema', lesValg(temaValg)));
});

// Bytt språk: oversett all tekst og tegn skjermen på nytt
sprakValg.querySelectorAll('button').forEach((knapp) => {
  knapp.addEventListener('click', () => {
    lagreInnstilling('sprak', lesValg(sprakValg));
    oversettSide();
    oppdaterSkjerm();
  });
});

holdVaaken.addEventListener('change', () => {
  lagreInnstilling('holdVaaken', holdVaaken.checked);
});

$('til-konto-knapp').addEventListener('click', () => naviger({ skjerm: 'konto' }));
