// =========================================================
// STRIKKEAPP – STARTFILEN
// Denne filen starter appen. Resten av koden ligger i mappene:
//   data/      – lagring (Firebase i skyen og mellomlagring på enheten)
//   ui/        – deler av skjermbildet som brukes mange steder
//   skjermer/  – én fil per skjerm (forsiden, tellerne, detaljer, ...)
// =========================================================
import { $ } from './hjelpere.js';
import './innstillinger.js'; // lys/mørk modus og "hold skjermen våken"
import { tilstand } from './tilstand.js';
import { auth, onAuthStateChanged } from './data/firebase.js';
import { erKonfigurert } from './data/firebase-config.js';
import { lyttPaProsjekter, flyttGamleData } from './data/prosjekter.js';
import { naviger, oppdaterSkjerm } from './ui/navigasjon.js';
import { visMelding } from './ui/dialog.js';

// Skjermene melder seg på navigasjonen når de importeres
import './skjermer/hjem.js';
import './skjermer/prosjekter.js';
import './skjermer/nytt.js';
import './skjermer/teller.js';
import './skjermer/ferdig.js';
import './skjermer/monster.js';
import './skjermer/innstillinger.js';
import './skjermer/konto.js';
import { redigererDetaljer } from './skjermer/detaljer.js';
import { visLoggInn, visOppsettMelding } from './skjermer/logg-inn.js';
import { oversettSide, flertall } from './sprak.js';

// Oversett teksten på siden til valgt språk (norsk/engelsk)
oversettSide();

let stoppLytting = null; // stopper lyttingen på prosjektene ved utlogging

// Kalles når prosjektene er lastet første gang, og når noe er endret
// på en annen enhet.
function vedProsjektEndring(forste) {
  if (forste) {
    $('laster-skjerm').hidden = true;
    naviger({ skjerm: 'hjem' }, true);

    // Første innlogging på denne enheten: flytt gamle prosjekter til skyen
    flyttGamleData()
      .then(async (antall) => {
        if (antall === 0) return;
        oppdaterSkjerm();
        await visMelding(
          flertall(antall, '{n} project from this device was saved to your account.', '{n} projects from this device were saved to your account.')
        );
      })
      .catch((feil) => console.error('Kunne ikke flytte gamle prosjekter:', feil));
    return;
  }

  // Endring fra en annen enhet: tegn skjermen på nytt, men ikke hvis
  // man holder på å skrive noe (da ville det man skrev forsvunnet).
  const skriver = document.activeElement && document.activeElement.matches('input, textarea, select');
  const iSkjema = ['nytt', 'ferdig'].includes(tilstand.gjeldende.skjerm);
  if (skriver || iSkjema || redigererDetaljer()) return;
  oppdaterSkjerm();
}

function start() {
  if (!erKonfigurert) {
    visOppsettMelding();
    return;
  }

  // Kalles når appen starter, og når man logger inn eller ut
  onAuthStateChanged(auth, (bruker) => {
    if (stoppLytting) {
      stoppLytting();
      stoppLytting = null;
    }

    if (!bruker) {
      tilstand.prosjekter = [];
      visLoggInn();
      return;
    }

    $('logginn-skjerm').hidden = true;
    $('laster-skjerm').hidden = false;
    stoppLytting = lyttPaProsjekter(vedProsjektEndring);
  });
}

start();

// ---------------------------------------------------------
// SERVICE WORKER (gjør at appen fungerer offline)
// ---------------------------------------------------------
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('service-worker.js')
      .catch((feil) => console.error('Service worker feilet:', feil));
  });
}
