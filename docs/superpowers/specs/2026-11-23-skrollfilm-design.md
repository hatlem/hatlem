# Skrollfilm på forsiden – design

Dato: 2026-11-23 · Status: godkjent av Andreas («liker det, kjør på»)

## Hensikt
En morsom, fortellende forside: en 30 sekunders film av Andreas (romdrakt → fritt fall → river av drakten → fallskjerm → stuper i havet → lander på bunnen) styres av skrollingen, mens historien hans fortelles i seks kapitler ved siden av. Siden skal aldri stå stille: en kort loop går mens resten av filmen lastes.

## Mål
- Filmen skrubbes jevnt med skrollingen på både mobil og PC (også iOS Safari).
- Loop vises umiddelbart; skrolling fungerer før alt er lastet (grov → fin oppløsning i tid).
- Seks kapitler med tekst knyttet til filmens faser, på no/en/de i eksisterende next-intl-ordbøker.
- Erstatter dagens hero; bloggen ligger under som før.

## Ikke-mål
- Ingen lyd. Ingen ny CMS-redigering av kapitlene.
- Ingen endringer på /about, /projects osv.

## Anti-mål
- Hakking, svarte rammer eller hopp mellom loop og film.
- Tung første lasting (LCP) eller layout som skyver seg.
- Tekst som ikke er sann: bare fakta fra eksisterende side og offentlige avisfakta (bursdagsappen).

## Tilnærminger (vurdert)
1. **Bildesekvens på canvas (valgt).** ~360 WebP-bilder (12 fps) tegnes etter skrollposisjon. Jevnt i alle nettlesere, progressiv lasting (hvert 8. bilde først, så fyll inn). ~10–12 MB fordelt.
2. Video med `currentTime`: enklere, men hakker i iOS Safari og krever full nedlasting for jevn spoling.
3. Ferdig bibliotek (GSAP ScrollTrigger): ekstra avhengighet uten gevinst over 1.

## Det som er bestemt
- Kilde: `~/Projects/hatlem-film-arbeid/film/seedance-original.mp4` (Seedance 2.5, 1920×1080, 24 fps, 30 s). Loop: `loop-justert.mp4` (Wan 3.0, justert til filmens første bilde).
- To bildesett: **desktop** 1280×720 og **mobil** 608×1080 (senterbeskåret stående). Velges med `matchMedia` (stående/smal skjerm → mobil).
- Loop som `<video autoplay muted loop playsinline>` i to varianter (desktop/mobil, H.264 + WebM), med plakatbilde = første filmbilde. Overtoning 300 ms fra loop til canvas når skrollingen starter.
- `prefers-reduced-motion`: ingen loop/skrubbing; vis stillbilder per kapittel.
- Layout PC: sticky filmflate på hele skjermen, kapitteltekst i et panel til venstre som glir inn per kapittel. Mobil: film fyller skjermen, tekst nederst over en mørk gradient.
- Skrollengde ~500vh; kapitlene fordeles på tidskodene 0–4, 4–9, 9–15, 15–20, 20–24, 24–30 s.
- Første kapittel bærer dagens H1/rolle/CTA (SEO og tilgjengelighet beholdes); JSON-LD uendret.
- Ressurser i `public/film/` (desktop/ og mobil/). Bilder lagres med lang cache.

## Kapitteltekst (no, godkjent)
1. **Født i 1986 – samme år som Halleys komet passerte.** Den dro videre. Jeg ble igjen og begynte å bygge. Andreas Hatlem, produktbygger i Oslo.
2. **Rett inn i dot-com-boblen.** Gratis .com-domener, leksikonsider og SEO før det hadde et navn. Harry Potter-sidene vant priser, provisjonene slo ukepengene. Første lønnsslipp: Radio 3 i Sarpsborg. Nettansvarlig i russestyret på Greåker, selvfølgelig.
3. **Av med det som holder deg tilbake.** To nettbutikker og et nettverk av kupongsider. Lager, logistikk og kundeservice – lært på den harde måten.
4. **Så foldet det seg ut.** Startet et medie- og webbyrå, jobbet med Norges største merkevarer, bygde et team – og solgte det.
5. **Hoppet i det igjen.** Har svømt i Nilen som 11-åring og ligget i Adriaterhavet 18+ somre, men AI var det dypeste vannet. Watson i 2017, ChatGPT, BurnBacon i 2023. Nå bygger jeg ikke på noen annen måte.
6. **Fast grunn.** Gift i 2024, pappa i 2025. Fortsatt den 15-åringen som ledet aksjonen for å redde Høla – bare med bedre verktøy. → Prosjekter · Om meg · Kontakt

en/de oversettes med samme innhold og tone.

## Overlatt til byggeren
- Eksakt fordeling av lastebølger, canvas-skalering (cover) og DPR-håndtering.
- Animasjonsdetaljer for kapittelpanelet innenfor eksisterende stil (Terminal Brutalism, aurora-teal).
- Tester: ren logikk (skroll→bilde, kapittel for tid, lasterekkefølge) i Vitest; Playwright-sjekk på mobil- og desktop-viewport.
