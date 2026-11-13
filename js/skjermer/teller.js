// =========================================================
// TELLERE (for et prosjekt som pågår)
// Alle tellerne ligger i prosjekt.tellere. Én av dem er hovedtelleren
// (prosjekt.hovedTeller) og vises stor. De andre vises som små bokser
// bortover under den. Trykk på en liten boks for å gjøre den stor.
//
// Knappene finner alltid prosjektet og telleren på nytt når man trykker
// (med aapentProsjekt() og ID-en), fordi prosjektet kan ha blitt
// oppdatert fra en annen enhet mens skjermen var åpen.
// =========================================================
import { $, lagId, vibrer, hvorLengeSiden } from '../hjelpere.js';
import { tilstand, aapentProsjekt, hovedTeller } from '../tilstand.js';
import { lagreEndring } from '../data/prosjekter.js';
import { registrerSkjerm, naviger } from '../ui/navigasjon.js';
import { bekreft } from '../ui/dialog.js';
import { redigerNavn } from '../ui/navnefelt.js';

function visTeller() {
  const prosjekt = aapentProsjekt();
  $('teller-tittel').textContent = prosjekt.navn;
  visTellere(prosjekt);
  visPause(prosjekt);
}

registrerSkjerm('teller', visTeller);

// Finner en teller i prosjektet som er åpent nå
function finnTeller(tellerId) {
  const prosjekt = aapentProsjekt();
  const teller = prosjekt && prosjekt.tellere.find((t) => t.id === tellerId);
  return { prosjekt, teller };
}

// Endrer en teller med +1 eller -1 (aldri under 0) og lagrer automatisk.
// Gir tilbake den nye verdien.
function endreTeller(tellerId, endring) {
  const { prosjekt, teller } = finnTeller(tellerId);
  if (!teller) return 0;
  teller.verdi = Math.max(0, teller.verdi + endring);
  teller.endret = Date.now(); // når akkurat denne telleren sist ble endret
  prosjekt.sistStrikket = Date.now(); // husk når du sist strikket
  lagreEndring(prosjekt);
  vibrer();
  visSistEndret();
  return teller.verdi;
}

// Fjerner en teller (etter å ha spurt)
async function fjernTeller(tellerId) {
  const { teller } = finnTeller(tellerId);
  if (!teller) return;
  if (!(await bekreft(`Remove the counter "${teller.navn}"?`, 'Remove'))) return;
  const prosjekt = aapentProsjekt();
  prosjekt.tellere = prosjekt.tellere.filter((t) => t.id !== tellerId);
  lagreEndring(prosjekt);
  visTellere(prosjekt);
}

// Tegner den store telleren og raden med små tellere.
// redigerId: ID-en til en ny teller som skal starte med navnefeltet åpent.
function visTellere(prosjekt, redigerId = null) {
  // --- Den store ---
  const stor = hovedTeller(prosjekt);
  $('hoved-teller').hidden = !stor;
  if (stor) {
    $('hoved-navn').textContent = stor.navn;
    $('hoved-tall').textContent = stor.verdi;
    visSistEndret();
    if (stor.id === redigerId) $('hoved-blyant').click();
  }

  // --- De små, bortover ---
  const rad = $('ekstra-tellere');
  rad.innerHTML = '';
  const sma = prosjekt.tellere.filter((t) => t !== stor);
  sma.forEach((teller) => {
    const { boks, startRedigering } = lagLitenTeller(teller);
    rad.append(boks);
    if (teller.id === redigerId) {
      boks.scrollIntoView({ inline: 'center', block: 'nearest' });
      startRedigering();
    }
  });

  // "+ Add counter"-boksen til slutt i raden
  const ny = document.createElement('button');
  ny.className = 'ny-teller-flis';
  ny.innerHTML = '<span class="pluss-tegn">+</span>Add counter';
  ny.addEventListener('click', leggTilTeller);
  rad.append(ny);

  $('bytt-hint').hidden = sma.length === 0;
}

