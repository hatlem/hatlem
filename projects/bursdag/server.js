'use strict';

/**
 * Bursdagsinstallasjon
 *  - /tegning : ta bilde av en tegning -> Higgsfield lager en film
 *  - /sang    : lag en sang -> Suno (sunoapi.org / api.box) -> legges i kø på storskjermen
 *  - /selfie  : ta en selfie -> Higgsfield-effekt (tiger, spøkelse, ...)
 *  - /skjerm  : storskjerm med galleri + musikk-kø
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
const suno = require('./lib/suno');
const demo = require('./lib/demo');
const { DRAWING_STYLES, SELFIE_EFFECTS, SONG_GENRES, SONG_MOODS } = require('./lib/catalog');
const party = require('./lib/party');
const { createKahoot } = require('./lib/kahoot');
const { writeZip } = require('./lib/zip');

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
const VIDEO_TYPES = new Set(['drawing', 'selfie']);
const AVG_VIDEO_MIN = Number(process.env.AVG_VIDEO_MIN || 2); // for ventetidsestimat
// Hvor mange sanger Suno-kontoen kan lage samtidig. Resten venter i appens kø.
const SUNO_MAX_CONCURRENT = Math.max(1, Number(process.env.SUNO_MAX_CONCURRENT || 5));
const AVG_SONG_MIN = Number(process.env.AVG_SONG_MIN || 3);
const FINALE_SECONDS = Number(process.env.FINALE_SECONDS || 60); // finalen kuttes til så mange sekunder (sparer kreditter)

fs.mkdirSync(MEDIA_DIR, { recursive: true });

const PARTY = party.loadConfig(process.env.PARTY_CONFIG || path.join(__dirname, 'party.json'), BIRTHDAY_NAME);
const NOSTALGIA_DIR = path.join(DATA_DIR, 'nostalgi');
const PLAYLIST_DIR = path.join(DATA_DIR, 'spilleliste');
const nostalgiaFiles = party.makeFolderScanner(NOSTALGIA_DIR, party.IMAGE);
const playlistFiles = party.makeFolderScanner(PLAYLIST_DIR, party.AUDIO);
const AI_TYPES = new Set(['drawing', 'selfie', 'song']);

const useHiggsfield = higgsfield.isConfigured();
const useSuno = suno.isConfigured();

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
  // Én lydkilde: siden som sist trykket «Start» med lyd. Admin fjernstyrer den.
  player: { id: null, paused: false, volume: 0.8, seq: 0, cmd: null, report: null },
};

/** Vises på storskjerm/galleri: ikke skjult og ikke ventende på godkjenning. */
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
const enqueueVideo = (job, contentType, prompt) => enqueue(job, { prompt, contentType });

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
          if (/429|concurren|too many|rate.?limit|limit.*(reached|exceeded)|queue.*full|frequen/i.test(err.message) && (job.retries || 0) < 20) {
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

async function startVideoJob(job) {
  if (!useHiggsfield) {
    updateJob(job, { status: 'processing', demo: true, provider: { name: 'demo', readyAt: Date.now() + demo.VIDEO_DELAY_MS } });
    return;
  }
  const buffer = fs.readFileSync(path.join(MEDIA_DIR, path.basename(job.inputUrl)));
  const imageUrl = job.hfImageUrl || (await higgsfield.upload(buffer, job.input.contentType || 'image/jpeg'));
  if (!job.hfImageUrl) updateJob(job, { hfImageUrl: imageUrl }); // ikke last opp på nytt ved nytt forsøk
  const webhook = PUBLIC_URL ? `${PUBLIC_URL}/api/hooks/higgsfield?job=${job.id}&t=${job.hookToken}` : undefined;
  const { requestId } = await higgsfield.submitImageToVideo({ imageUrl, prompt: job.input.prompt, webhookUrl: webhook });
  updateJob(job, { status: 'processing', provider: { name: 'higgsfield', requestId } });
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
async function completeVideo(job, videoUrl) {
  const noReview = job.type === 'finale' || job.type === 'example';
  updateJob(job, { status: 'done', result: { videoUrl, ...(job.type === 'finale' ? { lipsync: true } : {}) }, ...(noReview ? {} : reviewFlag()) });
  const local = await mirror(videoUrl, 'video/mp4');
  if (local !== videoUrl) updateJob(job, { result: { ...job.result, videoUrl: local } });
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
    const s = await higgsfield.status(p.requestId);
    if (s.status === 'completed') {
      if (!s.videoUrl) return fail(job, 'Fikk ikke noe video tilbake.');
      return completeVideo(job, s.videoUrl);
    }
    if (s.status === 'nsfw') return fail(job, 'Bildet ble stoppet av innholdsfilteret. Prøv et annet bilde!');
    if (['failed', 'canceled', 'cancelled'].includes(s.status)) return fail(job, 'Videoen kunne ikke lages. Prøv igjen!');
  }

  if (p.name === 'suno') {
    const s = await suno.status(p.taskId);
    if (s.failed) return fail(job, s.message || 'Sangen kunne ikke lages. Prøv et annet tema!');
    if (s.done && s.track) return completeSong(job, s.track);
  }
}

let polling = false;
async function pollAll() {
  if (polling) return;
  polling = true;
  try {
    for (const job of jobs.values()) {
      if (job.status !== 'processing') continue;
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
  if (job.status === 'starting' && job.type === 'finale') setImmediate(() => finaleFallback(job, 'serveren startet på nytt'));
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

const pageCache = new Map();
const page = (name) => (req, res) => {
  // <base> gjør at alle relative lenker i sidene virker både på rot og under BASE_PATH
  let html = pageCache.get(name);
  if (!html || process.env.NODE_ENV !== 'production') {
    html = fs.readFileSync(path.join(__dirname, 'public', `${name}.html`), 'utf8').replace('<head>', `<head>\n<base href="${BASE_PATH}/">`);
    pageCache.set(name, html);
  }
  res.type('html').setHeader('Cache-Control', 'no-cache');
  res.send(html);
};
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
r.use(express.static(path.join(__dirname, 'public'), { index: false }));
r.use('/media', express.static(MEDIA_DIR, { maxAge: '7d', immutable: true }));
r.use('/nostalgi', express.static(NOSTALGIA_DIR, { maxAge: '1h' }));
r.use('/spilleliste', express.static(PLAYLIST_DIR, { maxAge: '1h' }));

r.get('/api/config', (req, res) => {
  res.json({
    birthdayName: BIRTHDAY_NAME,
    partyTitle: PARTY_TITLE,
    drawingStyles: DRAWING_STYLES.map(({ id, name, emoji }) => ({ id, name, emoji })),
    selfieEffects: SELFIE_EFFECTS.map(({ id, name, emoji }) => ({ id, name, emoji })),
    songGenres: SONG_GENRES,
    songMoods: SONG_MOODS,
    schedule: PARTY.schedule,
    greetingPrompts: PARTY.greetingPrompts,
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
  const job = newJob('drawing', { guest: clean(req.body.name, 40), label: style.name, emoji: style.emoji, inputUrl, input: { style: style.id, description } });

  res.json({ id: job.id });
  enqueueVideo(job, req.file.mimetype, prompt);
});

// Selfie -> effekt
r.post('/api/selfie', upload.single('image'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Fant ikke noe bilde. Prøv igjen!' });
  const limit = checkLimits(clean(req.body.deviceId, 64) || req.ip);
  if (limit) return res.status(429).json({ error: limit });

  const effect = SELFIE_EFFECTS.find((e) => e.id === req.body.effect) || SELFIE_EFFECTS[0];
  const inputUrl = saveMedia(req.file.buffer, req.file.mimetype);
  const job = newJob('selfie', { guest: clean(req.body.name, 40), label: effect.name, emoji: effect.emoji, inputUrl, input: { effect: effect.id } });

  res.json({ id: job.id });
  enqueueVideo(job, req.file.mimetype, effect.prompt);
});

// Sang
r.post('/api/song', async (req, res) => {
  const b = req.body || {};
  const limit = checkLimits(clean(b.deviceId, 64) || req.ip);
  if (limit) return res.status(429).json({ error: limit });

  const to = clean(b.to, 40) || BIRTHDAY_NAME;
  const about = clean(b.about, 220);
  const genre = SONG_GENRES.includes(b.genre) ? b.genre : SONG_GENRES[0];
  const mood = SONG_MOODS.includes(b.mood) ? b.mood : SONG_MOODS[0];
  const from = clean(b.name, 40);

  // sunoapi.org (ikke-custom modus) tillater maks 500 tegn i prompt.
  const prompt = clean(
    `En ${mood.toLowerCase()} ${genre.toLowerCase()}-låt på norsk til bursdagen til ${to}.` +
      (about ? ` Sangen handler om: ${about}.` : '') +
      ` Fengende refreng der navnet ${to} synges.`,
    490,
  );
  const job = newJob('song', { guest: from, label: `${genre} til ${to}`, emoji: '🎵', input: { to, about, genre, mood } });

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

// Storskjerm
r.get('/api/screen', (req, res) => {
  const visible = [...jobs.values()].filter(onScreen);
  const gallery = visible
    .filter((j) => VIDEO_TYPES.has(j.type) || j.type === 'greeting')
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
  res.json({
    nostalgia,
    playlist,
    schedule: PARTY.schedule,
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

/** Under kake, tale og finale stopper musikken; under quizen senkes den. */
function playerMix() {
  const mode = state.takeover && state.takeover.mode;
  return { forcePause: ['cake', 'greetings', 'finale'].includes(mode), duck: mode === 'kahoot' ? 0.25 : 1 };
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

// Gjestebok med vri: korte hilsener som vises på storskjermen
r.post('/api/greeting', (req, res) => {
  const b = req.body || {};
  const limit = checkLimits(clean(b.deviceId, 64) || req.ip, { budget: false });
  if (limit) return res.status(429).json({ error: limit });
  const text = clean(b.text, 200);
  if (text.length < 2) return res.status(400).json({ error: 'Skriv litt først 😊' });
  const prompt = PARTY.greetingPrompts.find((g) => g.id === b.prompt) || PARTY.greetingPrompts[0] || { name: 'Hilsen', emoji: '💌' };
  const job = newJob('greeting', { status: 'done', ...reviewFlag(), guest: clean(b.name, 40), label: prompt.name, emoji: prompt.emoji, text });
  res.json({ id: job.id });
});

// Felles høydepunkt: storskjermen tar over (kaketid, quiz-trekning, hilsener høyt)
function takeoverView() {
  const t = state.takeover;
  if (!t) return null;
  if (t.mode === 'finale') {
    const f = jobs.get(state.finaleId);
    // Lyden går fra mobilen hvis den er på, ellers fra storskjermen
    return { ...t, audioOnScreen: !playerReport(), finale: f && f.status === 'done' ? { ...f.result, song: publicJob(jobs.get(f.input.songId)) } : null };
  }
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
    songs: [...jobs.values()].filter((j) => j.type === 'song' && j.status === 'done' && !j.hidden).map((j) => ({ id: j.id, title: (j.result && j.result.title) || j.label, guest: j.guest })),
    videos: [...jobs.values()].filter((j) => VIDEO_TYPES.has(j.type) && j.status === 'done' && !j.hidden && j.result && j.result.videoUrl).map((j) => ({ id: j.id, label: j.label, guest: j.guest })),
    nostalgia: nostalgiaFiles().length,
    playlist: playlistFiles().length,
  });
});

r.post('/api/admin/takeover', requireAdmin, (req, res) => {
  const mode = (req.body || {}).mode;
  if (mode === 'off') state.takeover = null;
  else if (mode === 'cake') state.takeover = { mode, at: Date.now(), title: (PARTY.schedule.find((p) => p.highlight) || {}).title || 'Kaketid!' };
  else if (mode === 'greetings') state.takeover = { mode, at: Date.now() };
  else if (mode === 'finale') {
    const f = jobs.get(state.finaleId);
    if (!f || f.status !== 'done') return res.status(409).json({ error: 'Finalen er ikke klar ennå.' });
    // Felles starttid, så storskjermen (video) og mobilen (lyd) starter i takt
    state.takeover = { mode, at: Date.now(), startAt: Date.now() + 6000 };
  }
  else return res.status(400).json({ error: 'Ukjent modus' });
  if (mode !== 'off' && kahoot.state.phase) kahoot.end(); // noe annet tar over skjermen
  save();
  res.json({ ok: true });
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
  // Quizen tar over storskjermen så lenge den pågår
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
  res.json({ plan: state.plan || { adults: 30, kids: 15, venue: 'inne', checked: {}, extra: [] }, schedule: PARTY.schedule, birthdayName: BIRTHDAY_NAME });
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
  const ids = list.map((x) => {
    const job = newJob('example', { label: x.name, emoji: x.emoji, inputUrl, input: { kind, ref: x.id } });
    enqueue(job, { prompt: kind === 'selfie' ? x.prompt : x.prompt(''), contentType: req.file.mimetype });
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
r.get('/lyd', page('lyd'));

// «Last ned alt» som én zip-fil
r.get('/api/gallery/zip', async (req, res) => {
  const items = [...jobs.values()].filter((j) => onScreen(j) && j.status === 'done' && (AI_TYPES.has(j.type) || j.type === 'greeting')).sort((a, b) => a.createdAt - b.createdAt);
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
    const folder = { drawing: 'tegninger', selfie: 'selfies', song: 'sanger' }[j.type];
    entries.push({ name: `${folder}/${prefix} ${safe(j.type === 'song' ? r2.title || j.label : j.label)} - ${safe(j.guest)}${path.extname(src)}`, file: src, date });
  });
  if (greetings.length) entries.push({ name: 'hilsener.txt', data: Buffer.from(greetings.join('\n')) });
  const finale = jobs.get(state.finaleId);
  const ff = finale && finale.status === 'done' && fileOf(finale.result.videoUrl);
  if (ff && fs.existsSync(ff)) entries.push({ name: 'finale' + path.extname(ff), file: ff });
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
    .filter((j) => onScreen(j) && j.status === 'done' && (AI_TYPES.has(j.type) || j.type === 'greeting'))
    .sort((a, b) => a.createdAt - b.createdAt)
    .map(publicJob);
  const finale = jobs.get(state.finaleId);
  res.json({ partyTitle: PARTY_TITLE, items, finale: finale && finale.status === 'done' ? finale.result : null });
});

// Helsesjekk for overvåking (f.eks. Railway eller UptimeRobot)
r.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    higgsfield: useHiggsfield ? 'på' : 'demo',
    suno: useSuno ? 'på' : 'demo',
    lipsync: higgsfield.lipsyncConfigured(),
    publicUrl: PUBLIC_URL || null,
    videoSlots: slots(LANES.video),
    songSlots: slots(LANES.song),
    jobs: jobs.size,
  });
});

app.use(BASE_PATH || '/', r);
if (BASE_PATH) app.get('/', (req, res) => res.redirect(BASE_PATH + '/'));

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) return res.status(400).json({ error: 'Filen er for stor. Prøv igjen!' });
  console.error(err);
  res.status(500).json({ error: 'Noe gikk galt.' });
});

app.listen(PORT, () => {
  console.log(`\n🎂 ${PARTY_TITLE} kjører på http://localhost:${PORT}${BASE_PATH}/`);
  for (const url of lanAddresses()) console.log(`   På nettverket: http://${url}:${PORT}${BASE_PATH}/`);
  console.log(`   Video (Higgsfield): ${useHiggsfield ? 'PÅ' : 'DEMO (sett HF_KEY)'}, maks ${HF_MAX_CONCURRENT} samtidig`);
  console.log(`   Sang (Suno):        ${useSuno ? 'PÅ' : 'DEMO (sett SUNO_API_KEY)'}, maks ${SUNO_MAX_CONCURRENT} samtidig`);
  if (!PUBLIC_URL) console.log('   Tips: sett PUBLIC_URL slik at QR-kodene peker til riktig adresse.\n');
});
