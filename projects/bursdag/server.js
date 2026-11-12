'use strict';

/**
 * Bursdagsinstallasjon
 *  - /tegning : ta bilde av en tegning -> Higgsfield lager en film
 *  - /sang    : lag en sang -> Suno (sunoapi.org / api.box) -> legges i kø på skjermen
 *  - /selfie  : ta en selfie -> Higgsfield-effekt (tiger, spøkelse, ...)
 *  - /skjerm  : skjerm med galleri + musikk-kø
 *  - /qr      : utskriftsvennlige QR-plakater til lokalet
 *
 * Uten API-nøkler kjører alt i demomodus, så du kan teste flyten før festen.
 */

const express = require('express');
const multer = require('multer');
const QRCode = require('qrcode');
const crypto = require('crypto');
const fs = require('fs');
const os = require('os');
const path = require('path');

const higgsfield = require('./lib/higgsfield');
const mcpFallback = require('./lib/mcp-fallback');
const suno = require('./lib/suno');
const demo = require('./lib/demo');
const { DRAWING_STYLES, SELFIE_EFFECTS, FRAMING, pickVariant, imagePrompt, drawingImagePrompt, SONG_GENRES, SONG_MOODS } = require('./lib/catalog');
const { imageSize, nearestAspect } = require('./lib/imagesize');
const { widen } = require('./lib/widen');
const mine = require('./lib/mine');
const teaser = require('./lib/teaser');
const vert = require('./lib/vert');
const pingpong = require('./lib/pingpong');
const clip = require('./lib/clip');
const party = require('./lib/party');
const { createKahoot } = require('./lib/kahoot');
const { writeZip } = require('./lib/zip');
const film = require('./lib/film');

// ---------------------------------------------------------------------------
// Konfig
// ---------------------------------------------------------------------------
const PORT = Number(process.env.PORT || 4830);
// Full offentlig adresse, inkludert eventuell sti (f.eks. https://andreashatlem.no/bursdag)
const PUBLIC_URL = (process.env.PUBLIC_URL || '').replace(/\/+$/, '');
// Stien appen ligger under (tom = rot). Settes automatisk fra PUBLIC_URL hvis den har en sti.
const BASE_PATH = ((process.env.BASE_PATH ?? (PUBLIC_URL ? new URL(PUBLIC_URL).pathname : '')) || '').replace(/\/+$/, '');
const BIRTHDAY_NAME = process.env.BIRTHDAY_NAME || 'bursdagsbarnet';
const PARTY_TITLE = process.env.PARTY_TITLE || `${BIRTHDAY_NAME} sin bursdag`;
const ADMIN_KEY = process.env.ADMIN_KEY || '';
const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, 'data'));
const MEDIA_DIR = path.join(DATA_DIR, 'media');
const JOBS_FILE = path.join(DATA_DIR, 'jobs.json');
const MAX_JOBS_TOTAL = Number(process.env.MAX_JOBS_TOTAL || 400); // budsjettsperre for kreditter
const MAX_PER_DEVICE = Number(process.env.MAX_PER_DEVICE || 8); // per gjest per time
const JOB_TIMEOUT_MS = Number(process.env.JOB_TIMEOUT_MIN || 25) * 60 * 1000;
// Hvor mange videoer Higgsfield-kontoen kan lage samtidig (Creator-pakken: 8). Resten venter i vår egen kø.
const HF_MAX_CONCURRENT = Math.max(1, Number(process.env.HF_MAX_CONCURRENT || 8));
const VIDEO_TYPES = new Set(['drawing', 'selfie']); // lages av Higgsfield
const SHOWN_VIDEO_TYPES = new Set([...VIDEO_TYPES, 'clip']); // alt som vises som film (også gjestenes egne klipp)
const AVG_VIDEO_MIN = Number(process.env.AVG_VIDEO_MIN || 2); // for ventetidsestimat
// Filmene lages i dette formatet så de fyller skjermen. Bildefiksen lager bildet i samme format,
// og bilde-til-video følger bildets form. Sett VIDEO_ASPECT=auto for å følge mobilbildet i stedet.
const VIDEO_ASPECT = process.env.VIDEO_ASPECT || '16:9';
// Hvor mange sanger Suno-kontoen kan lage samtidig. Resten venter i appens kø.
const SUNO_MAX_CONCURRENT = Math.max(1, Number(process.env.SUNO_MAX_CONCURRENT || 5));
const AVG_SONG_MIN = Number(process.env.AVG_SONG_MIN || 3);
const FINALE_SECONDS = Number(process.env.FINALE_SECONDS || 60); // finalen kuttes til så mange sekunder (sparer kreditter)
// «Kommer snart»: før festen viser alle gjestesider en teaser. Admin, helsesjekk og stilark virker som før.
const teaserConfig = { teaser: process.env.TEASER, openAt: teaser.parseOpenAt(process.env.OPEN_AT) };
const teaserOn = () => teaser.teaserActive(teaserConfig); // sjekkes per forespørsel, så siden åpner av seg selv ved OPEN_AT

fs.mkdirSync(MEDIA_DIR, { recursive: true });

const PARTY = party.loadConfig(process.env.PARTY_CONFIG || path.join(__dirname, 'party.json'), BIRTHDAY_NAME);
const NOSTALGIA_DIR = path.join(DATA_DIR, 'nostalgi');
const PLAYLIST_DIR = path.join(DATA_DIR, 'spilleliste');
const nostalgiaFiles = party.makeFolderScanner(NOSTALGIA_DIR, party.IMAGE);
const playlistFiles = party.makeFolderScanner(PLAYLIST_DIR, party.AUDIO);
const AI_TYPES = new Set(['drawing', 'selfie', 'song']);
const GALLERY_TYPES = new Set([...AI_TYPES, 'clip', 'greeting']);

// VIDEO_PROVIDER=mcp: filmene lages ikke av Higgsfield-API-et, men av en arbeider (Claude Code med Higgsfield-MCP) som
// henter jobbene via /api/admin/mcp og leverer bilde og film tilbake. Da brukes Higgsfield-kontoens kreditter.
const MCP_MODE = /^mcp$/i.test(process.env.VIDEO_PROVIDER || '');
const useHiggsfield = MCP_MODE || higgsfield.isConfigured();
// Reserve: filmer arbeideren ikke tar (eller ikke leverer) i tide, lages via API-et med HF_KEY.
const MCP_FALLBACK = MCP_MODE && higgsfield.isConfigured() ? mcpFallback.settings() : null;
const useImageFix = MCP_MODE || higgsfield.imageFixConfigured();
const useSuno = suno.isConfigured();
// Filmene vises frem og tilbake (ping-pong). Krever ffmpeg; uten den vises originalen i vanlig loop.
const usePingpong = !/^(0|off|nei|false)$/i.test(process.env.PINGPONG || '') && pingpong.available();
const useClipTranscode = clip.available();

// ---------------------------------------------------------------------------
// Lagring (enkel JSON-fil, holder lenge for én fest)
// ---------------------------------------------------------------------------
/** @type {Map<string, any>} */
const jobs = new Map();
const state = {
  queue: [],
  nowPlaying: null,
  played: [],
  playlistIndex: 0,
  takeover: null,
  moderation: /^(1|on|ja|true)$/i.test(process.env.GODKJENNING || ''),
  finaleId: null,
  kahoot: null,
  plan: null,
  program: null, // { schedule, note, venue } – endringer fra admin underveis (ellers party.json)
  help: [],
  votes: {}, // jobId -> [deviceId]
  featured: [], // jobId-er gjestene har bedt om å få vist på skjermen nå («Mine ting»)
  film: null, // { status, progress, url, seconds, error, at }
  // Én lydkilde: siden som sist trykket «Start» med lyd. Admin fjernstyrer den.
  player: { id: null, paused: false, volume: 0.8, seq: 0, cmd: null, report: null },
};

/** Vises på skjerm/galleri: ikke skjult og ikke ventende på godkjenning. */
const onScreen = (j) => !j.hidden && j.approved !== false;
/** Når godkjenning er på, må verten godkjenne ferdige ting før de vises. */
const reviewFlag = () => (state.moderation ? { approved: false } : {});

function queueSong(job) {
  if (!state.queue.includes(job.id) && !state.played.includes(job.id) && state.nowPlaying !== job.id) {
    state.queue.push(job.id);
    save();
  }
}

function load() {
  try {
    const raw = JSON.parse(fs.readFileSync(JOBS_FILE, 'utf8'));
    // Eldre data hadde absolutte lenker (/media/…): gjør dem relative
    const fix = (o) => JSON.parse(JSON.stringify(o).replace(/"\/(media|nostalgi|spilleliste)\//g, '"$1/'));
    for (const j of raw.jobs || []) jobs.set(j.id, fix(j));
    Object.assign(state, raw.state || {});
  } catch {
    /* første oppstart */
  }
}
load();
state.player = { id: null, paused: false, volume: 0.8, seq: 0, cmd: null, report: null, ...(state.player || {}) };
const kahoot = createKahoot(() => PARTY.quiz.questions, state.kahoot);
if (state.film && state.film.status === 'working') state.film = { status: 'failed', error: 'Serveren startet på nytt mens filmen ble laget. Prøv igjen.' };
state.kahoot = kahoot.state;

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const tmp = JOBS_FILE + '.tmp';
    fs.writeFileSync(tmp, JSON.stringify({ jobs: [...jobs.values()], state }, null, 2));
    fs.renameSync(tmp, JOBS_FILE);
  }, 200);
}

function updateJob(job, patch) {
  Object.assign(job, patch, { updatedAt: Date.now() });
  save();
  return job;
}

// ---------------------------------------------------------------------------
// Hjelpere
// ---------------------------------------------------------------------------
function baseUrl(req) {
  if (PUBLIC_URL) return PUBLIC_URL;
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'http').split(',')[0];
  const host = String(req.headers['x-forwarded-host'] || req.headers.host).split(',')[0];
  return `${proto}://${host}${BASE_PATH}`;
}

function lanAddresses() {
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((i) => i && i.family === 'IPv4' && !i.internal)
    .map((i) => i.address);
}

function clean(str, max) {
  return String(str || '')
    .replace(/[\u0000-\u001f]/g, ' ')
    .trim()
    .slice(0, max);
}

const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'video/mp4': '.mp4', 'video/quicktime': '.mov', 'video/webm': '.webm', 'audio/mpeg': '.mp3', 'audio/wav': '.wav' };

function saveMedia(buffer, contentType) {
  const name = crypto.randomUUID() + (EXT[contentType] || '');
  fs.writeFileSync(path.join(MEDIA_DIR, name), buffer);
  return `media/${name}`; // relativ: virker både på rot og under BASE_PATH
}

/** Last ned ferdig resultat lokalt, så skjermen fungerer selv om API-lenkene utløper. */
async function mirror(url, fallbackType) {
  if (!url || url.startsWith('media/')) return url;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const type = (res.headers.get('content-type') || fallbackType).split(';')[0];
    const buf = Buffer.from(await res.arrayBuffer());
    return saveMedia(buf, type);
  } catch (err) {
    console.warn('[mirror] beholder ekstern lenke:', err.message);
    return url;
  }
}

function publicJob(job) {
  if (!job) return null;
  const pos = job.type === 'song' ? state.queue.indexOf(job.id) : -1;
  const lane = laneOf(job);
  const wait = job.status === 'waiting' && lane ? waitList(lane).indexOf(job) : -1;
  return {
    id: job.id,
    type: job.type,
    status: job.status,
    stage: job.status === 'processing' && job.provider ? job.provider.stage || null : null,
    guest: job.guest,
    label: job.label,
    emoji: job.emoji,
    createdAt: job.createdAt,
    inputUrl: job.inputUrl,
    text: job.text,
    result: job.result || null,
    error: job.status === 'failed' ? job.error : undefined,
    demo: !!job.demo,
    queuePosition: pos >= 0 ? pos + 1 : null,
    waitPosition: wait >= 0 ? wait + 1 : null,
    waitMinutes: wait >= 0 ? Math.max(1, Math.ceil((Math.floor(wait / lane.max) + 1) * lane.avgMin)) : null,
    nowPlaying: state.nowPlaying === job.id,
    pending: job.approved === false && !job.hidden,
    votes: ((state.votes || {})[job.id] || []).length,
    shownAt: job.shownAt || null,
    featured: (state.featured || []).includes(job.id),
    played: job.type === 'song' && state.played.includes(job.id),
  };
}

