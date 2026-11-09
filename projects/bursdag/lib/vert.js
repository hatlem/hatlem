'use strict';

/**
 * Vertsinnlogging: lar verten se og teste hele siden mens «kommer snart» er på.
 * Nøkkelen havner aldri i kjeksen, bare en HMAC av den, så en lekket kjeks gir ikke admin-tilgang.
 */
const crypto = require('node:crypto');

const COOKIE = 'bursdag_vert';
const MAX_AGE_DAYS = 30;
const ATTEMPTS = 10; // feilforsøk per adresse ...
const WINDOW_MS = 10 * 60 * 1000; // ... per ti minutter

function safeEqual(a, b) {
  const x = Buffer.from(String(a || ''));
  const y = Buffer.from(String(b || ''));
  return x.length === y.length && x.length > 0 && crypto.timingSafeEqual(x, y);
}

function keyMatches(given, adminKey) {
  return !!adminKey && safeEqual(given, adminKey);
}

function token(adminKey) {
  return crypto.createHmac('sha256', String(adminKey)).update('vert').digest('hex');
}

function parseCookies(header) {
  const out = {};
  for (const part of String(header || '').split(';')) {
    const i = part.indexOf('=');
    if (i < 0) continue;
    const name = part.slice(0, i).trim();
    if (name) out[name] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function isVert(cookieHeader, adminKey) {
  if (!adminKey) return false;
  return safeEqual(parseCookies(cookieHeader)[COOKIE], token(adminKey));
}

function setCookie(adminKey, { secure = false } = {}) {
  const parts = [`${COOKIE}=${token(adminKey)}`, 'Path=/', `Max-Age=${MAX_AGE_DAYS * 86400}`, 'HttpOnly', 'SameSite=Lax'];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}

function clearCookie() {
  return `${COOKIE}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`;
}

/** Enkel brems mot gjetting av nøkkelen: etter ATTEMPTS feil må adressen vente. */
class Limiter {
  constructor({ attempts = ATTEMPTS, windowMs = WINDOW_MS } = {}) {
    this.attempts = attempts;
    this.windowMs = windowMs;
    this.hits = new Map();
  }

  blocked(ip, now = Date.now()) {
    const h = this.hits.get(ip);
    if (!h) return false;
    if (now - h.first > this.windowMs) {
      this.hits.delete(ip);
      return false;
    }
    return h.count >= this.attempts;
  }

  fail(ip, now = Date.now()) {
    const h = this.hits.get(ip);
    if (!h || now - h.first > this.windowMs) this.hits.set(ip, { first: now, count: 1 });
    else h.count += 1;
  }

  reset(ip) {
    this.hits.delete(ip);
  }
}

module.exports = { COOKIE, keyMatches, token, parseCookies, isVert, setCookie, clearCookie, Limiter };
