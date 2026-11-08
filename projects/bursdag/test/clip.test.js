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
  const a = clip.transcodeArgs('inn.mov', 'ut.mp4', 9);
  assert.equal(a[a.indexOf('-t') + 1], '9');
  assert.equal(a[a.indexOf('-c:v') + 1], 'libx264');
  assert.match(a[a.indexOf('-vf') + 1], /min\(1280,iw\)/);
  assert.ok(a.includes('+faststart'));
  assert.equal(a[a.length - 1], 'ut.mp4');
  const p = clip.posterArgs('ut.mp4', 'ut.jpg');
  assert.equal(p[p.length - 1], 'ut.jpg');
  assert.equal(p[p.indexOf('-frames:v') + 1], '1');
});
