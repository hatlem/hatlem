'use strict';

/**
 * Lager en «frem og tilbake»-versjon av et klipp: originalen etterfulgt av seg selv i revers.
 * Med <video loop> går filmen da frem, tilbake, frem … uten hakk, så korte klipp lever lenger på skjermen.
 * Bruker ffmpeg (nixpacks.toml installerer den på Railway). Jobbene kjøres én om gangen,
 * fordi reverseringen holder hele klippet i minnet.
 */

const { spawn, spawnSync } = require('child_process');

function available() {
  try {
    return spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
  } catch {
    return false;
  }
}

/** Argumenter til ffmpeg. Eksportert for test; første og siste bilde dobles ikke i vendepunktene. */
function ffmpegArgs(input, output) {
  return [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-i', input,
    '-filter_complex', '[0:v]split[a][b];[b]reverse,trim=start_frame=1[r];[a][r]concat=n=2:v=1:a=0,format=yuv420p[v]',
    '-map', '[v]', '-an',
    '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-movflags', '+faststart',
    output,
  ];
}

function run(input, output) {
  return new Promise((resolve, reject) => {
    const p = spawn('ffmpeg', ffmpegArgs(input, output), { stdio: ['ignore', 'ignore', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += d; });
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve(output) : reject(new Error('ffmpeg feilet: ' + err.slice(-300)))));
  });
}

let chain = Promise.resolve();
/** Kø: ett ffmpeg-kjør om gangen. Løser med utfilen. */
function build(input, output) {
  const job = chain.then(() => run(input, output));
  chain = job.catch(() => {});
  return job;
}

module.exports = { available, build, ffmpegArgs };
