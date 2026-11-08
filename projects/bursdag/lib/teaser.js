'use strict';

/**
 * «Kommer snart»-siden: på når TEASER er satt, og av av seg selv fra OPEN_AT (ISO-tidspunkt, f.eks. 2026-11-14T00:00:00+01:00).
 * Uten OPEN_AT må TEASER fjernes manuelt.
 */
const ON = /^(1|on|ja|true)$/i;

function parseOpenAt(value) {
  const t = Date.parse(value || '');
  return Number.isFinite(t) ? t : null;
}

function teaserActive({ teaser, openAt }, now = Date.now()) {
  if (!ON.test(teaser || '')) return false;
  return openAt == null || now < openAt;
}

module.exports = { parseOpenAt, teaserActive };