// ---------------------------------------------------------------------------
// Opprette jobber
// ---------------------------------------------------------------------------
const deviceLog = new Map(); // deviceId -> [timestamps]

function checkLimits(deviceId, { budget = true } = {}) {
  const used = [...jobs.values()].filter((j) => AI_TYPES.has(j.type)).length;
  if (budget && used >= MAX_JOBS_TOTAL) return 'Maks antall kreasjoner for kvelden er nådd 🎉';
  const now = Date.now();
  const list = (deviceLog.get(deviceId) || []).filter((t) => now - t < 60 * 60 * 1000);
  if (list.length >= MAX_PER_DEVICE) return 'Du har laget mye i det siste! Gi de andre en sjanse og prøv igjen litt senere 😄';
  list.push(now);
  deviceLog.set(deviceId, list);
  return null;
}

// --- Køer: maks antall samtidige jobber hos hver AI-tjeneste ------------------
// Higgsfield (video) og Suno (sang) har hver sin grense. Resten venter i appens egen kø.
const LANES = {
  video: { types: new Set([...VIDEO_TYPES, 'example']), max: HF_MAX_CONCURRENT, avgMin: AVG_VIDEO_MIN, start: (j) => startVideoJob(j), name: 'Higgsfield' },
  song: { types: new Set(['song']), max: SUNO_MAX_CONCURRENT, avgMin: AVG_SONG_MIN, start: (j) => startSongJob(j), name: 'Suno' },
};
const laneOf = (job) => Object.values(LANES).find((l) => l.types.has(job.type));
function waitList(lane) {
  return [...jobs.values()].filter((j) => lane.types.has(j.type) && j.status === 'waiting').sort((a, b) => a.createdAt - b.createdAt);
}
function activeCount(lane) {
  return [...jobs.values()].filter((j) => lane.types.has(j.type) && (j.status === 'processing' || j.status === 'starting')).length;
}
const videoWaitList = () => waitList(LANES.video);
const activeVideoCount = () => activeCount(LANES.video);
const slots = (lane) => ({ active: activeCount(lane), max: lane.max, waiting: waitList(lane).length });

/** Legg jobben i kø. Alt den trenger ligger i jobben/på disk, så køen overlever omstart. */
function enqueue(job, input) {
  updateJob(job, { status: 'waiting', input: { ...job.input, ...input } });
  pumpVideos();
}

let pumping = false;
async function pumpVideos() {
  if (pumping) return;
  pumping = true;
  try {
    for (const lane of Object.values(LANES)) {
      for (const job of waitList(lane)) {
        if (activeCount(lane) >= lane.max) break;
        if (job.retryAt && Date.now() < job.retryAt) continue;
        updateJob(job, { status: 'starting', startedAt: Date.now() });
        lane.start(job).catch((err) => {
          // Kontoen er full (eller midlertidig feil hos tjenesten): tilbake i køen og prøv igjen litt senere.
          if (RATE_LIMITED.test(err.message) && (job.retries || 0) < 20) {
            console.warn(`[${lane.name} ${job.id}] fullt, venter litt:`, err.message.slice(0, 120));
            updateJob(job, { status: 'waiting', retryAt: Date.now() + 20000, retries: (job.retries || 0) + 1 });
          } else {
            fail(job, friendly(err));
          }
        });
      }
    }
  } finally {
    pumping = false;
  }
}

const hookUrl = (job) => (PUBLIC_URL ? `${PUBLIC_URL}/api/hooks/higgsfield?job=${job.id}&t=${job.hookToken}` : undefined);

/**
 * Selfie i to steg: 1) bildefiks (lys + ny bakgrunn som passer effekten), 2) bilde til video.
 * Tegninger og jobber uten fiks går rett til video. Feiler fiksen, brukes originalbildet.
 */
async function startVideoJob(job) {
  if (MCP_MODE) {
    // Arbeideren plukker jobben opp; stage sier hva som gjenstår.
    const fix = job.input.fix;
    updateJob(job, { status: 'processing', provider: { name: 'mcp', stage: fix && fix.prompt && !job.fixedImageUrl ? 'image' : 'video' } });
    return;
  }
  return startApiVideo(job);
}

async function startApiVideo(job) {
  if (!useHiggsfield) {
    updateJob(job, { status: 'processing', demo: true, provider: { name: 'demo', readyAt: Date.now() + demo.VIDEO_DELAY_MS } });
    return;
  }
  const buffer = fs.readFileSync(path.join(MEDIA_DIR, path.basename(job.inputUrl)));
  const imageUrl = job.hfImageUrl || (await higgsfield.upload(buffer, job.input.contentType || 'image/jpeg'));
  if (!job.hfImageUrl) updateJob(job, { hfImageUrl: imageUrl }); // ikke last opp på nytt ved nytt forsøk
  const fix = job.input.fix;
  if (higgsfield.imageFixConfigured() && fix && fix.prompt && !job.fixedImageUrl) {
    const { requestId } = await higgsfield.submitImageFix({ imageUrl, prompt: fix.prompt, aspectRatio: fix.aspectRatio, webhookUrl: hookUrl(job) });
    updateJob(job, { status: 'processing', provider: { name: 'higgsfield', stage: 'image', requestId } });
    return;
  }
  await submitVideo(job, job.fixedImageUrl || (await wideUrl(job)) || imageUrl);
}

/**
 * Uten bildefiks (eller når den feiler) legges originalbildet i en 16:9-ramme med uskarp bakgrunn,
 * så filmen likevel fyller skjermen. Lastes opp én gang og gjenbrukes ved nye forsøk.
 */
async function wideUrl(job) {
  if (VIDEO_ASPECT !== '16:9') return null;
  if (job.hfWideUrl) return job.hfWideUrl;
  const src = path.join(MEDIA_DIR, path.basename(job.inputUrl));
  const out = widen(src, path.join(MEDIA_DIR, `${job.id}-16x9.jpg`));
  if (!out) return null;
  const url = await higgsfield.upload(fs.readFileSync(out), 'image/jpeg');
  updateJob(job, { hfWideUrl: url });
  return url;
}

async function submitVideo(job, imageUrl) {
  const { requestId } = await higgsfield.submitImageToVideo({ imageUrl, prompt: job.input.prompt, webhookUrl: hookUrl(job) });
  updateJob(job, { status: 'processing', provider: { name: 'higgsfield', stage: 'video', requestId } });
}

const RATE_LIMITED = /429|concurren|too many|rate.?limit|limit.*(reached|exceeded)|queue.*full|frequen/i;

/** Steg 2 etter bildefiksen. Er kontoen full akkurat nå, prøver pollJob igjen om litt. */
async function videoAfterFix(job, imageUrl, note) {
  updateJob(job, { provider: { name: 'higgsfield', stage: 'video-pending', imageUrl }, retryAt: 0, ...(note ? { note } : {}) });
  await trySubmitVideo(job);
}

async function trySubmitVideo(job) {
  const p = job.provider;
  if (job.retryAt && Date.now() < job.retryAt) return;
  try {
    await submitVideo(job, p.imageUrl);
  } catch (err) {
    if (RATE_LIMITED.test(err.message) && (job.retries || 0) < 20) {
      console.warn(`[Higgsfield ${job.id}] fullt før videosteget, venter litt:`, err.message.slice(0, 120));
      updateJob(job, { retryAt: Date.now() + 20000, retries: (job.retries || 0) + 1 });
    } else fail(job, friendly(err));
  }
}

async function startSongJob(job) {
  const prompt = job.input.prompt;
  if (!useSuno) {
    updateJob(job, { status: 'processing', demo: true, provider: { name: 'demo', readyAt: Date.now() + demo.SONG_DELAY_MS } });
    return;
  }
  const callBackUrl = PUBLIC_URL ? `${PUBLIC_URL}/api/hooks/suno?job=${job.id}&t=${job.hookToken}` : undefined;
  const { taskId } = await suno.generate({ prompt, callBackUrl });
  updateJob(job, { status: 'processing', provider: { name: 'suno', taskId } });
}

function newJob(type, fields) {
  const job = {
    id: crypto.randomBytes(6).toString('base64url'),
    hookToken: crypto.randomBytes(12).toString('base64url'),
    type,
    status: 'queued',
    createdAt: Date.now(),
    updatedAt: Date.now(),
    ...fields,
  };
  jobs.set(job.id, job);
  save();
  return job;
}

// ---------------------------------------------------------------------------
// Fullføring og polling
// ---------------------------------------------------------------------------
/**
 * Ferdig video: lastes ned lokalt og (unntatt finalen) gjøres om til en frem-og-tilbake-versjon,
 * så den lever lenger på skjermen. Originalen beholdes i result.originalUrl (brukes i kveldens film).
 */
async function completeVideo(job, videoUrl) {
  const noReview = job.type === 'finale' || job.type === 'example';
  updateJob(job, { provider: { ...(job.provider || {}), stage: 'finishing' } }); // nedlasting og ffmpeg tar tid: ikke poll på nytt imens
  const local = await mirror(videoUrl, 'video/mp4');
  const result = { ...(job.result || {}), videoUrl: local, ...(job.type === 'finale' ? { lipsync: true } : {}) };
  if (usePingpong && job.type !== 'finale' && local.startsWith('media/')) {
    const src = path.join(MEDIA_DIR, path.basename(local));
    const name = path.basename(local, path.extname(local)) + '-pp.mp4';
    try {
      await pingpong.build(src, path.join(MEDIA_DIR, name));
      result.originalUrl = local;
      result.videoUrl = 'media/' + name;
    } catch (err) {
      console.warn(`[pingpong ${job.id}] beholder originalen:`, err.message);
    }
  }
  updateJob(job, { status: 'done', result, ...(noReview ? {} : reviewFlag()) });
}


async function completeSong(job, track) {
  updateJob(job, {
    status: 'done',
    result: { audioUrl: track.audioUrl, imageUrl: track.imageUrl, title: track.title || job.label, duration: track.duration, lyrics: track.lyrics || null },
    ...reviewFlag(),
  });
  if (job.approved !== false) queueSong(job);
  const [audioUrl, imageUrl] = await Promise.all([mirror(track.audioUrl, 'audio/mpeg'), mirror(track.imageUrl, 'image/jpeg')]);
  updateJob(job, { result: { ...job.result, audioUrl, imageUrl } });
}

function fail(job, message) {
  console.warn(`[job ${job.id}] feilet: ${message}`);
  if (job.type === 'finale') return finaleFallback(job, message);
  updateJob(job, { status: 'failed', error: message });
  if (laneOf(job)) setImmediate(pumpVideos);
}

const lastPoll = new Map();

