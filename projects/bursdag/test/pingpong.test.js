'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { ffmpegArgs } = require('../lib/pingpong');

test('ffmpeg-argumenter: frem + revers uten lyd, med trimmet vendepunkt', () => {
  const a = ffmpegArgs('inn.mp4', 'ut.mp4');
  const filter = a[a.indexOf('-filter_complex') + 1];
  assert.match(filter, /reverse,trim=start_frame=1/);
  assert.match(filter, /concat=n=2:v=1:a=0/);
  assert.ok(a.includes('-an'));
  assert.equal(a[a.length - 1], 'ut.mp4');
  assert.equal(a[a.indexOf('-i') + 1], 'inn.mp4');
});
