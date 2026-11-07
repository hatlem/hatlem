'use strict';

/**
 * Live-quiz i Kahoot-stil. Verten styrer tempoet fra admin, storskjermen viser
 * spørsmålet, og telefonene er fargede svarknapper. Poeng for riktig svar,
 * flere jo raskere du svarer (1000 → 500).
 *
 * Faser: null (ikke åpnet) → lobby → question → reveal → leaderboard → question … → podium
 */

const QUESTION_MS = Number(process.env.QUIZ_SECONDS || 20) * 1000;

function createKahoot(getQuestions, saved) {
  const s = Object.assign(
    { phase: null, q: -1, startedAt: 0, endsAt: 0, players: {}, answers: [], lastPoints: {} },
    saved || {},
  );

  const questions = () => getQuestions();
  const playerList = () => Object.entries(s.players).map(([id, p]) => ({ id, ...p }));
  const ranked = () => playerList().sort((a, b) => b.score - a.score || a.joinedAt - b.joinedAt);

  function join(deviceId, name) {
    const p = s.players[deviceId];
    if (p) p.name = name;
    else s.players[deviceId] = { name, score: 0, joinedAt: Date.now() };
    return s.players[deviceId];
  }

  function open() {
    s.phase = 'lobby';
    s.q = -1;
    s.answers = [];
    s.lastPoints = {};
    for (const p of Object.values(s.players)) p.score = 0;
  }

  function startQuestion(i) {
    s.phase = 'question';
    s.q = i;
    s.startedAt = Date.now();
    s.endsAt = s.startedAt + QUESTION_MS;
    s.answers[i] = {};
  }

  function reveal() {
    const q = questions()[s.q];
    const answers = s.answers[s.q] || {};
    s.lastPoints = {};
    for (const [id, a] of Object.entries(answers)) {
      const correct = a.choice === q.correct;
      const points = correct ? Math.round(1000 * (1 - Math.min(a.ms, QUESTION_MS) / QUESTION_MS / 2)) : 0;
      s.lastPoints[id] = { correct, points };
      if (s.players[id]) s.players[id].score += points;
    }
    s.phase = 'reveal';
  }

  /** Én knapp i admin driver hele quizen videre. */
  function next() {
    const total = questions().length;
    if (s.phase === null) return open();
    if (s.phase === 'lobby') return total ? startQuestion(0) : (s.phase = 'podium');
    if (s.phase === 'question') return reveal();
    if (s.phase === 'reveal') return (s.phase = 'leaderboard');
    if (s.phase === 'leaderboard') return s.q + 1 < total ? startQuestion(s.q + 1) : (s.phase = 'podium');
    if (s.phase === 'podium') return (s.phase = null);
  }

  function end() {
    s.phase = null;
  }

  function answer(deviceId, qIndex, choice) {
    if (s.phase !== 'question' || qIndex !== s.q || !s.players[deviceId]) return false;
    const q = questions()[s.q];
    if (!Number.isInteger(choice) || choice < 0 || choice >= q.options.length) return false;
    const list = (s.answers[s.q] = s.answers[s.q] || {});
    if (list[deviceId] || Date.now() > s.endsAt) return false;
    list[deviceId] = { choice, ms: Date.now() - s.startedAt };
    return true;
  }

  /** Kalles jevnlig: avslutt spørsmålet når tiden er ute eller alle har svart. */
  function tick() {
    if (s.phase !== 'question') return false;
    const answered = Object.keys(s.answers[s.q] || {}).length;
    const players = Object.keys(s.players).length;
    if (Date.now() >= s.endsAt || (players > 0 && answered >= players)) {
      reveal();
      return true;
    }
    return false;
  }

  function nextLabel() {
    const total = questions().length;
    return {
      null: '🧠 Åpne quizen (lobby)',
      lobby: '▶️ Start første spørsmål',
      question: '⏩ Vis fasit nå',
      reveal: '🏅 Vis toppliste',
      leaderboard: s.q + 1 < total ? `▶️ Spørsmål ${s.q + 2} av ${total}` : '🏆 Vis pallen',
      podium: '⏹️ Avslutt quizen',
    }[String(s.phase)];
  }

  function screenView() {
    const qs = questions();
    const q = qs[s.q];
    const answers = s.answers[s.q] || {};
    const view = {
      phase: s.phase,
      q: s.q,
      total: qs.length,
      players: playerList().length,
      serverNow: Date.now(),
    };
    if (s.phase === 'lobby') view.names = ranked().slice(-40).map((p) => p.name);
    if (q && ['question', 'reveal'].includes(s.phase)) {
      Object.assign(view, { question: q.q, options: q.options, endsAt: s.endsAt, durationMs: QUESTION_MS, answered: Object.keys(answers).length });
    }
    if (s.phase === 'reveal') {
      view.correct = q.correct;
      view.counts = q.options.map((_, i) => Object.values(answers).filter((a) => a.choice === i).length);
    }
    if (s.phase === 'leaderboard' || s.phase === 'podium') {
      view.top = ranked().slice(0, 5).map(({ name, score, id }) => ({ name, score, gained: (s.lastPoints[id] || {}).points || 0 }));
    }
    return view;
  }

  function playerView(deviceId) {
    const me = s.players[deviceId];
    const qs = questions();
    const q = qs[s.q];
    const view = { phase: s.phase, joined: !!me, name: me && me.name, q: s.q, total: qs.length, serverNow: Date.now(), players: playerList().length };
    if (!me) return view;
    view.score = me.score;
    const mine = (s.answers[s.q] || {})[deviceId];
    if (s.phase === 'question' && q) Object.assign(view, { options: q.options, question: q.q, endsAt: s.endsAt, answered: mine ? mine.choice : null });
    if (s.phase === 'reveal') Object.assign(view, { result: s.lastPoints[deviceId] || { correct: false, points: 0, missed: true }, correctText: q.options[q.correct] });
    if (['reveal', 'leaderboard', 'podium'].includes(s.phase)) view.rank = ranked().findIndex((p) => p.id === deviceId) + 1;
    return view;
  }

  function adminView() {
    const answered = Object.keys(s.answers[s.q] || {}).length;
    return { phase: s.phase, q: s.q, total: questions().length, players: playerList().length, answered, nextLabel: nextLabel(), top: ranked().slice(0, 10).map(({ name, score }) => ({ name, score })) };
  }

  return { state: s, join, open, next, end, answer, tick, screenView, playerView, adminView };
}

module.exports = { createKahoot, QUESTION_MS };
