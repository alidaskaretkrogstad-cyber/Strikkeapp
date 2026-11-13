// =========================================================
// VISE BILDER
// =========================================================
import { hentFil } from '../data/filer.js';

// Henter bildet til et prosjekt og viser det i et <img>-element
export function visBildeI(imgElement, prosjekt) {
  hentFil('bilde', prosjekt.id, prosjekt.bildeVersjon)
    .then((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      // Frigjør minnet når bildet er tegnet
      imgElement.onload = () => URL.revokeObjectURL(url);
      imgElement.src = url;
      imgElement.hidden = false;
    })
    .catch((feil) => console.error('Kunne ikke hente bilde:', feil));
}

// Viser en forhåndsvisning av et valgt bilde i et <img>-element
export function visForhandsvisning(input, img) {
  input.addEventListener('change', () => {
    const fil = input.files[0];
    if (!fil) return;
    img.src = URL.createObjectURL(fil);
    img.hidden = false;
  });
}
