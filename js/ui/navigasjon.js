// =========================================================
// NAVIGASJON MELLOM SKJERMER
// Vi bruker nettleserens historikk (history.pushState). Da virker
// tilbake-knappen/-sveipen på telefonen akkurat som "← Back" i appen.
//
// Hver skjerm-fil (i mappen skjermer/) melder seg på med
// registrerSkjerm('navn', funksjonSomTegnerSkjermen).
// =========================================================
import { $ } from '../hjelpere.js';
import { tilstand, finnProsjekt } from '../tilstand.js';

// Hvilken <section> i index.html hører til hvilken skjerm
const SKJERM_ID = {
  hjem: 'hjem-skjerm',
  prosjekter: 'prosjekter-skjerm',
  nytt: 'nytt-skjerm',
  teller: 'teller-skjerm',
  ferdig: 'ferdig-skjerm',
  detaljer: 'detaljer-skjerm',
  monster: 'monster-skjerm',
};

// Skjermer som viser ett bestemt prosjekt
const PROSJEKT_SKJERMER = ['teller', 'ferdig', 'detaljer', 'monster'];

const tegnere = {}; // skjermnavn → funksjon som fyller skjermen med innhold
const meny = $('meny');
const menyKnapper = document.querySelectorAll('#meny .fane');

export function registrerSkjerm(navn, tegn) {
  tegnere[navn] = tegn;
}

// Brukes når vi vil gå tilbake ett steg OG så til en bestemt skjerm
// (f.eks. etter "Create project": tilbake fra skjemaet, og så til Projects).
let etterTilbake = null;

// Gå til en ny skjerm.
// erstatt = true betyr at vi bytter ut skjermen vi står på, i stedet for å
// legge en ny skjerm "oppå" (da hopper "Back" over den gamle).
export function naviger(ny, erstatt = false) {
  // "dybde" = hvor mange skjermer vi har gått inn fra forsiden/Projects.
  // Den trengs for å vite hvor langt tilbake hus-knappen skal gå.
  const dybde = tilstand.gjeldende.dybde || 0;
  ny.dybde = erstatt ? dybde : dybde + 1;

  if (erstatt) history.replaceState(ny, '');
  else history.pushState(ny, '');
  vis(ny);
}

// Går helt tilbake til en hovedskjerm (forsiden eller Projects).
// Vi går tilbake i historikken i stedet for framover, så "Back" etterpå
// ikke tar deg inn i prosjektet igjen.
export function gaTilHovedskjerm(ny) {
  const dybde = tilstand.gjeldende.dybde || 0;
  if (dybde === 0) {
    naviger(ny, true);
    return;
  }
  etterTilbake = ny;
  history.go(-dybde);
}

export function tilbake() {
  history.back();
}

// Tegner skjermen som hører til en tilstand.
// rullTilToppen = false brukes når skjermen bare oppdateres (f.eks. etter
// en endring fra en annen enhet), så man ikke mister plassen sin.
export function vis(ny, rullTilToppen = true) {
  // Skjermer for ett prosjekt: hvis prosjektet er slettet, gå til Projects
  if (PROSJEKT_SKJERMER.includes(ny.skjerm) && !finnProsjekt(ny.id)) {
    ny = { skjerm: 'prosjekter', dybde: 0 };
    history.replaceState(ny, '');
  }

  tilstand.gjeldende = ny;
  tegnere[ny.skjerm]();

  // Vis riktig <section>, skjul resten
  document.querySelectorAll('.skjerm').forEach((skjerm) => {
    skjerm.hidden = skjerm.id !== SKJERM_ID[ny.skjerm];
  });

  // Menyen nederst vises bare på forsiden og på Projects
  const erHovedskjerm = ny.skjerm === 'hjem' || ny.skjerm === 'prosjekter';
  meny.hidden = !erHovedskjerm;
  menyKnapper.forEach((knapp) => {
    knapp.classList.toggle('aktiv', knapp.dataset.mal === ny.skjerm);
  });

  if (rullTilToppen) window.scrollTo(0, 0);
}

// Tegner skjermen man står på én gang til (uten å rulle til toppen)
export function oppdaterSkjerm() {
  vis(tilstand.gjeldende, false);
}

// Skjuler alle skjermene og menyen (brukes av innloggingen)
export function skjulAlleSkjermer() {
  document.querySelectorAll('.skjerm').forEach((skjerm) => (skjerm.hidden = true));
  meny.hidden = true;
}

// --- Knapper som finnes på mange skjermer ---

// Når man går tilbake (knapp i appen eller på telefonen)
window.addEventListener('popstate', (hendelse) => {
  let ny = hendelse.state || { skjerm: 'hjem' };
  if (etterTilbake) {
    ny = etterTilbake;
    etterTilbake = null;
    history.replaceState(ny, '');
  }
  vis(ny);
});

document.querySelectorAll('.tilbake').forEach((knapp) => {
  knapp.addEventListener('click', tilbake);
});

// Hus-knappen øverst til høyre på prosjektsidene
document.querySelectorAll('.hjem-knapp').forEach((knapp) => {
  knapp.addEventListener('click', () => gaTilHovedskjerm({ skjerm: 'hjem' }));
});

// Menyknappene nederst. Hovedskjermene bytter plass med hverandre
// (erstatt = true), så "Back" ikke hopper fram og tilbake mellom dem.
menyKnapper.forEach((knapp) => {
  knapp.addEventListener('click', () => {
    naviger({ skjerm: knapp.dataset.mal }, true);
  });
});
