// =========================================================
// EN PROSJEKT-RAD (brukes både på forsiden og i listene)
// =========================================================
import { TYPE_IKON } from '../konstanter.js';
import { tidSomTekst, stjerner } from '../hjelpere.js';
import { tilstand, finnProsjekt, hovedTeller, sistStrikket } from '../tilstand.js';
import { lagreEndring } from '../data/prosjekter.js';
import { naviger, oppdaterSkjerm } from './navigasjon.js';
import { visBildeI } from './bilder.js';

// Åpner et prosjekt fra en liste:
// "In progress" går rett til tellerne, de andre til detaljer.
function aapneProsjekt(prosjekt) {
  const skjerm = prosjekt.status === 'pagar' ? 'teller' : 'detaljer';
  naviger({ skjerm: skjerm, id: prosjekt.id });
}

// Fremhever en prosjektrad kort med en lilla glød, så man ser hvor den er
export function uthevProsjekt(id) {
  const rad = document.querySelector(`.prosjekt-element[data-id="${id}"]`);
  if (!rad) return;
  rad.classList.add('hoppet-opp');
  rad.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// visTid = true: vis når du sist strikket i stedet for telleren (brukes på forsiden)
export function lagProsjektRad(prosjekt, visTid = false) {
  const li = document.createElement('li');
  const knapp = document.createElement('button');
  knapp.className = 'prosjekt-rad';
  // Prosjekter på pause får en egen, dempet farge
  if (prosjekt.status === 'pagar' && prosjekt.pause) knapp.classList.add('pauset');

  // Lite bilde til venstre
  const miniatyr = document.createElement('span');
  miniatyr.className = 'miniatyr';
  if (prosjekt.harBilde) {
    const img = document.createElement('img');
    img.alt = '';
    img.hidden = true; // vises når bildet er lastet
    miniatyr.append(img);
    visBildeI(img, prosjekt);
  } else {
    // Uten bilde: vis ikonet for det man lager (🧦, 🧣, ...), ellers et nøste
    miniatyr.textContent = TYPE_IKON[prosjekt.type] || '🧶';
  }

  const navn = document.createElement('span');
  navn.className = 'prosjekt-navn';
  // textContent (ikke innerHTML) gjør at navnet alltid vises som ren tekst
  navn.textContent = prosjekt.navn;

  // Liten tekst til høyre
  const info = document.createElement('span');
  info.className = 'prosjekt-info';
  if (visTid) {
    // På forsiden: når du sist strikket, f.eks. "Today, 14:32"
    info.textContent = tidSomTekst(sistStrikket(prosjekt));
  } else if (prosjekt.status === 'pagar') {
    // Viser den store telleren, f.eks. "Rows 12"
    const teller = hovedTeller(prosjekt);
    info.textContent = prosjekt.pause ? '⏸ Paused' : teller ? `${teller.navn} ${teller.verdi}` : '';
  } else if (prosjekt.status === 'ferdig') {
    // Ferdige prosjekter: stjernene du ga, eller ✓ hvis du ikke ga stjerner
    const likte = prosjekt.ferdig && prosjekt.ferdig.likte;
    info.textContent = likte ? stjerner(likte) : '✓';
    if (likte) info.classList.add('stjerne-info');
  }

  knapp.append(miniatyr, navn, info);
  knapp.addEventListener('click', () => aapneProsjekt(prosjekt));

  li.className = 'prosjekt-element';
  li.dataset.id = prosjekt.id;
  li.append(knapp);

  // Prosjekter på pause får en "Resume"-knapp ved siden av
  if (prosjekt.status === 'pagar' && prosjekt.pause) {
    const fortsett = document.createElement('button');
    fortsett.className = 'gjenoppta-knapp';
    fortsett.textContent = '▶ Resume';
    fortsett.setAttribute('aria-label', `Resume ${prosjekt.navn}`);
    fortsett.addEventListener('click', () => {
      // Hent prosjektet på nytt (det kan ha blitt oppdatert fra en annen enhet)
      const p = finnProsjekt(prosjekt.id);
      if (!p) return;
      p.pause = false;
      lagreEndring(p); // "sist endret" = nå, så den havner øverst
      tilstand.uthevNeste = p.id; // vis hvor den hoppet
      oppdaterSkjerm();
    });
    li.append(fortsett);
  }

  return li;
}
