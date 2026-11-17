// =========================================================
// OPPSKRIFT-SIDEN (pattern)
// Viser oppskriften rett på siden (PDF eller bilde), størrelsen man
// strikker, og lenken til oppskriften på nett.
// =========================================================
import { $ } from '../hjelpere.js';
import { aapentProsjekt } from '../tilstand.js';
import { lagreEndring } from '../data/prosjekter.js';
import { lagreFil, hentFil, slettFil } from '../data/filer.js';
import { registrerSkjerm } from '../ui/navigasjon.js';
import { bekreft, visMelding } from '../ui/dialog.js';
import { visPdf, tomPdf } from '../ui/pdf-visning.js';
import { t } from '../sprak.js';

const visning = $('oppskrift-visning');
const oppskriftBilde = $('oppskrift-bilde');
const sider = $('oppskrift-sider');
const filLenke = $('oppskrift-fil-lenke');
const laster = $('oppskrift-laster');
const ingenOppskrift = $('ingen-oppskrift');
const INGEN_TEKST =
  'No pattern added yet. Add a PDF or a photo of the pattern below, or add a link under Details.';

let oppskriftUrl = null; // midlertidig adresse til oppskriftsfilen som vises
// Hvilken fil som vises nå, f.eks. "abc123/1731840000000". Brukes for å slippe
// å tegne PDF-en på nytt hvis siden bare oppdateres.
let vistFil = null;

function visMonster() {
  const prosjekt = aapentProsjekt();
  $('monster-prosjektnavn').textContent = prosjekt.navn;

  // Størrelsen man strikker
  const storrelse = $('monster-storrelse');
  storrelse.textContent = t('Size: {storrelse}', { storrelse: prosjekt.storrelse });
  storrelse.hidden = !prosjekt.storrelse;

  // Lenke til oppskrift på nett
  $('nett-lenke-kort').hidden = !prosjekt.lenke;
  if (prosjekt.lenke) $('oppskrift-nett-lenke').href = prosjekt.lenke;

  visOppskrift(prosjekt);
}

registrerSkjerm('monster', visMonster);

// Tømmer visningen av oppskriftsfilen
function tomVisning() {
  if (oppskriftUrl) URL.revokeObjectURL(oppskriftUrl);
  oppskriftUrl = null;
  vistFil = null;
  tomPdf(sider);
  oppskriftBilde.hidden = true;
  oppskriftBilde.removeAttribute('src');
  visning.hidden = true;
  filLenke.hidden = true;
}

// Viser oppskriftsfilen (PDF eller bilde)
function visOppskrift(prosjekt) {
  const fil = prosjekt.oppskriftFil;
  $('oppskrift-knapp').textContent = t(fil ? '📎 Change pattern file' : '📎 Add pattern (PDF or image)');
  $('fjern-oppskrift-knapp').hidden = !fil;

  const filNokkel = fil ? `${prosjekt.id}/${fil.versjon}` : null;
  if (filNokkel && filNokkel === vistFil) return; // vises (eller lastes) allerede

  tomVisning();
  ingenOppskrift.textContent = t(INGEN_TEKST);
  ingenOppskrift.hidden = Boolean(fil) || Boolean(prosjekt.lenke);
  laster.hidden = !fil;
  if (!fil) return;

  vistFil = filNokkel;
  // Har man åpnet et annet prosjekts oppskrift, eller byttet fil i mellomtiden?
  const erAvbrutt = () => vistFil !== filNokkel;

  const visFeil = (tekst) => {
    laster.hidden = true;
    ingenOppskrift.textContent = tekst;
    ingenOppskrift.hidden = false;
  };

  // Hent filen (fra enheten, eller fra skyen hvis den ikke er her ennå)
  hentFil('oppskrift', prosjekt.id, fil.versjon)
    .then(async (blob) => {
      if (erAvbrutt()) return;
      if (!blob) {
        vistFil = null; // prøv igjen neste gang siden vises
        visFeil(t('The pattern file could not be loaded. Check your internet connection and try again.'));
        return;
      }
      oppskriftUrl = URL.createObjectURL(blob);

      // Diskret lenke som åpner filen i telefonens egen visning
      filLenke.href = oppskriftUrl;
      filLenke.hidden = false;

      if (fil.type.startsWith('image/')) {
        oppskriftBilde.src = oppskriftUrl;
        oppskriftBilde.hidden = false;
        visning.hidden = false;
        laster.hidden = true;
        return;
      }

      // PDF: tegn sidene rett på siden
      visning.hidden = false;
      try {
        await visPdf(blob, sider, erAvbrutt);
        if (!erAvbrutt()) laster.hidden = true;
      } catch (feil) {
        console.error('Kunne ikke vise PDF:', feil);
        if (erAvbrutt()) return;
        tomPdf(sider);
        visning.hidden = true;
        visFeil(t('The pattern could not be shown here. Tap “Open in another app” below to open it.'));
      }
    })
    .catch((feil) => {
      console.error('Kunne ikke hente oppskrift:', feil);
      if (!erAvbrutt()) {
        vistFil = null;
        visFeil(t('The pattern file could not be loaded. Check your internet connection and try again.'));
      }
    });
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
    window.scrollTo({ top: 0, behavior: 'smooth' }); // vis den nye oppskriften
  } catch (feil) {
    console.error(feil);
    await visMelding(t('The pattern could not be saved.'));
  } finally {
    input.value = ''; // så man kan velge samme fil igjen senere
  }
});

$('fjern-oppskrift-knapp').addEventListener('click', async () => {
  if (!(await bekreft(t('Remove the pattern file?'), 'Remove'))) return;
  const prosjekt = aapentProsjekt();
  slettFil('oppskrift', prosjekt.id);
  delete prosjekt.oppskriftFil;
  lagreEndring(prosjekt);
  visOppskrift(prosjekt);
});
