'use strict';

/**
 * Higgsfield cloud API (https://docs.higgsfield.ai).
 * Speiler oppførselen til den offisielle SDK-en `higgsfield-client`:
 *   - Auth:   Authorization: Key <key_id>:<key_secret>
 *   - Upload: POST /files/generate-upload-url { content_type } -> { public_url, upload_url, upload_headers }, så PUT
 *   - Submit: POST /<modell-sti>[?hf_webhook=<url>] med argumenter som JSON -> { request_id, status_url, cancel_url }
 *   - Status: GET /requests/<id>/status -> { status: queued|in_progress|completed|failed|nsfw|canceled, video: {url} | images: [{url}] }
 *
 * To steg per selfie: bildefiks (lys + ny bakgrunn) og deretter bilde-til-video.
 */

const BASE = (process.env.HF_BASE_URL || 'https://api.higgsfield.ai').replace(/\/+$/, '');
const KEY = process.env.HF_KEY || (process.env.HF_API_KEY && process.env.HF_API_SECRET ? `${process.env.HF_API_KEY}:${process.env.HF_API_SECRET}` : '');

// --- Bilde til video --------------------------------------------------------
// Modellsti. Kling 3.0 Standard tar image_url + prompt, duration 3–15 s og sound on/off.
const VIDEO_MODEL = (process.env.HF_VIDEO_MODEL || 'kling-video/v3.0/std/image-to-video').replace(/^\/+/, '');
const MAX_VIDEO_SECONDS = 15; // lengste film gjestene kan få (holder kostnadene og ventetiden nede)
const VIDEO_SECONDS = clampSeconds(process.env.VIDEO_SECONDS, 5);
const VIDEO_EXTRA = parseJson('HF_VIDEO_EXTRA', /kling-video/.test(VIDEO_MODEL) ? { sound: 'off' } : {});
const IMAGE_FIELD = process.env.HF_IMAGE_FIELD || 'image_url';
const PROMPT_FIELD = process.env.HF_PROMPT_FIELD || 'prompt';
const DURATION_FIELD = process.env.HF_DURATION_FIELD || 'duration';

// --- Bildefiks (bilde til bilde) -------------------------------------------
// Qwen Image 3 Edit tar image_urls (liste), prompt, aspect_ratio og resolution. Sett HF_IMAGE_MODEL= (tom) for å hoppe over steget.
const IMAGE_MODEL = (process.env.HF_IMAGE_MODEL ?? 'alibaba/qwen-image-3/edit').replace(/^\/+/, '');
const IMAGE_EXTRA = parseJson('HF_IMAGE_EXTRA', { resolution: '1k' });
const IMAGE_INPUT_FIELD = process.env.HF_IMAGE_INPUT_FIELD || 'image_urls';
const IMAGE_ASPECTS = ['1:1', '2:3', '3:2', '3:4', '4:3', '7:9', '9:7', '9:16', '16:9', '21:9'];

function parseJson(name, fallback) {
  if (!process.env[name]) return fallback;
  try {
    return { ...fallback, ...JSON.parse(process.env[name]) };
  } catch {
    console.warn(`[higgsfield] ${name} er ikke gyldig JSON – ignorerer`);
    return fallback;
  }
}

/** Hele sekunder mellom 1 og MAX_VIDEO_SECONDS; ugyldig verdi gir standarden. */
function clampSeconds(value, fallback) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(MAX_VIDEO_SECONDS, n);
}

function isConfigured() {
  return Boolean(KEY);
}
function imageFixConfigured() {
  return Boolean(KEY && IMAGE_MODEL);
}

