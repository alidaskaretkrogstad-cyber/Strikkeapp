// =========================================================
// VALGKNAPPER
// En .valg-gruppe er en rad med knapper der bare én kan være valgt.
// Valgt verdi lagres i gruppa som data-verdi.
// Samme system brukes for:
//  - vanskelighetsgrad (Easy / Medium / Hard)
//  - typeknappene (Sweater, Hat, ... Other)
//  - stjernene (1–5) på ferdig-siden
//  - Knitting / Crochet
// =========================================================
import { TYPE_NAVN, TYPE_IKON } from '../konstanter.js';

export function settValg(gruppe, verdi) {
  verdi = verdi || '';
  gruppe.dataset.verdi = verdi;

  gruppe.querySelectorAll('button').forEach((knapp) => {
    if (gruppe.classList.contains('stjerner')) {
      // Stjerner: alle stjernene opp til den valgte lyser
      knapp.classList.toggle('aktiv', Number(knapp.dataset.verdi) <= Number(verdi));
    } else {
      knapp.classList.toggle('aktiv', knapp.dataset.verdi === verdi);
    }
  });

  // Typeknappene: vis tekstfeltet når "Other" er valgt
  const annetFelt = document.getElementById(`${gruppe.id}-annet`);
  if (annetFelt) annetFelt.hidden = verdi !== 'annet';

  // Knitting/Crochet: bytt "Needles" ↔ "Hooks" i samme skjema
  if (gruppe.classList.contains('teknikk-valg')) {
    const skjema = gruppe.closest('form');
    skjema.querySelectorAll('[data-tekst-hekl]').forEach((element) => {
      element.textContent =
        verdi === 'hekling' ? element.dataset.tekstHekl : element.dataset.tekstStrikk;
    });
  }
}

export function lesValg(gruppe) {
  return gruppe.dataset.verdi || '';
}

// Fyll typeknappene (Sweater, Hat, ...) fra listen TYPE_NAVN
document.querySelectorAll('.valg-gruppe.chips').forEach((gruppe) => {
  for (const [verdi, navn] of Object.entries(TYPE_NAVN)) {
    const knapp = document.createElement('button');
    knapp.type = 'button';
    knapp.dataset.verdi = verdi;
    const ikon = document.createElement('span');
    ikon.className = 'chip-ikon';
    ikon.setAttribute('aria-hidden', 'true');
    ikon.textContent = TYPE_IKON[verdi] || '';
    knapp.append(ikon, navn);
    gruppe.append(knapp);
  }
});

// Trykk på en knapp i en gruppe
document.querySelectorAll('.valg-gruppe, .stjerner').forEach((gruppe) => {
  gruppe.querySelectorAll('button').forEach((knapp) => {
    knapp.addEventListener('click', () => {
      const valgtFraFor = lesValg(gruppe) === knapp.dataset.verdi;
      // Grupper med data-paakrevd (Knitting/Crochet) må alltid ha et valg
      if (valgtFraFor && 'paakrevd' in gruppe.dataset) return;
      // Ellers: trykker man på den som allerede er valgt, fjernes valget
      settValg(gruppe, valgtFraFor ? '' : knapp.dataset.verdi);
    });
  });
});