async function pollJob(job) {
  const p = job.provider || {};
  // Tidsfristen regnes fra jobben faktisk startet, ikke fra den kom i kø.
  if (Date.now() - (job.startedAt || job.createdAt) > JOB_TIMEOUT_MS) return fail(job, 'Det tok for lang tid. Prøv igjen!');

  if (p.name === 'mcp') return MCP_FALLBACK && mcpToApi(job); // arbeideren leverer via /api/admin/mcp
  if (p.name === 'demo') {
    if (Date.now() < p.readyAt) return;
    if (job.type === 'song') {
      const audioUrl = saveMedia(demo.makeSongWav(job.id), 'audio/wav');
      return completeSong(job, { audioUrl, imageUrl: null, title: `${job.label} (demo)` });
    }
    return updateJob(job, { status: 'done', result: { videoUrl: null, imageUrl: job.inputUrl }, ...(job.type === 'example' ? {} : reviewFlag()) });
  }

  const interval = p.name === 'suno' ? 12000 : 7000;
  if (Date.now() - (lastPoll.get(job.id) || 0) < interval) return;
  lastPoll.set(job.id, Date.now());

  if (p.name === 'higgsfield') {
    if (p.stage === 'video-pending') return trySubmitVideo(job);
    if (p.stage === 'finishing') return;
    const s = await higgsfield.status(p.requestId);
    if (s.status === 'nsfw') return fail(job, 'Bildet ble stoppet av innholdsfilteret. Prøv et annet bilde!');
    const stopped = ['failed', 'canceled', 'cancelled'].includes(s.status);
    if (p.stage === 'image') {
      // Bildefiksen er bonus: går den galt, lages filmen av originalbildet.
      if (s.status === 'completed' && s.imageUrl) {
        const local = await mirror(s.imageUrl, 'image/jpeg');
        updateJob(job, { fixedImageUrl: s.imageUrl, result: { ...(job.result || {}), fixedImageUrl: local } });
        return videoAfterFix(job, s.imageUrl);
      }
      if (s.status === 'completed' || stopped) {
        // Bakgrunnsbyttet er det som gir riktig scene og fyller ut til 16:9, så det prøves én gang til
        // før vi faller tilbake til originalbildet (lagt i en 16:9-ramme).
        if ((job.fixRetries || 0) < 1 && s.status !== 'nsfw') {
          const fix = job.input.fix;
          try {
            const { requestId } = await higgsfield.submitImageFix({ imageUrl: job.hfImageUrl, prompt: fix.prompt, aspectRatio: fix.aspectRatio, webhookUrl: hookUrl(job) });
            updateJob(job, { fixRetries: (job.fixRetries || 0) + 1, provider: { name: 'higgsfield', stage: 'image', requestId } });
            return;
          } catch (err) {
            console.warn(`[bildefiks ${job.id}] nytt forsøk feilet:`, err.message.slice(0, 120));
          }
        }
        const why = s.status === 'completed' ? 'Bildefiks uten bilde i svaret' : `Bildefiks ${s.status}`;
        return videoAfterFix(job, (await wideUrl(job)) || job.hfImageUrl, why);
      }
      return;
    }
    if (s.status === 'completed') {
      if (!s.videoUrl) return fail(job, 'Fikk ikke noe video tilbake.');
      return completeVideo(job, s.videoUrl);
    }
    if (stopped) return fail(job, 'Videoen kunne ikke lages. Prøv igjen!');
  }

  if (p.name === 'suno') {
    const s = await suno.status(p.taskId);
    if (s.failed) return fail(job, s.message || 'Sangen kunne ikke lages. Prøv et annet tema!');
    if (s.done && s.track) return completeSong(job, s.track);
  }
}

/** Arbeideren tok ikke jobben (eller ble ikke ferdig): lag den via API-et. Sene leveranser fra arbeideren avvises. */
async function mcpToApi(job) {
  const reason = mcpFallback.fallbackReason(job, Date.now(), MCP_FALLBACK);
  if (!reason) return;
  const p = job.provider;
  console.warn(`[MCP ${job.id}] ${reason === 'stuck' ? 'arbeideren ble ikke ferdig' : 'ingen arbeider tok jobben'}, bruker API-reserven`);
  try {
    await startApiVideo(job);
    updateJob(job, { startedAt: Date.now(), apiFallback: reason }); // ny tidsfrist fra API-starten
  } catch (err) {
    const tries = (p.fallbackTries || 0) + 1;
    if (tries >= 5 && !RATE_LIMITED.test(err.message)) return fail(job, friendly(err));
    console.warn(`[MCP ${job.id}] API-reserven feilet (${tries}), prøver igjen om ett minutt:`, err.message.slice(0, 120));
    updateJob(job, { provider: { ...p, fallbackTries: tries, fallbackRetryAt: Date.now() + 60000 } });
  }
}

let polling = false;
async function pollAll() {
  if (polling) return;
  polling = true;
  try {
    for (const job of jobs.values()) {
      if (job.status !== 'processing' || job.type === 'clip') continue;
      try {
        await pollJob(job);
      } catch (err) {
        console.warn(`[poll ${job.id}]`, err.message);
      }
    }
  } finally {
    polling = false;
  }
  await pumpVideos(); // ledige plasser? start neste i køen
}
setInterval(pollAll, 3000);

// Jobber som sto i "queued" da serveren stoppet får aldri startet: marker dem som feilet.
for (const job of jobs.values()) {
  if (job.status === 'queued') fail(job, 'Serveren ble startet på nytt. Prøv igjen!');
  // Stoppet midt i innsendingen: vi vet ikke om Higgsfield fikk den, så send på nytt.
  if (job.status === 'starting' && laneOf(job)) updateJob(job, { status: 'waiting' });
  // Stoppet under nedlasting/ffmpeg: hent resultatet fra Higgsfield på nytt
  if (job.status === 'processing' && job.provider && job.provider.stage === 'finishing') updateJob(job, { provider: { ...job.provider, stage: 'video' } });
  if (job.status === 'starting' && job.type === 'finale') setImmediate(() => finaleFallback(job, 'serveren startet på nytt'));
  // Eget klipp som sto midt i omkodingen: filen ligger på disk, så gjør den ferdig
  if (job.type === 'clip' && job.status === 'processing') setImmediate(() => finishClip(job).catch((err) => fail(job, 'Klippet kunne ikke brukes: ' + err.message.slice(0, 80))));
}

// ---------------------------------------------------------------------------
// Express
// ---------------------------------------------------------------------------
const app = express();
app.set('trust proxy', true);
app.disable('x-powered-by');
const r = express.Router(); // alle ruter, montert under BASE_PATH
r.use(express.json({ limit: '200kb' }));
r.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => cb(null, /^image\/(jpeg|png|webp)$/.test(file.mimetype)),
});

// Verten kan logge inn på enheten sin og se hele siden mens «kommer snart» er på (lib/vert.js).
const isVert = (req) => vert.isVert(req.headers.cookie, ADMIN_KEY);
const VERT_BANNER_SKIP = new Set(['snart', 'skjerm']); // TV-en og teaseren skal ikke ha vertsstripen
const vertLimiter = new vert.Limiter();
// Skript og stilark får ?v=<innholdshash> i sidene, så mobilene og Cloudflare henter nye filer etter hver deploy
// (uten dette cacher Cloudflare .js/.css i fire timer). Filer med ?v= kan caches «for alltid», resten må sjekkes hver gang.
const assetVersions = new Map();
function assetVersion(file) {
  let v = process.env.NODE_ENV === 'production' ? assetVersions.get(file) : null;
  if (!v) {
    try { v = crypto.createHash('sha1').update(fs.readFileSync(path.join(__dirname, 'public', file))).digest('hex').slice(0, 10); } catch { v = '0'; }
    assetVersions.set(file, v);
  }
  return v;
}
const versionAssets = (html) => html.replace(/\b(src|href)="([\w./-]+\.(?:js|css))"/g, (m, attr, file) => `${attr}="${file}?v=${assetVersion(file)}"`);
const staticHeaders = (res) => res.setHeader('Cache-Control', res.req.query.v ? 'public, max-age=31536000, immutable' : 'no-cache');

const pageCache = new Map();
const page = (name) => (req, res) => {
  // <base> gjør at alle relative lenker i sidene virker både på rot og under BASE_PATH
  let html = pageCache.get(name);
  if (!html || process.env.NODE_ENV !== 'production') {
    html = versionAssets(fs.readFileSync(path.join(__dirname, 'public', `${name}.html`), 'utf8').replace('<head>', `<head>\n<base href="${BASE_PATH}/">`));
    pageCache.set(name, html);
  }
  // Stripen «Du ser siden som vert» vises bare mens gjestene fortsatt ser teaseren
  if (teaserOn() && !VERT_BANNER_SKIP.has(name) && isVert(req)) html = html.replace('</body>', versionAssets('<script src="vert.js"></script>') + '\n</body>');
  res.type('html').setHeader('Cache-Control', 'no-cache');
  res.send(html);
};

// ?admin=NØKKEL i lenka logger inn som vert og fjerner nøkkelen fra adressen igjen
r.use((req, res, next) => {
  if (typeof req.query.admin !== 'string') return next();
  if (vertLimiter.blocked(req.ip) || !vert.keyMatches(req.query.admin, ADMIN_KEY)) {
    vertLimiter.fail(req.ip);
    return next();
  }
  vertLimiter.reset(req.ip);
  res.setHeader('Set-Cookie', vert.setCookie(ADMIN_KEY, { secure: req.secure }));
  const url = new URL(req.originalUrl, 'http://x');
  url.searchParams.delete('admin');
  res.redirect(303, url.pathname + url.search);
});

const vertStatus = (req) => ({ vert: isVert(req), teaser: teaserOn(), opensAt: teaserConfig.openAt ? new Date(teaserConfig.openAt).toISOString() : null });
r.get('/api/vert', (req, res) => res.json(vertStatus(req)));
r.post('/api/vert/inn', (req, res) => {
  if (!ADMIN_KEY) return res.status(403).json({ error: 'Sett ADMIN_KEY for å logge inn som vert.' });
  if (vertLimiter.blocked(req.ip)) return res.status(429).json({ error: 'For mange forsøk. Vent ti minutter.' });
  if (!vert.keyMatches((req.body || {}).key, ADMIN_KEY)) {
    vertLimiter.fail(req.ip);
    return res.status(401).json({ error: 'Feil nøkkel' });
  }
  vertLimiter.reset(req.ip);
  res.setHeader('Set-Cookie', vert.setCookie(ADMIN_KEY, { secure: req.secure }));
  res.json({ ok: true, ...vertStatus(req), vert: true });
});
r.post('/api/vert/ut', (req, res) => {
  res.setHeader('Set-Cookie', vert.clearCookie());
  res.json({ ok: true, ...vertStatus(req), vert: false });
});

if (teaserConfig.teaser) {
  const open = /^\/(admin(\/|$)|api\/(admin|health|player|queue|kahoot|hooks|vert)(\/|$)|style\.css$|common\.js$|player\.js$|vert\.js$|camera\.js$|stiler\/|lyd$|musikk$|skjerm$|program$|qr(\.svg)?$|api\/(program|config|screen|examples|reactions|qr-info|stamps|react|votes\/mine|screen\/shown)$|api\/mine(\/|$)|api\/jobs\/|media\/|nostalgi\/|spilleliste\/)/;
  const isAdmin = (req) => vert.keyMatches(req.get('x-admin-key'), ADMIN_KEY) || isVert(req);
  r.use((req, res, next) => (!teaserOn() || open.test(req.path) || isAdmin(req) ? next() : page('snart')(req, res)));
}
r.get('/', page('index'));
r.get('/tegning', page('tegning'));
r.get('/sang', page('sang'));
r.get('/selfie', page('selfie'));
r.get('/status/:id', page('status'));
r.get('/skjerm', page('skjerm'));
r.get('/qr', page('qr'));
r.get('/admin', page('admin'));
r.get('/quiz', page('quiz'));
r.get('/hilsen', page('hilsen'));
r.get('/klipp', page('klipp'));
r.get('/mine', page('mine'));
r.use(express.static(path.join(__dirname, 'public'), { index: false, setHeaders: staticHeaders }));
r.use('/media', express.static(MEDIA_DIR, { maxAge: '7d', immutable: true }));
r.use('/nostalgi', express.static(NOSTALGIA_DIR, { maxAge: '1h' }));
r.use('/spilleliste', express.static(PLAYLIST_DIR, { maxAge: '1h' }));

