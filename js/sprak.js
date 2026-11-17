// =========================================================
// SPRÅK (engelsk / norsk)
// All tekst i appen er skrevet på engelsk. Når norsk er valgt, byttes
// teksten ut med oversettelsen fra js/oversettelser.js.
//
//  - Tekst i index.html oversettes automatisk av oversettSide().
//  - Tekst som lages i JavaScript, skrives som t('Engelsk tekst').
//    Med verdier: t('Delete "{navn}"?', { navn: prosjekt.navn })
//
// Vil du endre en norsk tekst, gjør du det i js/oversettelser.js.
// =========================================================
import { NORSK } from './oversettelser.js';
import { innstillinger } from './innstillinger.js';

// Hvilket språk som er valgt nå: 'en' eller 'no'
export function sprak() {
  return innstillinger.sprak === 'no' ? 'no' : 'en';
}

// Datoformat for valgt språk (brukes med toLocaleDateString)
export function datoSprak() {
  return sprak() === 'no' ? 'nb-NO' : 'en-GB';
}

// Oversetter én tekst. {navn} i teksten byttes ut med verdier.navn osv.
export function t(engelsk, verdier = {}) {
  let tekst = (sprak() === 'no' && NORSK[engelsk]) || engelsk;
  for (const [nokkel, verdi] of Object.entries(verdier)) {
    tekst = tekst.replaceAll(`{${nokkel}}`, verdi);
  }
  return tekst;
}

// Entall eller flertall: flertall(3, '{n} project', '{n} projects') → "3 projects"
export function flertall(antall, entall, flere) {
  return t(antall === 1 ? entall : flere, { n: antall });
}

// ---------------------------------------------------------
// OVERSETTE TEKSTEN I index.html
// Den engelske originalen huskes, så man kan bytte tilbake.
// ---------------------------------------------------------
const ORIGINAL_TEKST = new WeakMap(); // tekstbit → engelsk tekst
const ORIGINAL_ATTR = new WeakMap(); // element → { attributt: engelsk tekst }
const ATTRIBUTTER = ['placeholder', 'aria-label', 'alt', 'data-tekst-strikk', 'data-tekst-hekl'];

export function oversettSide() {
  document.documentElement.lang = sprak() === 'no' ? 'no' : 'en';

  // Vanlig tekst
  const vandrer = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  for (let node = vandrer.nextNode(); node; node = vandrer.nextNode()) {
    if (node.parentElement.closest('script, style')) continue;
    const engelsk = ORIGINAL_TEKST.get(node) ?? node.nodeValue;
    const renset = engelsk.trim();
    if (!renset || !(renset in NORSK)) continue;
    ORIGINAL_TEKST.set(node, engelsk);
    node.nodeValue = engelsk.replace(renset, t(renset));
  }

  // Hjelpetekster i felt, knappenavn for skjermlesere osv.
  for (const element of document.body.querySelectorAll('*')) {
    for (const attributt of ATTRIBUTTER) {
      if (!element.hasAttribute(attributt)) continue;
      const lagret = ORIGINAL_ATTR.get(element) || {};
      const engelsk = lagret[attributt] ?? element.getAttribute(attributt);
      if (!(engelsk in NORSK)) continue;
      lagret[attributt] = engelsk;
      ORIGINAL_ATTR.set(element, lagret);
      element.setAttribute(attributt, t(engelsk));
    }
  }
}
