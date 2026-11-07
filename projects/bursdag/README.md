# 🎂 Bursdagsinstallasjon

En interaktiv fest-app. Gjestene skanner QR-koder rundt i lokalet og velger mellom tre ting på forsiden:

| | Hva skjer | API |
|---|---|---|
| 🖍️ **Tegning blir film** | Ta bilde av en tegning, velg stil (magisk, 3D-tegnefilm, anime, blir ekte). Du får en video. | Higgsfield (bilde til video) |
| 🎤 **Lag en sang** | Velg hvem den er til, tema, sjanger og stemning. Sangen legges **i kø i spillelisten** på storskjermen. | Suno (sunoapi.org / api.box) |
| 🤳 **Selfie med effekt** | Tiger som går rundt deg, bli et spøkelse, superhelt, UFO, drage, disko, is eller konfetti. | Higgsfield (bilde til video) |

I tillegg finnes en diskret «Mer moro»-rad under de tre valgene:

- 🧠 **Quiz om bursdagsbarnet** (`/quiz`): gjestene svarer når de kommer, og vinneren trekkes på storskjermen ved kaka.
- 💌 **Gjestebok med vri** (`/hilsen`): «Gi 40-åringen ett råd», «Gjett hva jeg gjorde da jeg var 20» osv. Hilsenene vises på storskjermen.

Sider:

- `/` er forsiden med de tre valgene.
- `/skjerm` er storskjermen. Den viser et galleri med alle filmer og effekter (nye kommer først med «NYTT!»), spiller sangkøen og viser en QR-kode. Når køen er tom, spilles tidligere sanger om igjen. Klikk én gang for fullskjerm og lyd. Ekstra skjermer uten lyd: `/skjerm?lyd=av`.
- `/qr` gir A4-plakater med QR-koder for forsiden, hver aktivitet, «Tiger-hjørnet» og «Spøkelseshjørnet». Skriv ut og heng opp.
- `/admin` har også knapper for det **felles høydepunktet**: 🎂 Kaketid, 🧠 Trekk quizvinner (trommevirvel og fasit), 💌 Les hilsener (én og én i stor tekst) og ⏹️ Tilbake til vanlig. Musikken pauses mens høydepunktet vises.
- `/admin` lar deg skjule upassende ting og flytte en sang først i køen. Krever `ADMIN_KEY`.

## Før festen: fyll inn ditt eget innhold

1. **`party.json`**: programmet (vises på skjermen med nedtelling til høydepunktet), hilsen-temaene og quizen. Quiz-spørsmålene er **eksempler**: skriv dine egne, sett riktig svar (`riktig` er 0–3) og sett `"eksempel": false`.
2. **Nostalgivegg:** legg bilder av deg i `data/nostalgi/` med årstall først, f.eks. `1990 barnehage.jpg`. De vises med stort årstall mellom gjestenes kreasjoner.
3. **Årsspilleliste 1986–2026:** legg lydfiler i `data/spilleliste/` med årstall først, f.eks. `1986 a-ha - Take On Me.mp3`. De spilles kronologisk når ingen gjestesanger står i kø. Gjestesangene går alltid foran.

## Kom i gang

```bash
cd projects/bursdag
npm install
BIRTHDAY_NAME=Andreas npm start      # http://localhost:4830
```

Uten API-nøkler kjører appen i **demomodus**. Da blir selfie- og tegningsbildet vist som resultat, og sangene er små pipelåter. Slik kan du teste hele flyten (QR, mobil, skjerm og kø) uten å bruke kreditter.

Legg inn nøklene for å bruke ekte AI (se `.env.example`):

```bash
HF_KEY=din_key_id:din_key_secret \
SUNO_API_KEY=... \
PUBLIC_URL=https://din-adresse \
ADMIN_KEY=hemmelig \
npm start
```

## Nettverk på festen

Telefonene må nå serveren:

- **Enklest:** deploy til Railway, Render eller Fly. Sett `PUBLIC_URL` og bruk en volum-disk for `DATA_DIR`.
- **Lokalt:** kjør på en laptop på samme wifi. Serveren skriver ut nettverksadressen ved oppstart. Åpne `/qr` via den adressen, eller sett `PUBLIC_URL=http://192.168.x.x:4830`.
- Kameraet åpnes via vanlig filopplasting (`capture`), så det virker også uten HTTPS.

## Hvordan det henger sammen

- Jobber lagres i `data/jobs.json`, og bildene og resultatene i `data/media/`. Ferdige videoer og sanger lastes ned lokalt, så skjermen virker selv om API-lenkene utløper.
- Serveren poller Higgsfield og Suno i bakgrunnen. Når `PUBLIC_URL` er satt, brukes også webhooks for raskere svar.
- Sangkøen styres fra serveren (`/api/queue/next`). Bare én skjerm bør spille lyd.
- Effekter og tegnestiler ligger i `lib/catalog.js`. Legg til flere der, så dukker de opp automatisk.

### Higgsfield-detaljer

API-klienten i `lib/higgsfield.js` følger den offisielle SDK-en `higgsfield-client`:

- Base: `https://api.higgsfield.ai`
- Header: `Authorization: Key <id>:<secret>`
- Opplasting: `/files/generate-upload-url`
- Innsending: `POST /<modell>`
- Status: `GET /requests/<id>/status`

Standardmodellen er `higgsfield-ai/dop/standard`. Sjekk modellnavn og parametere i Higgsfield-konsollen, og bytt med `HF_VIDEO_MODEL`, `HF_VIDEO_EXTRA`, `HF_IMAGE_FIELD` og `HF_PROMPT_FIELD` uten å endre kode.

### Kø hos Higgsfield

Higgsfield-kontoen har en grense for hvor mange videoer som kan lages samtidig (Creator-pakken: 8). Appen sender aldri flere enn `HF_MAX_CONCURRENT` (standard 8). Resten venter i appens egen kø og starter automatisk når en plass blir ledig.

- Gjesten ser «Du er nr. 3 i køen hos filmstudioet (ca. 2 min)».
- Storskjermen viser «Lages nå».
- Admin viser hvor mange av de 8 plassene som er i bruk.
- Køen overlever en omstart av serveren.
- Hvis Higgsfield likevel svarer at kontoen er full, legges jobben tilbake i køen og prøves på nytt.

Med rundt 2 minutter per video gir 8 plasser omtrent 4 videoer i minuttet.

### Kostnader

Hver video og sang koster kreditter. `MAX_JOBS_TOTAL` setter et tak for hele kvelden, og `MAX_PER_DEVICE` begrenser hver gjest per time.