async function call(method, pathOrUrl, body) {
  const url = pathOrUrl.startsWith('http') ? pathOrUrl : `${BASE}/${pathOrUrl.replace(/^\/+/, '')}`;
  const res = await fetch(url, {
    method,
    headers: { Authorization: `Key ${KEY}`, 'Content-Type': 'application/json', 'User-Agent': 'bursdag-installasjon/1.0' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  if (!res.ok) throw new Error(`Higgsfield ${method} ${url} -> ${res.status}: ${text.slice(0, 300)}`);
  return data;
}

async function upload(buffer, contentType) {
  const slot = await call('POST', '/files/generate-upload-url', { content_type: contentType });
  const put = await fetch(slot.upload_url, {
    method: 'PUT',
    headers: slot.upload_headers || { 'Content-Type': contentType },
    body: buffer,
  });
  if (!put.ok) throw new Error(`Higgsfield upload feilet: ${put.status}`);
  return slot.public_url;
}

async function submit(model, args, webhookUrl) {
  const q = webhookUrl ? `?hf_webhook=${encodeURIComponent(webhookUrl)}` : '';
  const data = await call('POST', `/${String(model).replace(/^\/+/, '')}${q}`, args);
  if (!data.request_id) throw new Error(`Higgsfield svarte uten request_id: ${JSON.stringify(data).slice(0, 300)}`);
  return { requestId: data.request_id };
}

/** Argumentene til videomodellen. Lengden kan aldri overstige MAX_VIDEO_SECONDS, heller ikke via HF_VIDEO_EXTRA. */
function videoArgs({ imageUrl, prompt, seconds }) {
  const args = { ...VIDEO_EXTRA, [IMAGE_FIELD]: imageUrl, [PROMPT_FIELD]: prompt };
  args[DURATION_FIELD] = clampSeconds(seconds ?? args[DURATION_FIELD], VIDEO_SECONDS);
  return args;
}

async function submitImageToVideo({ imageUrl, prompt, seconds, webhookUrl }) {
  return submit(VIDEO_MODEL, videoArgs({ imageUrl, prompt, seconds }), webhookUrl);
}

/** Argumentene til bildefiksen. aspectRatio må være ett av IMAGE_ASPECTS, ellers velger modellen selv. */
function imageArgs({ imageUrl, prompt, aspectRatio }) {
  const args = { ...IMAGE_EXTRA, [IMAGE_INPUT_FIELD]: [imageUrl], prompt };
  if (IMAGE_ASPECTS.includes(aspectRatio)) args.aspect_ratio = aspectRatio;
  return args;
}

async function submitImageFix({ imageUrl, prompt, aspectRatio, webhookUrl }) {
  if (!IMAGE_MODEL) throw new Error('HF_IMAGE_MODEL er ikke satt');
  return submit(IMAGE_MODEL, imageArgs({ imageUrl, prompt, aspectRatio }), webhookUrl);
}

// Lipsync (finalen): få en video til å synge en sang. Modellsti og feltnavn settes i env.
const LIPSYNC_MODEL = (process.env.HF_LIPSYNC_MODEL || '').replace(/^\/+/, '');
const LIPSYNC_EXTRA = parseJson('HF_LIPSYNC_EXTRA', { sync_mode: 'bounce' });
async function submitLipsync({ videoUrl, audioUrl, webhookUrl }) {
  if (!LIPSYNC_MODEL) throw new Error('HF_LIPSYNC_MODEL er ikke satt');
  const args = {
    ...LIPSYNC_EXTRA,
    [process.env.HF_LIPSYNC_VIDEO_FIELD || 'video_url']: videoUrl,
    [process.env.HF_LIPSYNC_AUDIO_FIELD || 'audio_url']: audioUrl,
  };
  return submit(LIPSYNC_MODEL, args, webhookUrl);
}

/** Alle http-lenker i svaret, med nøkkelen de lå under. */
function urlsIn(obj) {
  const urls = [];
  (function walk(v, key) {
    if (!v) return;
    if (typeof v === 'string') {
      if (/^https?:\/\//.test(v)) urls.push({ url: v, key });
    } else if (Array.isArray(v)) v.forEach((x) => walk(x, key));
    else if (typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, k);
  })(obj, '');
  return urls;
}

/** Finn første video-URL i svaret, uansett hvordan modellen strukturerer det. */
function findVideoUrl(obj) {
  const isVideo = (u) => /\.(mp4|webm|mov)(\?|$)/i.test(u.url) || /video/i.test(u.key);
  return (urlsIn(obj).find(isVideo) || {}).url || null;
}

/** Finn første bilde-URL i svaret (images: [{url}] hos de fleste bildemodellene). */
function findImageUrl(obj) {
  const isImage = (u) => /\.(jpe?g|png|webp)(\?|$)/i.test(u.url) || /image|url/i.test(u.key);
  const notVideo = (u) => !/\.(mp4|webm|mov)(\?|$)/i.test(u.url) && !/video|status|cancel|webhook/i.test(u.key);
  return (urlsIn(obj).filter(notVideo).find(isImage) || {}).url || null;
}

async function status(requestId) {
  const data = await call('GET', `/requests/${encodeURIComponent(requestId)}/status`);
  const s = String(data.status || '').toLowerCase();
  const done = s === 'completed';
  return { status: s, videoUrl: done ? findVideoUrl(data) : null, imageUrl: done ? findImageUrl(data) : null, raw: data };
}

module.exports = {
  isConfigured, imageFixConfigured, upload, submit, submitImageToVideo, submitImageFix, submitLipsync,
  lipsyncConfigured: () => Boolean(KEY && LIPSYNC_MODEL), status, findVideoUrl, findImageUrl,
  videoArgs, imageArgs, clampSeconds, IMAGE_ASPECTS, MAX_VIDEO_SECONDS, VIDEO_SECONDS, VIDEO_MODEL, IMAGE_MODEL,
};
