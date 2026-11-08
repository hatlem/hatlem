'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');

process.env.VIDEO_SECONDS = '40'; // over grensen: skal kuttes til 15
const hf = require('../lib/higgsfield');

test('filmlengden kan aldri overstige 15 sekunder', () => {
  assert.equal(hf.MAX_VIDEO_SECONDS, 15);
  assert.equal(hf.VIDEO_SECONDS, 15);
  assert.equal(hf.clampSeconds('3', 5), 3);
  assert.equal(hf.clampSeconds('15', 5), 15);
  assert.equal(hf.clampSeconds('99', 5), 15);
  assert.equal(hf.clampSeconds('0', 5), 5);
  assert.equal(hf.clampSeconds('tull', 5), 5);
  assert.equal(hf.clampSeconds(undefined, 5), 5);
  assert.equal(hf.videoArgs({ imageUrl: 'u', prompt: 'p', seconds: 60 }).duration, 15);
  assert.equal(hf.videoArgs({ imageUrl: 'u', prompt: 'p', seconds: 7 }).duration, 7);
});

test('videoargumenter: Kling får lyd av, bilde og prompt i riktige felt', () => {
  const a = hf.videoArgs({ imageUrl: 'https://x/bilde.jpg', prompt: 'Tiger' });
  assert.equal(a.image_url, 'https://x/bilde.jpg');
  assert.equal(a.prompt, 'Tiger');
  assert.equal(a.sound, 'off');
  assert.equal(a.duration, 15);
});

test('bildefiks: image_urls som liste og bare gyldige sideforhold', () => {
  const a = hf.imageArgs({ imageUrl: 'https://x/a.jpg', prompt: 'Fiks', aspectRatio: '3:4' });
  assert.deepEqual(a.image_urls, ['https://x/a.jpg']);
  assert.equal(a.aspect_ratio, '3:4');
  assert.equal(a.resolution, '1k');
  assert.equal('aspect_ratio' in hf.imageArgs({ imageUrl: 'u', prompt: 'p', aspectRatio: '5:7' }), false);
});

test('finner bilde- og video-URL i svaret fra Higgsfield', () => {
  const done = { request_id: 'r', status: 'completed', status_url: 'https://api/requests/r/status', cancel_url: 'https://api/requests/r/cancel', images: [{ url: 'https://cdn/out.png' }] };
  assert.equal(hf.findImageUrl(done), 'https://cdn/out.png');
  assert.equal(hf.findVideoUrl(done), null);
  const video = { status: 'completed', status_url: 'https://api/requests/r/status', video: { url: 'https://cdn/out.mp4' } };
  assert.equal(hf.findVideoUrl(video), 'https://cdn/out.mp4');
  assert.equal(hf.findImageUrl(video), null);
});
