'use strict';

/**
 * Legger et bilde midt i en 16:9-ramme med en uskarp, forstørret kopi av bildet bak (ingen svarte kanter).
 * Brukes når bildefiksen er av eller feiler, så filmen fra bilde-til-video likevel blir 16:9.
 * Krever ffmpeg; uten ffmpeg returneres null og originalbildet brukes.
 */

const { spawnSync } = require('child_process');

const W = 1920, H = 1080;

function args(input, output) {
  return [
    '-y', '-hide_banner', '-loglevel', 'error', '-i', input,
    '-filter_complex',
    `[0:v]split[a][b];[a]scale=${W}:${H}:force_original_aspect_ratio=increase,crop=${W}:${H},boxblur=40:2,eq=brightness=-0.08[bg];` +
      `[b]scale=${W}:${H}:force_original_aspect_ratio=decrease[fg];[bg][fg]overlay=(W-w)/2:(H-h)/2`,
    '-frames:v', '1', '-q:v', '3', output,
  ];
}

function widen(input, output) {
  try {
    const r = spawnSync('ffmpeg', args(input, output), { stdio: 'ignore', timeout: 30000 });
    return r.status === 0 ? output : null;
  } catch {
    return null;
  }
}

module.exports = { widen, args, W, H };
