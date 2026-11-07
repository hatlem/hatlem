# 🎂 Bursdagsinstallasjon

En interaktiv fest-app. Gjestene skanner QR-koder rundt i lokalet og velger mellom tre ting på forsiden:

| | Hva skjer | API |
|---|---|---|
| 🖍️ **Tegning blir film** | Ta bilde av en tegning, velg stil (magisk, 3D-tegnefilm, anime, blir ekte). Du får en video. | Higgsfield (bilde til video) |
| 🎤 **Lag en sang** | Velg hvem den er til, tema, sjanger og stemning. Sangen legges **i kø i spillelisten** på storskjermen. | Suno (sunoapi.org / api.box) |
| 🤳 **Selfie med effekt** | Tiger som går rundt deg, bli et spøkelse, superhelt, UFO, drage, disko, is eller konfetti. | Higgsfield (bilde til video) |

I tillegg finnes en diskret «Mer moro»-rad under de tre valgene:

- 🧠 **Live-quiz om bursdagsbarnet** (`/quiz`): gjestene melder seg på når de kommer. Ved kaka styrer du quizen fra admin. Storskjermen viser spørsmål med nedtelling, og telefonene er fire fargede svarknapper. Raske, riktige svar gir flest poeng (500–1000). Etter hvert spørsmål vises fasit og toppliste, og til slutt pallen.
- 💌 **Gjestebok med vri** (`/hilsen`): «Gi 40-åringen ett råd», «Gjett hva jeg gjorde da jeg var 20» osv.

## Skjermer og lyd

To skjermer, og **lyden går fra en mobil koblet til høyttaleren** (Bluetooth eller kabel):

| Enhet | Adresse | Viser / gjør |
|---|---|---|
| Skjerm 1 | `/skjerm` | Galleri, «Nå spilles», program og QR. Under høydepunktet viser den kake, live-quiz, hilsener og finale. Stum. |
| Skjerm 2 | `/musikk` | Stor «Nå spilles» med cover og sangtekst, køen og en QR-kode til «Lag din egen sang». Stum: følger mobilen. |
| Mobil ved høyttaleren | `/lyd` | **Spiller all musikken.** Store knapper for pause og neste sang. QR-kode til siden finnes i admin. |

- **Bare én enhet spiller lyd.** Den som sist trykket «Start» tar over, og de andre blir stille. Uten mobil kan du bruke `/musikk?lyd=pa` eller `/skjerm?lyd=pa`.
- **Mobilen holder skjermen våken** (Wake Lock). Hold den på lading og ikke lås den, for nettlesere kan stoppe lyden når skjermen er låst.
- **Låseskjermen og knappene på høyttaleren** (pause/neste) fungerer, og viser tittel og cover.
- **iPhone:** volum og demping styres via Web Audio, siden iPhone ikke lar nettsider sette volumet. Slå av lydløs-bryteren. På iOS 17+ spiller den likevel.
- **Musikken går hele tiden.** Rekkefølgen er gjestesanger i kø, så årsspillelisten (kronologisk), så reprise. En ny gjestesang avbryter årsspillelisten.
- **Under kake og hilsener** settes musikken på pause automatisk. Under quizen dempes den til en firedel.
- **Finalen:** storskjermen viser videoen stumt, og mobilen spiller lyden. Begge starter på en felles starttid og holdes i takt. Er mobilen ikke på, spiller storskjermen lyden selv.

Sider for verten:

- `/admin/plan`: **kjøreplan og handleliste**.
  - Oppgi antall voksne og barn, og velg inne, ute eller begge.
  - Tidsplanen regnes ut fra programmet i `party.json`: rigg, start lyd, åpne quiz-lobby, kaketid, påfyll og nedlasting.
  - Handlelisten regnes ut fra antall gjester: pølser, wraps, suppe, kake, drikke, engangsutstyr, stasjoner, teknikk og ute-utstyr.
  - Avkrysning deles mellom alle i admin. Du kan legge til egne punkter, og siden kan skrives ut.
- `/admin`: godkjenning, felles høydepunkt (🎂 kake, 💌 hilsener, 🎬 finale), live-quiz med én «Neste»-knapp, og forbruk.
- `/admin/musikk`: fjernkontroll i Spotify-stil.
  - Nå spilles med ⏯️, ⏭️ og volum.
  - Fanene **Kø** (⬆️⬇️, ▶️ spill nå, ✖️ fjern), **Alle sanger** og **Spilt** (▶️ / ➕ legg i kø) og **Årsspilleliste**.
  - Søk på tittel, gjest eller år.
