// =========================================================
// BILDER OG OPPSKRIFTSFILER
// Filene lagres to steder:
//  1. På enheten (IndexedDB), så de vises raskt og uten nett.
//  2. I skyen (Firestore), så de er trygge og finnes på alle enhetene dine.
//
// Firestore kan bare lagre ca. 1 MB per dokument, så store filer
// (f.eks. en PDF på 5 MB) deles opp i biter som lagres hver for seg:
//   brukere/{bruker}/filer/{prosjekt}-oppskrift          ← info om filen
//   brukere/{bruker}/filer/{prosjekt}-oppskrift/deler/0  ← første bit
//   brukere/{bruker}/filer/{prosjekt}-oppskrift/deler/1  ← andre bit ...
//
// "versjon" er et tidspunkt som lagres i prosjektet. Hvis versjonen på
// enheten er eldre enn den i prosjektet, hentes filen på nytt fra skyen.
// =========================================================
import { db, brukerId, doc, getDoc, getDocFromCache, setDoc, deleteDoc, Bytes } from './firebase.js';
import { BILDE_LAGER, OPPSKRIFT_LAGER, lesLokal, skrivLokal, slettLokal } from './lokal.js';

const DEL_STORRELSE = 700 * 1024; // 700 KB per bit (godt under grensen på 1 MB)
const LAGER = { bilde: BILDE_LAGER, oppskrift: OPPSKRIFT_LAGER };

// Dokumentet med info om filen i skyen
function infoDok(art, prosjektId) {
  return doc(db, 'brukere', brukerId(), 'filer', `${prosjektId}-${art}`);
}

function delDok(art, prosjektId, nummer) {
  return doc(infoDok(art, prosjektId), 'deler', String(nummer));
}

// Lagrer en fil (art er 'bilde' eller 'oppskrift').
// Filen lagres på enheten med en gang, og sendes til skyen i bakgrunnen.
export async function lagreFil(art, prosjektId, fil, versjon) {
  // Kopier filen inn i minnet. På iPhone kan en valgt fil ellers
  // "forsvinne" senere, fordi den bare peker til en midlertidig fil.
  const blob = new Blob([await fil.arrayBuffer()], { type: fil.type });
  await skrivLokal(LAGER[art], prosjektId, { blob, versjon });
  lastOpp(art, prosjektId, blob, versjon).catch((feil) =>
    console.error('Kunne ikke laste opp filen:', feil)
  );
}

async function lastOpp(art, prosjektId, blob, versjon) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const antallDeler = Math.max(1, Math.ceil(bytes.length / DEL_STORRELSE));

  // Hvor mange biter hadde den forrige filen? (de overflødige slettes etterpå).
  // Vi spør bare den lokale kopien, så det går raskt også uten nett.
  let forrigeAntall = 0;
  try {
    const forrige = await getDocFromCache(infoDok(art, prosjektId));
    if (forrige.exists()) forrigeAntall = forrige.data().deler || 0;
  } catch {
    // Ikke på enheten – da blir eventuelle gamle biter bare liggende
  }

  // Alle skrivingene legges i kø med en gang (uten å vente på nettet),
  // så de blir sendt selv om appen lukkes eller telefonen er uten nett.
  // Bitene først, og info-dokumentet til slutt (da er filen komplett).
  const skrivinger = [];
  for (let i = 0; i < antallDeler; i++) {
    const bit = bytes.slice(i * DEL_STORRELSE, (i + 1) * DEL_STORRELSE);
    skrivinger.push(setDoc(delDok(art, prosjektId, i), { data: Bytes.fromUint8Array(bit) }));
  }
  skrivinger.push(
    setDoc(infoDok(art, prosjektId), {
      type: blob.type,
      storrelse: bytes.length,
      deler: antallDeler,
      versjon: versjon,
    })
  );
  for (let i = antallDeler; i < forrigeAntall; i++) {
    skrivinger.push(deleteDoc(delDok(art, prosjektId, i)));
  }
  await Promise.all(skrivinger);
}

// Henter en fil. Bruker kopien på enheten hvis den er oppdatert,
// ellers hentes filen fra skyen (og lagres på enheten til neste gang).
export async function hentFil(art, prosjektId, versjon) {
  const lokal = await lesLokal(LAGER[art], prosjektId).catch(() => null);
  // Den gamle versjonen av appen lagret filen direkte (uten versjon)
  const lokalBlob = lokal instanceof Blob ? lokal : lokal && lokal.blob;
  const lokalVersjon = lokal && !(lokal instanceof Blob) ? lokal.versjon : null;

  if (lokalBlob && (!versjon || lokalVersjon === versjon)) return lokalBlob;

  try {
    const info = await getDoc(infoDok(art, prosjektId));
    if (!info.exists()) return lokalBlob || null;
    const { type, deler } = info.data();

    const biter = await Promise.all(
      Array.from({ length: deler }, (_, i) => getDoc(delDok(art, prosjektId, i)))
    );
    const blob = new Blob(
      biter.map((bit) => bit.data().data.toUint8Array()),
      { type }
    );
    await skrivLokal(LAGER[art], prosjektId, { blob, versjon: info.data().versjon });
    return blob;
  } catch (feil) {
    // Uten nett: bruk det vi har på enheten, selv om det er gammelt
    console.error('Kunne ikke hente filen fra skyen:', feil);
    return lokalBlob || null;
  }
}

// Sletter en fil både på enheten og i skyen
export async function slettFil(art, prosjektId) {
  await slettLokal(LAGER[art], prosjektId).catch(() => {});
  try {
    const info = await getDoc(infoDok(art, prosjektId));
    const deler = info.exists() ? info.data().deler || 0 : 0;
    await deleteDoc(infoDok(art, prosjektId));
    for (let i = 0; i < deler; i++) await deleteDoc(delDok(art, prosjektId, i));
  } catch (feil) {
    console.error('Kunne ikke slette filen i skyen:', feil);
  }
}

// Leser en fil som bare finnes på enheten (brukes når gamle data flyttes til skyen)
export async function lesGammelFil(art, prosjektId) {
  const lokal = await lesLokal(LAGER[art], prosjektId).catch(() => null);
  return lokal instanceof Blob ? lokal : lokal && lokal.blob;
}
