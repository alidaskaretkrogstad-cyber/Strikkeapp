// =========================================================
// LOKAL LAGRING PÅ ENHETEN
// Bilder og oppskrifter lagres i IndexedDB på enheten som en
// "mellomlagring", så de vises raskt og også uten nett.
// Selve sikkerhetskopien ligger i skyen (se filer.js).
//
// Her ligger også det som trengs for å hente data fra den gamle
// versjonen av appen (før innlogging), så de kan flyttes til skyen.
// =========================================================

const DB_NAVN = 'strikkeapp';
const DB_VERSJON = 2; // økes når vi legger til nye lagre
export const BILDE_LAGER = 'bilder';
export const OPPSKRIFT_LAGER = 'oppskrifter';
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

// Gjør én operasjon på et lager og venter til den er ferdig.
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

export const lesLokal = (lager, id) => brukLager(lager, 'readonly', (l) => l.get(id));
export const skrivLokal = (lager, id, verdi) => brukLager(lager, 'readwrite', (l) => l.put(verdi, id));
export const slettLokal = (lager, id) => brukLager(lager, 'readwrite', (l) => l.delete(id));

// Prosjektene fra den gamle versjonen av appen (lå i localStorage)
export function hentGamleProsjekter() {
  try {
    const tekst = localStorage.getItem('strikkeapp-prosjekter');
    return tekst ? JSON.parse(tekst) : [];
  } catch (feil) {
    console.error('Kunne ikke lese gamle prosjekter:', feil);
    return [];
  }
}