r.get('/api/config', (req, res) => {
  res.json({
    birthdayName: BIRTHDAY_NAME,
    partyTitle: PARTY_TITLE,
    drawingStyles: DRAWING_STYLES.map(({ id, name, emoji, thumb }) => ({ id, name, emoji, thumb: thumb && fs.existsSync(path.join(__dirname, 'public', thumb)) ? thumb : undefined })),
    selfieEffects: SELFIE_EFFECTS.map(({ id, name, emoji, framing, thumb }) => ({ id, name, emoji, framing, thumb: thumb && fs.existsSync(path.join(__dirname, 'public', thumb)) ? thumb : undefined })),
    framing: FRAMING,
    videoSeconds: higgsfield.VIDEO_SECONDS,
    imageFix: useImageFix,
    maxClipSeconds: clip.MAX_CLIP_SECONDS,
    songGenres: SONG_GENRES,
    songMoods: SONG_MOODS,
    schedule: schedule(),
    greetingPrompts: PARTY.greetingPrompts,
    songIdeas: PARTY.songIdeas,
    drawingIdeas: PARTY.drawingIdeas,
    helpPlaces: PARTY.helpPlaces,
    age: PARTY.birthYear ? new Date().getFullYear() - PARTY.birthYear : null,
    demo: { video: !useHiggsfield, song: !useSuno },
  });
});

r.get('/qr.svg', async (req, res) => {
  const target = String(req.query.path || '/');
  const query = String(req.query.q || '');
  if (!/^\/[a-z0-9/_-]*$/i.test(target) || !/^[a-z0-9=&_-]*$/i.test(query)) return res.status(400).end();
  const svg = await QRCode.toString(baseUrl(req) + target + (query ? `?${query}` : ''), { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
  res.type('image/svg+xml').setHeader('Cache-Control', 'no-cache');
  res.send(svg);
});

r.get('/api/qr-info', (req, res) => {
  const base = baseUrl(req);
  const local = /localhost|127\.0\.0\.1/.test(base);
  res.json({ base, local, lan: lanAddresses().map((ip) => `http://${ip}:${PORT}${BASE_PATH}`) });
});

// Tegning -> film
r.post('/api/drawing', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Fant ikke noe bilde. Prøv igjen!' });
  const limit = checkLimits(clean(req.body.deviceId, 64) || req.ip);
  if (limit) return res.status(429).json({ error: limit });

  const style = DRAWING_STYLES.find((s) => s.id === req.body.style) || DRAWING_STYLES[0];
  const description = clean(req.body.description, 300);
  const prompt = style.prompt(description);
  const inputUrl = saveMedia(req.file.buffer, req.file.mimetype);
  const job = newJob('drawing', { deviceId: clean(req.body.deviceId, 64), guest: clean(req.body.name, 40), label: style.name, emoji: style.emoji, inputUrl, input: { style: style.id, description } });

  res.json({ id: job.id });
  enqueue(job, { prompt, contentType: req.file.mimetype, fix: drawingFixFor(req.file.buffer) });
});

/** Tegninger beskjæres til arket før videoen, så bordet og hendene ikke blir med. */
function drawingFixFor(buffer) {
  const dim = imageSize(buffer);
  // A4 er 1:1,41; stående ark blir 3:4-ish, liggende 4:3-ish
  if (VIDEO_ASPECT !== 'auto') return { prompt: drawingImagePrompt(VIDEO_ASPECT), aspectRatio: VIDEO_ASPECT };
  return { prompt: drawingImagePrompt(), aspectRatio: dim && dim.width > dim.height ? '4:3' : '3:4' };
}

// Selfie -> effekt
r.post('/api/selfie', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Fant ikke noe bilde. Prøv igjen!' });
  const limit = checkLimits(clean(req.body.deviceId, 64) || req.ip);
  if (limit) return res.status(429).json({ error: limit });

  const effect = selfieVariant(req.body.effect);
  const wish = clean(req.body.wish, 120); // valgfritt ønske fra gjesten, flettes inn i filmprompten
  const inputUrl = saveMedia(req.file.buffer, req.file.mimetype);
  const job = newJob('selfie', { deviceId: clean(req.body.deviceId, 64), guest: clean(req.body.name, 40), label: effect.name, emoji: effect.emoji, inputUrl, input: { effect: effect.id, variant: effect.variant, ...(wish ? { wish } : {}) } });

  res.json({ id: job.id });
  enqueue(job, { prompt: selfiePrompt(effect, wish), contentType: req.file.mimetype, fix: imageFixFor(effect, req.file.buffer) });
});

/** Filmprompt for selfie: effektens prompt, pluss gjestens eget ønske (på norsk) hvis det er gitt. */
function selfiePrompt(effect, wish) {
  if (!wish) return effect.prompt;
  return `${effect.prompt} The guest also asked for this (written in Norwegian), include it if it fits the scene: "${wish.replace(/"/g, "'")}".`;
}

// Samme effekt gir ulike scener og vrier fra gang til gang, og aldri den samme to ganger på rad
const lastVariant = new Map();
function selfieVariant(id) {
  const base = SELFIE_EFFECTS.find((e) => e.id === id) || SELFIE_EFFECTS[0];
  const effect = pickVariant(base, { avoid: lastVariant.get(base.id) });
  lastVariant.set(base.id, effect.variant);
  return effect;
}

/** Bildefiksen trenger prompt og et sideforhold som ligner bildet (ellers blir alt kvadratisk). */
function imageFixFor(effect, buffer) {
  const prompt = imagePrompt(effect, VIDEO_ASPECT);
  if (!prompt) return null;
  if (VIDEO_ASPECT !== 'auto') return { prompt, aspectRatio: VIDEO_ASPECT };
  const dim = imageSize(buffer);
  return { prompt, aspectRatio: dim ? nearestAspect(dim.width, dim.height, higgsfield.IMAGE_ASPECTS) : '3:4' };
}

// Sang
r.post('/api/song', async (req, res) => {
  const b = req.body || {};
  const limit = checkLimits(clean(b.deviceId, 64) || req.ip);
  if (limit) return res.status(429).json({ error: limit });

  // Sangen kan handle om hva som helst. «Til» er valgfritt: da synges navnet i refrenget.
  const to = clean(b.to, 40);
  // «En sang om hunden min.» → «hunden min» (unngår «om: En sang om …» og doble punktum)
  const about = clean(b.about, 220).replace(/^(en\s+)?(sang|låt)\s+om\s+/i, '').replace(/[\s.!]+$/, '');
  const genre = SONG_GENRES.includes(b.genre) ? b.genre : SONG_GENRES[0];
  const mood = SONG_MOODS.includes(b.mood) ? b.mood : SONG_MOODS[0];
  const from = clean(b.name, 40);

  // sunoapi.org (ikke-custom modus) tillater maks 500 tegn i prompt.
  const prompt = clean(
    `En ${mood.toLowerCase()} ${genre.toLowerCase()}-låt på norsk` +
      (about ? ` om: ${about}.` : ' om noe morsomt og overraskende.') +
      (to ? ` Sangen er til ${to}, og navnet ${to} synges i et fengende refreng.` : ' Med et fengende refreng.'),
    490,
  );
  const job = newJob('song', { deviceId: clean(b.deviceId, 64), guest: from, label: to ? `${genre} til ${to}` : `${genre}: ${about ? about.slice(0, 40) + (about.length > 40 ? '…' : '') : 'overraskelse'}`, emoji: '🎵', input: { to, about, genre, mood } });

  res.json({ id: job.id });
  enqueue(job, { prompt });
});

function friendly(err) {
  console.warn('[api]', err.message);
  if (/credit|balance|insufficient|402/i.test(err.message)) return 'Tom for kreditter hos AI-tjenesten 😬 Si fra til verten!';
  return 'Noe gikk galt hos AI-tjenesten. Prøv igjen om litt!';
}

// --- Eksempelfilmer per stil/effekt (forhåndsvisning før man velger) ---------
// Kilde: nyeste godkjente gjestefilm i den stilen, ellers eksempel verten har laget i admin.
function examplesView() {
  const out = { drawing: {}, selfie: {} };
  const all = [...jobs.values()].filter((j) => j.status === 'done' && j.result && j.result.videoUrl).sort((a, b) => b.updatedAt - a.updatedAt);
  for (const j of all) {
    if (j.type === 'example') {
      const slot = out[j.input.kind];
      if (slot && !slot[j.input.ref]) slot[j.input.ref] = { url: j.result.videoUrl, source: 'eksempel' };
    }
  }
  // Gjestefilmer går foran vertens eksempler (de er mer morsomme å se)
  for (const j of all) {
    if (!onScreen(j) || !VIDEO_TYPES.has(j.type)) continue;
    const ref = j.type === 'drawing' ? j.input.style : j.input.effect;
    const slot = out[j.type];
    if (ref && (!slot[ref] || slot[ref].source === 'eksempel')) slot[ref] = { url: j.result.videoUrl, source: 'gjest', guest: j.guest || '' };
  }
  return out;
}
r.get('/api/examples', (req, res) => res.json(examplesView()));

r.get('/api/jobs/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Fant ikke denne.' });
  res.json(publicJob(job));
});

// Skjerm
r.get('/api/screen', (req, res) => {
  const visible = [...jobs.values()].filter(onScreen);
  const gallery = visible
    .filter((j) => SHOWN_VIDEO_TYPES.has(j.type) || j.type === 'greeting')
    .filter((j) => j.status === 'done')
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 60)
    .map(publicJob);
  const songs = (ids) => ids.map((id) => jobs.get(id)).filter((j) => j && onScreen(j)).map(publicJob);
  const inProgress = [...jobs.values()].filter((j) => !j.hidden && AI_TYPES.has(j.type)).filter((j) => ['processing', 'queued', 'starting', 'waiting'].includes(j.status));
  const working = inProgress.length;
  const making = inProgress
    .filter((j) => VIDEO_TYPES.has(j.type) || j.type === 'song')
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(0, 5)
    .map((j) => ({ guest: j.guest, emoji: j.emoji, label: j.label, waiting: j.status === 'waiting' }));
  const nostalgia = nostalgiaFiles().map((f) => {
    const { year, title } = party.parseName(f);
    return { id: 'n:' + f, type: 'nostalgia', emoji: '🕰️', label: year ? String(year) : title, guest: year ? title : '', result: { imageUrl: 'nostalgi/' + encodeURIComponent(f) } };
  });
  const playlist = playlistFiles().map((f) => {
    const { year, title } = party.parseName(f);
    return { id: 'p:' + f, year, title, url: 'spilleliste/' + encodeURIComponent(f) };
  });
  const featured = (state.featured || []).map((id) => jobs.get(id)).filter((j) => j && onScreen(j) && j.status === 'done').map(publicJob);
  res.json({
    featured,
    nostalgia,
    playlist,
    schedule: schedule(),
    programNote: (state.program && state.program.note) || '',
    allDay: allDay(),
    takeover: takeoverView(),
    playing: playerReport(),
    serverNow: Date.now(),
    gallery,
    nowPlaying: state.nowPlaying && !jobs.get(state.nowPlaying)?.hidden ? publicJob(jobs.get(state.nowPlaying)) : null,
    queue: songs(state.queue),
    played: songs(state.played).slice(-30),
    working,
    making,
    videoSlots: slots(LANES.video),
    songSlots: slots(LANES.song),
  });
});

// Lydkilden sier fra når en sang er ferdig spilt. Svarer med neste sang:
// gjestesang fra køen → årsspillelisten (kronologisk) → reprise av gjestesanger.
function playlistEntries() {
  return playlistFiles().map((f) => {
    const { year, title } = party.parseName(f);
    return { id: 'p:' + f, kind: 'playlist', year, title, url: 'spilleliste/' + encodeURIComponent(f) };
  });
}

