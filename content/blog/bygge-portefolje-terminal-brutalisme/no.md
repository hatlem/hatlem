---
title: "Å Bygge en Portefølje: Terminal-Brutalisme Møter Nordisk Minimalisme"
excerpt: "Bak kulissene på andreashatlem.no — designfilosofi, tekniske valg, og hvorfor det ikke finnes en eneste avrundet hjørne."
date: "2026-01-28"
readingTime: "7 min"
tags: ["Portefølje", "Design", "Next.js"]
featured: true
---

## Intensjon fremfor maler

Jeg ville ha en side som sa noe om meg før du i det hele tatt leser «Om»-siden. Ikke en mal med byttet farge. Ikke generert av en prompt. Noe som føles bevisst — teknisk rått, menneskelig gjennomtenkt.

Resultatet ble det jeg kaller terminal-brutalisme møter nordisk minimalisme. Mørk som en norsk vinternatt, med et nordlys-teal som aksent og monospace-typografi overalt. Null avrundede hjørner. Det er ikke en forglemmelse.

## Stacken

Valgene er bevisste og slanke:

- **Next.js 16** med App Router og React 19
- **TypeScript** overalt — ingen unntak
- **Tailwind CSS v4** med PostCSS
- **next-intl** for full internasjonalisering (norsk, engelsk, tysk)
- **pnpm** som pakkebehandler

Ingen headless CMS, ingen database, ingen analytics-SDK, ingen komponentbibliotek. Blogginnlegg og prosjektdata lever som typede TypeScript-objekter i kildekoden. Det er en portefølje, og den vet det.

## Designfilosofien

CSS-filen åpner med en kommentar: *«Terminal Brutalism + Post-AI Humanism. Anti-AI-slop. Intentionally human. Technically raw.»*

Fargepaletten er hentet fra norske vinternetter — nesten svart bakgrunn, varm kremfarget tekst, og et nordlys-teal som dukker opp overalt. Det finnes også en sekundær «midnattsol»-varme for kontrast.

Detaljene belønner oppmerksomhet:

- **Støy- og skannelinjeoverlegg** — subtil SVG-basert filmkorn og en sakte CRT-skannelinje
- **Kinetisk typografi** — helten staver «ANDREAS» bokstav for bokstav med 3D-rotasjonsanimasjon
- **Terminal-estetikk** — kommandoprompter, blinkende markører, og katalogstil-navigasjon
- **Brutalistiske kort** — innholdskort med forskjøvne skygge-pseudoelementer som skifter ved hover
- **Koordinater** — 59°54'N 10°45'E og et norsk flagg i hjørnet. Oslo-stolthet bakt inn i layouten.

## Trespråklig fra dag én

Siden leveres på norsk (standard), engelsk og tysk via next-intl. Hvert språk har sin egen komplette meldingsfil og lokalisert blogginnhold — ikke maskinoversatte stubber, men genuint tilpasset skriving.

Språkbytteren viser flaggemojier i navigasjonen, og URL-strukturen bruker lokale prefikser. Statiske parametere er forhåndsgenerert for alle språk.

## Null klientsidedata-henting

Alt er server-rendret. Blogginnlegg, prosjekter, oversettelser — alt løses ved bygg- eller forespørselstidspunkt. Klientkomponentene er begrenset til scroll-animasjoner, navigasjonstilstand og språkbytteren. Det er det.

## Skriftparet

Instrument Serif for visningsoverskrifter og JetBrains Mono for alt annet. Serif + monospace er en uvanlig kombinasjon som fungerer fordi den brutalistiske konteksten binder dem sammen. Serifskriften gir varme og personlighet; monospace gir den tekniske kanten.

> Bygget med intensjon, ikke maler.

Hele siden gikk fra create-next-app til fullstendig trespråklig portefølje på en håndfull commits. Det er shipping-hastighet i praksis, ikke bare blogget om.
