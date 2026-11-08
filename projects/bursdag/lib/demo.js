'use strict';

/**
 * Demomodus: brukes når API-nøkler mangler, så du kan teste hele flyten
 * (QR -> mobil -> skjerm -> musikk-kø) uten å bruke kreditter.
 */

const VIDEO_DELAY_MS = 10000;
const SONG_DELAY_MS = 8000;

/** Lag en liten, glad melodi som WAV (unik per jobb). */
function makeSongWav(seedStr) {
  let seed = [...seedStr].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
  const rand = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32);

  const rate = 22050;
  const scale = [0, 2, 4, 5, 7, 9, 11, 12, 14, 16];
  const root = 220 * 2 ** (Math.floor(rand() * 5) / 12);
  const beat = 0.22;
  const notes = [];
  for (let bar = 0; bar < 8; bar++) {
    for (let i = 0; i < 4; i++) notes.push(scale[Math.floor(rand() * scale.length)]);
  }
  const melody = [...notes, ...notes]; // gjenta = "refreng"
  const total = Math.ceil(melody.length * beat * rate);
  const pcm = new Int16Array(total);
  melody.forEach((step, n) => {
    const f = root * 2 ** (step / 12);
    const bass = root / 2 * 2 ** (scale[(Math.floor(n / 4) * 3) % 5] / 12);
    const start = Math.floor(n * beat * rate);
    const len = Math.floor(beat * rate);
    for (let i = 0; i < len && start + i < total; i++) {
      const t = i / rate;
      const env = Math.min(1, i / 200) * Math.exp(-3 * t);
      const s = 0.35 * Math.sin(2 * Math.PI * f * t) * env + 0.15 * Math.sin(2 * Math.PI * bass * t) + 0.08 * Math.sign(Math.sin(2 * Math.PI * f * 2 * t)) * env;
      pcm[start + i] = Math.max(-1, Math.min(1, s)) * 32767 * 0.6;
    }
  });

  const header = Buffer.alloc(44);
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + pcm.byteLength, 4);
  header.write('WAVEfmt ', 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(rate, 24);
  header.writeUInt32LE(rate * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(pcm.byteLength, 40);
  return Buffer.concat([header, Buffer.from(pcm.buffer)]);
}

module.exports = { VIDEO_DELAY_MS, SONG_DELAY_MS, makeSongWav };
