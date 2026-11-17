// =========================================================
// PÅMINNELSER OM GJENTAKELSER
// F.eks. "Increase every 6th row, 8 times". Når telleren kommer til en
// slik rad, kommer det et varsel (og telefonen vibrerer).
//
// Hver påminnelse lagres i prosjekt.paminnelser:
//   { id, tellerId, tekst, hver, fra, ganger }
//   hver:   hvor mange rader mellom hver gang (6)
//   fra:    raden man teller fra (0 = første gang på rad 6)
//   ganger: hvor mange ganger i alt (0 = uendelig)
// =========================================================
import { $, lagId } from '../hjelpere.js';
import { aapentProsjekt, hovedTeller } from '../tilstand.js';
import { lagreEndring } from '../data/prosjekter.js';
import { bekreft } from './dialog.js';
import { t } from '../sprak.js';

const skjema = $('paminnelse-skjema');
const nyKnapp = $('ny-paminnelse-knapp');

// --- Regnestykkene ---

// Slår påminnelsen til på denne raden?
function slarTil(p, verdi) {
  const avstand = verdi - p.fra;
  if (avstand <= 0 || avstand % p.hver !== 0) return false;
  return !p.ganger || avstand / p.hver <= p.ganger;
}

// Neste rad (etter "verdi") der påminnelsen slår til, eller null hvis ferdig
function nesteRad(p, verdi) {
  const gang = verdi < p.fra ? 1 : Math.floor((verdi - p.fra) / p.hver) + 1;
  if (p.ganger && gang > p.ganger) return null;
  return p.fra + gang * p.hver;
}

// Hvor mange ganger den allerede har slått til
function antallGjort(p, verdi) {
  const gjort = Math.floor(Math.max(0, verdi - p.fra) / p.hver);
  return p.ganger ? Math.min(gjort, p.ganger) : gjort;
}

function paminnelserFor(prosjekt, teller) {
  return (prosjekt.paminnelser || []).filter((p) => p.tellerId === teller.id);
}

// --- Under den store telleren: "🔔 Increase" og "Next: ... at row 24" ---
export function visPaminnelseStatus(prosjekt) {
  const teller = hovedTeller(prosjekt);
  const liste = teller ? paminnelserFor(prosjekt, teller) : [];

  const na = liste.filter((p) => slarTil(p, teller.verdi));
  $('paminnelse-na').textContent = na.map((p) => `🔔 ${p.tekst}`).join('\n');
  $('paminnelse-na').hidden = na.length === 0;

  // Den påminnelsen som kommer først
  const neste = liste
    .map((p) => ({ p, rad: nesteRad(p, teller.verdi) }))
    .filter((n) => n.rad !== null)
    .sort((a, b) => a.rad - b.rad)[0];
  $('paminnelse-neste').textContent = neste
    ? t('Next: {tekst} ({teller} {rad})', { tekst: neste.p.tekst, teller: teller.navn, rad: neste.rad })
    : '';
  $('paminnelse-neste').hidden = !neste;
}

// --- Varsel når en teller går opp ---
// Kalles hver gang man trykker +. Gir et varsel hvis en påminnelse slår til.
export function sjekkPaminnelser(prosjekt, teller) {
  const treff = paminnelserFor(prosjekt, teller).filter((p) => slarTil(p, teller.verdi));
  if (treff.length === 0) return;

  if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  visVarsel(`🔔 ${teller.navn} ${teller.verdi}: ${treff.map((p) => p.tekst).join(', ')}`);
}

let varselTid = null;
export function visVarsel(tekst) {
  const varsel = $('varsel');
  varsel.textContent = tekst;
  varsel.hidden = false;
  varsel.classList.remove('vises');
  void varsel.offsetWidth; // start animasjonen på nytt
  varsel.classList.add('vises');
  clearTimeout(varselTid);
  varselTid = setTimeout(() => (varsel.hidden = true), 5000);
}

// Trykk på varselet for å fjerne det
$('varsel').addEventListener('click', () => ($('varsel').hidden = true));

