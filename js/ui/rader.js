// =========================================================
// LISTER MED RADER (garn og pinner)
// Brukes både i "New project" og i "Edit details".
// Hver liste har data-felt="garn" eller "pinner", som sier hvilke
// felt hver rad skal ha (se RAD_FELT i konstanter.js).
// =========================================================
import { $ } from '../hjelpere.js';
import { RAD_FELT } from '../konstanter.js';

// Legger til én rad: [felt 1] [felt 2] [×]
export function leggTilRad(liste, verdier = {}) {
  const rad = document.createElement('div');
  rad.className = 'liste-rad';

  for (const [nokkel, hjelpetekst] of RAD_FELT[liste.dataset.felt]) {
    const felt = document.createElement('input');
    felt.type = 'text';
    felt.dataset.nokkel = nokkel;
    felt.placeholder = hjelpetekst;
    felt.maxLength = 60;
    felt.value = verdier[nokkel] || '';
    rad.append(felt);
  }

  const fjern = document.createElement('button');
  fjern.type = 'button'; // så knappen ikke sender skjemaet
  fjern.className = 'fjern-rad';
  fjern.textContent = '×';
  fjern.setAttribute('aria-label', 'Remove');
  fjern.addEventListener('click', () => rad.remove());
  rad.append(fjern);

  liste.append(rad);
  return rad;
}

// Fyller en liste med rader. Er den tom, vises én tom rad.
export function fyllRader(liste, rader) {
  liste.innerHTML = '';
  rader.forEach((verdier) => leggTilRad(liste, verdier));
  if (rader.length === 0) leggTilRad(liste);
}

// Leser radene fra en liste (helt tomme rader hoppes over)
export function lesRader(liste) {
  return [...liste.querySelectorAll('.liste-rad')]
    .map((rad) => {
      const verdier = {};
      rad.querySelectorAll('input').forEach((felt) => {
        verdier[felt.dataset.nokkel] = felt.value.trim();
      });
      return verdier;
    })
    .filter((verdier) => Object.values(verdier).some(Boolean));
}

// Gjør radene om til tekst, én per linje: "4 mm · 80 cm"
export function raderSomTekst(rader) {
  return rader
    .map((rad) => Object.values(rad).filter(Boolean).join(' · '))
    .join('\n');
}

// "+ Add yarn" / "+ Add needle". data-ny-rad sier hvilken liste de hører til.
document.querySelectorAll('[data-ny-rad]').forEach((knapp) => {
  knapp.addEventListener('click', () => {
    const rad = leggTilRad($(knapp.dataset.nyRad));
    rad.querySelector('input').focus();
  });
});
