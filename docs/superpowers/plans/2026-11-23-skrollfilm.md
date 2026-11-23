# Skrollfilm Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the homepage hero with a scroll-scrubbed 30 s film (canvas image sequence) plus six i18n story chapters, with an instant loop while frames load, on mobile and desktop.

**Architecture:** An ffmpeg script turns the source film into two WebP frame sets (desktop 1280×720, mobile 608×1080) plus loop videos and a manifest in `public/film/`. Pure functions in `src/lib/scrollFilm.ts` map scroll progress → frame/chapter and define load order. A client component draws the nearest loaded frame on a sticky canvas, crossfades from the loop video, and renders chapter text from next-intl.

**Tech Stack:** Next.js 16 App Router, React 19, next-intl 4, Tailwind 4, ffmpeg (cwebp via libwebp in ffmpeg), Vitest, Playwright (MCP) for viewport checks.

**Spec:** `docs/superpowers/specs/2026-11-23-skrollfilm-design.md`

## Global Constraints

- Source film: `~/Projects/hatlem-film-arbeid/film/seedance-original.mp4`; loop: `~/Projects/hatlem-film-arbeid/film/loop-justert.mp4`.
- Frames at 12 fps (≈360 per set). Desktop 1280×720, mobile 608×1080 (center crop). WebP.
- Chapter time ranges (s): 0–4, 4–9, 9–15, 15–20, 20–24, 24–30. Scroll length ≈500vh.
- Loop → canvas crossfade 300 ms. `prefers-reduced-motion`: no loop, no scrubbing, still frame per chapter.
- No sound. Copy only from spec (no/en/de). H1 + JSON-LD preserved. Never run dev server on port 3000 (use `pnpm dev --port 3017`).
- Heavy commands (`pnpm install`, `pnpm build`, ffmpeg batch) via `~/bin/heavy.sh`.
- Don't touch `projects/bursdag/` (another change is pending there).

## Review Focus

- Rotating phone / resizing across the mobile breakpoint mid-scroll → switch frame set and redraw the current frame, no blank canvas.
- Fast scroll before frames load → draw the nearest already-loaded frame, never blank/black.
- Returning to the page with scroll restored mid-film → correct frame and chapter on first paint.
- Reduced-motion users → static chapter images, all text readable, no autoplay video.
- Slow network → poster image visible immediately (no layout shift), loop starts when ready.

---

### Task 1: Asset pipeline

**Files:**
- Create: `scripts/film/lag-film.sh`
- Create (generated, committed): `public/film/desktop/f0001.webp…`, `public/film/mobil/f0001.webp…`, `public/film/loop-desktop.mp4`, `public/film/loop-mobil.mp4`, `public/film/poster-desktop.webp`, `public/film/poster-mobil.webp`, `public/film/manifest.json`

**Interfaces:**
- Produces: `manifest.json` = `{ "fps": 12, "frameCount": number, "duration": 30, "sets": { "desktop": { "width": 1280, "height": 720 }, "mobil": { "width": 608, "height": 1080 } } }`; frame URL pattern `/film/{set}/f{NNNN}.webp` (1-based, 4 digits).

- [ ] **Step 1:** Write `scripts/film/lag-film.sh <kilde.mp4> <loop.mp4>`: `set -euo pipefail`; ffmpeg `-vf fps=12,scale=1280:720` → desktop WebP (`-c:v libwebp -quality 72`); `-vf fps=12,crop=608*ih/1080:ih,scale=608:1080` → mobil; loop videos H.264 (`-an -crf 23 -movflags +faststart`, mobil cropped the same way); posters = frame 1 of each set; writes manifest with actual counts.
- [ ] **Step 2:** Run `~/bin/heavy.sh scripts/film/lag-film.sh ~/Projects/hatlem-film-arbeid/film/seedance-original.mp4 ~/Projects/hatlem-film-arbeid/film/loop-justert.mp4`. Expected: both dirs have equal count 360±2; `du -sh public/film/desktop` ≤ 12M, `public/film/mobil` ≤ 8M. If over, lower quality to 65 and rerun.
- [ ] **Step 3:** Commit `feat(film): bildesekvens og loop for skrollfilm`.

### Task 2: Scroll logic (pure, tested)

**Files:**
- Create: `src/lib/scrollFilm.ts`
- Test: `src/lib/scrollFilm.test.ts`
- Modify: `package.json` (devDependency `vitest`, script `"test": "vitest run"`)

**Interfaces:**
- Produces:
  - `export const CHAPTER_TIMES: readonly [number, number][]` = `[[0,4],[4,9],[9,15],[15,20],[20,24],[24,30]]`
  - `frameForProgress(progress: number, frameCount: number): number` → 0-based index, clamped.
  - `chapterForProgress(progress: number, duration: number): number` → 0–5.
  - `loadOrder(frameCount: number, step = 8): number[]` → every `step`th frame first (incl. 0 and last), then halving steps until all; no duplicates.
  - `nearestLoaded(target: number, loaded: ReadonlySet<number>): number | null` → closest loaded index (ties → lower).

