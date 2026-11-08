'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { requestFeature, markShown, requeueSong, FEATURE_COOLDOWN_MS } = require('../lib/mine');

test('vis på skjermen: legges i featured én gang, og skjermen tømmer den igjen', () => {
  const state = { featured: [] };
  const job = { id: 'a' };
  assert.deepEqual(requestFeature(state, job, 1000), { ok: true, status: 'queued' });
  assert.deepEqual(requestFeature(state, job, 1000), { ok: true, status: 'queued' });
  assert.deepEqual(state.featured, ['a']);
  markShown(state, job, 5000);
  assert.deepEqual(state.featured, []);
  assert.equal(job.shownAt, 5000);
});

test('vis på skjermen: nettopp vist gir ventetid, etter pausen går det igjen', () => {
  const state = {};
  const job = { id: 'b', shownAt: 10_000 };
  const r = requestFeature(state, job, 10_000 + 30_000);
  assert.equal(r.ok, false);
  assert.equal(r.status, 'cooldown');
  assert.equal(r.waitSeconds, 60);
  assert.deepEqual(state.featured, []);
  assert.equal(requestFeature(state, job, 10_000 + FEATURE_COOLDOWN_MS).ok, true);
  assert.deepEqual(state.featured, ['b']);
});

test('spill på høyttaleren: spilt sang går tilbake i køen, kø og «spilles nå» endres ikke', () => {
  const state = { queue: ['x'], played: ['s'], nowPlaying: 'n' };
  assert.deepEqual(requeueSong(state, { id: 's' }), { ok: true, status: 'queued', position: 2 });
  assert.deepEqual(state.queue, ['x', 's']);
  assert.deepEqual(state.played, []);
  assert.deepEqual(requeueSong(state, { id: 's' }), { ok: true, status: 'queued', position: 2 });
  assert.deepEqual(requeueSong(state, { id: 'n' }), { ok: true, status: 'playing' });
  assert.deepEqual(state.queue, ['x', 's']);
});