function nextSong(finished) {
  if (finished && finished === state.nowPlaying) {
    state.played.push(finished);
    state.nowPlaying = null;
  }
  if (!state.nowPlaying) {
    while (state.queue.length) {
      const j = jobs.get(state.queue.shift());
      if (j && onScreen(j)) {
        state.nowPlaying = j.id;
        break;
      }
    }
  }
  save();
  if (state.nowPlaying) return publicJob(jobs.get(state.nowPlaying));
  const list = playlistEntries();
  if (list.length) {
    const song = list[state.playlistIndex % list.length];
    state.playlistIndex = (state.playlistIndex + 1) % list.length;
    return song;
  }
  const played = state.played.map((id) => jobs.get(id)).filter((j) => j && onScreen(j));
  if (played.length) return { ...publicJob(played[Math.floor(Math.random() * played.length)]), kind: 'reprise' };
  return null;
}

r.post('/api/queue/next', (req, res) => {
  const b = req.body || {};
  if (b.playerId && b.playerId !== state.player.id) return res.json({ song: null, inactive: true });
  res.json({ song: nextSong(String(b.finished || '')) });
});

// --- Lydkilden (musikkskjermen) ---------------------------------------------
function playerReport() {
  const rep = state.player.report;
  return rep && Date.now() - rep.at < 12000 ? rep : null;
}

/** Under kaketid (bursdagssang), hilsener og finale stopper musikken; under quizen senkes den. */
function playerMix() {
  const mode = state.takeover && state.takeover.mode;
  return { forcePause: ['cake', 'greetings', 'finale', 'film'].includes(mode), duck: ['kahoot', 'stamp', 'favorites'].includes(mode) ? 0.25 : 1 };
}

r.post('/api/player/claim', (req, res) => {
  const id = clean((req.body || {}).playerId, 64);
  if (!id) return res.status(400).end();
  state.player.id = id;
  save();
  res.json({ ok: true });
});

function finaleForPlayer() {
  const t = state.takeover;
  if (t && t.mode === 'film' && state.film && state.film.url) return { key: String(t.at), url: state.film.url, startAt: t.startAt };
  if (!t || t.mode !== 'finale') return null;
  const f = jobs.get(state.finaleId);
  if (!f || f.status !== 'done') return null;
  // Med lipsync ligger lyden i videoen (den spilles som lyd på mobilen); uten lipsync spilles sangen.
  return { key: String(t.at), url: f.result.lipsync ? f.result.videoUrl : f.result.audioUrl, startAt: t.startAt };
}

r.get('/api/player', (req, res) => {
  const p = state.player;
  res.json({
    serverNow: Date.now(),
    finale: finaleForPlayer(),
    active: !!p.id && req.query.playerId === p.id,
    paused: p.paused,
    volume: p.volume,
    seq: p.seq,
    cmd: p.cmd,
    queueLength: state.queue.length,
    ...playerMix(),
  });
});

r.post('/api/player/report', (req, res) => {
  const b = req.body || {};
  if (b.playerId !== state.player.id) return res.json({ active: false });
  const now = b.now && typeof b.now === 'object' ? b.now : null;
  state.player.report = {
    at: Date.now(),
    now: now && { id: clean(now.id, 200), kind: clean(now.kind, 20), title: clean(now.title, 120), guest: clean(now.guest, 40), label: clean(now.label, 80), year: Number(now.year) || null, imageUrl: clean(now.imageUrl, 300) },
    position: Number(b.position) || 0,
    duration: Number(b.duration) || 0,
    paused: !!b.paused,
    source: clean(b.source, 20) || 'skjerm',
  };
  res.json({ active: true });
});

// Låseskjerm/Bluetooth-knapper på mobilen (Media Session) styrer det samme som admin
r.post('/api/player/control', (req, res) => {
  const b = req.body || {};
  if (!state.player.id || b.playerId !== state.player.id) return res.status(403).json({ active: false });
  if (b.action === 'pause') state.player.paused = true;
  else if (b.action === 'play') state.player.paused = false;
  else if (b.action === 'skip') sendCommand({ type: 'skip' });
  else return res.status(400).end();
  save();
  res.json({ ok: true });
});

// --- Kahoot-quiz --------------------------------------------------------------
r.get('/api/kahoot', (req, res) => {
  res.json(kahoot.playerView(clean(req.query.deviceId, 64)));
});
r.get('/api/kahoot/screen', (req, res) => res.json(kahoot.screenView()));
r.post('/api/kahoot/join', (req, res) => {
  const deviceId = clean((req.body || {}).deviceId, 64);
  const name = clean((req.body || {}).name, 24);
  if (!deviceId || !name) return res.status(400).json({ error: 'Skriv navnet ditt først!' });
  kahoot.join(deviceId, name);
  save();
  res.json(kahoot.playerView(deviceId));
});
r.post('/api/kahoot/answer', (req, res) => {
  const b = req.body || {};
  const ok = kahoot.answer(clean(b.deviceId, 64), Number(b.q), Number(b.choice));
  if (ok) {
    kahoot.tick();
    save();
  }
  res.json({ ok, ...kahoot.playerView(clean(b.deviceId, 64)) });
});
setInterval(() => {
  if (kahoot.tick()) save();
}, 400);

// Webhooks (brukes når PUBLIC_URL er satt; polling er alltid backup)
r.post('/api/hooks/:provider', (req, res) => {
  const job = jobs.get(String(req.query.job || ''));
  if (!job || req.query.t !== job.hookToken) return res.status(404).end();
  res.json({ ok: true });
  lastPoll.delete(job.id); // poll umiddelbart for å hente fasit fra API-et
  pollJob(job).catch((err) => console.warn('[hook]', err.message));
});

// --- Program (kan oppdateres fra admin underveis) --------------------------------
function schedule() {
  return (state.program && state.program.schedule) || PARTY.schedule;
}
/** Det som gjelder hele dagen (mat o.l.), uten klokkeslett. */
function allDay() {
  return (state.program && state.program.allDay) || PARTY.allDay;
}
function venue() {
  return { ...PARTY.venue, ...((state.program && state.program.venue) || {}) };
}
r.get('/api/program', (req, res) => {
  res.json({
    schedule: schedule(),
    allDay: allDay(),
    note: (state.program && state.program.note) || '',
    updatedAt: (state.program && state.program.updatedAt) || null,
    venue: venue(),
    partyTitle: PARTY_TITLE,
    serverNow: Date.now(),
  });
});

// --- «Jeg trenger hjelp»: gjesten roper på en hjelper, verten ser det i admin ---
r.post('/api/help', (req, res) => {
  const b = req.body || {};
  const deviceId = clean(b.deviceId, 64);
  if (!deviceId) return res.status(400).end();
  state.help = (state.help || []).filter((h) => Date.now() - h.at < 6 * 3600 * 1000);
  // Én åpen forespørsel per enhet (oppdateres hvis de trykker igjen)
  let h = state.help.find((x) => x.deviceId === deviceId && x.status !== 'done');
  if (!h) {
    h = { id: crypto.randomBytes(5).toString('base64url'), deviceId, status: 'open' };
    state.help.push(h);
  }
  Object.assign(h, { name: clean(b.name, 40), place: clean(b.place, 40), page: clean(b.page, 20), what: clean(b.what, 120), at: Date.now() });
  save();
  res.json({ id: h.id, status: h.status });
});
r.get('/api/help/:id', (req, res) => {
  const h = (state.help || []).find((x) => x.id === req.params.id);
  res.json(h ? { status: h.status } : { status: 'done' });
});
r.post('/api/help/:id/cancel', (req, res) => {
  const h = (state.help || []).find((x) => x.id === req.params.id);
  if (h && h.deviceId === clean((req.body || {}).deviceId, 64)) { h.status = 'done'; save(); }
  res.json({ ok: true });
});

// --- Emoji-reaksjoner fra mobilen til skjermen --------------------------
const REACTIONS = ['❤️', '😂', '🔥', '🎉', '😮', '👏', '🥳', '😍'];
const reactions = []; // { seq, e }
let reactSeq = 0;
const reactLog = new Map(); // deviceId -> [tider]
r.post('/api/react', (req, res) => {
  const b = req.body || {};
  if (!REACTIONS.includes(b.e)) return res.status(400).end();
  const dev = clean(b.deviceId, 64) || req.ip;
  const now = Date.now();
  const list = (reactLog.get(dev) || []).filter((t) => now - t < 10000);
  if (list.length >= 15) return res.status(429).json({ ok: false }); // maks 15 per 10 sek per mobil
  list.push(now);
  reactLog.set(dev, list);
  reactions.push({ seq: ++reactSeq, e: b.e });
  if (reactions.length > 300) reactions.splice(0, reactions.length - 300);
  res.json({ ok: true });
});
r.get('/api/reactions', (req, res) => {
  const after = Number(req.query.after);
  if (!Number.isFinite(after) || after < 0) return res.json({ seq: reactSeq, list: [] }); // første kall: bare posisjon
  res.json({ seq: reactSeq, list: reactions.filter((x) => x.seq > after).slice(-60).map((x) => x.e) });
});

// --- Stempelkort: tegning + sang + selfie = med i trekningen ------------------
const STAMP_TYPES = ['drawing', 'song', 'selfie'];
function stampsFor(deviceId) {
  const mine = [...jobs.values()].filter((j) => j.deviceId && j.deviceId === deviceId && j.status !== 'failed' && !j.hidden);
  const has = (t) => mine.some((j) => j.type === t);
  const name = (mine.filter((j) => j.guest).sort((a, b) => b.createdAt - a.createdAt)[0] || {}).guest || '';
  return { drawing: has('drawing'), song: has('song'), selfie: has('selfie'), greeting: has('greeting'), quiz: !!(kahoot.state.players || {})[deviceId], name };
}
function stampEligible() {
  const devices = new Set([...jobs.values()].map((j) => j.deviceId).filter(Boolean));
  return [...devices].map((d) => ({ deviceId: d, ...stampsFor(d) })).filter((s) => STAMP_TYPES.every((t) => s[t])).map((s) => ({ deviceId: s.deviceId, name: s.name || 'Hemmelig gjest' }));
}
r.get('/api/stamps', (req, res) => {
  const s = stampsFor(clean(req.query.deviceId, 64));
  res.json({ ...s, complete: STAMP_TYPES.every((t) => s[t]), entries: stampEligible().length });
});

// --- Stem på favoritter (ett hjerte per mobil per kreasjon) -----------------
function favorites(n) {
  return [...jobs.values()]
    .filter((j) => SHOWN_VIDEO_TYPES.has(j.type) && j.status === 'done' && onScreen(j))
    .map((j) => ({ j, v: ((state.votes || {})[j.id] || []).length }))
    .filter((x) => x.v > 0)
    .sort((a, b) => b.v - a.v || a.j.createdAt - b.j.createdAt)
    .slice(0, n)
    .map(({ j, v }) => ({ ...publicJob(j), votes: v }));
}
r.post('/api/vote', (req, res) => {
  const b = req.body || {};
  const dev = clean(b.deviceId, 64);
  const job = jobs.get(String(b.id || ''));
  if (!dev || !job || !onScreen(job) || job.status !== 'done') return res.status(400).end();
  state.votes = state.votes || {};
  const list = new Set(state.votes[job.id] || []);
  if (list.has(dev)) list.delete(dev);
  else list.add(dev);
  state.votes[job.id] = [...list];
  save();
  res.json({ votes: list.size, mine: list.has(dev) });
});
r.get('/api/votes/mine', (req, res) => {
  const dev = clean(req.query.deviceId, 64);
  res.json({ ids: Object.entries(state.votes || {}).filter(([, l]) => l.includes(dev)).map(([id]) => id) });
});

