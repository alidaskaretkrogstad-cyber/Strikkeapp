// =========================================================
// TILSTAND
// Dataene appen jobber med mens den kjører, samlet på ett sted.
// Alle filer som trenger dem, importerer "tilstand" herfra.
// =========================================================
import { STATUS_NAVN, TYPE_NAVN } from './konstanter.js';

export const tilstand = {
  // Liste med alle prosjekter. Hvert prosjekt ser slik ut:
  // { id, navn, status: 'vil'|'pagar'|'ferdig', pause: true/false,
  //   tellere: [{ id, navn, verdi, endret }],  (alle tellerne; endret = sist trykket +/-)
  //   hovedTeller: id,                         (telleren som vises stor)
  //   garn:   [{ navn, mengde }],
  //   pinner: [{ storrelse, lengde }],
  //   vanskelighet: 'lett'|'middels'|'vanskelig'|'',
  //   teknikk: 'strikking'|'hekling',
  //   type: 'genser'|'lue'|...|'annet'|'', typeAnnet: 'egen tekst',
  //   harBilde, bildeVersjon,                  (hvis prosjektet har bilde)
  //   oppskriftFil: { navn, type, versjon },   (hvis oppskrift er lastet opp)
  //   designer, storrelse, lenke, notater,
  //   ferdig: { dato, resultat, prosess, vanskelighet, likte: 1–5 },  (når ferdig)
  //   sistStrikket, opprettet, endret }
  prosjekter: [],

  // Hvilken underfane som er valgt på Projects-siden
  valgtFane: 'pagar',

  // Filteret på In progress-fanen: 'alle', 'aktive' eller 'pause'
  pauseFilter: 'alle',

  // Et prosjekt som skal fremheves neste gang listen vises (f.eks. et nytt prosjekt)
  uthevNeste: null,

  // Skjermen som vises nå, f.eks. { skjerm: 'teller', id: 'abc123' }
  gjeldende: { skjerm: 'hjem' },
};

export function finnProsjekt(id) {
  return tilstand.prosjekter.find((p) => p.id === id);
}

// Prosjektet som vises på skjermen akkurat nå
export function aapentProsjekt() {
  return finnProsjekt(tilstand.gjeldende.id);
}

// Finner telleren som skal vises stor (den første, hvis ingen er valgt)
export function hovedTeller(prosjekt) {
  return prosjekt.tellere.find((t) => t.id === prosjekt.hovedTeller) || prosjekt.tellere[0];
}

// Når ble prosjektet sist endret? (eldre prosjekter mangler "endret")
export function sistEndret(prosjekt) {
  return prosjekt.endret || prosjekt.opprettet;
}

// Når strikket du sist? Settes hver gang man trykker på en teller.
export function sistStrikket(prosjekt) {
  return prosjekt.sistStrikket || sistEndret(prosjekt);
}

// Statusteksten som vises, f.eks. "In progress" eller "Paused"
export function statusTekst(prosjekt) {
  if (prosjekt.status === 'pagar' && prosjekt.pause) return 'Paused';
  return STATUS_NAVN[prosjekt.status];
}

// Teksten for hva prosjektet er, f.eks. "Sweater" eller det man skrev under Other
export function typeTekst(prosjekt) {
  if (prosjekt.type === 'annet') return prosjekt.typeAnnet || 'Other';
  return TYPE_NAVN[prosjekt.type] || '';
}