// Lager én liten teller-boks: navn, ✏️, ×, tall, og − / +
function lagLitenTeller(teller) {
  const id = teller.id;
  const boks = document.createElement('div');
  boks.className = 'liten-teller';

  // Øverst: navn, blyant (endre navn) og × (fjerne telleren)
  const topp = document.createElement('div');
  topp.className = 'liten-teller-topp';
  const navn = document.createElement('span');
  navn.className = 'liten-teller-navn';
  navn.textContent = teller.navn;
  const blyant = document.createElement('button');
  blyant.className = 'blyant';
  blyant.textContent = '✏️';
  blyant.setAttribute('aria-label', `Rename counter ${teller.navn}`);
  const fjern = document.createElement('button');
  fjern.className = 'fjern-rad';
  fjern.textContent = '×';
  fjern.setAttribute('aria-label', `Remove counter ${teller.navn}`);
  topp.append(navn, blyant, fjern);

  // Tallet
  const tall = document.createElement('output');
  tall.className = 'liten-teller-tall';
  tall.textContent = teller.verdi;

  // − og +
  const knapper = document.createElement('div');
  knapper.className = 'liten-teller-knapper';
  const minus = document.createElement('button');
  minus.className = 'knapp minus';
  minus.textContent = '−';
  minus.setAttribute('aria-label', `${teller.navn} minus one`);
  const pluss = document.createElement('button');
  pluss.className = 'knapp pluss';
  pluss.textContent = '+';
  pluss.setAttribute('aria-label', `${teller.navn} plus one`);
  knapper.append(minus, pluss);

  boks.append(topp, tall, knapper);

  // Hva knappene gjør
  minus.addEventListener('click', () => (tall.textContent = endreTeller(id, -1)));
  pluss.addEventListener('click', () => (tall.textContent = endreTeller(id, 1)));
  fjern.addEventListener('click', () => fjernTeller(id));

  const startRedigering = () => {
    redigerNavn(navn, blyant, (nyttNavn) => {
      const { prosjekt, teller: t } = finnTeller(id);
      if (!t) return;
      t.navn = nyttNavn;
      lagreEndring(prosjekt);
    });
  };
  blyant.addEventListener('click', startRedigering);

  // Trykk på selve boksen (ikke på knappene) = gjør denne telleren stor
  boks.addEventListener('click', (hendelse) => {
    if (hendelse.target.closest('button, input')) return;
    const prosjekt = aapentProsjekt();
    prosjekt.hovedTeller = id;
    lagreEndring(prosjekt);
    visTellere(prosjekt);
    // Liten lilla glød på den store telleren, så man ser at den byttet
    const storBoks = $('hoved-teller');
    storBoks.classList.remove('hoppet-opp');
    void storBoks.offsetWidth; // "nullstiller" animasjonen så den kan spilles igjen
    storBoks.classList.add('hoppet-opp');
    storBoks.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  return { boks, startRedigering };
}

// "+ Add counter": lag en ny teller og la brukeren skrive navnet med en gang
function leggTilTeller() {
  const prosjekt = aapentProsjekt();
  const ny = { id: lagId(), navn: `Counter ${prosjekt.tellere.length + 1}`, verdi: 0 };
  prosjekt.tellere.push(ny);
  lagreEndring(prosjekt);
  visTellere(prosjekt, ny.id);
}

// --- Knappene på den store telleren ---
function endreHovedTeller(endring) {
  const teller = hovedTeller(aapentProsjekt());
  $('hoved-tall').textContent = endreTeller(teller.id, endring);
}

$('hoved-pluss').addEventListener('click', () => endreHovedTeller(1));
$('hoved-minus').addEventListener('click', () => endreHovedTeller(-1));

// Blyanten ved den store telleren: endre navnet
$('hoved-blyant').addEventListener('click', () => {
  redigerNavn($('hoved-navn'), $('hoved-blyant'), (nyttNavn) => {
    const prosjekt = aapentProsjekt();
    hovedTeller(prosjekt).navn = nyttNavn;
    lagreEndring(prosjekt);
  });
});

// --- "Last change: 5 min ago" under den store telleren ---
function visSistEndret() {
  const prosjekt = aapentProsjekt();
  const teller = prosjekt && hovedTeller(prosjekt);
  if (!teller) return;
  $('hoved-sist').textContent = teller.endret
    ? `Last change: ${hvorLengeSiden(teller.endret)}`
    : 'No changes yet';
}

// Oppdater teksten hvert 20. sekund mens tellersiden er åpen
setInterval(() => {
  if (tilstand.gjeldende.skjerm === 'teller') visSistEndret();
}, 20000);

// --- Pause ---
// Viser riktig tekst på pauseknappen, og meldingen øverst
function visPause(prosjekt) {
  $('pause-knapp').textContent = prosjekt.pause ? '▶ Resume project' : '⏸ Pause project';
  $('pause-melding').hidden = !prosjekt.pause;
}

$('pause-knapp').addEventListener('click', () => {
  const prosjekt = aapentProsjekt();
  prosjekt.pause = !prosjekt.pause; // slå av/på
  lagreEndring(prosjekt);
  visPause(prosjekt);
});

// --- Knapper til andre sider ---
$('ferdig-knapp').addEventListener('click', () => {
  naviger({ skjerm: 'ferdig', id: tilstand.gjeldende.id });
});

$('monster-knapp').addEventListener('click', () => {
  naviger({ skjerm: 'monster', id: tilstand.gjeldende.id });
});

// Til detaljer. "fra" husker at vi kom fra tellerne.
$('til-detaljer-knapp').addEventListener('click', () => {
  naviger({ skjerm: 'detaljer', id: tilstand.gjeldende.id, fra: 'teller' });
});
