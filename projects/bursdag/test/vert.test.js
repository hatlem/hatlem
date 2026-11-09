'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { COOKIE, keyMatches, token, parseCookies, isVert, setCookie, clearCookie, Limiter } = require('../lib/vert');

const KEY = 'testverdi';

test('nøkkel: bare eksakt match godtas, og aldri når ADMIN_KEY mangler', () => {
  assert.equal(keyMatches(KEY, KEY), true);
  assert.equal(keyMatches('testverd', KEY), false);
  assert.equal(keyMatches(KEY + ' ', KEY), false);
  assert.equal(keyMatches('', ''), false);
  assert.equal(keyMatches(undefined, KEY), false);
});

test('kjeks: inneholder HMAC, ikke nøkkelen, og gjenkjennes bare med riktig ADMIN_KEY', () => {
  const header = setCookie(KEY, { secure: true });
  assert.ok(header.startsWith(`${COOKIE}=${token(KEY)}`));
  assert.ok(!header.includes(KEY));
  assert.match(header, /HttpOnly/);
  assert.match(header, /SameSite=Lax/);
  assert.match(header, /Secure/);
  assert.doesNotMatch(setCookie(KEY), /Secure/);

  const cookie = header.split(';')[0];
  assert.equal(isVert(cookie, KEY), true);
  assert.equal(isVert(`a=b; ${cookie}; c=d`, KEY), true);
  assert.equal(isVert(cookie, 'annen-nokkel'), false);
  assert.equal(isVert(`${COOKIE}=${KEY}`, KEY), false, 'selve nøkkelen i kjeksen skal ikke gi tilgang');
  assert.equal(isVert('', KEY), false);
  assert.equal(isVert(cookie, ''), false);
});

test('kjeks: sletting nuller levetiden', () => {
  assert.match(clearCookie(), new RegExp(`^${COOKIE}=; Path=/; Max-Age=0`));
});

test('parseCookies tåler rot', () => {
  assert.deepEqual(parseCookies(' a=1;b = 2 ;skrot; c=x%20y'), { a: '1', b: '2', c: 'x y' });
  assert.deepEqual(parseCookies(undefined), {});
});

test('brems: ti feil på ti minutter sperrer, og sperren slipper etter vinduet eller ved riktig nøkkel', () => {
  const l = new Limiter({ attempts: 3, windowMs: 1000 });
  assert.equal(l.blocked('ip', 0), false);
  l.fail('ip', 0);
  l.fail('ip', 10);
  assert.equal(l.blocked('ip', 20), false);
  l.fail('ip', 30);
  assert.equal(l.blocked('ip', 40), true);
  assert.equal(l.blocked('annen', 40), false);
  assert.equal(l.blocked('ip', 1100), false, 'vinduet er over');
  l.fail('ip', 2000);
  l.fail('ip', 2000);
  l.fail('ip', 2000);
  l.reset('ip');
  assert.equal(l.blocked('ip', 2001), false);
});
