/* Lydkilden: spiller køen, følger fjernkontrollen i admin og sørger for at bare én side spiller. */
(function () {
  function cleanLyrics(text) {
    if (!text) return [];
    return String(text)
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !/^[[(].*[\])]$/.test(l));
  }

  const isGuestSong = (s) => s && !s.kind; // gjestesang (ikke årsspilleliste/reprise)

  function create(opts = {}) {
    const audio = new Audio();
    audio.preload = 'auto';
    const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const post = (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json());

    const st = { active: false, started: false, current: null, paused: false, volume: 0.8, duck: 1, forcePause: false, seq: null };
    let switching = false;

    const emit = () => opts.onChange && opts.onChange(api);

    function apply() {
      audio.volume = Math.max(0, Math.min(1, st.volume * st.duck));
      const shouldPlay = st.active && st.current && !st.paused && !st.forcePause;
      if (shouldPlay && audio.paused && audio.src) audio.play().catch(() => {});
      if (!shouldPlay && !audio.paused) audio.pause();
    }

    function start(song) {
      st.current = song;
      if (!song) {
        audio.removeAttribute('src');
        audio.load();
        emit();
        setTimeout(() => { if (!st.current && st.active) next(null); }, 5000);
        return;
      }
      song.lines = cleanLyrics(song.result && song.result.lyrics);
      audio.src = song.kind === 'playlist' ? song.url : song.result.audioUrl;
      apply();
      if (isGuestSong(song) && opts.onIntro) opts.onIntro(song);
      emit();
      report();
    }

    async function next(finished) {
      if (!st.active || switching) return;
      switching = true;
      try {
        const r = await post('api/queue/next', { finished: finished || '', playerId: id });
        if (r.inactive) return deactivate();
        start(r.song);
      } catch {
        setTimeout(() => next(null), 4000);
      } finally {
        switching = false;
      }
    }

    function deactivate() {
      st.active = false;
      audio.pause();
      emit();
    }

    async function claim() {
      st.started = true;
      await post('api/player/claim', { playerId: id }).catch(() => {});
      st.active = true;
      emit();
      await poll();
      next(null);
    }

    const finishedId = () => (isGuestSong(st.current) ? st.current.id : null);
    audio.addEventListener('ended', () => next(finishedId()));
    audio.addEventListener('error', () => { if (audio.getAttribute('src')) setTimeout(() => next(finishedId()), 1500); });
    audio.addEventListener('timeupdate', () => opts.onTime && opts.onTime(api));
    // Meld fra med en gang ved pause/avspilling, så admin ser riktig status
    audio.addEventListener('play', () => { emit(); report(); });
    audio.addEventListener('pause', () => { emit(); report(); });

    async function poll() {
      if (!st.started) return;
      let r;
      try {
        r = await (await fetch('api/player?playerId=' + encodeURIComponent(id))).json();
      } catch {
        return;
      }
      if (st.active && !r.active) return deactivate();
      st.paused = r.paused;
      st.volume = r.volume;
      st.duck = r.duck;
      st.forcePause = r.forcePause;
      if (st.seq === null) st.seq = r.seq;
      else if (r.seq !== st.seq) {
        st.seq = r.seq;
        if (st.active && r.cmd) {
          if (r.cmd.type === 'skip') next(finishedId());
          if (r.cmd.type === 'play') start(r.cmd.song);
        }
      }
      // Ny gjestesang i kø mens årsspillelisten eller en reprise går: bytt med en gang
      if (st.active && st.current && !isGuestSong(st.current) && r.queueLength > 0) next(null);
      apply();
      emit();
    }

    function report() {
      if (!st.active) return;
      const c = st.current;
      post('api/player/report', {
        playerId: id,
        now: c && {
          id: c.id,
          kind: c.kind || 'guest',
          title: c.kind === 'playlist' ? c.title : (c.result && c.result.title) || c.label,
          guest: c.guest || '',
          label: c.label || '',
          year: c.year || null,
          imageUrl: c.result && c.result.imageUrl,
        },
        position: audio.currentTime || 0,
        duration: audio.duration || 0,
        paused: audio.paused,
      })
        .then((r) => { if (r && r.active === false) deactivate(); })
        .catch(() => {});
    }

    setInterval(poll, 1500);
    setInterval(report, 3000);

    const api = {
      audio,
      claim,
      get active() { return st.active; },
      get started() { return st.started; },
      get current() { return st.current; },
      get mix() { return { paused: st.paused, forcePause: st.forcePause, duck: st.duck, volume: st.volume }; },
      /** De neste linjene i sangteksten, fordelt jevnt over sangens lengde. */
      lyricLines(n = 2) {
        const c = st.current;
        if (!c || !c.lines || !c.lines.length || !audio.duration) return [];
        const i = Math.min(c.lines.length - 1, Math.floor((audio.currentTime / audio.duration) * c.lines.length));
        return c.lines.slice(i, i + n);
      },
    };
    return api;
  }

  window.Party = Object.assign(window.Party || {}, { player: create, cleanLyrics });
})();
