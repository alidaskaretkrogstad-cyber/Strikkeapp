// =========================================================
// STRIKKEAPP – app.js
// All logikk for appen ligger her.
// =========================================================

// Nøkkelen vi bruker for å lagre prosjektene i localStorage
const LAGRINGS_NOKKEL = 'strikkeapp-prosjekter';

// Visningsnavn for hver status
const STATUS_NAVN = {
  vil: 'To knit',
  pagar: 'In progress',
  ferdig: 'Finished',
};

// Visningsnavn for vanskelighetsgrad
const VANSKELIGHET_NAVN = {
  lett: 'Easy',
  middels: 'Medium',
  vanskelig: 'Hard',
};

// Strikking eller hekling
const TEKNIKK_NAVN = {
  strikking: 'Knitting',
  hekling: 'Crochet',
};

// Hva man lager. "annet" (Other) lar deg skrive inn noe selv.
// Vil du ha flere valg, legger du dem bare til her.
const TYPE_NAVN = {
  genser: 'Sweater',
  jakke: 'Cardigan',
  vest: 'Vest',
  lue: 'Hat',
  sokker: 'Socks',
  votter: 'Mittens',
  skjerf: 'Scarf',
  sjal: 'Shawl',
  teppe: 'Blanket',
  veske: 'Bag',
  kosedyr: 'Toy',
  annet: 'Other',
};

// Små ikoner som vises foran hvert valg under "What are you making?"
const TYPE_IKON = {
  genser: '👕',
  jakke: '🧥',
  vest: '🎽',
  lue: '🧢',
  sokker: '🧦',
  votter: '🧤',
  skjerf: '🧣',
  sjal: '🌸',
  teppe: '🛏️',
  veske: '👜',
  kosedyr: '🧸',
  annet: '✨',
};

// Enkle tekstfelt i "Edit details" (lagres med samme navn i prosjektet)
const TEKST_FELT = ['designer', 'storrelse', 'notater'];

// Lister med flere rader (garn og pinner): hvilke felt hver rad har.
// [navn i dataene, hjelpetekst i feltet]
const RAD_FELT = {
  garn: [
    ['navn', 'Yarn: Peer Gynt'],
    ['mengde', 'Amount: 6 skeins'],
  ],
  pinner: [
    ['storrelse', 'Size: 4 mm'],
    ['lengde', 'Length: 80 cm'],
  ],
};

// ---------------------------------------------------------
// TILSTAND (data appen jobber med mens den kjører)
// ---------------------------------------------------------

// Liste med alle prosjekter. Hvert prosjekt ser slik ut:
// { id, navn, status: 'vil'|'pagar'|'ferdig', pause: true/false,
//   tellere: [{ id, navn, verdi, endret }],  (alle tellerne; endret = sist trykket +/-)
//   hovedTeller: id,                         (telleren som vises stor)
//   garn:   [{ navn, mengde }],
//   pinner: [{ storrelse, lengde }],
//   vanskelighet: 'lett'|'middels'|'vanskelig'|'',
//   teknikk: 'strikking'|'hekling',
//   type: 'genser'|'lue'|...|'annet'|'', typeAnnet: 'egen tekst',
//   harBilde, oppskriftFil: { navn, type },  (hvis lastet opp)
//   designer, storrelse, lenke, notater,
//   ferdig: { dato, resultat, prosess, vanskelighet, likte: 1–5 },  (når ferdig)
//   opprettet, endret }
let prosjekter = hentProsjekter();

// Hvilken underfane som er valgt på Projects-siden
let valgtFane = 'pagar';

// Filteret på In progress-fanen: 'alle', 'aktive' eller 'pause'
let pauseFilter = 'alle';

// Et prosjekt som skal fremheves neste gang listen vises (f.eks. et nytt prosjekt)
let uthevNeste = null;

// Skjermen som vises nå, f.eks. { skjerm: 'teller', id: 'abc123' }
let gjeldende = { skjerm: 'hjem' };

// ---------------------------------------------------------
// LAGRING AV PROSJEKTER (localStorage)
// localStorage kan bare lagre tekst, så vi gjør om til/fra JSON.
// ---------------------------------------------------------

function hentProsjekter() {
  try {
    const tekst = localStorage.getItem(LAGRINGS_NOKKEL);
    const liste = tekst ? JSON.parse(tekst) : [];
    liste.forEach(oppgraderProsjekt);
    return liste;
  } catch (feil) {
    // Hvis noe er galt med lagrede data, starter vi med tom liste
    console.error('Kunne ikke lese lagrede prosjekter:', feil);
    return [];
  }
}

// Prosjekter laget i eldre versjoner av appen gjøres om til den nye formen,
// så ingenting går tapt.
function oppgraderProsjekt(prosjekt) {
  // Før hadde alle en fast masketeller. Nå er den en valgfri småteller.
  if (!Array.isArray(prosjekt.tellere)) {
    prosjekt.tellere = [];
    if (prosjekt.masker > 0) {
      prosjekt.tellere.push({ id: lagId(), navn: 'Stitches', verdi: prosjekt.masker });
    }
  }
  delete prosjekt.masker;

  // Før var radtelleren en egen, fast teller. Nå er den en vanlig teller
  // i listen (den første), og den er valgt som den store.
  if ('rader' in prosjekt) {
    const rader = { id: lagId(), navn: prosjekt.hovedNavn || 'Rows', verdi: prosjekt.rader || 0 };
    prosjekt.tellere.unshift(rader);
    prosjekt.hovedTeller = rader.id;
    delete prosjekt.rader;
    delete prosjekt.hovedNavn;
  }

  // Før var pinner og garn bare én tekst. Nå er de lister.
  if (typeof prosjekt.pinner === 'string') {
    prosjekt.pinner = prosjekt.pinner ? [{ storrelse: prosjekt.pinner, lengde: '' }] : [];
  }
  if (!Array.isArray(prosjekt.pinner)) prosjekt.pinner = [];

  if (typeof prosjekt.garn === 'string') {
    prosjekt.garn = prosjekt.garn ? [{ navn: prosjekt.garn, mengde: '' }] : [];
  }
  if (!Array.isArray(prosjekt.garn)) prosjekt.garn = [];

  // Før fantes bare strikking
  if (!prosjekt.teknikk) prosjekt.teknikk = 'strikking';
}

// Teksten for hva prosjektet er, f.eks. "Sweater" eller det man skrev under Other
function typeTekst(prosjekt) {
  if (prosjekt.type === 'annet') return prosjekt.typeAnnet || 'Other';
  return TYPE_NAVN[prosjekt.type] || '';
}

// Gjør et tall 1–5 om til stjerner: 4 → "★★★★☆"
function stjerner(antall) {
  return '★'.repeat(antall) + '☆'.repeat(5 - antall);
}

function lagreProsjekter() {
  localStorage.setItem(LAGRINGS_NOKKEL, JSON.stringify(prosjekter));
}

