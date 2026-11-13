// =========================================================
// SERVICE WORKER
// Kjører i bakgrunnen og lagrer (cacher) appens filer på enheten,
// slik at appen virker selv uten internett.
//
// Appens egne filer: vi prøver nettet først (så du alltid får nyeste
// versjon), og bruker den lagrede kopien hvis det ikke er nett.
// Firebase-filene (fra gstatic.com) endres aldri for en gitt versjon,
// så de hentes fra den lagrede kopien først.
//
// Prosjektene dine lagres IKKE her – det gjør Firebase selv.
// =========================================================

// Øk dette tallet hvis du legger til eller fjerner filer i listen under.
const CACHE_NAVN = 'strikkeapp-v15';

// Filene appen trenger for å starte uten nett
const FILER = [
  './',
  './index.html',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './css/grunn.css',
  './css/knapper.css',
  './css/prosjekter.css',
  './css/teller.css',
  './css/skjema.css',
  './css/logg-inn.css',
  './js/main.js',
  './js/konstanter.js',
  './js/hjelpere.js',
  './js/tilstand.js',
  './js/data/firebase-config.js',
  './js/data/firebase.js',
  './js/data/lokal.js',
  './js/data/filer.js',
  './js/data/prosjekter.js',
  './js/ui/dialog.js',
  './js/ui/navigasjon.js',
  './js/ui/valg.js',
  './js/ui/rader.js',
  './js/ui/navnefelt.js',
  './js/ui/bilder.js',
  './js/ui/prosjektrad.js',
  './js/skjermer/hjem.js',
  './js/skjermer/prosjekter.js',
  './js/skjermer/nytt.js',
  './js/skjermer/teller.js',
  './js/skjermer/ferdig.js',
  './js/skjermer/detaljer.js',
  './js/skjermer/monster.js',
  './js/skjermer/logg-inn.js',
];

// Hvor lenge vi venter på nettet før vi bruker den lagrede kopien
const NETT_TIDSFRIST = 3000; // millisekunder

// 1) INSTALL: kjøres første gang. Vi laster ned og lagrer alle filene.
self.addEventListener('install', (hendelse) => {
  hendelse.waitUntil(caches.open(CACHE_NAVN).then((cache) => cache.addAll(FILER)));
  self.skipWaiting(); // ta i bruk den nye versjonen med en gang
});

// 2) ACTIVATE: rydder bort gamle cacher fra tidligere versjoner.
self.addEventListener('activate', (hendelse) => {
  hendelse.waitUntil(
    caches.keys().then((navn) =>
      Promise.all(navn.filter((n) => n !== CACHE_NAVN).map((n) => caches.delete(n)))
    )
  );
  self.clients.claim();
});

// 3) FETCH: hver gang appen ber om en fil.
self.addEventListener('fetch', (hendelse) => {
  const foresporsel = hendelse.request;
  if (foresporsel.method !== 'GET') return;
  const url = new URL(foresporsel.url);

  if (url.origin === self.location.origin) {
    hendelse.respondWith(nettForst(foresporsel));
  } else if (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) {
    hendelse.respondWith(lagretForst(foresporsel));
  }
  // Alt annet (f.eks. Firebase sin database) går rett til nettet
});

// Prøv nettet først. Er det tregt eller borte, bruk den lagrede kopien.
async function nettForst(foresporsel) {
  const cache = await caches.open(CACHE_NAVN);

  const fraNett = fetch(foresporsel).then((svar) => {
    if (svar.ok) cache.put(foresporsel, svar.clone());
    return svar;
  });
  fraNett.catch(() => {}); // unngå feilmelding i konsollen hvis vi ikke trenger svaret

  const tidsfrist = new Promise((ok) => setTimeout(ok, NETT_TIDSFRIST));
  const lagret = () =>
    cache.match(foresporsel, { ignoreSearch: true }).then(
      // Når appen åpnes (f.eks. ".../Strikkeapp/"), bruk den lagrede forsiden
      (svar) => svar || (foresporsel.mode === 'navigate' ? cache.match('./') : undefined)
    );

  try {
    // Den som er raskest av nettet og tidsfristen vinner
    const svar = await Promise.race([fraNett, tidsfrist]);
    if (svar) return svar;
    // Tidsfristen gikk ut: bruk lagret kopi hvis vi har en, ellers vent på nettet
    return (await lagret()) || (await fraNett);
  } catch {
    // Ingen nett
    const svar = await lagret();
    if (svar) return svar;
    throw new Error('Ikke på nett, og filen er ikke lagret');
  }
}

// Bruk lagret kopi hvis vi har den, ellers hent fra nettet og lagre
async function lagretForst(foresporsel) {
  const cache = await caches.open(CACHE_NAVN);
  const lagret = await cache.match(foresporsel);
  if (lagret) return lagret;
  const svar = await fetch(foresporsel);
  if (svar.ok) cache.put(foresporsel, svar.clone());
  return svar;
}
