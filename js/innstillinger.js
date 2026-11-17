// =========================================================
// INNSTILLINGER
// Lagres på denne enheten (localStorage), ikke i skyen, fordi
// f.eks. "skjermen skal ikke slukke" gjerne gjelder én telefon.
//
//   tema:        'lys' | 'mork' | 'system' (følg telefonens innstilling)
//   holdVaaken:  true = skjermen slukker ikke mens appen er åpen
//   sprak:       'en' | 'no' (engelsk eller norsk)
// =========================================================

const NOKKEL = 'strikkeapp-innstillinger';
// Språk: norsk hvis telefonen er på norsk, ellers engelsk
const telefonenErNorsk = /^(nb|nn|no)\b/i.test(navigator.language || '');
const STANDARD = { tema: 'system', holdVaaken: false, sprak: telefonenErNorsk ? 'no' : 'en' };

function les() {
  try {
    return { ...STANDARD, ...JSON.parse(localStorage.getItem(NOKKEL) || '{}') };
  } catch {
    return { ...STANDARD };
  }
}

export const innstillinger = les();

export function lagreInnstilling(navn, verdi) {
  innstillinger[navn] = verdi;
  try {
    localStorage.setItem(NOKKEL, JSON.stringify(innstillinger));
  } catch {
    // Privat nettleservindu e.l.: innstillingen gjelder bare til appen lukkes
  }
  if (navn === 'tema') brukTema();
  if (navn === 'holdVaaken') oppdaterVaakenLas();
}

// ---------------------------------------------------------
// TEMA (lys / mørk / følg telefonen)
// ---------------------------------------------------------
const morkSystem = window.matchMedia('(prefers-color-scheme: dark)');

function brukTema() {
  const mork =
    innstillinger.tema === 'mork' || (innstillinger.tema === 'system' && morkSystem.matches);
  document.documentElement.dataset.tema = mork ? 'mork' : 'lys';

  // Fargen på statuslinjen øverst på telefonen
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = mork ? '#1c1720' : '#f7f3ef';
}

// Når telefonen bytter mellom lys og mørk (f.eks. automatisk om kvelden)
morkSystem.addEventListener('change', brukTema);
brukTema();

// ---------------------------------------------------------
// HOLD SKJERMEN VÅKEN (Screen Wake Lock)
// Telefonen slipper låsen selv når appen legges i bakgrunnen,
// så vi ber om den på nytt når appen vises igjen.
// ---------------------------------------------------------
export const stotterVaakenLas = 'wakeLock' in navigator;
let las = null;

async function oppdaterVaakenLas() {
  if (!stotterVaakenLas) return;

  if (innstillinger.holdVaaken && document.visibilityState === 'visible') {
    if (las && !las.released) return; // har den allerede
    try {
      las = await navigator.wakeLock.request('screen');
    } catch (feil) {
      // Kan f.eks. skje hvis batterisparing er på
      console.warn('Kunne ikke holde skjermen våken:', feil);
    }
  } else if (las) {
    las.release().catch(() => {});
    las = null;
  }
}

document.addEventListener('visibilitychange', oppdaterVaakenLas);
// Noen telefoner gir bare låsen etter at man har trykket på skjermen,
// så vi prøver også igjen ved hvert trykk hvis vi ikke har den.
document.addEventListener('click', () => {
  if (innstillinger.holdVaaken && (!las || las.released)) oppdaterVaakenLas();
});
oppdaterVaakenLas();