// Merker et prosjekt som "sist endret nå" og lagrer.
function lagreEndring(prosjekt) {
  prosjekt.endret = Date.now();
  lagreProsjekter();
}

// Når ble prosjektet sist endret? (eldre prosjekter mangler "endret")
function sistEndret(prosjekt) {
  return prosjekt.endret || prosjekt.opprettet;
}

// Lager en enkel, unik ID
function lagId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function finnProsjekt(id) {
  return prosjekter.find((p) => p.id === id);
}

// Prosjektet som vises på skjermen akkurat nå
function aapentProsjekt() {
  return finnProsjekt(gjeldende.id);
}

// Statusteksten som vises, f.eks. "In progress" eller "Paused"
function statusTekst(prosjekt) {
  if (prosjekt.status === 'pagar' && prosjekt.pause) return 'Paused';
  return STATUS_NAVN[prosjekt.status];
}

// ---------------------------------------------------------
// LAGRING AV FILER (IndexedDB)
// Bilder og oppskriftsfiler er store, så de lagres i IndexedDB,
// som har mye mer plass enn localStorage.
// Vi har to "lagre": ett for bilder og ett for oppskrifter.
// Begge bruker prosjektets ID som nøkkel.
// ---------------------------------------------------------

const DB_NAVN = 'strikkeapp';
const DB_VERSJON = 2; // økes når vi legger til nye lagre
const BILDE_LAGER = 'bilder';
const OPPSKRIFT_LAGER = 'oppskrifter';
let databaseLofte = null; // databasen åpnes bare én gang

// Åpner databasen (og lager manglende lagre første gang)
function aapneDatabase() {
  if (!databaseLofte) {
    databaseLofte = new Promise((ok, feil) => {
      const foresporsel = indexedDB.open(DB_NAVN, DB_VERSJON);

      foresporsel.onupgradeneeded = () => {
        const db = foresporsel.result;
        for (const navn of [BILDE_LAGER, OPPSKRIFT_LAGER]) {
          if (!db.objectStoreNames.contains(navn)) db.createObjectStore(navn);
        }
      };

      foresporsel.onsuccess = () => {
        const db = foresporsel.result;
        // Hvis en nyere versjon av appen åpnes i en annen fane, slipp databasen
        db.onversionchange = () => db.close();
        ok(db);
      };
      foresporsel.onerror = () => feil(foresporsel.error);
    });
  }
  return databaseLofte;
}

// Hjelpefunksjon: gjør én operasjon på et lager og venter til den er ferdig.
// modus er 'readonly' (bare lese) eller 'readwrite' (endre).
async function brukLager(lagerNavn, modus, operasjon) {
  const db = await aapneDatabase();
  return new Promise((ok, feil) => {
    const transaksjon = db.transaction(lagerNavn, modus);
    const foresporsel = operasjon(transaksjon.objectStore(lagerNavn));
    transaksjon.oncomplete = () => ok(foresporsel.result);
    transaksjon.onerror = () => feil(transaksjon.error);
  });
}

const lagreBilde = (id, blob) => brukLager(BILDE_LAGER, 'readwrite', (l) => l.put(blob, id));
const hentBilde = (id) => brukLager(BILDE_LAGER, 'readonly', (l) => l.get(id));
const slettBilde = (id) => brukLager(BILDE_LAGER, 'readwrite', (l) => l.delete(id));

const lagreOppskrift = (id, fil) => brukLager(OPPSKRIFT_LAGER, 'readwrite', (l) => l.put(fil, id));
const hentOppskrift = (id) => brukLager(OPPSKRIFT_LAGER, 'readonly', (l) => l.get(id));
const slettOppskrift = (id) => brukLager(OPPSKRIFT_LAGER, 'readwrite', (l) => l.delete(id));

// Mobilbilder er ofte flere MB. Denne funksjonen krymper bildet
// (lengste side maks 1200 piksler) og lagrer det som JPEG.
function krympBilde(fil, maks = 1200) {
  return new Promise((ok, feil) => {
    const url = URL.createObjectURL(fil);
    const bilde = new Image();

    bilde.onload = () => {
      const skala = Math.min(1, maks / Math.max(bilde.width, bilde.height));
      const lerret = document.createElement('canvas');
      lerret.width = Math.round(bilde.width * skala);
      lerret.height = Math.round(bilde.height * skala);
      lerret.getContext('2d').drawImage(bilde, 0, 0, lerret.width, lerret.height);
      URL.revokeObjectURL(url);

      lerret.toBlob(
        (blob) => (blob ? ok(blob) : feil(new Error('Kunne ikke lage bilde'))),
        'image/jpeg',
        0.8 // kvalitet (0–1)
      );
    };

    bilde.onerror = () => {
      URL.revokeObjectURL(url);
      feil(new Error('Kunne ikke lese bildet'));
    };

    bilde.src = url;
  });
}

// Henter bildet til et prosjekt og viser det i et <img>-element
function visBildeI(imgElement, prosjektId) {
  hentBilde(prosjektId)
    .then((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      // Frigjør minnet når bildet er tegnet
      imgElement.onload = () => URL.revokeObjectURL(url);
      imgElement.src = url;
      imgElement.hidden = false;
    })
    .catch((feil) => console.error('Kunne ikke hente bilde:', feil));
}

// Gjør det brukeren skrev inn om til en trygg nettlenke
// (bare http/https er lov, og "https://" legges til hvis det mangler).
function lagNettlenke(tekst) {
  const renset = tekst.trim();
  if (!renset) return '';
  return /^https?:\/\//i.test(renset) ? renset : 'https://' + renset;
}

// ---------------------------------------------------------
// HENTE ELEMENTER FRA HTML
// ---------------------------------------------------------
const $ = (id) => document.getElementById(id); // kortere skrivemåte

const skjermer = document.querySelectorAll('.skjerm');
const meny = $('meny');
const menyKnapper = document.querySelectorAll('#meny .fane');
const underfaneKnapper = document.querySelectorAll('.underfane');

// ---------------------------------------------------------
// DIALOGBOKS (appens egen erstatning for confirm og alert)
// ---------------------------------------------------------
const dialog = $('dialog');

// Spør brukeren et ja/nei-spørsmål. Gir true hvis man trykker ja-knappen.
// Bruk med await:  if (!(await bekreft('Delete?', 'Delete'))) return;
function bekreft(tekst, jaTekst = 'OK', visAvbryt = true) {
  return new Promise((svar) => {
    $('dialog-tekst').textContent = tekst;
    $('dialog-ja').textContent = jaTekst;
    $('dialog-nei').hidden = !visAvbryt;
    dialog.returnValue = '';
    dialog.addEventListener('close', () => svar(dialog.returnValue === 'ja'), { once: true });
    dialog.showModal();
  });
}

// Viser en melding med bare en OK-knapp
function visMelding(tekst) {
  return bekreft(tekst, 'OK', false);
}

