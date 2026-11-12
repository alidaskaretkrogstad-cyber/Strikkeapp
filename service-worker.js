// =========================================================
// SERVICE WORKER
// Kjører i bakgrunnen og lagrer (cacher) appens filer på telefonen,
// slik at appen virker selv uten internett.
// =========================================================

// VIKTIG: Øk versjonsnummeret hver gang du endrer en fil og legger ut
// appen på nytt. Da henter telefonen de nye filene.
const CACHE_NAVN = 'strikkeapp-v12';

// Filene appen trenger for å fungere offline
const FILER = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// 1) INSTALL: kjøres første gang. Vi laster ned og lagrer alle filene.
self.addEventListener('install', (hendelse) => {
  hendelse.waitUntil(
    caches.open(CACHE_NAVN).then((cache) => cache.addAll(FILER))
  );
  self.skipWaiting(); // ta i bruk den nye versjonen med en gang
});

// 2) ACTIVATE: rydder bort gamle cacher fra tidligere versjoner.
self.addEventListener('activate', (hendelse) => {
  hendelse.waitUntil(
    caches.keys().then((navn) =>
      Promise.all(
        navn
          .filter((n) => n !== CACHE_NAVN)
          .map((n) => caches.delete(n))
      )
    )
  );
  self.clients.claim();
});

// 3) FETCH: hver gang appen ber om en fil.
// Vi prøver cachen først (raskt + offline), og går til nettet bare hvis filen mangler.
self.addEventListener('fetch', (hendelse) => {
  if (hendelse.request.method !== 'GET') return;

  hendelse.respondWith(
    caches.match(hendelse.request).then((svar) => svar || fetch(hendelse.request))
  );
});
