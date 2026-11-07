'use strict';

/**
 * Suno via sunoapi.org (samme API finnes på api.box / "MusicBox").
 *   POST /api/v1/generate                  -> { code: 200, data: { taskId } }
 *   GET  /api/v1/generate/record-info?taskId=... -> { data: { status, response: { sunoData: [ { audioUrl, streamAudioUrl, imageUrl, title, duration } ] } } }
 */

const BASE = (process.env.SUNO_BASE_URL || 'https://api.sunoapi.org').replace(/\/+$/, '');
const KEY = process.env.SUNO_API_KEY || '';
const MODEL = process.env.SUNO_MODEL || 'V4_5';

function isConfigured() {
  return Boolean(KEY);
}

async function call(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error(`Suno ${path} -> ${res.status}: ${text.slice(0, 300)}`);
  }
  if (!res.ok || (data.code && data.code !== 200)) {
    throw new Error(`Suno ${path} -> ${res.status}/${data.code}: ${data.msg || text.slice(0, 300)}`);
  }
  return data;
}

async function generate({ prompt, callBackUrl }) {
  const data = await call('POST', '/api/v1/generate', {
    customMode: false,
    instrumental: false,
    model: MODEL,
    prompt,
    // callBackUrl er påkrevd av API-et. Uten offentlig adresse poller vi i stedet.
    callBackUrl: callBackUrl || 'https://example.com/suno-callback-unused',
  });
  const taskId = data.data && (data.data.taskId || data.data.task_id);
  if (!taskId) throw new Error(`Suno svarte uten taskId: ${JSON.stringify(data).slice(0, 300)}`);
  return { taskId };
}

const FAILED = /FAIL|ERROR|SENSITIVE/i;

async function status(taskId) {
  const data = await call('GET', `/api/v1/generate/record-info?taskId=${encodeURIComponent(taskId)}`);
  const d = data.data || {};
  const st = String(d.status || '');
  const list = (d.response && (d.response.sunoData || d.response.data)) || [];
  const t = list.find((x) => x.audioUrl || x.audio_url) || null;
  const track = t && {
    audioUrl: t.audioUrl || t.audio_url,
    imageUrl: t.imageUrl || t.image_url || null,
    title: t.title || null,
    duration: t.duration || null,
    // I ikke-custom modus ligger den genererte sangteksten i «prompt»
    lyrics: t.prompt || t.lyric || t.lyrics || null,
  };
  if (FAILED.test(st)) return { failed: true, message: /SENSITIVE/i.test(st) ? 'Teksten ble stoppet av filteret. Prøv et annet tema!' : null };
  // FIRST_SUCCESS = første av to låter er ferdig, det holder for oss.
  return { done: (st === 'SUCCESS' || st === 'FIRST_SUCCESS') && !!track, track, status: st };
}

module.exports = { isConfigured, generate, status };