// ---------------------------------------------------------
// ENDRE NAVN PÅ EN TELLER (blyant-knappen)
// Navnet byttes midlertidig ut med et tekstfelt.
// Enter eller trykk utenfor = lagre, Escape = avbryt.
// ---------------------------------------------------------
function redigerNavn(navnEl, blyant, lagre) {
  const felt = document.createElement('input');
  felt.type = 'text';
  felt.className = 'navn-felt';
  felt.maxLength = 40;
  felt.value = navnEl.textContent;

  navnEl.hidden = true;
  blyant.hidden = true;
  navnEl.after(felt);
  felt.focus();
  felt.select();

  let ferdig = false;
  const avslutt = (behold) => {
    if (ferdig) return; // kan bli kalt to ganger (Enter + blur)
    ferdig = true;
    const nyttNavn = felt.value.trim();
    felt.remove();
    navnEl.hidden = false;
    blyant.hidden = false;
    if (behold && nyttNavn) {
      navnEl.textContent = nyttNavn;
      lagre(nyttNavn);
    }
  };

  felt.addEventListener('keydown', (hendelse) => {
    if (hendelse.key === 'Enter') {
      hendelse.preventDefault();
      avslutt(true);
    }
    if (hendelse.key === 'Escape') avslutt(false);
  });
  felt.addEventListener('blur', () => avslutt(true));
}

// ---------------------------------------------------------
// NAVIGASJON MELLOM SKJERMER
// Vi bruker nettleserens historikk (history.pushState). Da virker
// tilbake-knappen/-sveipen på telefonen akkurat som "← Back" i appen.
// ---------------------------------------------------------

// Hvilken <section> hører til hvilken skjerm
const SKJERM_ID = {
  hjem: 'hjem-skjerm',
  prosjekter: 'prosjekter-skjerm',
  nytt: 'nytt-skjerm',
  teller: 'teller-skjerm',
  ferdig: 'ferdig-skjerm',
  detaljer: 'detaljer-skjerm',
  monster: 'monster-skjerm',
};

// Brukes når vi vil gå tilbake ett steg OG så til en bestemt skjerm
// (f.eks. etter "Create project": tilbake fra skjemaet, og så til Projects).
let etterTilbake = null;

// Gå til en ny skjerm.
// erstatt = true betyr at vi bytter ut skjermen vi står på, i stedet for å
// legge en ny skjerm "oppå" (da hopper "Back" over den gamle).
function naviger(tilstand, erstatt = false) {
  // "dybde" = hvor mange skjermer vi har gått inn fra forsiden/Projects.
  // Den trengs for å vite hvor langt tilbake hus-knappen skal gå.
  const dybde = gjeldende.dybde || 0;
  tilstand.dybde = erstatt ? dybde : dybde + 1;

  if (erstatt) history.replaceState(tilstand, '');
  else history.pushState(tilstand, '');
  vis(tilstand);
}

// Går helt tilbake til en hovedskjerm (forsiden eller Projects).
// Vi går tilbake i historikken i stedet for framover, så "Back" etterpå
// ikke tar deg inn i prosjektet igjen.
function gaTilHovedskjerm(tilstand) {
  const dybde = gjeldende.dybde || 0;
  if (dybde === 0) {
    naviger(tilstand, true);
    return;
  }
  etterTilbake = tilstand;
  history.go(-dybde);
}

// Hus-knappen øverst til høyre på prosjektsidene
document.querySelectorAll('.hjem-knapp').forEach((knapp) => {
  knapp.addEventListener('click', () => gaTilHovedskjerm({ skjerm: 'hjem' }));
});

function tilbake() {
  history.back();
}

// Når man går tilbake (knapp i appen eller på telefonen)
window.addEventListener('popstate', (hendelse) => {
  let tilstand = hendelse.state || { skjerm: 'hjem' };
  if (etterTilbake) {
    tilstand = etterTilbake;
    etterTilbake = null;
    history.replaceState(tilstand, '');
  }
  vis(tilstand);
});

document.querySelectorAll('.tilbake').forEach((knapp) => {
  knapp.addEventListener('click', tilbake);
});

// Tegner skjermen som hører til en tilstand
function vis(tilstand) {
  // Skjermer for ett prosjekt: hvis prosjektet er slettet, gå til Projects
  const gjelderProsjekt = ['teller', 'ferdig', 'detaljer', 'monster'].includes(tilstand.skjerm);
  if (gjelderProsjekt && !finnProsjekt(tilstand.id)) {
    tilstand = { skjerm: 'prosjekter' };
    history.replaceState(tilstand, '');
  }

  gjeldende = tilstand;

  // Fyll skjermen med innhold
  if (tilstand.skjerm === 'hjem') visHjem();
  if (tilstand.skjerm === 'prosjekter') visProsjektliste();
  if (tilstand.skjerm === 'nytt') visNyttSkjema();
  if (tilstand.skjerm === 'teller') visTeller();
  if (tilstand.skjerm === 'ferdig') visFerdigSkjema();
  if (tilstand.skjerm === 'detaljer') visDetaljer();
  if (tilstand.skjerm === 'monster') visMonster();

  // Vis riktig <section>, skjul resten
  skjermer.forEach((skjerm) => {
    skjerm.hidden = skjerm.id !== SKJERM_ID[tilstand.skjerm];
  });

  // Menyen nederst vises bare på forsiden og på Projects
  const erHovedskjerm = tilstand.skjerm === 'hjem' || tilstand.skjerm === 'prosjekter';
  meny.hidden = !erHovedskjerm;
  menyKnapper.forEach((knapp) => {
    knapp.classList.toggle('aktiv', knapp.dataset.mal === tilstand.skjerm);
  });

  window.scrollTo(0, 0);
}

