// =========================================================
// HJELPEFUNKSJONER
// Små, generelle funksjoner som brukes mange steder.
// =========================================================

// Kortere skrivemåte for document.getElementById
export const $ = (id) => document.getElementById(id);

// Lager en enkel, unik ID
export function lagId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Gjør et tall 1–5 om til stjerner: 4 → "★★★★☆"
export function stjerner(antall) {
  return '★'.repeat(antall) + '☆'.repeat(5 - antall);
}

// Gjør et tidspunkt om til tekst: "Today, 14:32", "Yesterday, 09:10" eller "3 Nov, 18:05"
export function tidSomTekst(tid) {
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

// Gjør et tidspunkt om til "Just now", "5 min ago", "2 h ago" osv.
export function hvorLengeSiden(tid) {
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

// Gjør det brukeren skrev inn om til en trygg nettlenke
// (bare http/https er lov, og "https://" legges til hvis det mangler).
export function lagNettlenke(tekst) {
  const renset = tekst.trim();
  if (!renset) return '';
  return /^https?:\/\//i.test(renset) ? renset : 'https://' + renset;
}

// Liten vibrasjon som bekreftelse (fungerer på mange Android-telefoner)
export function vibrer() {
  if (navigator.vibrate) navigator.vibrate(15);
}

// Mobilbilder er ofte flere MB. Denne funksjonen krymper bildet
// (lengste side maks 1200 piksler) og lagrer det som JPEG.
export function krympBilde(fil, maks = 1200) {
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
