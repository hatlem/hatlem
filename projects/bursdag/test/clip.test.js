'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const clip = require('../lib/clip');

test('klipp kuttes til 15 sekunder, kortere beholdes', () => {
  assert.deepEqual(clip.plan(7.4), { seconds: 7.4, trimmed: false });
  assert.deepEqual(clip.plan(15.1), { seconds: 15, trimmed: false }); // avrundingsslingring
  assert.deepEqual(clip.plan(42), { seconds: 15, trimmed: true });
  assert.deepEqual(clip.plan(null), { seconds: 15, trimmed: false });
  assert.deepEqual(clip.plan(-3), { seconds: 15, trimmed: false });
  assert.equal(clip.MAX_CLIP_SECONDS, 15);
});

test('omkoding: H.264 mp4, kuttet, maks 1280 px, faststart', () => {
  const a = clip.transcodeArgs('inn.mov', 'ut.mp4', 9, false);
  assert.equal(a[a.indexOf('-t') + 1], '9');
  assert.equal(a[a.indexOf('-c:v') + 1], 'libx264');
  assert.match(a[a.indexOf('-vf') + 1], /min\(1280,iw\)/);
  assert.ok(a.includes('+faststart'));
  assert.equal(a[a.length - 1], 'ut.mp4');
  const p = clip.posterArgs('ut.mp4', 'ut.jpg');
  assert.equal(p[p.length - 1], 'ut.jpg');
  assert.equal(p[p.indexOf('-frames:v') + 1], '1');
});

test('standard: klippet blir 16:9 (1280x720) med uskarpe sider, lyden følger med hvis den finnes', () => {
  const a = clip.transcodeArgs('inn.mov', 'ut.mp4', 9);
  const f = a[a.indexOf('-filter_complex') + 1];
  assert.match(f, /crop=1280:720,boxblur/);
  assert.match(f, /overlay=\(W-w\)\/2:\(H-h\)\/2/);
  assert.ok(a.includes('0:a?'));
  assert.ok(!a.includes('-vf'));
});

const { spawnSync } = require('child_process');
const hasFfmpeg = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;
test('stående 9:16-klipp blir 1280x720', { skip: !hasFfmpeg && 'ffmpeg mangler' }, async () => {
  const fs = require('fs'); const os = require('os'); const path = require('path');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'clip-'));
  const src = path.join(dir, 'in.mp4');
  spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc=size=720x1280:rate=30', '-t', '2', '-pix_fmt', 'yuv420p', src]);
  const r = await clip.prepare(src, path.join(dir, 'out.mp4'), path.join(dir, 'p.jpg'));
  assert.ok(r.poster);
  const probe = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', path.join(dir, 'out.mp4')], { encoding: 'utf8' });
  assert.equal(probe.stdout.trim(), '1280,720');
});