// Fremhever en prosjektrad kort med en lilla glød, så man ser hvor den er
function uthevProsjekt(id) {
  const rad = document.querySelector(`.prosjekt-element[data-id="${id}"]`);
  if (!rad) return;
  rad.classList.add('hoppet-opp');
  rad.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// Menyknappene nederst. Hovedskjermene bytter plass med hverandre
// (erstatt = true), så "Back" ikke hopper fram og tilbake mellom dem.
menyKnapper.forEach((knapp) => {
  knapp.addEventListener('click', () => {
    naviger({ skjerm: knapp.dataset.mal }, true);
  });
});

// Åpner et prosjekt fra en liste:
// "In progress" går rett til tellerne, de andre til oppskrift/detaljer.
function aapneProsjekt(prosjekt) {
  const skjerm = prosjekt.status === 'pagar' ? 'teller' : 'detaljer';
  naviger({ skjerm: skjerm, id: prosjekt.id });
}

// ---------------------------------------------------------
// VALGKNAPPER (vanskelighetsgrad: Easy / Medium / Hard)
// En .valg-gruppe er en rad med knapper der bare én kan være valgt.
// Valgt verdi lagres i gruppa som data-verdi.
// ---------------------------------------------------------
// Samme system brukes også for:
//  - typeknappene (Sweater, Hat, ... Other)
//  - stjernene (1–5) på ferdig-siden
//  - Knitting / Crochet
function settValg(gruppe, verdi) {
  verdi = verdi || '';
  gruppe.dataset.verdi = verdi;

  gruppe.querySelectorAll('button').forEach((knapp) => {
    if (gruppe.classList.contains('stjerner')) {
      // Stjerner: alle stjernene opp til den valgte lyser
      knapp.classList.toggle('aktiv', Number(knapp.dataset.verdi) <= Number(verdi));
    } else {
      knapp.classList.toggle('aktiv', knapp.dataset.verdi === verdi);
    }
  });

  // Typeknappene: vis tekstfeltet når "Other" er valgt
  const annetFelt = document.getElementById(`${gruppe.id}-annet`);
  if (annetFelt) annetFelt.hidden = verdi !== 'annet';

  // Knitting/Crochet: bytt "Needles" ↔ "Hooks" i samme skjema
  if (gruppe.classList.contains('teknikk-valg')) {
    const skjema = gruppe.closest('form');
    skjema.querySelectorAll('[data-tekst-hekl]').forEach((element) => {
      element.textContent =
        verdi === 'hekling' ? element.dataset.tekstHekl : element.dataset.tekstStrikk;
    });
  }
}

function lesValg(gruppe) {
  return gruppe.dataset.verdi || '';
}

// Fyll typeknappene (Sweater, Hat, ...) fra listen TYPE_NAVN øverst
document.querySelectorAll('.valg-gruppe.chips').forEach((gruppe) => {
  for (const [verdi, navn] of Object.entries(TYPE_NAVN)) {
    const knapp = document.createElement('button');
    knapp.type = 'button';
    knapp.dataset.verdi = verdi;
    const ikon = document.createElement('span');
    ikon.className = 'chip-ikon';
    ikon.setAttribute('aria-hidden', 'true');
    ikon.textContent = TYPE_IKON[verdi] || '';
    knapp.append(ikon, navn);
    gruppe.append(knapp);
  }
});

document.querySelectorAll('.valg-gruppe, .stjerner').forEach((gruppe) => {
  gruppe.querySelectorAll('button').forEach((knapp) => {
    knapp.addEventListener('click', () => {
      const valgtFraFor = lesValg(gruppe) === knapp.dataset.verdi;
      // Grupper med data-paakrevd (Knitting/Crochet) må alltid ha et valg
      if (valgtFraFor && 'paakrevd' in gruppe.dataset) return;
      // Ellers: trykker man på den som allerede er valgt, fjernes valget
      settValg(gruppe, valgtFraFor ? '' : knapp.dataset.verdi);
    });
  });
});

// ---------------------------------------------------------
// LISTER MED RADER (garn og pinner)
// Brukes både i "New project" og i "Edit details".
// Hver liste har data-felt="garn" eller "pinner", som sier hvilke
// felt hver rad skal ha (se RAD_FELT øverst).
// ---------------------------------------------------------

// Legger til én rad: [felt 1] [felt 2] [×]
function leggTilRad(liste, verdier = {}) {
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
function fyllRader(liste, rader) {
  liste.innerHTML = '';
  rader.forEach((verdier) => leggTilRad(liste, verdier));
  if (rader.length === 0) leggTilRad(liste);
}

// Leser radene fra en liste (helt tomme rader hoppes over)
function lesRader(liste) {
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
function raderSomTekst(rader) {
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

// ---------------------------------------------------------
// NÅR STRIKKET DU SIST?
// prosjekt.sistStrikket settes hver gang man trykker på en teller.
// Eldre prosjekter mangler den, og da bruker vi "sist endret".
// ---------------------------------------------------------
function sistStrikket(prosjekt) {
  return prosjekt.sistStrikket || sistEndret(prosjekt);
}

// Gjør et tidspunkt om til tekst: "Today, 14:32", "Yesterday, 09:10" eller "3 Nov, 18:05"
function tidSomTekst(tid) {
  const dato = new Date(tid);
  const klokke = dato.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });

  const iDag = new Date();
  const iGaar = new Date();
  iGaar.setDate(iDag.getDate() - 1);

  if (dato.toDateString() === iDag.toDateString()) return `Today, ${klokke}`;
  if (dato.toDateString() === iGaar.toDateString()) return `Yesterday, ${klokke}`;

  // Tar med årstall bare hvis det ikke er i år
  const valg = { day: 'numeric', month: 'short' };
  if (dato.getFullYear() !== iDag.getFullYear()) valg.year = 'numeric';
  return `${dato.toLocaleDateString('en-GB', valg)}, ${klokke}`;
}

// ---------------------------------------------------------
// EN PROSJEKT-RAD (brukes både på forsiden og i listene)
// visTid = true: vis når du sist strikket i stedet for telleren (brukes på forsiden)
// ---------------------------------------------------------
function lagProsjektRad(prosjekt, visTid = false) {
  const li = document.createElement('li');
  const knapp = document.createElement('button');
  knapp.className = 'prosjekt-rad';
  // Prosjekter på pause får en egen, dempet farge
  if (prosjekt.status === 'pagar' && prosjekt.pause) knapp.classList.add('pauset');

  // Lite bilde til venstre (lilla rute hvis prosjektet ikke har bilde)
  const miniatyr = document.createElement('span');
  miniatyr.className = 'miniatyr';
  if (prosjekt.harBilde) {
    const img = document.createElement('img');
    img.alt = '';
    img.hidden = true; // vises når bildet er lastet
    miniatyr.append(img);
    visBildeI(img, prosjekt.id);
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
      prosjekt.pause = false;
      lagreEndring(prosjekt); // "sist endret" = nå, så den havner øverst
      visProsjektliste();
      uthevProsjekt(prosjekt.id); // vis hvor den hoppet
    });
    li.append(fortsett);
  }

  return li;
}