- [ ] **Step 1:** Tests:
  - `frameForProgress(0,360)===0`, `(1,360)===359`, `(0.5,360)===180`, `(-0.2,360)===0`, `(1.4,360)===359`, `(NaN,360)===0`.
  - `chapterForProgress(0,30)===0`, `(4/30,30)===1`, `(0.999,30)===5`, `(1,30)===5`, `(14.9/30,30)===2`.
  - `loadOrder(17,8)` starts with `[0,8,16]`, has length 17, is a permutation of 0..16.
  - `nearestLoaded(10,new Set([0,8,16]))===8`, `(12,new Set([8,16]))===8`, `(5,new Set())===null`.
- [ ] **Step 2:** `~/bin/heavy.sh pnpm add -D vitest` then `pnpm test` → FAIL (module missing).
- [ ] **Step 3:** Implement the five exports.
- [ ] **Step 4:** `pnpm test` → PASS.
- [ ] **Step 5:** Commit `feat(film): skroll-logikk med tester`.

### Task 3: ScrollFilm component

**Files:**
- Create: `src/components/scroll-film/ScrollFilm.tsx` (client; layout, sticky stage, loop video, crossfade, reduced-motion fallback)
- Create: `src/components/scroll-film/useFrameSequence.ts` (client hook: picks set via `matchMedia("(max-aspect-ratio: 4/5), (max-width: 640px)")`, loads per `loadOrder` with `Image.decode()`, keeps `Map<number, ImageBitmap|HTMLImageElement>` per set, reloads on set change)
- Create: `src/components/scroll-film/drawCover.ts` (`drawCover(ctx, img, cssW, cssH, dpr): void` — object-fit: cover, DPR capped at 2)

**Interfaces:**
- Consumes: Task 2 exports; `manifest.json` (fetched once).
- Produces: `<ScrollFilm chapters={ChapterContent[]} />` where `type ChapterContent = { id: string; title: string; body: string }` and chapter 0 additionally renders `children` (H1/role/CTA slot) — signature `ScrollFilm({ chapters, intro }: { chapters: ChapterContent[]; intro: React.ReactNode })`.

- [ ] **Step 1:** Section height `500vh`; inner `sticky top-0 h-[100svh]`. Progress = `(-rect.top)/(rect.height - innerHeight)` from a passive scroll listener throttled by `requestAnimationFrame`; on change draw `nearestLoaded(frameForProgress(p))`.
- [ ] **Step 2:** Loop `<video autoPlay muted loop playsInline preload="auto" poster=…>` with `<source>` per set (media query), absolutely over the canvas; opacity → 0 over 300 ms once `p > 0.002` and frame 0 drawn; back to 1 when `p` returns to 0.
- [ ] **Step 3:** Draw current frame on mount, on set change and on resize (Review Focus 1, 3).
- [ ] **Step 4:** `prefers-reduced-motion: reduce` → no video/canvas; render each chapter as a normal block with its still (`/film/{set}/f{index}.webp` for the chapter's start time).
- [ ] **Step 5:** Commit `feat(film): ScrollFilm-komponent`.

### Task 4: Chapters, i18n and homepage integration

**Files:**
- Modify: `messages/no.json`, `messages/en.json`, `messages/de.json` (new namespace `film.chapters.{c1..c6}.{title,body}`, `film.scrollHint`)
- Create: `src/components/scroll-film/ChapterPanel.tsx` (desktop: left panel, chapter fades/slides in; mobile: bottom with gradient `from-bg/90`)
- Modify: `src/app/[locale]/page.tsx` (replace `<HeroSection>` with `<ScrollFilm intro={…H1/role/CTA from HeroSection…} chapters={…} />`; keep `KineticHero`-H1, JSON-LD unchanged)

- [ ] **Step 1:** Add no copy verbatim from spec §Kapitteltekst; en/de translated with same facts and tone. Chapter 6 body ends with links Prosjekter `/projects`, Om meg `/about`, Kontakt `/contact` (rendered as `Link`s, not in the message string).
- [ ] **Step 2:** Integrate; `pnpm lint` and `npx tsc --noEmit` clean.
- [ ] **Step 3:** Commit `feat(film): kapitler på tre språk og ny forside`.

### Task 5: Verify on mobile and desktop

- [ ] **Step 1:** `~/bin/heavy.sh pnpm build` → success.
- [ ] **Step 2:** `pnpm start --port 3017`; Playwright at 1440×900 and 390×844: screenshot at scroll 0 (loop/poster visible, H1 present), 25 %, 50 %, 75 %, 100 % → frame changes, correct chapter text each time; rotate to 844×390 mid-scroll → canvas not blank; emulate reduced motion → static chapters. No console errors.
- [ ] **Step 3:** Lighthouse-free sanity: initial transfer before scroll < 3 MB (poster + loop + first wave).
- [ ] **Step 4:** Commit any fixes; push branch `feat/skrollfilm`. Deploy only when Andreas says so.
