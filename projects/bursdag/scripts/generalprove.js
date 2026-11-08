#!/usr/bin/env node
'use strict';

/**
 * Generalprøve før festen.
 *
 *   npm run sjekk                          # sjekker oppsett (gratis)
 *   npm run sjekk -- --ekte --bilde selfie.jpg
 *                                          # lager 1 ekte video + 1 ekte sang (koster kreditter)
 *
 * Leser .env i prosjektmappa hvis den finnes.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');

// --- enkel .env-leser (overstyrer ikke variabler som allerede er satt) ---
const envFile = path.join(ROOT, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const higgsfield = require('../lib/higgsfield');
const suno = require('../lib/suno');

const args = process.argv.slice(2);
const ekte = args.includes('--ekte');
const bildeIdx = args.indexOf('--bilde');
const bilde = bildeIdx >= 0 ? args[bildeIdx + 1] : null;

let problems = 0;
const ok = (m) => console.log('  ✅ ' + m);
const warn = (m) => console.log('  ⚠️  ' + m);
const bad = (m) => { problems++; console.log('  ❌ ' + m); };
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const mins = (ms) => (ms / 60000).toFixed(1) + ' min';

async function checkConfig() {
  console.log('\n1. Oppsett');
  process.env.HF_KEY || process.env.HF_API_KEY ? ok('Higgsfield-nøkkel er satt') : bad('HF_KEY mangler (videoer kjører i demomodus)');
  process.env.SUNO_API_KEY ? ok('Suno-nøkkel er satt') : bad('SUNO_API_KEY mangler (sanger kjører i demomodus)');
  process.env.PUBLIC_URL ? ok('PUBLIC_URL = ' + process.env.PUBLIC_URL) : warn('PUBLIC_URL er ikke satt: QR-kodene bruker adressen du åpner /qr fra');
  process.env.ADMIN_KEY ? ok('ADMIN_KEY er satt') : bad('ADMIN_KEY mangler: du kommer ikke inn på /admin på festen');
  process.env.HF_LIPSYNC_MODEL ? ok('Lipsync-modell: ' + process.env.HF_LIPSYNC_MODEL) : warn('HF_LIPSYNC_MODEL er ikke satt: finalen blir uten syngende munn');
  ok(`Maks ${process.env.HF_MAX_CONCURRENT || 8} videoer samtidig hos Higgsfield`);

  const partyFile = process.env.PARTY_CONFIG || path.join(ROOT, 'party.json');
  try {
    const p = JSON.parse(fs.readFileSync(partyFile, 'utf8'));
    p.quiz && p.quiz.eksempel === false ? ok(`Quizen har ${p.quiz.sporsmal.length} egne spørsmål`) : bad('Quiz-spørsmålene er fortsatt eksempler (party.json → "eksempel": false)');
    ok(`Program: ${(p.program || []).map((x) => x.tid + ' ' + x.tittel).join(' · ')}`);
  } catch (e) {
    bad('Kunne ikke lese party.json: ' + e.message);
  }

  const dataDir = path.resolve(process.env.DATA_DIR || path.join(ROOT, 'data'));
  const count = (d, re) => { try { return fs.readdirSync(path.join(dataDir, d)).filter((f) => re.test(f)).length; } catch { return 0; } };
  const n = count('nostalgi', /\.(jpe?g|png|webp|gif)$/i);
  const s = count('spilleliste', /\.(mp3|m4a|aac|ogg|wav)$/i);
  n ? ok(`${n} bilder på nostalgiveggen`) : warn(`Ingen bilder i ${path.join(dataDir, 'nostalgi')}`);
  s ? ok(`${s} låter i årsspillelisten`) : warn(`Ingen låter i ${path.join(dataDir, 'spilleliste')}`);
}

async function checkServer() {
  const url = process.env.PUBLIC_URL;
  if (!url) return;
  console.log('\n2. Serveren på ' + url);
  try {
    const t = Date.now();
    const res = await fetch(url.replace(/\/+$/, '') + '/api/health');
    const h = await res.json();
    ok(`Svarer på ${Date.now() - t} ms (video: ${h.higgsfield}, sang: ${h.suno}, lipsync: ${h.lipsync ? 'på' : 'av'})`);
    if (h.higgsfield !== 'på' || h.suno !== 'på') bad('Serveren kjører i demomodus for minst én tjeneste: sett nøklene der appen kjører også');
  } catch (e) {
    bad('Fikk ikke kontakt: ' + e.message);
  }
}

async function testVideo() {
  if (!higgsfield.isConfigured()) return bad('Hopper over video: HF_KEY mangler');
  if (!bilde || !fs.existsSync(bilde)) return bad('Hopper over video: bruk --bilde sti/til/selfie.jpg');
  const t0 = Date.now();
  try {
    const type = /\.png$/i.test(bilde) ? 'image/png' : 'image/jpeg';
    const imageUrl = await higgsfield.upload(fs.readFileSync(bilde), type);
    ok('Bildet er lastet opp til Higgsfield');
    const { requestId } = await higgsfield.submitImageToVideo({ imageUrl, prompt: 'A majestic realistic tiger walks slowly in a full circle around the person. Cinematic.' });
    ok(`Video sendt (modell ${higgsfield.VIDEO_MODEL}, ${higgsfield.VIDEO_SECONDS} sek), venter …`);
    for (;;) {
      await sleep(5000);
      const s = await higgsfield.status(requestId);
      if (s.status === 'completed') {
        if (!s.videoUrl) return bad('Ferdig, men fant ingen video-URL i svaret: ' + JSON.stringify(s.raw).slice(0, 300));
        ok(`Video ferdig på ${mins(Date.now() - t0)}: ${s.videoUrl}`);
        return Date.now() - t0;
      }
      if (['failed', 'nsfw', 'canceled', 'cancelled'].includes(s.status)) return bad('Videoen feilet: ' + JSON.stringify(s.raw).slice(0, 300));
      if (Date.now() - t0 > 15 * 60000) return bad('Videoen brukte over 15 min');
    }
  } catch (e) {
    bad('Higgsfield: ' + e.message);
    if (/404/.test(e.message)) warn('404 betyr som regel feil modellsti. Sjekk HF_VIDEO_MODEL i Higgsfield-konsollen.');
  }
}

async function testSong() {
  if (!suno.isConfigured()) return bad('Hopper over sang: SUNO_API_KEY mangler');
  const t0 = Date.now();
  try {
    const { taskId } = await suno.generate({ prompt: `En kort, morsom pop-låt på norsk til bursdagen til ${process.env.BIRTHDAY_NAME || 'bursdagsbarnet'}.` });
    ok('Sang sendt til Suno, venter …');
    for (;;) {
      await sleep(10000);
      const s = await suno.status(taskId);
      if (s.failed) return bad('Sangen feilet: ' + (s.message || 'ukjent feil'));
      if (s.done && s.track) {
        ok(`Sang ferdig på ${mins(Date.now() - t0)}: «${s.track.title}» ${s.track.audioUrl}`);
        s.track.lyrics ? ok('Sangteksten kom med (vises på skjermen)') : warn('Ingen sangtekst i svaret: skjermen viser bare tittel');
        return Date.now() - t0;
      }
      if (Date.now() - t0 > 15 * 60000) return bad('Sangen brukte over 15 min (siste status: ' + s.status + ')');
    }
  } catch (e) {
    bad('Suno: ' + e.message);
  }
}

(async () => {
  console.log('🎂 Generalprøve');
  await checkConfig();
  await checkServer();
  if (ekte) {
    console.log('\n3. Ekte test (bruker kreditter: 1 video + 1 sang)');
    const [v] = await Promise.all([testVideo(), testSong()]);
    if (v) console.log(`\n  💡 Sett AVG_VIDEO_MIN=${Math.max(1, Math.round(v / 60000))} for riktig ventetid i køen.`);
  } else {
    console.log('\n3. Ekte test: hoppet over. Kjør med --ekte --bilde selfie.jpg for å lage 1 video og 1 sang.');
  }
  console.log(problems ? `\n${problems} ting må fikses før festen.` : '\n🎉 Alt ser klart ut!');
  process.exit(problems ? 1 : 0);
})();
