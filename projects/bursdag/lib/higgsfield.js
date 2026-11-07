'use strict';

/**
 * Higgsfield cloud API (https://cloud.higgsfield.ai).
 * Speiler oppførselen til den offisielle SDK-en `higgsfield-client`:
 *   - Auth:   Authorization: Key <key_id>:<key_secret>
 *   - Upload: POST /files/generate-upload-url { content_type } -> { public_url, upload_url, upload_headers }, så PUT
 *   - Submit: POST /<modell-sti>[?hf_webhook=<url>] med argumenter som JSON -> { request_id, status_url, cancel_url }
 *   - Status: GET /requests/<id>/status -> { status: queued|in_progress|completed|failed|nsfw|canceled, ... }
 */

const BASE = (process.env.HF_BASE_URL || 'https://api.higgsfield.ai').replace(/\/+$/, '');
const KEY = process.env.HF_KEY || (process.env.HF_API_KEY && process.env.HF_API_SECRET ? `${process.env.HF_API_KEY}:${process.env.HF_API_SECRET}` : '');
// Modellsti for bilde-til-video. Bytt via env hvis du vil bruke en annen modell fra Higgsfield-katalogen.
const VIDEO_MODEL = (process.env.HF_VIDEO_MODEL || 'higgsfield-ai/dop/standard').replace(/^\/+/, '');
// Ekstra argumenter til modellen, f.eks. {"duration":5,"aspect_ratio":"9:16"}
let EXTRA = {};
try {
  EXTRA = JSON.parse(process.env.HF_VIDEO_EXTRA || '{}');
} catch {
  console.warn('[higgsfield] HF_VIDEO_EXTRA er ikke gyldig JSON – ignorerer');
}
// Feltnavn for bilde og prompt, i tilfelle modellen du velger bruker andre navn.
const IMAGE_FIELD = process.env.HF_IMAGE_FIELD || 'image_url';
const PROMPT_FIELD = process.env.HF_PROMPT_FIELD || 'prompt';

function isConfigured() {
  return Boolean(KEY);
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

async function submitImageToVideo({ imageUrl, prompt, webhookUrl }) {
  return submit(VIDEO_MODEL, { ...EXTRA, [IMAGE_FIELD]: imageUrl, [PROMPT_FIELD]: prompt }, webhookUrl);
}

// Lipsync (finalen): få en video til å synge en sang. Modellsti og feltnavn settes i env.
const LIPSYNC_MODEL = (process.env.HF_LIPSYNC_MODEL || '').replace(/^\/+/, '');
let LIPSYNC_EXTRA = { sync_mode: 'bounce' };
try {
  LIPSYNC_EXTRA = { ...LIPSYNC_EXTRA, ...JSON.parse(process.env.HF_LIPSYNC_EXTRA || '{}') };
} catch {
  console.warn('[higgsfield] HF_LIPSYNC_EXTRA er ikke gyldig JSON – ignorerer');
}
async function submitLipsync({ videoUrl, audioUrl, webhookUrl }) {
  if (!LIPSYNC_MODEL) throw new Error('HF_LIPSYNC_MODEL er ikke satt');
  const args = {
    ...LIPSYNC_EXTRA,
    [process.env.HF_LIPSYNC_VIDEO_FIELD || 'video_url']: videoUrl,
    [process.env.HF_LIPSYNC_AUDIO_FIELD || 'audio_url']: audioUrl,
  };
  return submit(LIPSYNC_MODEL, args, webhookUrl);
}

/** Finn første video-URL i svaret, uansett hvordan modellen strukturerer det. */
function findVideoUrl(obj) {
  const urls = [];
  (function walk(v, key) {
    if (!v) return;
    if (typeof v === 'string') {
      if (/^https?:\/\//.test(v)) urls.push({ url: v, key });
    } else if (Array.isArray(v)) v.forEach((x) => walk(x, key));
    else if (typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(x, k);
  })(obj, '');
  const isVideo = (u) => /\.(mp4|webm|mov)(\?|$)/i.test(u.url) || /video/i.test(u.key);
  return (urls.find(isVideo) || {}).url || null;
}

async function status(requestId) {
  const data = await call('GET', `/requests/${encodeURIComponent(requestId)}/status`);
  const s = String(data.status || '').toLowerCase();
  return { status: s, videoUrl: s === 'completed' ? findVideoUrl(data) : null, raw: data };
}

module.exports = { isConfigured, upload, submit, submitImageToVideo, submitLipsync, lipsyncConfigured: () => Boolean(KEY && LIPSYNC_MODEL), status, findVideoUrl };