// ---------------------------------------------------------
// FORSIDE
// ---------------------------------------------------------
function visHjem() {
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

// Rutene med antall tar deg til riktig underfane på Projects
document.querySelectorAll('.oversikt-rute').forEach((rute) => {
  rute.addEventListener('click', () => {
    valgtFane = rute.dataset.status;
    naviger({ skjerm: 'prosjekter' }, true);
  });
});

$('ny-knapp').addEventListener('click', () => naviger({ skjerm: 'nytt' }));

// ---------------------------------------------------------
// PROJECTS (liste med underfaner)
// ---------------------------------------------------------
function visProsjektliste() {
  // Marker valgt underfane
  underfaneKnapper.forEach((knapp) => {
    knapp.classList.toggle('aktiv', knapp.dataset.status === valgtFane);
  });

  // "+ New project" vises bare på To knit-fanen
  $('ny-to-knit-knapp').hidden = valgtFane !== 'vil';

  // Filteret (All / Active / Paused) vises bare på In progress-fanen
  const erPagar = valgtFane === 'pagar';
  $('pause-filter').hidden = !erPagar;
  document.querySelectorAll('#pause-filter button').forEach((knapp) => {
    knapp.classList.toggle('aktiv', knapp.dataset.filter === pauseFilter);
  });

  // Plukk ut prosjektene med valgt status, sist endret øverst
  const iFanen = prosjekter
    .filter((p) => p.status === valgtFane)
    .sort((a, b) => sistEndret(b) - sistEndret(a));

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
    skille.textContent = 'Paused projects';
    liste.append(skille);
  }
  pausede.forEach((prosjekt) => liste.append(lagProsjektRad(prosjekt)));

  // Vis melding hvis listen er tom
  const tom = aktive.length + pausede.length === 0;
  $('tom-melding').hidden = !tom;
  if (tom) {
    if (erPagar && pauseFilter === 'aktive') $('tom-melding').textContent = 'No active projects.';
    else if (erPagar && pauseFilter === 'pause') $('tom-melding').textContent = 'No paused projects.';
    else $('tom-melding').textContent = 'No projects here yet.';
  }

  // Fremhev et nytt prosjekt (etter at siden er ferdig tegnet)
  if (uthevNeste) {
    const id = uthevNeste;
    uthevNeste = null;
    setTimeout(() => uthevProsjekt(id), 50);
  }
}

// Filterknappene All / Active / Paused
document.querySelectorAll('#pause-filter button').forEach((knapp) => {
  knapp.addEventListener('click', () => {
    pauseFilter = knapp.dataset.filter;
    visProsjektliste();
  });
});

// Bytte underfane (vi blir på samme skjerm, bare listen endres)
underfaneKnapper.forEach((knapp) => {
  knapp.addEventListener('click', () => {
    valgtFane = knapp.dataset.status;
    visProsjektliste();
  });
});

// Nytt prosjekt fra To knit-fanen: status er forhåndsvalgt til "To knit"
$('ny-to-knit-knapp').addEventListener('click', () => {
  naviger({ skjerm: 'nytt', status: 'vil' });
});

// ---------------------------------------------------------
// NYTT PROSJEKT
// ---------------------------------------------------------
const nyttSkjema = $('nytt-prosjekt-skjema');
const nyttBildeInput = $('nytt-bilde');
const nyttBildeForhand = $('nytt-bilde-forhand');
const nyttOppskriftInput = $('nytt-oppskrift');
const nyttOppskriftNavn = $('nytt-oppskrift-navn');

// Viser en forhåndsvisning av et valgt bilde i et <img>-element
function visForhandsvisning(input, img) {
  input.addEventListener('change', () => {
    const fil = input.files[0];
    if (!fil) return;
    img.src = URL.createObjectURL(fil);
    img.hidden = false;
  });
}

// Tømmer skjemaet hver gang skjermen vises
function visNyttSkjema() {
  nyttSkjema.reset();
  $('ny-status').value = 'vil'; // "To knit" er standard
  settValg($('ny-teknikk'), 'strikking'); // "Knitting" er standard
  settValg($('ny-type'), '');
  settValg($('ny-vanskelighet'), '');
  nyttBildeForhand.hidden = true;
  nyttBildeForhand.removeAttribute('src');
  nyttOppskriftNavn.hidden = true;
  fyllRader($('nytt-garn'), []);
  fyllRader($('nytt-pinner'), []);
}

visForhandsvisning(nyttBildeInput, nyttBildeForhand);

// Vis navnet på oppskriftsfilen man har valgt
nyttOppskriftInput.addEventListener('change', () => {
  const fil = nyttOppskriftInput.files[0];
  nyttOppskriftNavn.textContent = fil ? `📄 ${fil.name}` : '';
  nyttOppskriftNavn.hidden = !fil;
});

nyttSkjema.addEventListener('submit', async (hendelse) => {
  // Hindrer at siden lastes på nytt (standard for skjemaer)
  hendelse.preventDefault();

  const navn = $('nytt-navn').value.trim();
  if (!navn) return;

  const nytt = {
    id: lagId(),
    navn: navn,
    status: $('ny-status').value,
    pause: false,
    tellere: [{ id: lagId(), navn: 'Rows', verdi: 0 }], // starter med én radteller
    garn: lesRader($('nytt-garn')),
    pinner: lesRader($('nytt-pinner')),
    vanskelighet: lesValg($('ny-vanskelighet')),
    teknikk: lesValg($('ny-teknikk')) || 'strikking',
    type: lesValg($('ny-type')),
    typeAnnet: $('ny-type-annet').value.trim(),
    harBilde: false,
    opprettet: Date.now(),
    endret: Date.now(),
  };

  // Lagre oppskriftsfilen hvis man har valgt en
  const oppskrift = nyttOppskriftInput.files[0];
  if (oppskrift) {
    try {
      await lagreOppskrift(nytt.id, oppskrift);
      nytt.oppskriftFil = { navn: oppskrift.name, type: oppskrift.type };
    } catch (feil) {
      console.error(feil);
      await visMelding('The pattern could not be saved, but the project was created.');
    }
  }

  // Lagre bildet hvis man har valgt ett
  const bilde = nyttBildeInput.files[0];
  if (bilde) {
    try {
      await lagreBilde(nytt.id, await krympBilde(bilde));
      nytt.harBilde = true;
    } catch (feil) {
      console.error(feil);
      await visMelding('The photo could not be saved, but the project was created.');
    }
  }

  prosjekter.push(nytt);
  lagreProsjekter();

  // Gå til Projects, på fanen der det nye prosjektet havnet, og fremhev det.
  // Vi går først tilbake fra skjemaet, så "Back" ikke tar deg til skjemaet igjen.
  valgtFane = nytt.status;
  pauseFilter = 'alle'; // så det nye prosjektet ikke er skjult av filteret
  uthevNeste = nytt.id;
  gaTilHovedskjerm({ skjerm: 'prosjekter' });
});

// ---------------------------------------------------------
// TELLERE
// Alle tellerne ligger i prosjekt.tellere. Én av dem er hovedtelleren
// (prosjekt.hovedTeller) og vises stor. De andre vises som små bokser
// bortover under den. Trykk på en liten boks for å gjøre den stor.
// ---------------------------------------------------------

// Finner telleren som skal vises stor (den første, hvis ingen er valgt)
function hovedTeller(prosjekt) {
  return prosjekt.tellere.find((t) => t.id === prosjekt.hovedTeller) || prosjekt.tellere[0];
}

function visTeller() {
  const prosjekt = aapentProsjekt();
  $('teller-tittel').textContent = prosjekt.navn;
  visTellere(prosjekt);
  visPause(prosjekt);
}

