'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseName, osloMinutes, pickFromPlaylist } = require('../lib/party');

test('filnavn: årstall, rekkefølgenummer og klokkeslett', () => {
  assert.deepEqual(parseName('1986 a-ha - Take On Me.mp3'), { year: 1986, title: 'a-ha - Take On Me', after: null });
  assert.deepEqual(parseName('07 Greåker.m4a'), { year: null, title: 'Greåker', after: null });
  assert.deepEqual(parseName('29 kl1930 Takk for at dere kom.m4a'), { year: null, title: 'Takk for at dere kom', after: 19 * 60 + 30 });
  assert.deepEqual(parseName('28 kl 18.30 Takk til Mari.m4a'), { year: null, title: 'Takk til Mari', after: 18 * 60 + 30 });
  assert.equal(parseName('Klovn i byen.m4a').after, null); // «kl» inni et ord er ikke et klokkeslett
  assert.equal(parseName('1997 På Vikingland.jpg').title, 'På Vikingland');
});

test('Oslo-tid uansett serverens tidssone', () => {
  assert.equal(osloMinutes(new Date('2026-11-14T18:30:00Z')), 19 * 60 + 30); // vintertid, UTC+1
  assert.equal(osloMinutes(new Date('2026-07-01T10:00:00Z')), 12 * 60); // sommertid, UTC+2
});

test('låter med klokkeslett venter, går foran én gang, og er så med i runden', () => {
  const list = [{ id: 'a' }, { id: 'sen', after: 1170 }, { id: 'b' }];
  let p = pickFromPlaylist(list, 0, 900, []);
  assert.deepEqual([p.song.id, p.index], ['a', 1]);
  p = pickFromPlaylist(list, 1, 900, []); // «sen» hoppes over før tiden
  assert.deepEqual([p.song.id, p.index], ['b', 0]);
  p = pickFromPlaylist(list, 0, 1170, []); // tiden er inne: foran køen, runden står stille
  assert.deepEqual([p.song.id, p.index, p.due], ['sen', 0, ['sen']]);
  p = pickFromPlaylist(list, 0, 1171, ['sen']);
  assert.equal(p.song.id, 'a');
  p = pickFromPlaylist(list, 1, 1171, ['sen']); // nå i vanlig rekkefølge
  assert.equal(p.song.id, 'sen');
  assert.equal(pickFromPlaylist([], 0, 900, []), null);
  assert.equal(pickFromPlaylist([{ id: 'x', after: 1200 }], 0, 900, []), null); // ingenting er klart ennå
});
