'use strict';

/**
 * «Mine ting»: gjesten kan be om at en ferdig film vises på skjermen (igjen) eller at sangen spilles (igjen).
 * Ren tilstandslogikk uten Express, så den kan testes for seg. `state.featured` er køen skjermen prioriterer.
 */

const FEATURE_COOLDOWN_MS = 90 * 1000; // nettopp vist? da må gjesten vente litt før den kan sendes opp igjen

/** Ber skjermen vise jobben som neste lysbilde. Svarer med hva som skjedde. */
function requestFeature(state, job, now = Date.now()) {
  state.featured = state.featured || [];
  if (state.featured.includes(job.id)) return { ok: true, status: 'queued' };
  if (job.shownAt && now - job.shownAt < FEATURE_COOLDOWN_MS) {
    return { ok: false, status: 'cooldown', waitSeconds: Math.ceil((FEATURE_COOLDOWN_MS - (now - job.shownAt)) / 1000) };
  }
  state.featured.push(job.id);
  return { ok: true, status: 'queued' };
}

/** Skjermen melder at jobben er vist: ut av «vis nå»-køen, og tidspunktet huskes på jobben. */
function markShown(state, job, now = Date.now()) {
  state.featured = (state.featured || []).filter((id) => id !== job.id);
  job.shownAt = now;
}

/** Legger sangen i køen, også om den er spilt før (reprise). Spilles den nå eller står i kø, skjer ingenting. */
function requeueSong(state, job) {
  if (state.nowPlaying === job.id) return { ok: true, status: 'playing' };
  const pos = state.queue.indexOf(job.id);
  if (pos >= 0) return { ok: true, status: 'queued', position: pos + 1 };
  state.played = state.played.filter((id) => id !== job.id);
  state.queue.push(job.id);
  return { ok: true, status: 'queued', position: state.queue.length };
}

module.exports = { requestFeature, markShown, requeueSong, FEATURE_COOLDOWN_MS };
