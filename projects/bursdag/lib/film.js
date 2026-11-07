'use strict';

/**
 * «Kveldens film»: syr sammen gjestenes filmer (og bilder) til én film med musikk under.
 * Bruker ffmpeg (må være installert; på Railway via nixpacks.toml).
 */

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');

const W = 1280, H = 720, FPS = 30;

function available() {
  try {
    return spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
  } catch {
    return false;
  }
}

/** Lengde på en mediefil i sekunder (via ffprobe), eller null. */
function duration(file) {
  try {
    const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file], { encoding: 'utf8' });
    const d = parseFloat(r.stdout);
    return Number.isFinite(d) ? d : null;
  } catch {
    return null;
  }
}

/**
 * @param {{ clips: {file: string, image?: boolean}[], audio: string[], out: string, clipSeconds?: number, onProgress?: (p:number)=>void }} opts
 */
function build({ clips, audio, out, clipSeconds = 5, onProgress }) {
  return new Promise((resolve, reject) => {
    if (!clips.length) return reject(new Error('Ingen klipp å lage film av ennå'));
    const args = ['-y', '-hide_banner', '-loglevel', 'error', '-progress', 'pipe:1'];
    const parts = [];
    let total = 0;

    clips.forEach((c, i) => {
      let len = clipSeconds;
      if (c.image) {
        args.push('-loop', '1', '-t', String(4), '-i', c.file);
        len = 4;
      } else {
        const d = duration(c.file);
        len = Math.max(1, Math.min(clipSeconds, d || clipSeconds));
        args.push('-t', String(len), '-i', c.file);
      }
      total += len;
      // Likt format på alle klipp: 1280x720, svart kant ved behov, myk inn-/uttoning
      parts.push(
        `[${i}:v]scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2:color=0x120a24,setsar=1,fps=${FPS},format=yuv420p,` +
          `trim=duration=${len},setpts=PTS-STARTPTS,fade=t=in:st=0:d=0.4,fade=t=out:st=${Math.max(0, len - 0.4)}:d=0.4[v${i}]`,
      );
    });

    const n = clips.length;
    let filter = parts.join(';') + ';' + clips.map((_, i) => `[v${i}]`).join('') + `concat=n=${n}:v=1:a=0[v]`;
    const map = ['-map', '[v]'];

    // Musikk: gjestesanger etter hverandre (gjentas om filmen er lengre), tones ut på slutten
    const tracks = audio.filter((f) => fs.existsSync(f));
    if (tracks.length) {
      tracks.forEach((f) => args.push('-stream_loop', '-1', '-i', f));
      const a0 = n;
      if (tracks.length === 1) filter += `;[${a0}:a]atrim=duration=${total},asetpts=PTS-STARTPTS[araw]`;
      else {
        // Bruk hvert spor i lik lengde så alle sangene kommer med
        const each = total / tracks.length;
        filter += ';' + tracks.map((_, j) => `[${a0 + j}:a]atrim=duration=${each},asetpts=PTS-STARTPTS,aresample=44100,aformat=channel_layouts=stereo[a${j}]`).join(';');
        filter += ';' + tracks.map((_, j) => `[a${j}]`).join('') + `concat=n=${tracks.length}:v=0:a=1[araw]`;
      }
      filter += `;[araw]afade=t=in:st=0:d=1,afade=t=out:st=${Math.max(0, total - 3)}:d=3[a]`;
      map.push('-map', '[a]');
    }

    args.push('-filter_complex', filter, ...map, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '23', '-movflags', '+faststart');
    if (tracks.length) args.push('-c:a', 'aac', '-b:a', '160k');
    args.push('-t', String(total), out);

    const p = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let err = '';
    p.stderr.on('data', (d) => { err += d; });
    p.stdout.on('data', (d) => {
      const m = String(d).match(/out_time_us=(\d+)/g);
      if (m && onProgress) onProgress(Math.min(0.99, Number(m[m.length - 1].split('=')[1]) / 1e6 / total));
    });
    p.on('error', reject);
    p.on('close', (code) => (code === 0 ? resolve({ seconds: total }) : reject(new Error('ffmpeg feilet: ' + err.slice(-400)))));
  });
}

module.exports = { available, build };
