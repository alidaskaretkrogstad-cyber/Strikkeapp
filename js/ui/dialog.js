// =========================================================
// DIALOGBOKS
// Appens egen erstatning for confirm og alert (de virker ikke i alle
// nettlesere, f.eks. forhåndsvisningen i VS Code).
// =========================================================
import { $ } from '../hjelpere.js';

const dialog = $('dialog');

// Spør brukeren et ja/nei-spørsmål. Gir true hvis man trykker ja-knappen.
// Bruk med await:  if (!(await bekreft('Delete?', 'Delete'))) return;
export function bekreft(tekst, jaTekst = 'OK', visAvbryt = true) {
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
export function visMelding(tekst) {
  return bekreft(tekst, 'OK', false);
}
