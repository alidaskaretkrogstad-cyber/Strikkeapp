// =========================================================
// PROSJEKTENE I SKYEN (Firestore)
// Hvert prosjekt er ett dokument: brukere/{bruker}/prosjekter/{prosjekt}
//
// Endringer skrives først til den lokale kopien på enheten og sendes
// til skyen i bakgrunnen. Endringer fra de andre enhetene dine kommer
// inn automatisk via lyttPaProsjekter().
// =========================================================
import { db, brukerId, collection, doc, setDoc, deleteDoc, onSnapshot } from './firebase.js';
import { hentGamleProsjekter } from './lokal.js';
import { lesGammelFil, lagreFil, slettFil } from './filer.js';
import { tilstand } from '../tilstand.js';
import { lagId } from '../hjelpere.js';

function prosjektSamling() {
  return collection(db, 'brukere', brukerId(), 'prosjekter');
}

// Skriver ett prosjekt til skyen (venter ikke på nettet)
function skriv(prosjekt) {
  // JSON fram og tilbake gir en ren kopi uten "undefined"-verdier
  const kopi = JSON.parse(JSON.stringify(prosjekt));
  setDoc(doc(prosjektSamling(), prosjekt.id), kopi).catch((feil) =>
    console.error('Kunne ikke lagre prosjektet:', feil)
  );
}

// Merker et prosjekt som "sist endret nå" og lagrer det.
export function lagreEndring(prosjekt) {
  prosjekt.endret = Date.now();
  skriv(prosjekt);
}

export function leggTilProsjekt(prosjekt) {
  tilstand.prosjekter.push(prosjekt);
  skriv(prosjekt);
}

// Sletter prosjektet, bildet og oppskriftsfilen
export function slettProsjekt(prosjekt) {
  tilstand.prosjekter = tilstand.prosjekter.filter((p) => p.id !== prosjekt.id);
  deleteDoc(doc(prosjektSamling(), prosjekt.id)).catch((feil) => console.error(feil));
  slettFil('bilde', prosjekt.id);
  slettFil('oppskrift', prosjekt.id);
}

// Lytter på prosjektene i skyen.
// vedEndring(forste) kalles første gang prosjektene er lastet (forste = true),
// og senere hver gang noe er endret på en ANNEN enhet (forste = false).
// Gir tilbake en funksjon som stopper lyttingen (brukes ved utlogging).
export function lyttPaProsjekter(vedEndring) {
  let forste = true;

  return onSnapshot(
    prosjektSamling(),
    (svar) => {
      if (forste) {
        forste = false;
        tilstand.prosjekter = svar.docs.map((d) => oppgraderProsjekt(d.data()));
        vedEndring(true);
        return;
      }

      let endretAvAndre = false;
      for (const endring of svar.docChanges()) {
        // Endringer vi nettopp gjorde selv, har vi allerede
        if (endring.doc.metadata.hasPendingWrites) continue;

        const id = endring.doc.id;
        const plass = tilstand.prosjekter.findIndex((p) => p.id === id);
        if (endring.type === 'removed') {
          if (plass !== -1) tilstand.prosjekter.splice(plass, 1);
        } else {
          const prosjekt = oppgraderProsjekt(endring.doc.data());
          if (plass === -1) tilstand.prosjekter.push(prosjekt);
          else tilstand.prosjekter[plass] = prosjekt;
        }
        endretAvAndre = true;
      }
      if (endretAvAndre) vedEndring(false);
    },
    (feil) => console.error('Kunne ikke hente prosjektene:', feil)
  );
}

// ---------------------------------------------------------
// FLYTTE GAMLE DATA TIL SKYEN
// Før innlogging fantes, lå prosjektene bare på enheten. Første gang
// noen logger inn på en enhet, kopieres de opp til skyen.
// De gamle dataene på enheten slettes ikke (for sikkerhets skyld).
// ---------------------------------------------------------
const FLYTTET_NOKKEL = 'strikkeapp-flyttet-til-skyen';

// Gir tilbake hvor mange prosjekter som ble flyttet
export async function flyttGamleData() {
  if (localStorage.getItem(FLYTTET_NOKKEL)) return 0;

  let antall = 0;
  for (const gammelt of hentGamleProsjekter()) {
    const prosjekt = oppgraderProsjekt(gammelt);
    if (tilstand.prosjekter.some((p) => p.id === prosjekt.id)) continue;

    if (prosjekt.harBilde) {
      const bilde = await lesGammelFil('bilde', prosjekt.id);
      if (bilde) {
        prosjekt.bildeVersjon = Date.now();
        await lagreFil('bilde', prosjekt.id, bilde, prosjekt.bildeVersjon);
      } else {
        prosjekt.harBilde = false;
      }
    }

    if (prosjekt.oppskriftFil) {
      const oppskrift = await lesGammelFil('oppskrift', prosjekt.id);
      if (oppskrift) {
        prosjekt.oppskriftFil.versjon = Date.now();
        await lagreFil('oppskrift', prosjekt.id, oppskrift, prosjekt.oppskriftFil.versjon);
      } else {
        delete prosjekt.oppskriftFil;
      }
    }

    leggTilProsjekt(prosjekt);
    antall++;
  }

  localStorage.setItem(FLYTTET_NOKKEL, 'ja');
  return antall;
}

// ---------------------------------------------------------
// OPPGRADERING AV ELDRE PROSJEKTER
// Prosjekter laget i eldre versjoner av appen gjøres om til den nye
// formen, så ingenting går tapt.
// ---------------------------------------------------------
export function oppgraderProsjekt(prosjekt) {
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

  return prosjekt;
}
