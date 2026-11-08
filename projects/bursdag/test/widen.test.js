'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');
const { widen, W, H } = require('../lib/widen');

const hasFfmpeg = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' }).status === 0;

test('stående bilde blir 16:9 med uskarp bakgrunn', { skip: !hasFfmpeg && 'ffmpeg mangler' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'widen-'));
  const src = path.join(dir, 'in.jpg');
  spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc=size=600x900', '-frames:v', '1', src]);
  const out = widen(src, path.join(dir, 'out.jpg'));
  assert.ok(out && fs.existsSync(out));
  const probe = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_entries', 'stream=width,height', '-of', 'csv=p=0', out], { encoding: 'utf8' });
  assert.equal(probe.stdout.trim(), `${W},${H}`);
});

test('uten bilde gir null (originalbildet brukes)', () => {
  assert.equal(widen('/finnes/ikke.jpg', path.join(os.tmpdir(), 'x.jpg')), null);
});
