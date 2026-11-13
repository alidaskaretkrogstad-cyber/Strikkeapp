// =========================================================
// ENDRE NAVN PÅ EN TELLER (blyant-knappen)
// Navnet byttes midlertidig ut med et tekstfelt.
// Enter eller trykk utenfor = lagre, Escape = avbryt.
// =========================================================

export function redigerNavn(navnEl, blyant, lagre) {
  const felt = document.createElement('input');
  felt.type = 'text';
  felt.className = 'navn-felt';
  felt.maxLength = 40;
  felt.value = navnEl.textContent;

  navnEl.hidden = true;
  blyant.hidden = true;
  navnEl.after(felt);
  felt.focus();
  felt.select();

  let ferdig = false;
  const avslutt = (behold) => {
    if (ferdig) return; // kan bli kalt to ganger (Enter + blur)
    ferdig = true;
    const nyttNavn = felt.value.trim();
    felt.remove();
    navnEl.hidden = false;
    blyant.hidden = false;
    if (behold && nyttNavn) {
      navnEl.textContent = nyttNavn;
      lagre(nyttNavn);
    }
  };

  felt.addEventListener('keydown', (hendelse) => {
    if (hendelse.key === 'Enter') {
      hendelse.preventDefault();
      avslutt(true);
    }
    if (hendelse.key === 'Escape') avslutt(false);
  });
  felt.addEventListener('blur', () => avslutt(true));
}
