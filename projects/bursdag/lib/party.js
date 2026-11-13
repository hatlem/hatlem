'use strict';

/**
 * Det analoge rundt det digitale: program, quiz, hilsener, nostalgivegg og egen spilleliste.
 * Innholdet ligger i party.json, og bilder/musikk i mapper du fyller selv:
 *   DATA_DIR/nostalgi/1990 barnehage.jpg   -> vises på skjermen med «1990»
 *   DATA_DIR/spilleliste/1986 a-ha - Take On Me.mp3 -> spilles i rekkefølge når sangkøen er tom («07 Tittel.m4a» går også, «07 kl1930 Tittel.m4a» tidligst kl. 19.30)
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
      date: (raw.sted && raw.sted.dato) || '',
      day: (raw.sted && raw.sted.dag) || '', // ÅÅÅÅ-MM-DD: «nå»/«ferdig» markeres bare denne dagen
      time: (raw.sted && raw.sted.tid) || '',
    },
    allDay: (raw.hele_dagen || []).map(fill),
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
  let rest = m ? m[2] : base.replace(/^\d{1,3}[\s._-]+/, ''); // «07 Tittel»: tallet styrer bare rekkefølgen
  const t = rest.match(/^kl[\s._-]?([01]\d|2[0-3])[.:]?([0-5]\d)[\s._-]+(.*)$/i); // «kl1930 Tittel»: spilles tidligst da
  if (t) rest = t[3];
  return { year: m ? Number(m[1]) : null, title: rest.replace(/_/g, ' ').trim(), after: t ? Number(t[1]) * 60 + Number(t[2]) : null };
}

/** Minutter siden midnatt i Oslo, uansett hvilken tidssone serveren står i. */
function osloMinutes(date = new Date()) {
  const [h, min] = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Oslo', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(date).split(':').map(Number);
  return h * 60 + min;
}

/**
 * Neste låt fra spillelisten når sangkøen er tom. Låter med klokkeslett («kl1930 …») holdes tilbake til da.
 * Når tiden er inne, går låta foran de andre én gang, og er deretter med i den vanlige runden.
 * @param {{id:string, after?:number|null}[]} list
 * @returns {{song:any, index:number, due:string[]} | null}
 */
function pickFromPlaylist(list, index, now, due = []) {
  if (!list.length) return null;
  const ready = (s) => s.after == null || s.after <= now;
  const fresh = list.find((s) => s.after != null && ready(s) && !due.includes(s.id));
  if (fresh) return { song: fresh, index, due: [...due, fresh.id] };
  for (let k = 0; k < list.length; k++) {
    const i = (index + k) % list.length;
    if (ready(list[i])) return { song: list[i], index: (i + 1) % list.length, due };
  }
  return null;
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

module.exports = { loadConfig, parseName, osloMinutes, pickFromPlaylist, makeFolderScanner, IMAGE, AUDIO };
