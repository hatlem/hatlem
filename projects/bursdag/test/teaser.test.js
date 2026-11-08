'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseOpenAt, teaserActive } = require('../lib/teaser');

test('teaser: av uten TEASER, på med TEASER og ingen åpningstid', () => {
  assert.equal(teaserActive({ teaser: '', openAt: null }), false);
  assert.equal(teaserActive({ teaser: '1', openAt: null }), true);
  assert.equal(teaserActive({ teaser: 'ja', openAt: null }), true);
});

test('teaser: slår seg av av seg selv ved OPEN_AT', () => {
  const openAt = parseOpenAt('2026-11-14T00:00:00+01:00');
  assert.equal(openAt, Date.UTC(2026, 10, 13, 23, 0, 0));
  assert.equal(teaserActive({ teaser: '1', openAt }, openAt - 1), true);
  assert.equal(teaserActive({ teaser: '1', openAt }, openAt), false);
  assert.equal(parseOpenAt('tull'), null);
  assert.equal(parseOpenAt(''), null);
});