// --- Mine ting: gjesten ser alt sitt og kan sende film til skjermen eller sang til høyttaleren -------
// Skjermen kvitterer for hvert lysbilde, så gjesten ser «Vist på skjermen kl. …».
r.post('/api/screen/shown', (req, res) => {
  const job = jobs.get(String((req.body || {}).id || ''));
  if (job) {
    mine.markShown(state, job);
    save();
  }
  res.json({ ok: true });
});
const ownJob = (req) => {
  const dev = clean((req.body || {}).deviceId || req.query.deviceId, 64);
  const job = jobs.get(String(req.params.id));
  return dev && job && job.deviceId === dev && !job.hidden ? job : null;
};
r.get('/api/mine', (req, res) => {
  const dev = clean(req.query.deviceId, 64);
  const list = dev
    ? [...jobs.values()].filter((j) => j.deviceId === dev && !j.hidden).sort((a, b) => b.createdAt - a.createdAt).map(publicJob)
    : [];
  res.json({ jobs: list });
});
r.post('/api/mine/:id/screen', (req, res) => {
  const job = ownJob(req);
  if (!job || !(SHOWN_VIDEO_TYPES.has(job.type) || job.type === 'greeting')) return res.status(404).json({ error: 'Fant ikke denne' });
  if (job.status !== 'done' || !onScreen(job)) return res.status(409).json({ error: 'Den er ikke klar for skjermen ennå' });
  const r = mine.requestFeature(state, job);
  if (!r.ok) return res.status(429).json({ error: `Den ble nettopp vist. Prøv igjen om ${r.waitSeconds} sekunder`, ...r });
  save();
  res.json({ ...r, job: publicJob(job) });
});
r.post('/api/mine/:id/play', (req, res) => {
  const job = ownJob(req);
  if (!job || job.type !== 'song') return res.status(404).json({ error: 'Fant ikke denne' });
  if (job.status !== 'done' || !onScreen(job)) return res.status(409).json({ error: 'Sangen er ikke klar ennå' });
  const r = mine.requeueSong(state, job);
  save();
  res.json({ ...r, job: publicJob(job) });
});

// Gjestebok med vri: korte hilsener som vises på skjermen
r.post('/api/greeting', (req, res) => {
  const b = req.body || {};
  const limit = checkLimits(clean(b.deviceId, 64) || req.ip, { budget: false });
  if (limit) return res.status(429).json({ error: limit });
  const text = clean(b.text, 200);
  if (text.length < 2) return res.status(400).json({ error: 'Skriv litt først 😊' });
  const prompt = PARTY.greetingPrompts.find((g) => g.id === b.prompt) || PARTY.greetingPrompts[0] || { name: 'Hilsen', emoji: '💌' };
  const job = newJob('greeting', { status: 'done', ...reviewFlag(), deviceId: clean(b.deviceId, 64), guest: clean(b.name, 40), label: prompt.name, emoji: prompt.emoji, text });
  res.json({ id: job.id });
});

// --- Eget klipp: gjesten filmer maks 15 sekunder selv, uten AI ---------------
// Mobilvideo er ofte HEVC/.mov, så klippet kodes om til H.264 og kuttes til grensen, får et stillbilde,
// og vises frem og tilbake som de andre filmene.
const clipUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 200 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => cb(null, /^video\/(mp4|quicktime|webm|x-m4v)$/.test(file.mimetype)),
});
const mediaPath = (url) => path.join(MEDIA_DIR, path.basename(url));

r.post('/api/clip', clipUpload.single('video'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Fant ikke noe klipp. Velg en video (mp4 eller mov)!' });
  const limit = checkLimits(clean(req.body.deviceId, 64) || req.ip, { budget: false });
  if (limit) return res.status(429).json({ error: limit });
  const type = { 'video/quicktime': 'video/quicktime', 'video/webm': 'video/webm' }[req.file.mimetype] || 'video/mp4';
  const sourceUrl = saveMedia(req.file.buffer, type);
  const job = newJob('clip', { status: 'processing', startedAt: Date.now(), deviceId: clean(req.body.deviceId, 64), guest: clean(req.body.name, 40), label: 'Eget klipp', emoji: '🎥', inputUrl: sourceUrl, sourceUrl, input: {} });
  res.json({ id: job.id });
  finishClip(job).catch((err) => {
    console.warn(`[clip ${job.id}]`, err.message);
    fail(job, 'Klippet kunne ikke brukes. Prøv et annet!');
  });
});

async function finishClip(job) {
  let videoUrl = job.sourceUrl;
  const extra = {};
  if (useClipTranscode) {
    const base = path.basename(job.sourceUrl, path.extname(job.sourceUrl));
    const out = `${base}-h264.mp4`, poster = `${base}-bilde.jpg`;
    const r2 = await clip.prepare(mediaPath(job.sourceUrl), path.join(MEDIA_DIR, out), path.join(MEDIA_DIR, poster), { wide: VIDEO_ASPECT === '16:9' });
    videoUrl = 'media/' + out;
    extra.seconds = Math.round(r2.seconds * 10) / 10;
    extra.trimmed = r2.trimmed;
    if (r2.poster) updateJob(job, { inputUrl: 'media/' + poster }); // stillbilde: bakgrunn på skjermen og celle i galleriet
  }
  updateJob(job, { result: { ...(job.result || {}), ...extra } });
  await completeVideo(job, videoUrl);
}

// Felles høydepunkt: skjermen tar over (kaketid, quiz-trekning, hilsener høyt)
function takeoverView() {
  const t = state.takeover;
  if (!t) return null;
  if (t.mode === 'finale') {
    const f = jobs.get(state.finaleId);
    // Lyden går fra mobilen hvis den er på, ellers fra skjermen
    return { ...t, audioOnScreen: !playerReport(), finale: f && f.status === 'done' ? { ...f.result, song: publicJob(jobs.get(f.input.songId)) } : null };
  }
  if (t.mode === 'film') {
    const f = state.film;
    return { ...t, audioOnScreen: !playerReport(), finale: f && f.url ? { videoUrl: f.url, lipsync: true, heading: '🎞️ Kveldens film', sub: `Alt dere har laget i dag, på ${Math.round(f.seconds || 0)} sekunder` } : null };
  }
  if (t.mode === 'stamp' || t.mode === 'favorites') return t;
  if (t.mode === 'greetings') {
    const list = [...jobs.values()].filter((j) => j.type === 'greeting' && !j.hidden).sort((a, b) => a.createdAt - b.createdAt).map(publicJob);
    return { ...t, greetings: list };
  }
  return t;
}

// Admin: skjul upassende ting fra skjermen, eller flytt sanger
function requireAdmin(req, res, next) {
  if (!ADMIN_KEY) return res.status(403).json({ error: 'Sett ADMIN_KEY for å bruke admin.' });
  const key = req.get('x-admin-key') || '';
  const a = Buffer.from(key);
  const b = Buffer.from(ADMIN_KEY);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return res.status(401).json({ error: 'Feil nøkkel' });
  next();
}

r.get('/api/admin/jobs', requireAdmin, (req, res) => {
  const list = [...jobs.values()].sort((a, b) => b.createdAt - a.createdAt).map((j) => ({ ...publicJob(j), hidden: !!j.hidden, error: j.error }));
  res.json({ jobs: list, queue: state.queue, nowPlaying: state.nowPlaying });
});

r.get('/api/admin/party', requireAdmin, (req, res) => {
  res.json({
    takeover: state.takeover ? state.takeover.mode : null,
    quiz: { example: PARTY.quiz.example, questions: PARTY.quiz.questions.length },
    kahoot: kahoot.adminView(),
    player: { online: !!playerReport(), ...playerReport() },
    videoSlots: slots(LANES.video),
    songSlots: slots(LANES.song),
    usage: {
      videos: [...jobs.values()].filter((j) => VIDEO_TYPES.has(j.type)).length,
      songs: [...jobs.values()].filter((j) => j.type === 'song').length,
      max: MAX_JOBS_TOTAL,
    },
    moderation: state.moderation,
    pending: [...jobs.values()].filter((j) => j.approved === false && !j.hidden).length,
    examples: (() => {
      const ex = [...jobs.values()].filter((j) => j.type === 'example');
      const count = (k, st) => ex.filter((j) => j.input.kind === k && (!st || st.includes(j.status))).length;
      return ['drawing', 'selfie'].map((k) => ({ kind: k, total: count(k), done: count(k, ['done']), working: count(k, ['waiting', 'starting', 'processing']), failed: count(k, ['failed']) }));
    })(),
    finale: (() => {
      const f = jobs.get(state.finaleId);
      return f ? { status: f.status, lipsync: !!(f.result && f.result.lipsync), note: f.note || null, error: f.error || null } : null;
    })(),
    lipsyncConfigured: higgsfield.lipsyncConfigured(),
    film: state.film ? { status: state.film.status, progress: state.film.progress, url: state.film.url, seconds: state.film.seconds, clips: state.film.clips, error: state.film.error } : null,
    filmAvailable: film.available(),
    stamps: stampEligible().length,
    topVotes: favorites(5).map((f) => ({ id: f.id, label: f.label, guest: f.guest, votes: f.votes })),
    help: (state.help || []).filter((h) => h.status !== 'done').map(({ id, name, place, page, what, at, status }) => ({ id, name, place, page, what, at, status })),
    songs: [...jobs.values()].filter((j) => j.type === 'song' && j.status === 'done' && !j.hidden).map((j) => ({ id: j.id, title: (j.result && j.result.title) || j.label, guest: j.guest })),
    videos: [...jobs.values()].filter((j) => SHOWN_VIDEO_TYPES.has(j.type) && j.status === 'done' && !j.hidden && j.result && j.result.videoUrl).map((j) => ({ id: j.id, label: j.label, guest: j.guest })),
    nostalgia: nostalgiaFiles().length,
    playlist: playlistFiles().length,
  });
});

r.post('/api/admin/takeover', requireAdmin, (req, res) => {
  const mode = (req.body || {}).mode;
  if (mode === 'off') state.takeover = null;
  else if (mode === 'cake') state.takeover = { mode, at: Date.now(), title: 'Kaketid!' };
  else if (mode === 'greetings') state.takeover = { mode, at: Date.now() };
  else if (mode === 'film') {
    if (!state.film || !state.film.url) return res.status(409).json({ error: 'Kveldens film er ikke laget ennå.' });
    state.takeover = { mode, at: Date.now(), startAt: Date.now() + 5000 };
  } else if (mode === 'stamp') {
    const el = stampEligible();
    const winner = el.length ? el[Math.floor(Math.random() * el.length)] : null;
    state.takeover = { mode, at: Date.now(), winner: winner && winner.name, count: el.length, names: el.map((e) => e.name).sort(() => Math.random() - 0.5).slice(0, 40) };
  } else if (mode === 'favorites') {
    state.takeover = { mode, at: Date.now(), top: favorites(3) };
  } else if (mode === 'finale') {
    const f = jobs.get(state.finaleId);
    if (!f || f.status !== 'done') return res.status(409).json({ error: 'Finalen er ikke klar ennå.' });
    // Felles starttid, så skjermen (video) og mobilen (lyd) starter i takt
    state.takeover = { mode, at: Date.now(), startAt: Date.now() + 6000 };
  }
  else return res.status(400).json({ error: 'Ukjent modus' });
  if (mode !== 'off' && kahoot.state.phase) kahoot.end(); // noe annet tar over skjermen
  save();
  res.json({ ok: true });
});

