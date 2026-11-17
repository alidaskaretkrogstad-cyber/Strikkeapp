// =========================================================
import { t } from '../sprak.js';
// PDF-VISNING
// Tegner sidene i en PDF rett inn på siden, én under den andre.
// Bruker pdf.js (fra Mozilla), som lastes ned første gang en PDF vises.
// Service workeren tar vare på en kopi, så det virker uten nett etterpå.
// =========================================================

// "legacy"-utgaven virker også på litt eldre telefoner
const PDFJS = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/legacy/build/pdf.min.mjs';
const PDFJS_WORKER = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/legacy/build/pdf.worker.min.mjs';

let pdfjsLaster = null;

function hentPdfjs() {
  if (!pdfjsLaster) {
    pdfjsLaster = import(PDFJS).then((pdfjs) => {
      pdfjs.GlobalWorkerOptions.workerSrc = PDFJS_WORKER;
      return pdfjs;
    });
    // Prøv på nytt neste gang hvis nedlastingen feilet (f.eks. uten nett)
    pdfjsLaster.catch(() => (pdfjsLaster = null));
  }
  return pdfjsLaster;
}

// Tegner PDF-en (en Blob) inn i "beholder".
// erAvbrutt() sjekkes underveis: blir den true (man har gått til en annen
// side), slutter vi å tegne.
// Hver side gjøres om til et bilde (<img>). Bilder bruker mye mindre minne
// enn å ha mange store tegneflater, så store oppskrifter går fint på telefonen.
export async function visPdf(blob, beholder, erAvbrutt) {
  const pdfjs = await hentPdfjs();
  const data = new Uint8Array(await blob.arrayBuffer());
  const dokument = await pdfjs.getDocument({ data }).promise;

  try {
    // Tegn med ekstra oppløsning, så teksten er skarp når man zoomer inn
    // (er siden skjult akkurat nå, bruker vi skjermbredden i stedet)
    const bredde = beholder.clientWidth || Math.min(window.innerWidth, 560) - 32;
    const skarphet = Math.min((window.devicePixelRatio || 1) * 1.5, 4);
    const lerret = document.createElement('canvas');

    for (let nr = 1; nr <= dokument.numPages; nr++) {
      if (erAvbrutt()) return;
      const side = await dokument.getPage(nr);
      const original = side.getViewport({ scale: 1 });
      const visning = side.getViewport({ scale: (bredde / original.width) * skarphet });

      lerret.width = Math.floor(visning.width);
      lerret.height = Math.floor(visning.height);
      const ctx = lerret.getContext('2d');
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, lerret.width, lerret.height);
      await side.render({ canvasContext: ctx, viewport: visning }).promise;
      side.cleanup();

      const bildeBlob = await new Promise((ok) => lerret.toBlob(ok, 'image/jpeg', 0.92));
      if (erAvbrutt()) return;

      const img = document.createElement('img');
      img.className = 'oppskrift-side';
      img.alt = t('Page {nr} of {antall}', { nr, antall: dokument.numPages });
      img.src = URL.createObjectURL(bildeBlob);
      beholder.append(img);
    }
  } finally {
    dokument.destroy();
  }
}

// Fjerner sidene og frigjør minnet de brukte
export function tomPdf(beholder) {
  beholder.querySelectorAll('img').forEach((img) => URL.revokeObjectURL(img.src));
  beholder.innerHTML = '';
}
