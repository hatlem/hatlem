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

// ---------------------------------------------------------------------------
// Konfig
// ---------------------------------------------------------------------------
const PORT = Number(process.env.PORT || 4830);
const PUBLIC_URL = (process.env.PUBLIC_URL || '').replace(/\/+$/, '');
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
const state = { queue: [], nowPlaying: null, played: [], quiz: [], takeover: null };

function load() {
  try {
    const raw = JSON.parse(fs.readFileSync(JOBS_FILE, 'utf8'));
    for (const j of raw.jobs || []) jobs.set(j.id, j);
    Object.assign(state, raw.state || {});
  } catch {
    /* første oppstart */
  }
}
load();

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
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  return `${proto}://${host}`;
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

const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'video/mp4': '.mp4', 'audio/mpeg': '.mp3', 'audio/wav': '.wav' };

function saveMedia(buffer, contentType) {
  const name = crypto.randomUUID() + (EXT[contentType] || '');
  fs.writeFileSync(path.join(MEDIA_DIR, name), buffer);
  return `/media/${name}`;
}

/** Last ned ferdig resultat lokalt, så skjermen fungerer selv om API-lenkene utløper. */
async function mirror(url, fallbackType) {
  if (!url || url.startsWith('/media/')) return url;
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
  const wait = job.status === 'waiting' ? videoWaitList().indexOf(job) : -1;
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
    waitMinutes: wait >= 0 ? Math.max(1, Math.ceil(((Math.floor(wait / HF_MAX_CONCURRENT) + 1) * AVG_VIDEO_MIN))) : null,
    nowPlaying: state.nowPlaying === job.id,
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

// --- Videokø: maks HF_MAX_CONCURRENT jobber hos Higgsfield samtidig -------------
function videoWaitList() {
  return [...jobs.values()].filter((j) => j.status === 'waiting').sort((a, b) => a.createdAt - b.createdAt);
}
function activeVideoCount() {
  return [...jobs.values()].filter((j) => VIDEO_TYPES.has(j.type) && (j.status === 'processing' || j.status === 'starting')).length;
}

/** Legg videojobben i kø. Bildet ligger allerede på disk (inputUrl), så køen overlever omstart. */
function enqueueVideo(job, contentType, prompt) {
  updateJob(job, { status: 'waiting', input: { ...job.input, prompt, contentType } });
  pumpVideos();
}

let pumping = false;
async function pumpVideos() {
  if (pumping) return;
  pumping = true;
  try {
    for (const job of videoWaitList()) {
      if (activeVideoCount() >= HF_MAX_CONCURRENT) break;
      if (job.retryAt && Date.now() < job.retryAt) continue;
      updateJob(job, { status: 'starting', startedAt: Date.now() });
      startVideoJob(job).catch((err) => {
        // Kontoen er full (eller midlertidig feil hos Higgsfield): tilbake i køen og prøv igjen litt senere.
        if (/429|concurren|too many|rate.?limit|limit.*(reached|exceeded)|queue.*full/i.test(err.message) && (job.retries || 0) < 20) {
          console.warn(`[video ${job.id}] Higgsfield er fullt, venter litt:`, err.message.slice(0, 120));
          updateJob(job, { status: 'waiting', retryAt: Date.now() + 20000, retries: (job.retries || 0) + 1 });
        } else {
          fail(job, friendly(err));
        }
      });
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

async function startSongJob(job, prompt) {
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
  updateJob(job, { status: 'done', result: { videoUrl } });
  const local = await mirror(videoUrl, 'video/mp4');
  if (local !== videoUrl) updateJob(job, { result: { ...job.result, videoUrl: local } });
}


async function completeSong(job, track) {
  updateJob(job, {
    status: 'done',
    result: { audioUrl: track.audioUrl, imageUrl: track.imageUrl, title: track.title || job.label, duration: track.duration },
  });
  if (!state.queue.includes(job.id) && !state.played.includes(job.id) && state.nowPlaying !== job.id) {
    state.queue.push(job.id);
    save();
  }
  const [audioUrl, imageUrl] = await Promise.all([mirror(track.audioUrl, 'audio/mpeg'), mirror(track.imageUrl, 'image/jpeg')]);
  updateJob(job, { result: { ...job.result, audioUrl, imageUrl } });
}

function fail(job, message) {
  console.warn(`[job ${job.id}] feilet: ${message}`);
  updateJob(job, { status: 'failed', error: message });
  if (VIDEO_TYPES.has(job.type)) setImmediate(pumpVideos);
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
    return updateJob(job, { status: 'done', result: { videoUrl: null, imageUrl: job.inputUrl } });
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
  if (job.status === 'starting') updateJob(job, { status: 'waiting' });
}

// ---------------------------------------------------------------------------
// Express
// ---------------------------------------------------------------------------
const app = express();
app.set('trust proxy', true);
app.disable('x-powered-by');
app.use(express.json({ limit: '200kb' }));
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => cb(null, /^image\/(jpeg|png|webp)$/.test(file.mimetype)),
});

const page = (name) => (req, res) => res.sendFile(path.join(__dirname, 'public', `${name}.html`));
app.get('/', page('index'));
app.get('/tegning', page('tegning'));
app.get('/sang', page('sang'));
app.get('/selfie', page('selfie'));
app.get('/status/:id', page('status'));
app.get('/skjerm', page('skjerm'));
app.get('/qr', page('qr'));
app.get('/admin', page('admin'));
app.get('/quiz', page('quiz'));
app.get('/hilsen', page('hilsen'));
app.use(express.static(path.join(__dirname, 'public'), { index: false }));
app.use('/media', express.static(MEDIA_DIR, { maxAge: '7d', immutable: true }));
app.use('/nostalgi', express.static(NOSTALGIA_DIR, { maxAge: '1h' }));
app.use('/spilleliste', express.static(PLAYLIST_DIR, { maxAge: '1h' }));

app.get('/api/config', (req, res) => {
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

app.get('/qr.svg', async (req, res) => {
  const target = String(req.query.path || '/');
  const query = String(req.query.q || '');
  if (!/^\/[a-z0-9/_-]*$/i.test(target) || !/^[a-z0-9=&_-]*$/i.test(query)) return res.status(400).end();
  const svg = await QRCode.toString(baseUrl(req) + target + (query ? `?${query}` : ''), { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
  res.type('image/svg+xml').setHeader('Cache-Control', 'no-cache');
  res.send(svg);
});

app.get('/api/qr-info', (req, res) => {
  const base = baseUrl(req);
  const local = /localhost|127\.0\.0\.1/.test(base);
  res.json({ base, local, lan: lanAddresses().map((ip) => `http://${ip}:${PORT}`) });
});

// Tegning -> film
app.post('/api/drawing', upload.single('image'), async (req, res) => {
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
app.post('/api/selfie', upload.single('image'), async (req, res) => {
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
app.post('/api/song', async (req, res) => {
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
  startSongJob(job, prompt).catch((err) => fail(job, friendly(err)));
});

function friendly(err) {
  console.warn('[api]', err.message);
  if (/credit|balance|insufficient|402/i.test(err.message)) return 'Tom for kreditter hos AI-tjenesten 😬 Si fra til verten!';
  return 'Noe gikk galt hos AI-tjenesten. Prøv igjen om litt!';
}

app.get('/api/jobs/:id', (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).json({ error: 'Fant ikke denne.' });
  res.json(publicJob(job));
});

// Storskjerm
app.get('/api/screen', (req, res) => {
  const visible = [...jobs.values()].filter((j) => !j.hidden);
  const gallery = visible
    .filter((j) => j.type !== 'song' && j.status === 'done')
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, 60)
    .map(publicJob);
  const songs = (ids) => ids.map((id) => jobs.get(id)).filter((j) => j && !j.hidden).map(publicJob);
  const inProgress = visible.filter((j) => ['processing', 'queued', 'starting', 'waiting'].includes(j.status));
  const working = inProgress.length;
  const making = inProgress
    .filter((j) => VIDEO_TYPES.has(j.type) || j.type === 'song')
    .sort((a, b) => a.createdAt - b.createdAt)
    .slice(0, 5)
    .map((j) => ({ guest: j.guest, emoji: j.emoji, label: j.label, waiting: j.status === 'waiting' }));
  const nostalgia = nostalgiaFiles().map((f) => {
    const { year, title } = party.parseName(f);
    return { id: 'n:' + f, type: 'nostalgia', emoji: '🕰️', label: year ? String(year) : title, guest: year ? title : '', result: { imageUrl: '/nostalgi/' + encodeURIComponent(f) } };
  });
  const playlist = playlistFiles().map((f) => {
    const { year, title } = party.parseName(f);
    return { id: 'p:' + f, year, title, url: '/spilleliste/' + encodeURIComponent(f) };
  });
  res.json({
    nostalgia,
    playlist,
    schedule: PARTY.schedule,
    takeover: takeoverView(),
    quizCount: state.quiz.length,
    gallery,
    nowPlaying: state.nowPlaying && !jobs.get(state.nowPlaying)?.hidden ? publicJob(jobs.get(state.nowPlaying)) : null,
    queue: songs(state.queue),
    played: songs(state.played).slice(-30),
    working,
    making,
    videoSlots: { active: activeVideoCount(), max: HF_MAX_CONCURRENT, waiting: videoWaitList().length },
  });
});

// Skjermen sier fra når en sang er ferdig spilt (eller vil hoppe over). Returnerer neste sang.
app.post('/api/queue/next', (req, res) => {
  const finished = String((req.body || {}).finished || '');
  if (finished && finished === state.nowPlaying) {
    state.played.push(finished);
    state.nowPlaying = null;
  }
  if (!state.nowPlaying) {
    while (state.queue.length) {
      const id = state.queue.shift();
      const j = jobs.get(id);
      if (j && !j.hidden) {
        state.nowPlaying = id;
        break;
      }
    }
  }
  save();
  res.json({ nowPlaying: state.nowPlaying ? publicJob(jobs.get(state.nowPlaying)) : null });
});

// Webhooks (brukes når PUBLIC_URL er satt; polling er alltid backup)
app.post('/api/hooks/:provider', (req, res) => {
  const job = jobs.get(String(req.query.job || ''));
  if (!job || req.query.t !== job.hookToken) return res.status(404).end();
  res.json({ ok: true });
  lastPoll.delete(job.id); // poll umiddelbart for å hente fasit fra API-et
  pollJob(job).catch((err) => console.warn('[hook]', err.message));
});

// Gjestebok med vri: korte hilsener som vises på storskjermen
app.post('/api/greeting', (req, res) => {
  const b = req.body || {};
  const limit = checkLimits(clean(b.deviceId, 64) || req.ip, { budget: false });
  if (limit) return res.status(429).json({ error: limit });
  const text = clean(b.text, 200);
  if (text.length < 2) return res.status(400).json({ error: 'Skriv litt først 😊' });
  const prompt = PARTY.greetingPrompts.find((g) => g.id === b.prompt) || PARTY.greetingPrompts[0] || { name: 'Hilsen', emoji: '💌' };
  const job = newJob('greeting', { status: 'done', guest: clean(b.name, 40), label: prompt.name, emoji: prompt.emoji, text });
  res.json({ id: job.id });
});

// Quiz om bursdagsbarnet
app.get('/api/quiz', (req, res) => {
  const deviceId = clean(req.query.deviceId, 64);
  const mine = state.quiz.find((e) => e.deviceId === deviceId);
  res.json({
    questions: PARTY.quiz.questions.map(({ q, options }) => ({ q, options })),
    closed: !!state.quizClosed,
    mine: mine ? { name: mine.name, answers: mine.answers } : null,
  });
});

app.post('/api/quiz', (req, res) => {
  const b = req.body || {};
  if (state.quizClosed) return res.status(409).json({ error: 'Quizen er avsluttet, vinneren er trukket! 🏆' });
  const deviceId = clean(b.deviceId, 64);
  const name = clean(b.name, 40);
  if (!deviceId || !name) return res.status(400).json({ error: 'Skriv navnet ditt, så vi vet hvem som vinner!' });
  const qs = PARTY.quiz.questions;
  const answers = qs.map((q, i) => {
    const a = Number(Array.isArray(b.answers) ? b.answers[i] : NaN);
    return Number.isInteger(a) && a >= 0 && a < q.options.length ? a : null;
  });
  if (answers.some((a) => a === null)) return res.status(400).json({ error: 'Svar på alle spørsmålene først!' });
  const entry = { deviceId, name, answers, score: party.scoreQuiz(qs, answers), at: Date.now() };
  state.quiz = state.quiz.filter((e) => e.deviceId !== deviceId).concat(entry);
  save();
  res.json({ ok: true, count: state.quiz.length });
});

// Felles høydepunkt: storskjermen tar over (kaketid, quiz-trekning, hilsener høyt)
function takeoverView() {
  const t = state.takeover;
  if (!t) return null;
  if (t.mode === 'quiz') {
    return {
      ...t,
      answers: PARTY.quiz.questions.map((q) => ({ q: q.q, a: q.options[q.correct] })),
    };
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

app.get('/api/admin/jobs', requireAdmin, (req, res) => {
  const list = [...jobs.values()].sort((a, b) => b.createdAt - a.createdAt).map((j) => ({ ...publicJob(j), hidden: !!j.hidden, error: j.error }));
  res.json({ jobs: list, queue: state.queue, nowPlaying: state.nowPlaying });
});

app.get('/api/admin/party', requireAdmin, (req, res) => {
  const top = [...state.quiz].sort((a, b) => b.score - a.score || a.at - b.at).slice(0, 10).map(({ name, score }) => ({ name, score }));
  res.json({
    takeover: state.takeover ? state.takeover.mode : null,
    quiz: { count: state.quiz.length, max: PARTY.quiz.questions.length, top, example: PARTY.quiz.example, closed: !!state.quizClosed },
    videoSlots: { active: activeVideoCount(), max: HF_MAX_CONCURRENT, waiting: videoWaitList().length },
    nostalgia: nostalgiaFiles().length,
    playlist: playlistFiles().length,
  });
});

app.post('/api/admin/takeover', requireAdmin, (req, res) => {
  const mode = (req.body || {}).mode;
  if (mode === 'off') state.takeover = null;
  else if (mode === 'cake') state.takeover = { mode, at: Date.now(), title: (PARTY.schedule.find((p) => p.highlight) || {}).title || 'Kaketid!' };
  else if (mode === 'greetings') state.takeover = { mode, at: Date.now() };
  else if (mode === 'quiz') {
    const winner = party.drawWinner(state.quiz);
    const names = [...new Set(state.quiz.map((e) => e.name))].sort(() => Math.random() - 0.5).slice(0, 40);
    state.takeover = { mode, at: Date.now(), winner: winner && { name: winner.name, score: winner.score }, max: PARTY.quiz.questions.length, count: state.quiz.length, names };
    state.quizClosed = true;
  } else if (mode === 'reopen-quiz') {
    state.quizClosed = false;
  } else return res.status(400).json({ error: 'Ukjent modus' });
  save();
  res.json({ ok: true });
});

app.post('/api/admin/jobs/:id', requireAdmin, (req, res) => {
  const job = jobs.get(req.params.id);
  if (!job) return res.status(404).end();
  const { action } = req.body || {};
  if (action === 'hide') updateJob(job, { hidden: true });
  if (action === 'show') updateJob(job, { hidden: false });
  if (action === 'play-next' && job.type === 'song' && job.status === 'done') {
    state.queue = [job.id, ...state.queue.filter((id) => id !== job.id)];
    state.played = state.played.filter((id) => id !== job.id);
    save();
  }
  res.json({ ok: true });
});

app.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) return res.status(400).json({ error: 'Bildet er for stort. Prøv igjen!' });
  console.error(err);
  res.status(500).json({ error: 'Noe gikk galt.' });
});

app.listen(PORT, () => {
  console.log(`\n🎂 ${PARTY_TITLE} kjører på http://localhost:${PORT}`);
  for (const url of lanAddresses()) console.log(`   På nettverket: http://${url}:${PORT}`);
  console.log(`   Video (Higgsfield): ${useHiggsfield ? 'PÅ' : 'DEMO (sett HF_KEY)'}, maks ${HF_MAX_CONCURRENT} samtidig`);
  console.log(`   Sang (Suno):        ${useSuno ? 'PÅ' : 'DEMO (sett SUNO_API_KEY)'}`);
  if (!PUBLIC_URL) console.log('   Tips: sett PUBLIC_URL slik at QR-kodene peker til riktig adresse.\n');
});