// Liten vibrasjon som bekreftelse (fungerer på mange Android-telefoner)
function vibrer() {
  if (navigator.vibrate) navigator.vibrate(15);
}

// Endrer en teller med +1 eller -1 (aldri under 0) og lagrer automatisk
function endreTeller(prosjekt, teller, endring) {
  teller.verdi = Math.max(0, teller.verdi + endring);
  teller.endret = Date.now(); // når akkurat denne telleren sist ble endret
  prosjekt.sistStrikket = Date.now(); // husk når du sist strikket
  lagreEndring(prosjekt);
  vibrer();
  visSistEndret();
}

// Fjerner en teller (etter å ha spurt)
async function fjernTeller(prosjekt, teller) {
  if (!(await bekreft(`Remove the counter "${teller.navn}"?`, 'Remove'))) return;
  prosjekt.tellere = prosjekt.tellere.filter((t) => t.id !== teller.id);
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
    const { boks, startRedigering } = lagLitenTeller(prosjekt, teller);
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
  ny.addEventListener('click', () => leggTilTeller(prosjekt));
  rad.append(ny);

  $('bytt-hint').hidden = sma.length === 0;
}

// Lager én liten teller-boks: navn, ✏️, ×, tall, og − / +
function lagLitenTeller(prosjekt, teller) {
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
  minus.addEventListener('click', () => {
    endreTeller(prosjekt, teller, -1);
    tall.textContent = teller.verdi;
  });
  pluss.addEventListener('click', () => {
    endreTeller(prosjekt, teller, 1);
    tall.textContent = teller.verdi;
  });
  fjern.addEventListener('click', () => fjernTeller(prosjekt, teller));

  const startRedigering = () => {
    redigerNavn(navn, blyant, (nyttNavn) => {
      teller.navn = nyttNavn;
      lagreEndring(prosjekt);
    });
  };
  blyant.addEventListener('click', startRedigering);

  // Trykk på selve boksen (ikke på knappene) = gjør denne telleren stor
  boks.addEventListener('click', (hendelse) => {
    if (hendelse.target.closest('button, input')) return;
    prosjekt.hovedTeller = teller.id;
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
function leggTilTeller(prosjekt) {
  const ny = { id: lagId(), navn: `Counter ${prosjekt.tellere.length + 1}`, verdi: 0 };
  prosjekt.tellere.push(ny);
  lagreEndring(prosjekt);
  visTellere(prosjekt, ny.id);
}

// --- Knappene på den store telleren ---
$('hoved-pluss').addEventListener('click', () => {
  const prosjekt = aapentProsjekt();
  const teller = hovedTeller(prosjekt);
  endreTeller(prosjekt, teller, 1);
  $('hoved-tall').textContent = teller.verdi;
});

$('hoved-minus').addEventListener('click', () => {
  const prosjekt = aapentProsjekt();
  const teller = hovedTeller(prosjekt);
  endreTeller(prosjekt, teller, -1);
  $('hoved-tall').textContent = teller.verdi;
});

// --- "Last change: 5 min ago" under den store telleren ---
// Gjør et tidspunkt om til "Just now", "5 min ago", "2 h ago" osv.
function hvorLengeSiden(tid) {
  const minutter = Math.floor((Date.now() - tid) / 60000);
  if (minutter < 1) return 'Just now';
  if (minutter < 60) return `${minutter} min ago`;
  const timer = Math.floor(minutter / 60);
  if (timer < 24) {
    const rest = minutter % 60;
    return rest ? `${timer} h ${rest} min ago` : `${timer} h ago`;
  }
  return tidSomTekst(tid); // eldre enn et døgn: "Yesterday, 14:32" osv.
}

function visSistEndret() {
  const felt = $('hoved-sist');
  const prosjekt = aapentProsjekt();
  const teller = prosjekt && hovedTeller(prosjekt);
  if (!teller) return;
  felt.textContent = teller.endret
    ? `Last change: ${hvorLengeSiden(teller.endret)}`
    : 'No changes yet';
}

// Oppdater teksten hvert 20. sekund mens tellersiden er åpen
setInterval(() => {
  if (gjeldende.skjerm === 'teller') visSistEndret();
}, 20000);

// Blyanten ved den store telleren: endre navnet
$('hoved-blyant').addEventListener('click', () => {
  redigerNavn($('hoved-navn'), $('hoved-blyant'), (nyttNavn) => {
    const prosjekt = aapentProsjekt();
    hovedTeller(prosjekt).navn = nyttNavn;
    lagreEndring(prosjekt);
  });
});

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

// --- Ferdig ---
$('ferdig-knapp').addEventListener('click', () => {
  naviger({ skjerm: 'ferdig', id: gjeldende.id });
});

// Til oppskriften (egen side)
$('monster-knapp').addEventListener('click', () => {
  naviger({ skjerm: 'monster', id: gjeldende.id });
});

// Til detaljer. "fra" husker at vi kom fra tellerne.
$('til-detaljer-knapp').addEventListener('click', () => {
  naviger({ skjerm: 'detaljer', id: gjeldende.id, fra: 'teller' });
});

// ---------------------------------------------------------
// FERDIG-SIDEN (vurdering når prosjektet er ferdig)
// ---------------------------------------------------------
const ferdigSkjema = $('ferdig-skjema');
const ferdigBildeInput = $('ferdig-bilde');
const ferdigBildeForhand = $('ferdig-bilde-forhand');

// Siden brukes på to måter:
//  - når et prosjekt blir ferdig ("Mark as finished")
//  - når man endrer vurderingen etterpå ("Edit review"), da er feltene fylt ut
function visFerdigSkjema() {
  const prosjekt = aapentProsjekt();
  const f = prosjekt.ferdig || {}; // tidligere vurdering, hvis den finnes
  const endrer = Boolean(gjeldende.endre);

  ferdigSkjema.reset();
  $('ferdig-tittel').textContent = endrer ? 'Your review' : 'Finished! 🎉';
  $('ferdig-lagre').textContent = endrer ? 'Save review' : '✓ Save as finished';
  $('ferdig-prosjektnavn').textContent = prosjekt.navn;
  $('ferdig-likte-tittel').textContent =
    prosjekt.teknikk === 'hekling' ? 'How did you like crocheting it?' : 'How did you like knitting it?';

  $('ferdig-resultat').value = f.resultat || '';
  $('ferdig-prosess').value = f.prosess || '';
  settValg($('ferdig-vanskelighet'), f.vanskelighet);
  settValg($('ferdig-likte'), f.likte ? String(f.likte) : '');

  ferdigBildeForhand.hidden = true;
  ferdigBildeForhand.removeAttribute('src');
}

visForhandsvisning(ferdigBildeInput, ferdigBildeForhand);

ferdigSkjema.addEventListener('submit', async (hendelse) => {
  hendelse.preventDefault();
  const prosjekt = aapentProsjekt();

  // Bildet av det ferdige prosjektet blir prosjektets bilde
  const bilde = ferdigBildeInput.files[0];
  if (bilde) {
    try {
      await lagreBilde(prosjekt.id, await krympBilde(bilde));
      prosjekt.harBilde = true;
    } catch (feil) {
      console.error(feil);
      await visMelding('The photo could not be saved.');
    }
  }

  const tidligere = prosjekt.ferdig || {};
  prosjekt.ferdig = {
    dato: tidligere.dato || Date.now(), // behold datoen hvis man bare endrer vurderingen
    resultat: $('ferdig-resultat').value.trim(),
    prosess: $('ferdig-prosess').value.trim(),
    vanskelighet: lesValg($('ferdig-vanskelighet')),
    likte: Number(lesValg($('ferdig-likte'))) || 0, // 0 = ingen stjerner valgt
  };

  if (gjeldende.endre) {
    // Vi endret bare vurderingen: gå tilbake til detaljsiden
    lagreEndring(prosjekt);
    tilbake();
    return;
  }

  prosjekt.status = 'ferdig';
  prosjekt.pause = false;
  lagreEndring(prosjekt);

  // Vis det ferdige prosjektet. Skjermen byttes ut, så "Back" går til listen.
  valgtFane = 'ferdig';
  naviger({ skjerm: 'detaljer', id: prosjekt.id }, true);
});

// ---------------------------------------------------------
// DETALJER / OPPSKRIFT
// ---------------------------------------------------------
const hovedHandling = $('hoved-handling');
const detaljerBilde = $('detaljer-bilde');
const oppskriftBilde = $('oppskrift-bilde');
const oppskriftFilLenke = $('oppskrift-fil-lenke');
const oppskriftNettLenke = $('oppskrift-nett-lenke');
const infoKort = $('info-kort');
const redigerSkjema = $('rediger-skjema');
let oppskriftUrl = null; // midlertidig adresse til oppskriftsfilen som vises

function visDetaljer() {
  const prosjekt = aapentProsjekt();
  $('detaljer-tittel').textContent = prosjekt.navn;
  $('detaljer-status').textContent = statusTekst(prosjekt);

  // Hovedknappen: "Start project" for To knit, "Open counters" for In progress.
  // Ferdige prosjekter har ingen hovedknapp.
  $('handling-kort').hidden = prosjekt.status === 'ferdig';
  hovedHandling.textContent = prosjekt.status === 'vil' ? '▶ Start project' : '🔢 Open counters';

  // Prosjektbilde
  if (prosjekt.harBilde) {
    visBildeI(detaljerBilde, prosjekt.id);
  } else {
    detaljerBilde.hidden = true;
    detaljerBilde.removeAttribute('src');
  }
  $('bilde-knapp').textContent = prosjekt.harBilde ? '📷 Change photo' : '📷 Add photo';
  $('fjern-bilde-knapp').hidden = !prosjekt.harBilde;

  visVurdering(prosjekt);
  visInfo(prosjekt);

  // Skjul redigeringsskjemaet hver gang siden tegnes på nytt
  redigerSkjema.hidden = true;
  infoKort.hidden = false;
}

// Fyller en <dl>-liste med [overskrift, verdi]-par (tomme verdier hoppes over).
// Returnerer hvor mange linjer som ble vist.
function fyllListe(dl, linjer) {
  dl.innerHTML = '';
  const utfylt = linjer.filter(([, verdi]) => verdi);
  for (const [overskrift, verdi] of utfylt) {
    const dt = document.createElement('dt');
    dt.textContent = overskrift;
    const dd = document.createElement('dd');
    dd.textContent = verdi;
    dl.append(dt, dd);
  }
  return utfylt.length;
}

// Vurderingen fra ferdig-siden
function visVurdering(prosjekt) {
  const kort = $('vurdering-kort');
  if (prosjekt.status !== 'ferdig') {
    kort.hidden = true;
    return;
  }
  // Prosjekter som ble ferdige i en eldre versjon av appen har ingen vurdering ennå
  const f = prosjekt.ferdig || {};
  $('rediger-vurdering-knapp').textContent = prosjekt.ferdig ? '✏️ Edit review' : '✏️ Add review';
  fyllListe($('vurdering-liste'), [
    ['Finished', f.dato ? new Date(f.dato).toLocaleDateString('en-GB') : ''],
    ['Enjoyed it', f.likte ? stjerner(f.likte) : ''],
    ['Result', f.resultat],
    ['How it went', f.prosess],
    ['Difficulty', VANSKELIGHET_NAVN[f.vanskelighet]],
  ]);
  kort.hidden = false;
}

// "Edit review": åpne ferdig-siden med vurderingen fylt ut
$('rediger-vurdering-knapp').addEventListener('click', () => {
  naviger({ skjerm: 'ferdig', id: gjeldende.id, endre: true });
});

// Til oppskriften fra detaljsiden
$('detaljer-monster-knapp').addEventListener('click', () => {
  naviger({ skjerm: 'monster', id: gjeldende.id });
});

// ---------------------------------------------------------
// OPPSKRIFT-SIDEN
// ---------------------------------------------------------
function visMonster() {
  const prosjekt = aapentProsjekt();
  $('monster-prosjektnavn').textContent = prosjekt.navn;
  visOppskrift(prosjekt);
}

// Viser oppskriftsfil og/eller lenke
function visOppskrift(prosjekt) {
  // Frigjør adressen til en tidligere vist fil
  if (oppskriftUrl) URL.revokeObjectURL(oppskriftUrl);
  oppskriftUrl = null;
  oppskriftBilde.hidden = true;
  oppskriftFilLenke.hidden = true;

  // Lenke til oppskrift på nett
  oppskriftNettLenke.hidden = !prosjekt.lenke;
  if (prosjekt.lenke) oppskriftNettLenke.href = prosjekt.lenke;

  const harFil = Boolean(prosjekt.oppskriftFil);
  $('ingen-oppskrift').hidden = harFil || Boolean(prosjekt.lenke);
  $('oppskrift-knapp').textContent = harFil
    ? '📎 Change pattern file'
    : '📎 Add pattern (PDF or image)';
  $('fjern-oppskrift-knapp').hidden = !harFil;

  if (!harFil) return;

  // Hent filen fra IndexedDB
  hentOppskrift(prosjekt.id)
    .then((fil) => {
      // Sjekk at vi fortsatt ser på samme prosjekt (hentingen tar litt tid)
      if (!fil || gjeldende.id !== prosjekt.id) return;
      oppskriftUrl = URL.createObjectURL(fil);

      // Lenke som åpner filen (PDF åpnes i telefonens PDF-visning)
      oppskriftFilLenke.href = oppskriftUrl;
      oppskriftFilLenke.textContent = `📄 Open ${prosjekt.oppskriftFil.navn}`;
      oppskriftFilLenke.hidden = false;

      // Er oppskriften et bilde, vises den også direkte på siden
      if (prosjekt.oppskriftFil.type.startsWith('image/')) {
        oppskriftBilde.src = oppskriftUrl;
        oppskriftBilde.hidden = false;
      }
    })
    .catch((feil) => console.error('Kunne ikke hente oppskrift:', feil));
}

// Viser informasjonen som er fylt ut
function visInfo(prosjekt) {
  const antall = fyllListe($('detaljer-liste'), [
    ['Craft', TEKNIKK_NAVN[prosjekt.teknikk]],
    ['Type', typeTekst(prosjekt)],
    ['Designer', prosjekt.designer],
    ['Difficulty', VANSKELIGHET_NAVN[prosjekt.vanskelighet]],
    ['Yarn', raderSomTekst(prosjekt.garn)],
    [prosjekt.teknikk === 'hekling' ? 'Hooks' : 'Needles', raderSomTekst(prosjekt.pinner)],
    ['Size', prosjekt.storrelse],
    ['Notes', prosjekt.notater],
  ]);
  $('ingen-detaljer').hidden = antall > 0;
}

// Hovedknappen: Start project / Open counters
hovedHandling.addEventListener('click', () => {
  const prosjekt = aapentProsjekt();

  if (prosjekt.status === 'vil') {
    // Start prosjektet: flytt til "In progress" og åpne tellerne.
    // Detaljsiden byttes ut, så "Back" fra tellerne går til listen.
    prosjekt.status = 'pagar';
    prosjekt.pause = false;
    valgtFane = 'pagar';
    lagreEndring(prosjekt);
    naviger({ skjerm: 'teller', id: prosjekt.id }, true);
  } else if (gjeldende.fra === 'teller') {
    // Vi kom fra tellerne, så vi går bare tilbake dit
    tilbake();
  } else {
    naviger({ skjerm: 'teller', id: prosjekt.id }, true);
  }
});

// --- Redigere informasjon ---
$('rediger-knapp').addEventListener('click', () => {
  const prosjekt = aapentProsjekt();
  // Fyll skjemaet med det som er lagret nå
  $('rediger-navn').value = prosjekt.navn;
  $('rediger-lenke').value = prosjekt.lenke || '';
  for (const felt of TEKST_FELT) {
    $(`rediger-${felt}`).value = prosjekt[felt] || '';
  }
  settValg($('rediger-vanskelighet'), prosjekt.vanskelighet);
  settValg($('rediger-teknikk'), prosjekt.teknikk);
  $('rediger-type-annet').value = prosjekt.typeAnnet || '';
  settValg($('rediger-type'), prosjekt.type);
  fyllRader($('rediger-garn'), prosjekt.garn);
  fyllRader($('rediger-pinner'), prosjekt.pinner);

  infoKort.hidden = true;
  redigerSkjema.hidden = false;
  redigerSkjema.scrollIntoView({ behavior: 'smooth' });
});

$('avbryt-rediger-knapp').addEventListener('click', () => {
  redigerSkjema.hidden = true;
  infoKort.hidden = false;
});

redigerSkjema.addEventListener('submit', (hendelse) => {
  hendelse.preventDefault();
  const prosjekt = aapentProsjekt();

  const navn = $('rediger-navn').value.trim();
  if (navn) prosjekt.navn = navn;
  prosjekt.lenke = lagNettlenke($('rediger-lenke').value);
  for (const felt of TEKST_FELT) {
    prosjekt[felt] = $(`rediger-${felt}`).value.trim();
  }
  prosjekt.vanskelighet = lesValg($('rediger-vanskelighet'));
  prosjekt.teknikk = lesValg($('rediger-teknikk')) || 'strikking';
  prosjekt.type = lesValg($('rediger-type'));
  prosjekt.typeAnnet = $('rediger-type-annet').value.trim();
  prosjekt.garn = lesRader($('rediger-garn'));
  prosjekt.pinner = lesRader($('rediger-pinner'));

  lagreEndring(prosjekt);
  visDetaljer();
});

// --- Oppskriftsfil ---
$('oppskrift-input').addEventListener('change', async (hendelse) => {
  const input = hendelse.target;
  const fil = input.files[0];
  if (!fil) return;
  const prosjekt = aapentProsjekt();

  try {
    // Oppskriften lagres som den er (ikke krympet), så teksten er lett å lese
    await lagreOppskrift(prosjekt.id, fil);
    prosjekt.oppskriftFil = { navn: fil.name, type: fil.type };
    lagreEndring(prosjekt);
    visOppskrift(prosjekt);
  } catch (feil) {
    console.error(feil);
    await visMelding('The pattern could not be saved.');
  } finally {
    input.value = ''; // så man kan velge samme fil igjen senere
  }
});

$('fjern-oppskrift-knapp').addEventListener('click', async () => {
  if (!(await bekreft('Remove the pattern file?', 'Remove'))) return;
  const prosjekt = aapentProsjekt();
  await slettOppskrift(prosjekt.id);
  delete prosjekt.oppskriftFil;
  lagreEndring(prosjekt);
  visOppskrift(prosjekt);
});

// --- Prosjektbilde ---
$('bilde-input').addEventListener('change', async (hendelse) => {
  const input = hendelse.target;
  const fil = input.files[0];
  if (!fil) return;
  const prosjekt = aapentProsjekt();

  try {
    await lagreBilde(prosjekt.id, await krympBilde(fil));
    prosjekt.harBilde = true;
    lagreEndring(prosjekt);
    visDetaljer();
  } catch (feil) {
    console.error(feil);
    await visMelding('The photo could not be saved.');
  } finally {
    input.value = '';
  }
});

$('fjern-bilde-knapp').addEventListener('click', async () => {
  if (!(await bekreft('Remove the photo?', 'Remove'))) return;
  const prosjekt = aapentProsjekt();
  await slettBilde(prosjekt.id);
  prosjekt.harBilde = false;
  lagreEndring(prosjekt);
  visDetaljer();
});

// --- Slette prosjekt ---
$('slett-knapp').addEventListener('click', async () => {
  const prosjekt = aapentProsjekt();
  if (!(await bekreft(`Delete "${prosjekt.navn}"? This cannot be undone.`, 'Delete'))) return;

  // Slett bilde og oppskriftsfil også (det går fint selv om de ikke finnes)
  slettBilde(prosjekt.id).catch((feil) => console.error(feil));
  slettOppskrift(prosjekt.id).catch((feil) => console.error(feil));

  // Behold alle prosjekter unntatt det vi sletter
  prosjekter = prosjekter.filter((p) => p.id !== prosjekt.id);
  lagreProsjekter();
  gaTilHovedskjerm({ skjerm: 'prosjekter' });
});

// ---------------------------------------------------------
// START APPEN PÅ FORSIDEN
// Eldre prosjekter kan ha blitt oppgradert ved innlasting; lagre det.
// ---------------------------------------------------------
lagreProsjekter();
naviger({ skjerm: 'hjem' }, true);

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