// --- MCP-arbeideren: henter jobber som venter på bilde/film og leverer resultatet ---------------
const absUrl = (req, rel) => (rel && !/^https?:/.test(rel) ? `${baseUrl(req)}/${rel}` : rel);
function mcpJobView(req, j) {
  const p = j.provider || {};
  return {
    id: j.id,
    type: j.type,
    stage: p.stage,
    claimedAt: p.claimedAt || null,
    inputUrl: absUrl(req, j.inputUrl),
    fixedImageUrl: absUrl(req, (j.result || {}).fixedImageUrl) || null,
    fix: j.input.fix || null,
    prompt: j.input.prompt,
    seconds: higgsfield.VIDEO_SECONDS,
    videoAspect: VIDEO_ASPECT === 'auto' ? null : VIDEO_ASPECT,
    label: j.label,
    createdAt: j.createdAt,
  };
}
r.get('/api/admin/mcp/jobs', requireAdmin, (req, res) => {
  const list = [...jobs.values()]
    .filter((j) => j.status === 'processing' && j.provider && j.provider.name === 'mcp')
    .sort((a, b) => a.createdAt - b.createdAt)
    .map((j) => mcpJobView(req, j));
  res.json({ mode: MCP_MODE ? 'mcp' : 'api', apiFallbackMin: MCP_FALLBACK ? MCP_FALLBACK.unclaimedMs / 60000 : null, jobs: list, waiting: videoWaitList().length });
});
r.post('/api/admin/mcp/jobs/:id/claim', requireAdmin, (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job || !job.provider || job.provider.name !== 'mcp') return res.status(404).json({ error: 'Ingen slik MCP-jobb' });
  updateJob(job, { provider: { ...job.provider, claimedAt: Date.now(), worker: clean((req.body || {}).worker, 40) } });
  res.json(mcpJobView(req, job));
});
r.post('/api/admin/mcp/jobs/:id/result', requireAdmin, async (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job || !job.provider || job.provider.name !== 'mcp') return res.status(404).json({ error: 'Ingen slik MCP-jobb' });
  const b = req.body || {};
  if (b.error) {
    fail(job, clean(b.error, 160));
    return res.json({ ok: true, status: 'failed' });
  }
  if (b.imageUrl && job.provider.stage === 'image') {
    const local = await mirror(String(b.imageUrl), 'image/png');
    updateJob(job, { fixedImageUrl: String(b.imageUrl), result: { ...(job.result || {}), fixedImageUrl: local }, provider: { ...job.provider, stage: 'video' } });
    return res.json({ ok: true, stage: 'video' });
  }
  if (b.videoUrl) {
    res.json({ ok: true, stage: 'finishing' });
    await completeVideo(job, String(b.videoUrl));
    setImmediate(pumpVideos);
    return;
  }
  res.status(400).json({ error: 'Send imageUrl, videoUrl eller error' });
});

r.post('/api/admin/jobs/:id', requireAdmin, (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).end();
  const { action } = req.body || {};
  if (action === 'approve') {
    updateJob(job, { approved: true, hidden: false });
    if (job.type === 'song' && job.status === 'done') queueSong(job);
  }
  if (action === 'reject') updateJob(job, { approved: true, hidden: true });
  if (action === 'hide') updateJob(job, { hidden: true });
  if (action === 'show') updateJob(job, { hidden: false });
  if (action === 'play-next' && job.type === 'song' && job.status === 'done') {
    state.queue = [job.id, ...state.queue.filter((id) => id !== job.id)];
    state.played = state.played.filter((id) => id !== job.id);
    save();
  }
  res.json({ ok: true });
});

r.post('/api/admin/kahoot', requireAdmin, (req, res) => {
  const action = (req.body || {}).action;
  if (action === 'next') kahoot.next();
  else if (action === 'end') kahoot.end();
  else return res.status(400).json({ error: 'Ukjent handling' });
  // Quizen tar over skjermen så lenge den pågår
  if (kahoot.state.phase) state.takeover = { mode: 'kahoot', at: (state.takeover && state.takeover.mode === 'kahoot' && state.takeover.at) || Date.now() };
  else if (state.takeover && state.takeover.mode === 'kahoot') state.takeover = null;
  save();
  res.json(kahoot.adminView());
});

// --- Musikkstyring (Spotify-lignende fjernkontroll) ---------------------------
function sendCommand(cmd) {
  state.player.seq++;
  state.player.cmd = cmd;
  save();
}

r.get('/api/admin/music', requireAdmin, (req, res) => {
  const songJobs = [...jobs.values()].filter((j) => j.type === 'song' && j.status === 'done' && onScreen(j)).sort((a, b) => b.createdAt - a.createdAt);
  res.json({
    player: { online: !!playerReport(), report: playerReport(), paused: state.player.paused, volume: state.player.volume, ...playerMix() },
    nowPlaying: state.nowPlaying,
    queue: state.queue.map((id) => jobs.get(id)).filter((j) => j && onScreen(j)).map(publicJob),
    played: state.played.map((id) => jobs.get(id)).filter((j) => j && onScreen(j)).reverse().map(publicJob),
    songs: songJobs.map(publicJob),
    playlist: playlistEntries(),
    playlistIndex: state.playlistIndex,
  });
});

r.post('/api/admin/player', requireAdmin, (req, res) => {
  const { action, value, id } = req.body || {};
  const p = state.player;
  if (action === 'toggle') p.paused = !p.paused;
  else if (action === 'pause') p.paused = true;
  else if (action === 'play') p.paused = false;
  else if (action === 'volume') p.volume = Math.max(0, Math.min(1, Number(value)));
  else if (action === 'skip') sendCommand({ type: 'skip' });
  else if (action === 'play-now') {
    let song = null;
    if (String(id).startsWith('p:')) {
      const list = playlistEntries();
      const i = list.findIndex((x) => x.id === id);
      if (i < 0) return res.status(404).end();
      song = list[i];
      state.playlistIndex = (i + 1) % list.length; // fortsett kronologisk derfra
      if (state.nowPlaying) state.played.push(state.nowPlaying);
      state.nowPlaying = null;
    } else {
      const j = jobs.get(String(id));
      if (!j || j.type !== 'song' || j.status !== 'done') return res.status(404).end();
      if (state.nowPlaying && state.nowPlaying !== j.id) state.played.push(state.nowPlaying);
      state.queue = state.queue.filter((x) => x !== j.id);
      state.played = state.played.filter((x) => x !== j.id);
      state.nowPlaying = j.id;
      song = publicJob(j);
    }
    p.paused = false;
    sendCommand({ type: 'play', song });
  } else return res.status(400).json({ error: 'Ukjent handling' });
  save();
  res.json({ ok: true });
});

r.post('/api/admin/queue', requireAdmin, (req, res) => {
  const { action, id } = req.body || {};
  const q = state.queue;
  const i = q.indexOf(id);
  if (action === 'add') {
    const j = jobs.get(String(id));
    if (!j || j.type !== 'song' || j.status !== 'done') return res.status(404).end();
    if (i < 0 && state.nowPlaying !== id) q.push(id);
    state.played = state.played.filter((x) => x !== id);
  } else if (i < 0) return res.status(404).end();
  else if (action === 'up' && i > 0) [q[i - 1], q[i]] = [q[i], q[i - 1]];
  else if (action === 'down' && i < q.length - 1) [q[i + 1], q[i]] = [q[i], q[i + 1]];
  else if (action === 'top') q.unshift(...q.splice(i, 1));
  else if (action === 'remove') q.splice(i, 1);
  save();
  res.json({ ok: true });
});

// --- Kjøreplan og handleliste (delt mellom alle som er logget inn i admin) ---
r.get('/api/admin/plan', requireAdmin, (req, res) => {
  res.json({ plan: state.plan || { adults: 30, kids: 15, venue: 'inne', checked: {}, extra: [] }, schedule: schedule(), birthdayName: BIRTHDAY_NAME });
});
r.post('/api/admin/plan', requireAdmin, (req, res) => {
  const b = req.body || {};
  const plan = state.plan || { adults: 30, kids: 15, venue: 'inne', checked: {}, extra: [] };
  if (b.adults != null) plan.adults = Math.max(0, Math.min(500, Math.round(Number(b.adults) || 0)));
  if (b.kids != null) plan.kids = Math.max(0, Math.min(500, Math.round(Number(b.kids) || 0)));
  if (['inne', 'ute', 'begge'].includes(b.venue)) plan.venue = b.venue;
  if (typeof b.check === 'string') plan.checked[b.check.slice(0, 80)] = !!b.value;
  if (typeof b.addItem === 'string' && b.addItem.trim()) plan.extra = [...(plan.extra || []), clean(b.addItem, 80)].slice(0, 100);
  if (typeof b.removeItem === 'string') plan.extra = (plan.extra || []).filter((x) => x !== b.removeItem);
  state.plan = plan;
  save();
  res.json({ plan });
});

r.post('/api/admin/help/:id', requireAdmin, (req, res) => {
  const h = (state.help || []).find((x) => x.id === req.params.id);
  if (!h) return res.status(404).end();
  if (['coming', 'done'].includes((req.body || {}).status)) h.status = req.body.status;
  save();
  res.json({ ok: true });
});

// --- Kveldens film ------------------------------------------------------------
let filmBusy = false;
r.post('/api/admin/film', requireAdmin, async (req, res) => {
  if (filmBusy) return res.status(409).json({ error: 'Filmen lages allerede.' });
  if (!film.available()) return res.status(501).json({ error: 'ffmpeg er ikke installert på serveren.' });
  const items = [...jobs.values()].filter((j) => SHOWN_VIDEO_TYPES.has(j.type) && j.status === 'done' && onScreen(j)).sort((a, b) => a.createdAt - b.createdAt);
  const fileOf = (url) => (url && url.startsWith('media/') ? path.join(MEDIA_DIR, path.basename(url)) : null);
  // Maks 40 klipp: ta et jevnt utvalg gjennom kvelden
  const pickEvery = Math.max(1, Math.ceil(items.length / 40));
  const clips = items.filter((_, i) => i % pickEvery === 0).map((j) => {
    const v = fileOf(j.result.originalUrl || j.result.videoUrl);
    if (v && fs.existsSync(v)) return { file: v };
    const img = fileOf(j.result.imageUrl || j.inputUrl);
    return img && fs.existsSync(img) ? { file: img, image: true } : null;
  }).filter(Boolean);
  if (!clips.length) return res.status(400).json({ error: 'Det finnes ingen filmer eller bilder ennå.' });
  // Musikk: de mest stemte/første gjestesangene (maks 3), ellers årsspillelisten
  const songs = [...jobs.values()].filter((j) => j.type === 'song' && j.status === 'done' && onScreen(j)).map((j) => fileOf(j.result.audioUrl)).filter(Boolean).slice(0, 3);
  const audio = songs.length ? songs : playlistFiles().slice(0, 3).map((f) => path.join(PLAYLIST_DIR, f));
  const name = `kveldens-film-${Date.now()}.mp4`;
  state.film = { status: 'working', progress: 0, at: Date.now(), clips: clips.length };
  filmBusy = true;
  save();
  res.json({ ok: true, clips: clips.length });
  try {
    const r2 = await film.build({ clips, audio, out: path.join(MEDIA_DIR, name), onProgress: (p) => { state.film.progress = p; } });
    state.film = { status: 'done', progress: 1, url: 'media/' + name, seconds: r2.seconds, clips: clips.length, at: Date.now() };
  } catch (err) {
    console.warn('[film]', err.message);
    state.film = { status: 'failed', error: err.message.slice(0, 200), at: Date.now() };
  } finally {
    filmBusy = false;
    save();
  }
});

