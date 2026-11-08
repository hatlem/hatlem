'use strict';

/**
 * Egne klipp fra gjestene: maks MAX_CLIP_SECONDS, gjøres om til H.264 mp4 (mobilvideo er ofte HEVC,
 * som skjermen ikke kan spille) og får et stillbilde til bakgrunn og galleri. Krever ffmpeg.
 */

const { spawn, spawnSync } = require('child_process');

const MAX_CLIP_SECONDS = 15;
const MAX_SIDE = 1280;
const WIDE_W = 1280, WIDE_H = 720;

function available() {
  try {
    return spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
  } catch {
    return false;
  }
}

/** Lengde i sekunder (ffprobe), eller null. */
function duration(file) {
  try {
    const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file], { encoding: 'utf8' });
    const d = parseFloat(r.stdout);
    return Number.isFinite(d) ? d : null;
  } catch {
    return null;
  }
}

/** Hvor lang den ferdige filen blir: aldri over grensen, selv om klienten slapp gjennom noe lengre. */
function plan(seconds, max = MAX_CLIP_SECONDS) {
  const d = Number.isFinite(seconds) && seconds > 0 ? seconds : null;
  const trimmed = d != null && d > max + 0.25;
  return { seconds: d == null ? max : Math.min(d, max), trimmed };
}

/**
 * Omkoding: H.264 + AAC, 30 fps, kuttet til `seconds`. Rotasjon fra mobil følger med (autorotate).
 * wide (standard): alltid 1280x720 (16:9) så klippet fyller skjermen. Stående (9:16) og andre formater
 * legges i midten, og sidene fylles med en forstørret, uskarp kopi av klippet i stedet for svarte kanter.
 * wide = false: beholder formen fra mobilen (maks 1280 px).
 */
function transcodeArgs(input, output, seconds, wide = true) {
  const video = wide
    ? ['-filter_complex',
      `[0:v]split[a][b];[a]scale=${WIDE_W}:${WIDE_H}:force_original_aspect_ratio=increase,crop=${WIDE_W}:${WIDE_H},boxblur=20:2,eq=brightness=-0.08[bg];` +
        `[b]scale=${WIDE_W}:${WIDE_H}:force_original_aspect_ratio=decrease:force_divisible_by=2[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2,fps=30,format=yuv420p[v]`,
      '-map', '[v]', '-map', '0:a?']
    : ['-vf', `scale='min(${MAX_SIDE},iw)':'min(${MAX_SIDE},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,fps=30,format=yuv420p`];
  return [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-i', input, '-t', String(seconds),
    ...video,
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '21', '-profile:v', 'high', '-level', '4.1',
    '-c:a', 'aac', '-b:a', '128k', '-ac', '2',
    '-movflags', '+faststart', output,
  ];
}

/** Stillbilde fra ett sekund inn i klippet (bakgrunn på skjermen og celle i galleriet). */
function posterArgs(input, output) {
  return ['-y', '-hide_banner', '-loglevel', 'error', '-ss', '1', '-i', input, '-frames:v', '1', '-q:v', '3', output];
}

function run(args) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', args, { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += d; });
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve() : reject(new Error('ffmpeg feilet: ' + err.slice(-300)))));
  });
}

/**
 * @returns {Promise<{seconds:number, trimmed:boolean, poster:boolean}>}
 */
async function prepare(input, output, poster, { wide = true } = {}) {
  const p = plan(duration(input));
  await run(transcodeArgs(input, output, p.seconds, wide));
  let hasPoster = false;
  try {
    await run(posterArgs(output, poster));
    hasPoster = true;
  } catch (err) {
    console.warn('[clip] uten stillbilde:', err.message);
  }
  return { ...p, poster: hasPoster };
}

module.exports = { MAX_CLIP_SECONDS, available, duration, plan, transcodeArgs, posterArgs, prepare };
