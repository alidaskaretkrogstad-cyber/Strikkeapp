// =========================================================
// DETALJER (informasjon om et prosjekt)
// =========================================================
import { $, krympBilde, lagNettlenke, stjerner } from '../hjelpere.js';
import { TEKNIKK_NAVN, VANSKELIGHET_NAVN, TEKST_FELT } from '../konstanter.js';
import { tilstand, aapentProsjekt, statusTekst, typeTekst } from '../tilstand.js';
import { lagreEndring, slettProsjekt } from '../data/prosjekter.js';
import { lagreFil, slettFil } from '../data/filer.js';
import { registrerSkjerm, naviger, tilbake, gaTilHovedskjerm } from '../ui/navigasjon.js';
import { settValg, lesValg } from '../ui/valg.js';
import { fyllRader, lesRader, raderSomTekst } from '../ui/rader.js';
import { visBildeI } from '../ui/bilder.js';
import { bekreft, visMelding } from '../ui/dialog.js';

const hovedHandling = $('hoved-handling');
const detaljerBilde = $('detaljer-bilde');
const infoKort = $('info-kort');
const redigerSkjema = $('rediger-skjema');

function visDetaljer() {
  const prosjekt = aapentProsjekt();
  $('detaljer-tittel').textContent = prosjekt.navn;
  $('detaljer-status').textContent = statusTekst(prosjekt);

  // Hovedknappen: "Start project" for To knit, "Open counters" for In progress.
  // Ferdige prosjekter har ingen hovedknapp.
  $('handling-kort').hidden = prosjekt.status === 'ferdig';
  hovedHandling.textContent = prosjekt.status === 'vil' ? '▶ Start project' : '🔢 Open counters';

  // Prosjektbilde
  if (prosjekt.harBilde) {
    visBildeI(detaljerBilde, prosjekt);
  } else {
    detaljerBilde.hidden = true;
    detaljerBilde.removeAttribute('src');
  }
  $('bilde-knapp').textContent = prosjekt.harBilde ? '📷 Change photo' : '📷 Add photo';
  $('fjern-bilde-knapp').hidden = !prosjekt.harBilde;

  visVurdering(prosjekt);
  visInfo(prosjekt);

  // Skjul redigeringsskjemaet hver gang siden tegnes på nytt
  redigerSkjema.hidden = true;
  infoKort.hidden = false;
}

registrerSkjerm('detaljer', visDetaljer);

// Er redigeringsskjemaet åpent? (da skal ikke siden tegnes på nytt)
export function redigererDetaljer() {
  return !redigerSkjema.hidden;
}

// Fyller en <dl>-liste med [overskrift, verdi]-par (tomme verdier hoppes over).
// Returnerer hvor mange linjer som ble vist.
function fyllListe(dl, linjer) {
  dl.innerHTML = '';
  const utfylt = linjer.filter(([, verdi]) => verdi);
  for (const [overskrift, verdi] of utfylt) {
    const dt = document.createElement('dt');
    dt.textContent = overskrift;
    const dd = document.createElement('dd');
    dd.textContent = verdi;
    dl.append(dt, dd);
  }
  return utfylt.length;
}

// Vurderingen fra ferdig-siden
function visVurdering(prosjekt) {
  const kort = $('vurdering-kort');
  if (prosjekt.status !== 'ferdig') {
    kort.hidden = true;
    return;
  }
  // Prosjekter som ble ferdige i en eldre versjon av appen har ingen vurdering ennå
  const f = prosjekt.ferdig || {};
  $('rediger-vurdering-knapp').textContent = prosjekt.ferdig ? '✏️ Edit review' : '✏️ Add review';
  fyllListe($('vurdering-liste'), [
    ['Finished', f.dato ? new Date(f.dato).toLocaleDateString('en-GB') : ''],
    ['Enjoyed it', f.likte ? stjerner(f.likte) : ''],
    ['Result', f.resultat],
    ['How it went', f.prosess],
    ['Difficulty', VANSKELIGHET_NAVN[f.vanskelighet]],
  ]);
  kort.hidden = false;
}

// Viser informasjonen som er fylt ut
function visInfo(prosjekt) {
  const antall = fyllListe($('detaljer-liste'), [
    ['Craft', TEKNIKK_NAVN[prosjekt.teknikk]],
    ['Type', typeTekst(prosjekt)],
    ['Designer', prosjekt.designer],
    ['Difficulty', VANSKELIGHET_NAVN[prosjekt.vanskelighet]],
    ['Yarn', raderSomTekst(prosjekt.garn)],
    [prosjekt.teknikk === 'hekling' ? 'Hooks' : 'Needles', raderSomTekst(prosjekt.pinner)],
    ['Size', prosjekt.storrelse],
    ['Notes', prosjekt.notater],
  ]);
  $('ingen-detaljer').hidden = antall > 0;
}

