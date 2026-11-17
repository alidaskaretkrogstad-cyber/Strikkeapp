// =========================================================
// PROJECTS (liste med underfaner: To knit / In progress / Finished)
// =========================================================
import { $ } from '../hjelpere.js';
import { tilstand, sistEndret, sistStrikket } from '../tilstand.js';
import { registrerSkjerm, naviger } from '../ui/navigasjon.js';
import { lagProsjektRad, uthevProsjekt } from '../ui/prosjektrad.js';
import { t } from '../sprak.js';

// Hva hver fane sorteres etter (høyeste tall øverst):
//   To knit:     sist laget
//   In progress: sist strikket på
//   Finished:    sist fullført
const SORTERING = {
  vil: (p) => p.opprettet || 0,
  pagar: (p) => sistStrikket(p),
  ferdig: (p) => (p.ferdig && p.ferdig.dato) || sistEndret(p),
};

const underfaneKnapper = document.querySelectorAll('.underfane');
const filterKnapper = document.querySelectorAll('#pause-filter button');

function visProsjektliste() {
  const { valgtFane, pauseFilter } = tilstand;

  // Marker valgt underfane
  underfaneKnapper.forEach((knapp) => {
    knapp.classList.toggle('aktiv', knapp.dataset.status === valgtFane);
  });

  // "+ New project" vises bare på To knit-fanen
  $('ny-to-knit-knapp').hidden = valgtFane !== 'vil';

  // Filteret (All / Active / Paused) vises bare på In progress-fanen
  const erPagar = valgtFane === 'pagar';
  $('pause-filter').hidden = !erPagar;
  filterKnapper.forEach((knapp) => {
    knapp.classList.toggle('aktiv', knapp.dataset.filter === pauseFilter);
  });

  // Plukk ut prosjektene med valgt status, og sorter dem (nyeste øverst)
  const iFanen = tilstand.prosjekter
    .filter((p) => p.status === valgtFane)
    .sort((a, b) => SORTERING[valgtFane](b) - SORTERING[valgtFane](a));

  // Del opp i aktive og pausede (bare In progress har pausede)
  let aktive = iFanen.filter((p) => !(erPagar && p.pause));
  let pausede = iFanen.filter((p) => erPagar && p.pause);
  if (erPagar && pauseFilter === 'aktive') pausede = [];
  if (erPagar && pauseFilter === 'pause') aktive = [];

  // Tøm listen og bygg den opp på nytt
  const liste = $('prosjektliste');
  liste.innerHTML = '';
  aktive.forEach((prosjekt) => liste.append(lagProsjektRad(prosjekt)));

  // Skillelinje "Paused projects" mellom aktive og pausede
  if (pausede.length > 0 && pauseFilter === 'alle') {
    const skille = document.createElement('li');
    skille.className = 'skillelinje';
    skille.textContent = t('Paused projects');
    liste.append(skille);
  }
  pausede.forEach((prosjekt) => liste.append(lagProsjektRad(prosjekt)));

  // Vis melding hvis listen er tom
  const tom = aktive.length + pausede.length === 0;
  $('tom-melding').hidden = !tom;
  if (tom) {
    if (erPagar && pauseFilter === 'aktive') $('tom-melding').textContent = t('No active projects.');
    else if (erPagar && pauseFilter === 'pause') $('tom-melding').textContent = t('No paused projects.');
    else $('tom-melding').textContent = t('No projects here yet.');
  }

  // Fremhev et nytt prosjekt (etter at siden er ferdig tegnet)
  if (tilstand.uthevNeste) {
    const id = tilstand.uthevNeste;
    tilstand.uthevNeste = null;
    setTimeout(() => uthevProsjekt(id), 50);
  }
}

registrerSkjerm('prosjekter', visProsjektliste);

// Filterknappene All / Active / Paused
filterKnapper.forEach((knapp) => {
  knapp.addEventListener('click', () => {
    tilstand.pauseFilter = knapp.dataset.filter;
    visProsjektliste();
  });
});

// Bytte underfane (vi blir på samme skjerm, bare listen endres)
underfaneKnapper.forEach((knapp) => {
  knapp.addEventListener('click', () => {
    tilstand.valgtFane = knapp.dataset.status;
    visProsjektliste();
  });
});

// Nytt prosjekt fra To knit-fanen
$('ny-to-knit-knapp').addEventListener('click', () => {
  naviger({ skjerm: 'nytt', status: 'vil' });
});