- `/galleri`: galleri i Google Photos-stil.
  - Tidslinje per time.
  - Fullskjerm med sveip, piltaster og «sveip ned for å lukke».
  - 📤 Del via telefonen og ⬇️ last ned enkeltfiler.
  - **Last ned alt** som én zip, sortert i mappene `tegninger/`, `selfies/` og `sanger/`, med `hilsener.txt` og finalen.
- `/qr`: A4-plakater med QR-koder.

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

## Generalprøve (gjør dette en uke før)

```bash
npm run sjekk                                    # gratis: sjekker oppsett, party.json, mapper og serveren
npm run sjekk -- --ekte --bilde min-selfie.jpg   # lager 1 ekte video + 1 ekte sang (koster kreditter)
```

Skriptet leser `.env`. Den ekte testen viser:

- om modellstien og feltnavnene hos Higgsfield stemmer
- om Suno sender med sangtekst
- hvor lang tid en video tar, og hvilken `AVG_VIDEO_MIN` du bør sette

## Godkjenning, finale og galleri

- **Godkjenn før visning** (`GODKJENNING=1`, eller bryteren i `/admin`): nye filmer, sanger og hilsener vises først i admin med forhåndsvisning og knappene ✅ Vis og 🚫 Avvis.
  - Gjesten ser fortsatt resultatet sitt på telefonen.
  - Skrur du godkjenningen av, slippes alt som venter gjennom.
- **Sangintro og sangtekst:** før hver gjestesang viser storskjermen «🎤 Neste sang: tittel, laget av Per». Mens sangen spilles, vises teksten linje for linje i «Nå spilles».
- **Finale** (i `/admin`): velg en gjestesang og last opp en kort video av bursdagsbarnet (5–15 sekunder, ansiktet rett mot kamera), eller bruk en ferdig selfievideo.
  - Higgsfield lipsync (`HF_LIPSYNC_MODEL`) får munnen til å synge sangen. Sangen kuttes til `FINALE_SECONDS` for å spare kreditter.
  - Trykk «🎬 Vis finalen» ved kaka. Skjermen viser «Verdenspremiere!», så musikkvideoen, så konfetti.
  - Hvis lipsync ikke er satt opp eller feiler, blir finalen videoen og sangen spilt samtidig, så den virker uansett.
- **Galleri** (`/galleri`): alt som ble vist på skjermen, med nedlastingslenker og finalen øverst. Send lenken til gjestene dagen etter.
- **Forbruk:** admin viser hvor mange videoer og sanger som er laget, mot `MAX_JOBS_TOTAL`.

## På andreashatlem.no/bursdag

Bursdagsappen kjører som egen tjeneste (Railway), og hovedsiden videresender `/bursdag` dit:

1. Deploy bursdagsappen (se under) med `PUBLIC_URL=https://andreashatlem.no/bursdag`. Da ligger alle sidene under `/bursdag/`.
2. Sett `BURSDAG_URL=https://<bursdag-tjenesten>.up.railway.app` på **hovedsiden** og deploy den. `next.config.ts` videresender `/bursdag/*`, og språkruteren hopper over `/bursdag`. Uten `BURSDAG_URL` endres ingenting på hovedsiden.
3. Webhooks og QR-kodene bruker `PUBLIC_URL`.
4. Opplasting av store finalevideoer går fint via Railway-adressen direkte, hvis hovedsiden begrenser størrelsen.

Vil du heller ha et subdomene (`bursdag.andreashatlem.no`), legg det til som eget domene på Railway og sett `PUBLIC_URL` til det. Da trengs ingen `BURSDAG_URL`.

## Deploy på Railway (anbefalt)

1. Nytt prosjekt fra GitHub-repoet med **Root Directory** `projects/bursdag`. `railway.json` setter startkommando og helsesjekk (`/api/health`).
2. Legg til et **volum** montert på `/data`, og sett `DATA_DIR=/data`. Da overlever bilder, sanger og køen en omstart.
3. Sett variablene fra `.env.example`, med `PUBLIC_URL` lik Railway-adressen.
4. Legg nostalgibilder og årsspilleliste i `/data/nostalgi` og `/data/spilleliste`, for eksempel med `railway run` eller ved å laste dem opp før festen.
5. Ha en mobil klar som hotspot til storskjermen. Hvis skjermen mister kontakten, viser den et rødt varsel og prøver igjen av seg selv.

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

### Køer hos Higgsfield og Suno

Sanger har sin egen kø med `SUNO_MAX_CONCURRENT` (standard 5). Den virker på samme måte som videokøen under, og gjesten ser «nr. 3 i køen hos lydstudioet».

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