// "Edit review": åpne ferdig-siden med vurderingen fylt ut
$('rediger-vurdering-knapp').addEventListener('click', () => {
  naviger({ skjerm: 'ferdig', id: tilstand.gjeldende.id, endre: true });
});

// Til oppskriften
$('detaljer-monster-knapp').addEventListener('click', () => {
  naviger({ skjerm: 'monster', id: tilstand.gjeldende.id });
});

// Hovedknappen: Start project / Open counters
hovedHandling.addEventListener('click', () => {
  const prosjekt = aapentProsjekt();

  if (prosjekt.status === 'vil') {
    // Start prosjektet: flytt til "In progress" og åpne tellerne.
    // Detaljsiden byttes ut, så "Back" fra tellerne går til listen.
    prosjekt.status = 'pagar';
    prosjekt.pause = false;
    tilstand.valgtFane = 'pagar';
    lagreEndring(prosjekt);
    naviger({ skjerm: 'teller', id: prosjekt.id }, true);
  } else if (tilstand.gjeldende.fra === 'teller') {
    // Vi kom fra tellerne, så vi går bare tilbake dit
    tilbake();
  } else {
    naviger({ skjerm: 'teller', id: prosjekt.id }, true);
  }
});

// --- Redigere informasjon ---
$('rediger-knapp').addEventListener('click', () => {
  const prosjekt = aapentProsjekt();
  // Fyll skjemaet med det som er lagret nå
  $('rediger-navn').value = prosjekt.navn;
  $('rediger-lenke').value = prosjekt.lenke || '';
  for (const felt of TEKST_FELT) {
    $(`rediger-${felt}`).value = prosjekt[felt] || '';
  }
  settValg($('rediger-vanskelighet'), prosjekt.vanskelighet);
  settValg($('rediger-teknikk'), prosjekt.teknikk);
  $('rediger-type-annet').value = prosjekt.typeAnnet || '';
  settValg($('rediger-type'), prosjekt.type);
  fyllRader($('rediger-garn'), prosjekt.garn);
  fyllRader($('rediger-pinner'), prosjekt.pinner);

  infoKort.hidden = true;
  redigerSkjema.hidden = false;
  redigerSkjema.scrollIntoView({ behavior: 'smooth' });
});

$('avbryt-rediger-knapp').addEventListener('click', () => {
  redigerSkjema.hidden = true;
  infoKort.hidden = false;
});

redigerSkjema.addEventListener('submit', (hendelse) => {
  hendelse.preventDefault();
  const prosjekt = aapentProsjekt();

  const navn = $('rediger-navn').value.trim();
  if (navn) prosjekt.navn = navn;
  prosjekt.lenke = lagNettlenke($('rediger-lenke').value);
  for (const felt of TEKST_FELT) {
    prosjekt[felt] = $(`rediger-${felt}`).value.trim();
  }
  prosjekt.vanskelighet = lesValg($('rediger-vanskelighet'));
  prosjekt.teknikk = lesValg($('rediger-teknikk')) || 'strikking';
  prosjekt.type = lesValg($('rediger-type'));
  prosjekt.typeAnnet = $('rediger-type-annet').value.trim();
  prosjekt.garn = lesRader($('rediger-garn'));
  prosjekt.pinner = lesRader($('rediger-pinner'));

  lagreEndring(prosjekt);
  visDetaljer();
});

// --- Prosjektbilde ---
$('bilde-input').addEventListener('change', async (hendelse) => {
  const input = hendelse.target;
  const fil = input.files[0];
  if (!fil) return;
  const prosjekt = aapentProsjekt();

  try {
    const versjon = Date.now();
    await lagreFil('bilde', prosjekt.id, await krympBilde(fil), versjon);
    prosjekt.harBilde = true;
    prosjekt.bildeVersjon = versjon;
    lagreEndring(prosjekt);
    visDetaljer();
  } catch (feil) {
    console.error(feil);
    await visMelding('The photo could not be saved.');
  } finally {
    input.value = '';
  }
});

$('fjern-bilde-knapp').addEventListener('click', async () => {
  if (!(await bekreft('Remove the photo?', 'Remove'))) return;
  const prosjekt = aapentProsjekt();
  slettFil('bilde', prosjekt.id);
  prosjekt.harBilde = false;
  delete prosjekt.bildeVersjon;
  lagreEndring(prosjekt);
  visDetaljer();
});

// --- Slette prosjekt ---
$('slett-knapp').addEventListener('click', async () => {
  const prosjekt = aapentProsjekt();
  if (!(await bekreft(`Delete "${prosjekt.navn}"? This cannot be undone.`, 'Delete'))) return;
  slettProsjekt(prosjekt);
  gaTilHovedskjerm({ skjerm: 'prosjekter' });
});
