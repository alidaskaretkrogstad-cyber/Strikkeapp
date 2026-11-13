// =========================================================
// OPPSKRIFT-SIDEN (pattern)
// Viser oppskriftsfilen (PDF eller bilde) og/eller lenken til oppskriften.
// =========================================================
import { $ } from '../hjelpere.js';
import { tilstand, aapentProsjekt } from '../tilstand.js';
import { lagreEndring } from '../data/prosjekter.js';
import { lagreFil, hentFil, slettFil } from '../data/filer.js';
import { registrerSkjerm } from '../ui/navigasjon.js';
import { bekreft, visMelding } from '../ui/dialog.js';

const oppskriftBilde = $('oppskrift-bilde');
const filLenke = $('oppskrift-fil-lenke');
const nettLenke = $('oppskrift-nett-lenke');
const ingenOppskrift = $('ingen-oppskrift');
const INGEN_TEKST = ingenOppskrift.textContent; // standardteksten fra index.html
let oppskriftUrl = null; // midlertidig adresse til oppskriftsfilen som vises

function visMonster() {
  const prosjekt = aapentProsjekt();
  $('monster-prosjektnavn').textContent = prosjekt.navn;
  visOppskrift(prosjekt);
}

registrerSkjerm('monster', visMonster);

// Viser oppskriftsfil og/eller lenke
function visOppskrift(prosjekt) {
  // Frigjør adressen til en tidligere vist fil
  if (oppskriftUrl) URL.revokeObjectURL(oppskriftUrl);
  oppskriftUrl = null;
  oppskriftBilde.hidden = true;
  filLenke.hidden = true;

  // Lenke til oppskrift på nett
  nettLenke.hidden = !prosjekt.lenke;
  if (prosjekt.lenke) nettLenke.href = prosjekt.lenke;

  const fil = prosjekt.oppskriftFil;
  ingenOppskrift.textContent = INGEN_TEKST;
  ingenOppskrift.hidden = Boolean(fil) || Boolean(prosjekt.lenke);
  $('oppskrift-knapp').textContent = fil ? '📎 Change pattern file' : '📎 Add pattern (PDF or image)';
  $('fjern-oppskrift-knapp').hidden = !fil;
  $('oppskrift-laster').hidden = !fil;

  if (!fil) return;

  // Hent filen (fra enheten, eller fra skyen hvis den ikke er her ennå)
  hentFil('oppskrift', prosjekt.id, fil.versjon)
    .then((blob) => {
      // Sjekk at vi fortsatt ser på samme prosjekt (hentingen tar litt tid)
      if (tilstand.gjeldende.id !== prosjekt.id) return;
      $('oppskrift-laster').hidden = true;
      if (!blob) {
        ingenOppskrift.hidden = false;
        ingenOppskrift.textContent =
          'The pattern file could not be loaded. Check your internet connection and try again.';
        return;
      }
      oppskriftUrl = URL.createObjectURL(blob);

      // Lenke som åpner filen (PDF åpnes i telefonens PDF-visning)
      filLenke.href = oppskriftUrl;
      filLenke.textContent = `📄 Open ${fil.navn}`;
      filLenke.hidden = false;

      // Er oppskriften et bilde, vises den også direkte på siden
      if (fil.type.startsWith('image/')) {
        oppskriftBilde.src = oppskriftUrl;
        oppskriftBilde.hidden = false;
      }
    })
    .catch((feil) => console.error('Kunne ikke hente oppskrift:', feil));
}

// --- Laste opp / bytte oppskriftsfil ---
$('oppskrift-input').addEventListener('change', async (hendelse) => {
  const input = hendelse.target;
  const fil = input.files[0];
  if (!fil) return;
  const prosjekt = aapentProsjekt();

  try {
    // Oppskriften lagres som den er (ikke krympet), så teksten er lett å lese
    const versjon = Date.now();
    await lagreFil('oppskrift', prosjekt.id, fil, versjon);
    prosjekt.oppskriftFil = { navn: fil.name, type: fil.type, versjon };
    lagreEndring(prosjekt);
    visOppskrift(prosjekt);
  } catch (feil) {
    console.error(feil);
    await visMelding('The pattern could not be saved.');
  } finally {
    input.value = ''; // så man kan velge samme fil igjen senere
  }
});

$('fjern-oppskrift-knapp').addEventListener('click', async () => {
  if (!(await bekreft('Remove the pattern file?', 'Remove'))) return;
  const prosjekt = aapentProsjekt();
  slettFil('oppskrift', prosjekt.id);
  delete prosjekt.oppskriftFil;
  lagreEndring(prosjekt);
  visOppskrift(prosjekt);
});
