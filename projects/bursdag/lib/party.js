'use strict';

/**
 * Det analoge rundt det digitale: program, quiz, hilsener, nostalgivegg og årsspilleliste.
 * Innholdet ligger i party.json, og bilder/musikk i mapper du fyller selv:
 *   DATA_DIR/nostalgi/1990 barnehage.jpg   -> vises på skjermen med «1990»
 *   DATA_DIR/spilleliste/1986 a-ha - Take On Me.mp3 -> spilles kronologisk når sangkøen er tom
 */

const fs = require('fs');
const path = require('path');

function loadConfig(file, name) {
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const fill = (s) => String(s).replace(/\{navn\}/g, name);
  const quiz = raw.quiz || { sporsmal: [] };
  return {
    birthYear: Number(raw.fodselsar) || null,
    venue: {
      name: (raw.sted && raw.sted.navn) || '',
      address: (raw.sted && raw.sted.adresse) || '',
      date: (raw.sted && raw.sted.dato) || '',
      day: (raw.sted && raw.sted.dag) || '', // ÅÅÅÅ-MM-DD: «nå»/«ferdig» markeres bare denne dagen
      time: (raw.sted && raw.sted.tid) || '',
      directions: (raw.sted && raw.sted.veibeskrivelse) || [],
    },
    schedule: (raw.program || []).map((p) => ({ time: p.tid, title: fill(p.tittel), emoji: p.emoji || '⭐', highlight: !!p.hoydepunkt })),
    greetingPrompts: (raw.hilsen || []).map((g) => ({ id: g.id, name: fill(g.tekst), emoji: g.emoji || '💌' })),
    songIdeas: (raw.sangideer || []).map(fill),
    drawingIdeas: (raw.tegneideer || []).map(fill),
    helpPlaces: raw.hjelpesteder || ['Tegnebordet', 'Fotohjørnet', 'Ved skjermen', 'Annet'],
    quiz: {
      example: quiz.eksempel !== false,
      questions: (quiz.sporsmal || []).map((q) => ({ q: fill(q.q), options: q.alt.map(fill), correct: Number(q.riktig) })),
    },
  };
}

const IMAGE = /\.(jpe?g|png|webp|gif)$/i;
const AUDIO = /\.(mp3|m4a|aac|ogg|wav)$/i;

/** «1986 a-ha - Take On Me.mp3» -> { year: 1986, title: 'a-ha - Take On Me' } */
function parseName(file) {
  const base = file.replace(/\.[^.]+$/, '');
  const m = base.match(/^(\d{4})[\s._-]*(.*)$/);
  return { year: m ? Number(m[1]) : null, title: (m ? m[2] : base).replace(/_/g, ' ').trim() };
}

function makeFolderScanner(dir, pattern) {
  fs.mkdirSync(dir, { recursive: true });
  let cache = { at: 0, files: [] };
  return () => {
    if (Date.now() - cache.at > 20000) {
      let files = [];
      try {
        files = fs.readdirSync(dir).filter((f) => pattern.test(f) && !f.startsWith('.'));
      } catch {
        /* mappa finnes ikke */
      }
      cache = { at: Date.now(), files: files.sort((a, b) => a.localeCompare(b, 'nb', { numeric: true })) };
    }
    return cache.files;
  };
}

module.exports = { loadConfig, parseName, makeFolderScanner, IMAGE, AUDIO };