r.post('/api/admin/program', requireAdmin, (req, res) => {
  const b = req.body || {};
  const prog = state.program || {};
  if (Array.isArray(b.schedule)) {
    prog.schedule = b.schedule
      .map((p) => ({ time: clean(p.time, 5), title: clean(p.title, 80), emoji: clean(p.emoji, 8) || '⭐', highlight: !!p.highlight }))
      .filter((p) => /^\d{1,2}:\d{2}$/.test(p.time) && p.title)
      .sort((a, c) => a.time.localeCompare(c.time, 'nb', { numeric: true }))
      .slice(0, 30);
  }
  if (typeof b.note === 'string') prog.note = clean(b.note, 200);
  if (Array.isArray(b.allDay)) prog.allDay = b.allDay.map((x) => clean(x, 80)).filter(Boolean).slice(0, 8);
  if (b.venue && typeof b.venue === 'object') {
    prog.venue = {
      name: clean(b.venue.name, 80), date: clean(b.venue.date, 60), time: clean(b.venue.time, 40), day: /^\d{4}-\d{2}-\d{2}$/.test(b.venue.day || '') ? b.venue.day : PARTY.venue.day,
    };
  }
  if (b.reset) Object.keys(prog).forEach((k) => delete prog[k]);
  prog.updatedAt = Date.now();
  state.program = prog;
  save();
  res.json({ ok: true });
});

r.post('/api/admin/settings', requireAdmin, (req, res) => {
  const b = req.body || {};
  if (typeof b.moderation === 'boolean') {
    state.moderation = b.moderation;
    // Skrus godkjenning av, slipper vi gjennom alt som venter.
    if (!b.moderation) {
      for (const j of jobs.values()) {
        if (j.approved === false) {
          updateJob(j, { approved: true });
          if (j.type === 'song' && j.status === 'done' && !j.hidden) queueSong(j);
        }
      }
    }
    save();
  }
  res.json({ ok: true, moderation: state.moderation });
});

// ---------------------------------------------------------------------------
// Finale: bursdagsbarnet synger en av gjestenes sanger (Higgsfield lipsync).
// Virker alltid: uten lipsync (eller hvis den feiler) blir finalen videoen + sangen side om side.
// ---------------------------------------------------------------------------
const videoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 150 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => cb(null, /^video\/(mp4|quicktime|webm)$/.test(file.mimetype)),
});

function readMedia(url) {
  if (!url || !url.startsWith('media/')) return null;
  return fs.readFileSync(path.join(MEDIA_DIR, path.basename(url)));
}

/** Kutt en MP3 til ca. FINALE_SECONDS (MP3-rammer tåler å bli kuttet). */
function trimAudio(buf, url, duration) {
  if (!/\.mp3$/i.test(url) || !duration || duration <= FINALE_SECONDS) return buf;
  return buf.subarray(0, Math.floor(buf.length * (FINALE_SECONDS / duration)));
}

function finaleFallback(job, reason) {
  const song = jobs.get(job.input.songId);
  updateJob(job, {
    status: 'done',
    note: reason ? `Uten lipsync (${reason})` : 'Uten lipsync',
    result: { videoUrl: job.input.videoUrl, audioUrl: song && song.result && song.result.audioUrl, lipsync: false },
  });
}

// Verten laster opp én tegning eller én selfie, og får en eksempelfilm per stil/effekt
r.post('/api/admin/examples', requireAdmin, upload.single('image'), (req, res) => {
  const kind = req.body.kind === 'selfie' ? 'selfie' : 'drawing';
  if (!req.file) return res.status(400).json({ error: 'Velg et bilde.' });
  const list = kind === 'selfie' ? SELFIE_EFFECTS : DRAWING_STYLES;
  const inputUrl = saveMedia(req.file.buffer, req.file.mimetype);
  const ids = list.map((base) => {
    const x = kind === 'selfie' ? selfieVariant(base.id) : base;
    const job = newJob('example', { label: x.name, emoji: x.emoji, inputUrl, input: { kind, ref: x.id, variant: x.variant } });
    enqueue(job, { prompt: kind === 'selfie' ? x.prompt : x.prompt(''), contentType: req.file.mimetype, fix: kind === 'selfie' ? imageFixFor(x, req.file.buffer) : drawingFixFor(req.file.buffer) });
    return job.id;
  });
  res.json({ count: ids.length });
});

r.post('/api/admin/finale', requireAdmin, videoUpload.single('video'), async (req, res) => {
  const song = jobs.get(String(req.body.songId || ''));
  if (!song || song.type !== 'song' || song.status !== 'done') return res.status(400).json({ error: 'Velg en ferdig sang.' });
  let videoUrl;
  if (req.file) videoUrl = saveMedia(req.file.buffer, req.file.mimetype === 'video/quicktime' ? 'video/quicktime' : 'video/mp4');
  else {
    const src = jobs.get(String(req.body.videoJobId || ''));
    videoUrl = src && src.result && src.result.videoUrl;
  }
  if (!videoUrl) return res.status(400).json({ error: 'Last opp en video, eller velg en ferdig video.' });

  const job = newJob('finale', { status: 'starting', startedAt: Date.now(), label: 'Finale', emoji: '🎬', input: { songId: song.id, videoUrl } });
  state.finaleId = job.id;
  save();
  res.json({ id: job.id });

  if (!higgsfield.lipsyncConfigured()) return finaleFallback(job, useHiggsfield ? 'HF_LIPSYNC_MODEL er ikke satt' : 'demomodus');
  try {
    const vbuf = readMedia(videoUrl);
    const abuf = readMedia(song.result.audioUrl);
    if (!vbuf || !abuf) throw new Error('Fant ikke filene lokalt');
    const [hfVideo, hfAudio] = await Promise.all([
      higgsfield.upload(vbuf, videoUrl.endsWith('.mov') ? 'video/quicktime' : 'video/mp4'),
      higgsfield.upload(trimAudio(abuf, song.result.audioUrl, song.result.duration), song.result.audioUrl.endsWith('.wav') ? 'audio/wav' : 'audio/mpeg'),
    ]);
    const webhook = PUBLIC_URL ? `${PUBLIC_URL}/api/hooks/higgsfield?job=${job.id}&t=${job.hookToken}` : undefined;
    const { requestId } = await higgsfield.submitLipsync({ videoUrl: hfVideo, audioUrl: hfAudio, webhookUrl: webhook });
    updateJob(job, { status: 'processing', provider: { name: 'higgsfield', requestId } });
  } catch (err) {
    fail(job, err.message.slice(0, 120));
  }
});

// Galleri etter festen: alt som ble vist på skjermen, til å laste ned
r.get('/galleri', page('galleri'));
r.get('/musikk', page('musikk'));
r.get('/admin/musikk', page('admin-musikk'));
r.get('/admin/plan', page('admin-plan'));
r.get('/program', page('program'));
r.get('/lyd', page('lyd'));

// «Last ned alt» som én zip-fil
r.get('/api/gallery/zip', async (req, res) => {
  const items = [...jobs.values()].filter((j) => onScreen(j) && j.status === 'done' && GALLERY_TYPES.has(j.type)).sort((a, b) => a.createdAt - b.createdAt);
  const entries = [];
  const safe = (t) => String(t || '').replace(/[^\p{L}\p{N} _-]+/gu, '').trim().slice(0, 40) || 'gjest';
  const fileOf = (url) => (url && url.startsWith('media/') ? path.join(MEDIA_DIR, path.basename(url)) : null);
  const greetings = [];
  items.forEach((j, n) => {
    const r2 = j.result || {};
    const prefix = String(n + 1).padStart(3, '0');
    const date = new Date(j.createdAt);
    if (j.type === 'greeting') return greetings.push(`${j.label}\n«${j.text}»${j.guest ? `\n– ${j.guest}` : ''}\n`);
    const src = fileOf(r2.videoUrl) || fileOf(r2.audioUrl) || fileOf(r2.imageUrl);
    if (!src || !fs.existsSync(src)) return;
    const folder = { drawing: 'tegninger', selfie: 'selfies', song: 'sanger', clip: 'klipp' }[j.type];
    entries.push({ name: `${folder}/${prefix} ${safe(j.type === 'song' ? r2.title || j.label : j.label)} - ${safe(j.guest)}${path.extname(src)}`, file: src, date });
  });
  if (greetings.length) entries.push({ name: 'hilsener.txt', data: Buffer.from(greetings.join('\n')) });
  const finale = jobs.get(state.finaleId);
  const ff = finale && finale.status === 'done' && fileOf(finale.result.videoUrl);
  if (ff && fs.existsSync(ff)) entries.push({ name: 'finale' + path.extname(ff), file: ff });
  const kf = state.film && state.film.url && fileOf(state.film.url);
  if (kf && fs.existsSync(kf)) entries.push({ name: 'kveldens-film.mp4', file: kf });
  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(PARTY_TITLE)}.zip"; filename*=UTF-8''${encodeURIComponent(PARTY_TITLE)}.zip`);
  try {
    await writeZip(res, entries);
  } catch (err) {
    console.warn('[zip]', err.message);
    res.destroy();
  }
});
r.get('/api/gallery', (req, res) => {
  const items = [...jobs.values()]
    .filter((j) => onScreen(j) && j.status === 'done' && GALLERY_TYPES.has(j.type))
    .sort((a, b) => a.createdAt - b.createdAt)
    .map(publicJob);
  const finale = jobs.get(state.finaleId);
  res.json({ partyTitle: PARTY_TITLE, items, finale: finale && finale.status === 'done' ? finale.result : null, film: state.film && state.film.url ? { url: state.film.url, seconds: state.film.seconds } : null });
});

// Helsesjekk for overvåking (f.eks. Railway eller UptimeRobot). Svarer også på rotstien når appen ligger under BASE_PATH.
function health(req, res) {
  res.json({
    ok: true,
    teaser: teaserOn(),
    opensAt: teaserConfig.openAt ? new Date(teaserConfig.openAt).toISOString() : null,
    videoProvider: MCP_MODE ? 'mcp' : useHiggsfield ? 'higgsfield' : 'demo',
    higgsfield: useHiggsfield ? 'på' : 'demo',
    imageFix: useImageFix,
    videoSeconds: higgsfield.VIDEO_SECONDS,
    pingpong: usePingpong,
    clipTranscode: useClipTranscode,
    suno: useSuno ? 'på' : 'demo',
    lipsync: higgsfield.lipsyncConfigured(),
    publicUrl: PUBLIC_URL || null,
    videoSlots: slots(LANES.video),
    songSlots: slots(LANES.song),
    jobs: jobs.size,
  });
}
r.get('/api/health', health);

app.use(BASE_PATH || '/', r);
if (BASE_PATH) {
  app.get('/', (req, res) => res.redirect(BASE_PATH + '/'));
  app.get('/api/health', health); // Railway-helsesjekken bruker rotstien og følger ikke omdirigeringer
}

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) return res.status(400).json({ error: 'Filen er for stor. Prøv igjen!' });
  console.error(err);
  res.status(500).json({ error: 'Noe gikk galt.' });
});

app.listen(PORT, () => {
  console.log(`\n🎂 ${PARTY_TITLE} kjører på http://localhost:${PORT}${BASE_PATH}/`);
  for (const url of lanAddresses()) console.log(`   På nettverket: http://${url}:${PORT}${BASE_PATH}/`);
  console.log(`   Video: ${MCP_MODE ? 'MCP-ARBEIDER (Claude Code + Higgsfield-MCP)' : useHiggsfield ? 'Higgsfield-API PÅ' : 'DEMO (sett HF_KEY)'}, ${higgsfield.VIDEO_SECONDS} sek per film, maks ${HF_MAX_CONCURRENT} samtidig`);
  console.log(`   Bildefiks:          ${useImageFix ? 'PÅ (' + higgsfield.IMAGE_MODEL + ')' : 'AV'}, frem og tilbake: ${usePingpong ? 'PÅ' : 'AV (ffmpeg mangler)'}`);
  console.log(`   Sang (Suno):        ${useSuno ? 'PÅ' : 'DEMO (sett SUNO_API_KEY)'}, maks ${SUNO_MAX_CONCURRENT} samtidig`);
  if (!PUBLIC_URL) console.log('   Tips: sett PUBLIC_URL slik at QR-kodene peker til riktig adresse.\n');
});
