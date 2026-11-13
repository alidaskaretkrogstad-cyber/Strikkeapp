// =========================================================
// FORSIDEN
// =========================================================
import { $ } from '../hjelpere.js';
import { STATUS_NAVN } from '../konstanter.js';
import { tilstand, sistStrikket } from '../tilstand.js';
import { registrerSkjerm, naviger } from '../ui/navigasjon.js';
import { lagProsjektRad } from '../ui/prosjektrad.js';

function visHjem() {
  const { prosjekter } = tilstand;

  // Tell opp prosjekter per status
  for (const status of Object.keys(STATUS_NAVN)) {
    const antall = prosjekter.filter((p) => p.status === status).length;
    $(`antall-${status}`).textContent = antall;
  }

  // Pågående prosjekter (ikke på pause), det du sist strikket på først
  const pagaende = prosjekter
    .filter((p) => p.status === 'pagar' && !p.pause)
    .sort((a, b) => sistStrikket(b) - sistStrikket(a));

  // "Last knitted": det aller siste
  $('fortsett-liste').innerHTML = '';
  if (pagaende.length > 0) {
    $('fortsett-liste').append(lagProsjektRad(pagaende[0], true));
  }
  $('fortsett-boks').hidden = pagaende.length === 0;

  // "Recently knitted": de to før det siste
  const nylige = pagaende.slice(1, 3);
  $('nylig-liste').innerHTML = '';
  nylige.forEach((prosjekt) => $('nylig-liste').append(lagProsjektRad(prosjekt, true)));
  $('nylig-boks').hidden = nylige.length === 0;
}

registrerSkjerm('hjem', visHjem);

// Rutene med antall tar deg til riktig underfane på Projects
document.querySelectorAll('.oversikt-rute').forEach((rute) => {
  rute.addEventListener('click', () => {
    tilstand.valgtFane = rute.dataset.status;
    naviger({ skjerm: 'prosjekter' }, true);
  });
});

$('ny-knapp').addEventListener('click', () => naviger({ skjerm: 'nytt' }));
