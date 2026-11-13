// =========================================================
// NYTT PROSJEKT
// =========================================================
import { $, lagId, krympBilde } from '../hjelpere.js';
import { tilstand } from '../tilstand.js';
import { leggTilProsjekt } from '../data/prosjekter.js';
import { lagreFil } from '../data/filer.js';
import { registrerSkjerm, gaTilHovedskjerm } from '../ui/navigasjon.js';
import { settValg, lesValg } from '../ui/valg.js';
import { fyllRader, lesRader } from '../ui/rader.js';
import { visForhandsvisning } from '../ui/bilder.js';
import { visMelding } from '../ui/dialog.js';

const skjema = $('nytt-prosjekt-skjema');
const bildeInput = $('nytt-bilde');
const bildeForhand = $('nytt-bilde-forhand');
const oppskriftInput = $('nytt-oppskrift');
const oppskriftNavn = $('nytt-oppskrift-navn');

// Tømmer skjemaet hver gang skjermen vises
function visNyttSkjema() {
  skjema.reset();
  $('ny-status').value = 'vil'; // "To knit" er standard
  settValg($('ny-teknikk'), 'strikking'); // "Knitting" er standard
  settValg($('ny-type'), '');
  settValg($('ny-vanskelighet'), '');
  bildeForhand.hidden = true;
  bildeForhand.removeAttribute('src');
  oppskriftNavn.hidden = true;
  fyllRader($('nytt-garn'), []);
  fyllRader($('nytt-pinner'), []);
}

registrerSkjerm('nytt', visNyttSkjema);
visForhandsvisning(bildeInput, bildeForhand);

// Vis navnet på oppskriftsfilen man har valgt
oppskriftInput.addEventListener('change', () => {
  const fil = oppskriftInput.files[0];
  oppskriftNavn.textContent = fil ? `📄 ${fil.name}` : '';
  oppskriftNavn.hidden = !fil;
});

skjema.addEventListener('submit', async (hendelse) => {
  // Hindrer at siden lastes på nytt (standard for skjemaer)
  hendelse.preventDefault();

  const navn = $('nytt-navn').value.trim();
  if (!navn) return;

  const nytt = {
    id: lagId(),
    navn: navn,
    status: $('ny-status').value,
    pause: false,
    tellere: [{ id: lagId(), navn: 'Rows', verdi: 0 }], // starter med én radteller
    garn: lesRader($('nytt-garn')),
    pinner: lesRader($('nytt-pinner')),
    vanskelighet: lesValg($('ny-vanskelighet')),
    teknikk: lesValg($('ny-teknikk')) || 'strikking',
    type: lesValg($('ny-type')),
    typeAnnet: $('ny-type-annet').value.trim(),
    harBilde: false,
    opprettet: Date.now(),
    endret: Date.now(),
  };

  // Lagre oppskriftsfilen hvis man har valgt en
  const oppskrift = oppskriftInput.files[0];
  if (oppskrift) {
    try {
      const versjon = Date.now();
      await lagreFil('oppskrift', nytt.id, oppskrift, versjon);
      nytt.oppskriftFil = { navn: oppskrift.name, type: oppskrift.type, versjon };
    } catch (feil) {
      console.error(feil);
      await visMelding('The pattern could not be saved, but the project was created.');
    }
  }

  // Lagre bildet hvis man har valgt ett
  const bilde = bildeInput.files[0];
  if (bilde) {
    try {
      const versjon = Date.now();
      await lagreFil('bilde', nytt.id, await krympBilde(bilde), versjon);
      nytt.harBilde = true;
      nytt.bildeVersjon = versjon;
    } catch (feil) {
      console.error(feil);
      await visMelding('The photo could not be saved, but the project was created.');
    }
  }

  leggTilProsjekt(nytt);

  // Gå til Projects, på fanen der det nye prosjektet havnet, og fremhev det.
  // Vi går først tilbake fra skjemaet, så "Back" ikke tar deg til skjemaet igjen.
  tilstand.valgtFane = nytt.status;
  tilstand.pauseFilter = 'alle'; // så det nye prosjektet ikke er skjult av filteret
  tilstand.uthevNeste = nytt.id;
  gaTilHovedskjerm({ skjerm: 'prosjekter' });
});
