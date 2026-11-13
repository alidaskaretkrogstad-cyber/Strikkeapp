# Strikkeapp

En app for å holde styr på strikke- og hekleprosjekter, med rad- og masketellere.
Prosjektene lagres i skyen (Firebase), så de er trygge og finnes på alle enhetene dine.

## Mappene

```
index.html            Alle skjermene (HTML)
manifest.json         Navn, ikon og farger når appen legges på hjemskjermen
service-worker.js     Gjør at appen virker uten nett
icons/                App-ikonene

css/
  grunn.css           Farger, skrift, topplinje, meny, kort og dialogboks
  knapper.css         Knapper, faner, valgknapper og stjerner
  prosjekter.css      Forsiden og prosjektlistene
  teller.css          Tellersiden
  skjema.css          Tekstfelt, detaljer og oppskriftssiden
  logg-inn.css        Innlogging og "Loading…"

js/
  main.js             Starter appen (innlogging → hent prosjekter → vis forsiden)
  konstanter.js       Faste lister: statuser, typer plagg, ikoner ...
  hjelpere.js         Små hjelpefunksjoner (tid, ID-er, krympe bilder ...)
  tilstand.js         Dataene appen jobber med mens den kjører
  data/
    firebase-config.js  ← Her limer du inn Firebase-innstillingene dine
    firebase.js         Starter Firebase
    prosjekter.js       Lagrer og henter prosjektene i skyen
    filer.js            Lagrer og henter bilder og oppskriftsfiler
    lokal.js            Mellomlagring på enheten
  ui/                 Deler som brukes på flere skjermer
  skjermer/           Én fil per skjerm (hjem, prosjekter, teller, detaljer ...)
```

## Sette opp Firebase (gjøres én gang, ca. 10 minutter)

1. **Lag et prosjekt.** Gå til <https://console.firebase.google.com>, logg inn med
   Google-kontoen din og trykk **Create a project**. Gi det et navn, f.eks. `strikkeapp`.
   Google Analytics trenger du ikke.

2. **Slå på innlogging med e-post.** I menyen til venstre: **Build → Authentication →
   Get started**. Velg **Email/Password**, slå på den øverste bryteren og trykk **Save**.

3. **Lag databasen.** **Build → Firestore Database → Create database**.
   Velg en plassering i Europa (f.eks. `eur3`), og velg **Start in production mode**.

4. **Lås databasen så bare du ser dine data.** Gå til fanen **Rules** i Firestore,
   erstatt alt som står der med dette, og trykk **Publish**:

   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /brukere/{bruker}/{dokument=**} {
         allow read, write: if request.auth != null && request.auth.uid == bruker;
       }
     }
   }
   ```

5. **Koble appen til prosjektet.** Trykk tannhjulet ⚙️ ved **Project Overview →
   Project settings**. Under **Your apps** trykker du på web-ikonet `</>`, gir appen
   et navn og trykker **Register app** (Hosting trenger du ikke).
   Du får se en `firebaseConfig = { ... }`. Kopier verdiene inn i
   `js/data/firebase-config.js` (bytt ut alle `LIM-INN-HER`).

6. Legg ut appen på nytt (commit og push til GitHub).

Første gang du logger inn på en enhet som har prosjekter fra den gamle versjonen av
appen, blir de automatisk kopiert opp til kontoen din.

### Koster det noe?

Nei. Gratisplanen (Spark) har plass til 1 GB data og mange tusen lagringer per dag –
langt mer enn appen bruker. Bilder krympes før de lagres, og oppskrifter (PDF/bilder)
lagres i biter i databasen, så du trenger ikke Firebase Storage (som krever kredittkort).

## Teste lokalt

Appen må åpnes via en webserver (ikke ved å dobbeltklikke på `index.html`), f.eks.:

```
python3 -m http.server 8000
```

og så åpne <http://localhost:8000>.
