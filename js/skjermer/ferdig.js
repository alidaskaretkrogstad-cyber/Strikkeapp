// =========================================================
// FERDIG-SIDEN (vurdering når prosjektet er ferdig)
// Siden brukes på to måter:
//  - når et prosjekt blir ferdig ("Mark as finished")
//  - når man endrer vurderingen etterpå ("Edit review"), da er feltene fylt ut
// =========================================================
import { $, krympBilde } from '../hjelpere.js';
import { tilstand, aapentProsjekt } from '../tilstand.js';
import { lagreEndring } from '../data/prosjekter.js';
import { lagreFil } from '../data/filer.js';
import { registrerSkjerm, naviger, tilbake } from '../ui/navigasjon.js';
import { settValg, lesValg } from '../ui/valg.js';
import { visForhandsvisning } from '../ui/bilder.js';
import { visMelding } from '../ui/dialog.js';

const skjema = $('ferdig-skjema');
const bildeInput = $('ferdig-bilde');
const bildeForhand = $('ferdig-bilde-forhand');

function visFerdigSkjema() {
  const prosjekt = aapentProsjekt();
  const f = prosjekt.ferdig || {}; // tidligere vurdering, hvis den finnes
  const endrer = Boolean(tilstand.gjeldende.endre);

  skjema.reset();
  $('ferdig-tittel').textContent = endrer ? 'Your review' : 'Finished! 🎉';
  $('ferdig-lagre').textContent = endrer ? 'Save review' : '✓ Save as finished';
  $('ferdig-prosjektnavn').textContent = prosjekt.navn;
  $('ferdig-likte-tittel').textContent =
    prosjekt.teknikk === 'hekling' ? 'How did you like crocheting it?' : 'How did you like knitting it?';

  $('ferdig-resultat').value = f.resultat || '';
  $('ferdig-prosess').value = f.prosess || '';
  settValg($('ferdig-vanskelighet'), f.vanskelighet);
  settValg($('ferdig-likte'), f.likte ? String(f.likte) : '');

  bildeForhand.hidden = true;
  bildeForhand.removeAttribute('src');
}

registrerSkjerm('ferdig', visFerdigSkjema);
visForhandsvisning(bildeInput, bildeForhand);

skjema.addEventListener('submit', async (hendelse) => {
  hendelse.preventDefault();
  const prosjekt = aapentProsjekt();

  // Bildet av det ferdige prosjektet blir prosjektets bilde
  const bilde = bildeInput.files[0];
  if (bilde) {
    try {
      const versjon = Date.now();
      await lagreFil('bilde', prosjekt.id, await krympBilde(bilde), versjon);
      prosjekt.harBilde = true;
      prosjekt.bildeVersjon = versjon;
    } catch (feil) {
      console.error(feil);
      await visMelding('The photo could not be saved.');
    }
  }

  const tidligere = prosjekt.ferdig || {};
  prosjekt.ferdig = {
    dato: tidligere.dato || Date.now(), // behold datoen hvis man bare endrer vurderingen
    resultat: $('ferdig-resultat').value.trim(),
    prosess: $('ferdig-prosess').value.trim(),
    vanskelighet: lesValg($('ferdig-vanskelighet')),
    likte: Number(lesValg($('ferdig-likte'))) || 0, // 0 = ingen stjerner valgt
  };

  if (tilstand.gjeldende.endre) {
    // Vi endret bare vurderingen: gå tilbake til detaljsiden
    lagreEndring(prosjekt);
    tilbake();
    return;
  }

  prosjekt.status = 'ferdig';
  prosjekt.pause = false;
  lagreEndring(prosjekt);

  // Vis det ferdige prosjektet. Skjermen byttes ut, så "Back" går til listen.
  tilstand.valgtFane = 'ferdig';
  naviger({ skjerm: 'detaljer', id: prosjekt.id }, true);
});
