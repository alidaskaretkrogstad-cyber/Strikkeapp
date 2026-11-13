// =========================================================
// KONSTANTER
// Faste lister og navn som brukes rundt om i appen.
// Vil du legge til flere valg (f.eks. en ny type plagg), gjør du det her.
// =========================================================

// Visningsnavn for hver status
export const STATUS_NAVN = {
  vil: 'To knit',
  pagar: 'In progress',
  ferdig: 'Finished',
};

// Visningsnavn for vanskelighetsgrad
export const VANSKELIGHET_NAVN = {
  lett: 'Easy',
  middels: 'Medium',
  vanskelig: 'Hard',
};

// Strikking eller hekling
export const TEKNIKK_NAVN = {
  strikking: 'Knitting',
  hekling: 'Crochet',
};

// Hva man lager. "annet" (Other) lar deg skrive inn noe selv.
export const TYPE_NAVN = {
  genser: 'Sweater',
  jakke: 'Cardigan',
  vest: 'Vest',
  lue: 'Hat',
  sokker: 'Socks',
  votter: 'Mittens',
  skjerf: 'Scarf',
  sjal: 'Shawl',
  teppe: 'Blanket',
  veske: 'Bag',
  kosedyr: 'Toy',
  annet: 'Other',
};

// Små ikoner som vises foran hvert valg under "What are you making?"
export const TYPE_IKON = {
  genser: '👕',
  jakke: '🧥',
  vest: '🎽',
  lue: '🧢',
  sokker: '🧦',
  votter: '🧤',
  skjerf: '🧣',
  sjal: '🌸',
  teppe: '🛏️',
  veske: '👜',
  kosedyr: '🧸',
  annet: '✨',
};

// Enkle tekstfelt i "Edit details" (lagres med samme navn i prosjektet)
export const TEKST_FELT = ['designer', 'storrelse', 'notater'];

// Lister med flere rader (garn og pinner): hvilke felt hver rad har.
// [navn i dataene, hjelpetekst i feltet]
export const RAD_FELT = {
  garn: [
    ['navn', 'Yarn: Peer Gynt'],
    ['mengde', 'Amount: 6 skeins'],
  ],
  pinner: [
    ['storrelse', 'Size: 4 mm'],
    ['lengde', 'Length: 80 cm'],
  ],
};