// --- Listen med påminnelser (kortet "Reminders") ---
export function visPaminnelseListe(prosjekt) {
  const liste = $('paminnelse-liste');
  liste.innerHTML = '';
  const alle = prosjekt.paminnelser || [];
  const flereTellere = prosjekt.tellere.length > 1;

  for (const p of alle) {
    const teller = prosjekt.tellere.find((tl) => tl.id === p.tellerId);
    const li = document.createElement('li');
    li.className = 'paminnelse-rad';

    const tekst = document.createElement('div');
    tekst.className = 'paminnelse-tekst';
    const tittel = document.createElement('strong');
    tittel.textContent = p.tekst;

    // "Every 6 rows, from row 0 · 8 times"
    const regel = document.createElement('span');
    regel.className = 'dempet-tekst';
    let regelTekst = t('Every {hver} rows, from row {fra}', { hver: p.hver, fra: p.fra });
    if (p.ganger) regelTekst += ' · ' + t('{n} times', { n: p.ganger });
    if (flereTellere && teller) regelTekst += ` · ${teller.navn}`;
    regel.textContent = regelTekst;

    // "Next: 24 · 3 of 8 done" eller "Done ✓"
    const status = document.createElement('span');
    status.className = 'paminnelse-status';
    if (!teller) {
      status.textContent = t('The counter was removed');
    } else {
      const neste = nesteRad(p, teller.verdi);
      const gjort = antallGjort(p, teller.verdi);
      if (neste === null) status.textContent = t('Done ✓');
      else {
        status.textContent = t('Next: {rad}', { rad: neste });
        if (p.ganger) status.textContent += ' · ' + t('{gjort} of {ganger} done', { gjort, ganger: p.ganger });
      }
    }

    tekst.append(tittel, regel, status);

    const fjern = document.createElement('button');
    fjern.type = 'button';
    fjern.className = 'fjern-rad';
    fjern.textContent = '×';
    fjern.setAttribute('aria-label', t('Remove reminder'));
    fjern.addEventListener('click', () => fjernPaminnelse(p.id));

    li.append(tekst, fjern);
    liste.append(li);
  }

  $('ingen-paminnelser').hidden = alle.length > 0;
}

async function fjernPaminnelse(id) {
  const prosjekt = aapentProsjekt();
  const p = (prosjekt.paminnelser || []).find((x) => x.id === id);
  if (!p) return;
  if (!(await bekreft(t('Remove the reminder "{tekst}"?', { tekst: p.tekst }), t('Remove')))) return;
  prosjekt.paminnelser = prosjekt.paminnelser.filter((x) => x.id !== id);
  lagreEndring(prosjekt);
  oppdaterAlt(prosjekt);
}

function oppdaterAlt(prosjekt) {
  visPaminnelseListe(prosjekt);
  visPaminnelseStatus(prosjekt);
}

// Når en teller fjernes, fjernes påminnelsene som hørte til den
export function fjernPaminnelserFor(prosjekt, tellerId) {
  if (!prosjekt.paminnelser) return;
  prosjekt.paminnelser = prosjekt.paminnelser.filter((p) => p.tellerId !== tellerId);
}

// Skjuler skjemaet (f.eks. når man åpner et annet prosjekt)
export function lukkPaminnelseSkjema() {
  skjema.hidden = true;
  nyKnapp.hidden = false;
}

// --- Legge til en påminnelse ---
nyKnapp.addEventListener('click', () => {
  const prosjekt = aapentProsjekt();
  const stor = hovedTeller(prosjekt);
  skjema.reset();

  // Velg teller (bare vist hvis det finnes flere)
  const velger = $('paminnelse-teller');
  velger.innerHTML = '';
  for (const teller of prosjekt.tellere) {
    const valg = document.createElement('option');
    valg.value = teller.id;
    valg.textContent = teller.navn;
    velger.append(valg);
  }
  if (stor) velger.value = stor.id;
  $('paminnelse-teller-felt').hidden = prosjekt.tellere.length < 2;

  // Start å telle fra der telleren står nå
  $('paminnelse-fra').value = stor ? stor.verdi : 0;

  nyKnapp.hidden = true;
  skjema.hidden = false;
  $('paminnelse-tekst').focus();
});

// Bytter man teller i skjemaet, settes "From row" til den tellerens verdi
$('paminnelse-teller').addEventListener('change', () => {
  const teller = aapentProsjekt().tellere.find((tl) => tl.id === $('paminnelse-teller').value);
  if (teller) $('paminnelse-fra').value = teller.verdi;
});

$('avbryt-paminnelse').addEventListener('click', lukkPaminnelseSkjema);

skjema.addEventListener('submit', (hendelse) => {
  hendelse.preventDefault();
  const prosjekt = aapentProsjekt();
  const ny = {
    id: lagId(),
    tellerId: $('paminnelse-teller').value || hovedTeller(prosjekt).id,
    tekst: $('paminnelse-tekst').value.trim(),
    hver: Math.max(1, parseInt($('paminnelse-hver').value, 10) || 1),
    fra: Math.max(0, parseInt($('paminnelse-fra').value, 10) || 0),
    ganger: Math.max(0, parseInt($('paminnelse-ganger').value, 10) || 0),
  };
  if (!ny.tekst) return;

  prosjekt.paminnelser = [...(prosjekt.paminnelser || []), ny];
  lagreEndring(prosjekt);
  lukkPaminnelseSkjema();
  oppdaterAlt(prosjekt);
});
