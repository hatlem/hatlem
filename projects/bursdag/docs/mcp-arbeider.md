# MCP-arbeideren: filmer via Higgsfield-kontoen (ikke API-lommeboken)

Når Railway-tjenesten kjører med `VIDEO_PROVIDER=mcp`, lages ingen filmer av Higgsfield-API-et. Jobbene legges i stedet i en kø
som en Claude Code-økt på Andreas' Mac tømmer med Higgsfield-MCP-en (`mcp__higgsfield__*`). Da brukes kredittene på
higgsfield.ai-kontoen. Arbeideren må kjøre så lenge festen varer.

## Endepunkter (krever `x-admin-key`)

| Kall | Gjør |
|---|---|
| `GET /api/admin/mcp/jobs` | Jobber som venter på arbeideren, eldste først. Hver har `id`, `type` (selfie/drawing/example), `stage` (`image` eller `video`), `inputUrl`, `fixedImageUrl`, `fix` ({prompt, aspectRatio}), `prompt`, `seconds`, `claimedAt`. |
| `POST /api/admin/mcp/jobs/:id/claim` | Marker at du har tatt jobben (`{ "worker": "mac" }`). Jobber med `claimedAt` eldre enn 10 min kan tas på nytt. |
| `POST /api/admin/mcp/jobs/:id/result` | `{ "imageUrl": … }` når `stage` er `image` (jobben går til `video`), `{ "videoUrl": … }` når filmen er klar, eller `{ "error": "…" }`. |

Appen laster ned resultatene selv, lager frem-og-tilbake-versjonen og viser filmen på skjermen.

## Én jobb, steg for steg

1. `scripts/mcp-ko.sh liste` (eller `curl -s -H "x-admin-key: …" …/api/admin/mcp/jobs`). Skriptet trenger BURSDAG_ADMIN_KEY i miljøet; de andre kommandoene er `hent`, `claim`, `bilde`, `film`, `feil`.
2. Claim jobben.
3. Last ned `inputUrl` (eller `fixedImageUrl` hvis `stage` er `video`) til scratchpad.
4. `media_upload` (filnavn med riktig endelse) → `curl -X PUT …` → `media_confirm` (type image).
5. `stage` = `image`: `generate_image` med `model: nano_banana_2_1`, `prompt: fix.prompt`, `aspect_ratio: fix.aspectRatio`,
   `resolution: 1k`, `medias: [{ value: <media_id>, role: image_references }]`. `jobs_wait` til `completed`.
   POST `{ "imageUrl": result_url }`. Jobben er nå `video`; bruk `job_id` fra bildet som `start_image` i neste steg
   (ingen ny opplasting nødvendig).
6. `stage` = `video`: `generate_video` med `model: kling3_0`, `prompt`, `duration: seconds`, `mode: std`, `sound: off`,
   `aspect_ratio` 9:16 for stående bilde og 16:9 for liggende, `medias: [{ value: <job_id eller media_id>, role: start_image }]`.
   `jobs_wait` (15 s om gangen, 2–4 min totalt). POST `{ "videoUrl": result_url }`.
7. Feiler noe to ganger: POST `{ "error": "kort forklaring" }`, så får gjesten beskjed og kan prøve igjen.

Flere jobber samtidig: bruk `generate_image_batch` / `generate_video_batch` og `jobs_wait` med flere jobber. Maks 6 filmer
om gangen, så kontoen ikke blir strupet.

## Kjøre arbeideren under festen

I Claude Code, i dette repoet:

```
/loop sjekk køen for bursdagsfilmer: les docs/mcp-arbeider.md og gjør alle jobbene i GET /api/admin/mcp/jobs ferdige
```

Uten mellomrom i intervallet velger løkken selv tempo. ADMIN_KEY og PUBLIC_URL (https://andreashatlem.no/bursdag) står
på Railway-tjenesten «bursdag». Macen må stå på med strøm, og Higgsfield-MCP-en må være koblet til i Claude Code (`/mcp`).

Målt 8.11.2026: bildefiks 15 s, Kling 3.0 std 5 s film ca. 2,5 min.
