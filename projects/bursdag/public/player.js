/* Lydkilden: spiller køen, følger fjernkontrollen i admin og sørger for at bare én enhet spiller.
 * Laget for å kjøre på en mobil koblet til en høyttaler (Bluetooth eller kabel), men virker også på en PC.
 *  - Skjermen holdes våken (Wake Lock), ellers kan mobilen stoppe musikken
 *  - Låseskjerm/høyttalerknapper (Media Session) styrer pause og neste sang
 *  - Volum via Web Audio på iPhone, der nettsider ikke kan sette volumet direkte
 *  - Finalelyden spilles i takt med videoen på skjermen
 */
(function () {
  function cleanLyrics(text) {
    if (!text) return [];
    return String(text)
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l && !/^[[(].*[\])]$/.test(l));
  }

  /** 0,2 sekunder stillhet som WAV, til å låse opp lyd på mobil. */
  function silentClip() {
    const rate = 8000, n = rate / 5, buf = new ArrayBuffer(44 + n), v = new DataView(buf);
    const w = (o, str) => [...str].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, rate, true); v.setUint32(28, rate, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); w(36, 'data'); v.setUint32(40, n, true);
    for (let i = 0; i < n; i++) v.setUint8(44 + i, 128);
    return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
  }

  const isGuestSong = (s) => s && !s.kind; // gjestesang (ikke spilleliste/reprise)
  const abs = (u) => (u ? new URL(u, document.baseURI).href : u);

  function create(opts = {}) {
    const audio = new Audio();
    audio.preload = 'auto';
    audio.setAttribute('playsinline', '');
    const id = Math.random().toString(36).slice(2) + Date.now().toString(36);
    const post = (url, body) => fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then((r) => r.json());

    const st = { active: false, started: false, current: null, paused: false, volume: 0.8, duck: 1, forcePause: false, seq: null, offset: 0 };
    const fin = { key: null, url: null, startAt: 0, playing: false, done: false, resume: null };
    let switching = false;
    let gain = null; // Web Audio-forsterker (brukes når audio.volume er låst, som på iPhone)
    let wakeLock = null;

    const emit = () => opts.onChange && opts.onChange(api);
    const songUrl = (s) => (s.kind === 'playlist' ? s.url : s.result.audioUrl);

    function setVolume(v) {
      if (gain) gain.gain.value = v;
      else audio.volume = Math.max(0, Math.min(1, v));
    }

    function apply() {
      if (fin.playing || fin.done) return; // finalen styrer lyden nå
      setVolume(st.volume * st.duck);
      const shouldPlay = st.active && st.current && !st.paused && !st.forcePause;
      if (shouldPlay && audio.paused && audio.getAttribute('src')) audio.play().catch(() => {});
      if (!shouldPlay && !audio.paused) audio.pause();
    }

    function setMediaSession(song) {
      if (!('mediaSession' in navigator)) return;
      if (!song) { navigator.mediaSession.metadata = null; return; }
      const r = song.result || {};
      const title = song.kind === 'playlist' ? song.title : r.title || song.label;
      const artist = song.kind === 'playlist' ? song.year ? `Spillelisten ${song.year}` : 'Vertens spilleliste' : `Laget av ${song.guest || 'en gjest'}`;
      try {
        navigator.mediaSession.metadata = new MediaMetadata({
          title, artist, album: opts.album || 'Bursdag',
          artwork: r.imageUrl ? [{ src: abs(r.imageUrl), sizes: '512x512' }] : [],
        });
      } catch { /* eldre nettleser */ }
    }

    function start(song) {
      st.current = song;
      setMediaSession(song);
      if (!song) {
        audio.removeAttribute('src');
        audio.load();
        emit();
        setTimeout(() => { if (!st.current && st.active) next(null); }, 5000);
        return;
      }
      song.lines = cleanLyrics(song.result && song.result.lyrics);
      audio.src = songUrl(song);
      apply();
      if (isGuestSong(song) && opts.onIntro) opts.onIntro(song);
      emit();
      report();
    }

    async function next(finished) {
      if (!st.active || switching || fin.playing || fin.done) return;
      switching = true;
      try {
        const r = await post('api/queue/next', { finished: finished || '', playerId: id });
        if (r.inactive) return deactivate();
        start(r.song);
      } catch {
        setTimeout(() => next(null), 3000);
      } finally {
        switching = false;
      }
    }

    function deactivate() {
      st.active = false;
      audio.pause();
      releaseWakeLock();
      emit();
    }

    // --- skjermen våken ---------------------------------------------------
    async function keepAwake() {
      try {
        if ('wakeLock' in navigator && !wakeLock) {
          wakeLock = await navigator.wakeLock.request('screen');
          wakeLock.addEventListener('release', () => { wakeLock = null; emit(); });
        }
      } catch { /* ikke støttet / batterisparing */ }
      emit();
    }
    function releaseWakeLock() { if (wakeLock) wakeLock.release().catch(() => {}); wakeLock = null; }
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && st.active) { keepAwake(); poll(); }
    });

    // --- start (må skje i et trykk fra brukeren) ----------------------------
    async function claim() {
      st.started = true;
      // iPhone (iOS 17+): spill selv om lydløs-bryteren er på
      try { if (navigator.audioSession) navigator.audioSession.type = 'playback'; } catch {}
      // iPhone ignorerer audio.volume: bruk Web Audio-forsterker i stedet
      if (!gain) {
        audio.volume = 0.5;
        const locked = audio.volume !== 0.5;
        audio.volume = 1;
        if (locked && (window.AudioContext || window.webkitAudioContext)) {
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const src = ctx.createMediaElementSource(audio);
            gain = ctx.createGain();
            src.connect(gain).connect(ctx.destination);
            ctx.resume();
            document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') ctx.resume(); });
          } catch { gain = null; }
        }
      }
      // «Lås opp» lydelementet mens vi har trykket (iPhone krever det), med et kort stille klipp
      audio.src = silentClip();
      await audio.play().catch(() => {});
      keepAwake();
      await post('api/player/claim', { playerId: id }).catch(() => {});
      st.active = true;
      emit();
      await poll();
      next(null);
    }

    const finishedId = () => (isGuestSong(st.current) ? st.current.id : null);
    const isUnlockClip = () => audio.src.startsWith('blob:');
    audio.addEventListener('ended', () => {
      if (isUnlockClip()) return;
      if (fin.playing) return endFinale();
      next(finishedId());
    });
    audio.addEventListener('error', () => {
      if (isUnlockClip()) return;
      if (fin.playing) return endFinale();
      if (audio.getAttribute('src')) setTimeout(() => next(finishedId()), 1500);
    });
    audio.addEventListener('timeupdate', () => opts.onTime && opts.onTime(api));
    // Meld fra med en gang ved pause/avspilling, så admin ser riktig status
    audio.addEventListener('play', () => { emit(); report(); });
    audio.addEventListener('pause', () => { emit(); report(); });

    // Knapper på låseskjermen, i bilen eller på Bluetooth-høyttaleren
    if ('mediaSession' in navigator) {
      const ctl = (action) => {
        if (!st.active) return;
        if (action === 'pause') { st.paused = true; apply(); }
        if (action === 'play') { st.paused = false; apply(); }
        post('api/player/control', { playerId: id, action }).catch(() => {});
      };
      try {
        navigator.mediaSession.setActionHandler('play', () => ctl('play'));
        navigator.mediaSession.setActionHandler('pause', () => ctl('pause'));
        navigator.mediaSession.setActionHandler('nexttrack', () => ctl('skip'));
      } catch { /* ikke støttet */ }
    }

    // --- finalen: lyden fra mobilen i takt med videoen på skjermen ------
    const serverNow = () => Date.now() + st.offset;
    function syncFinale(f) {
      if (!st.active) return;
      if (!f) { if (fin.key) stopFinale(); return; }
      if (f.key !== fin.key) {
        fin.key = f.key; fin.url = f.url; fin.startAt = f.startAt; fin.done = false;
        fin.resume = st.current ? { song: st.current, pos: audio.currentTime } : null;
        audio.pause();
        audio.src = f.url;
        audio.load();
        fin.playing = true;
        setVolume(st.volume);
        emit();
      }
      if (!fin.playing) return;
      const elapsed = (serverNow() - fin.startAt) / 1000;
      if (elapsed < 0) {
        if (!audio.paused) audio.pause();
        setTimeout(() => syncFinale(f), Math.min(-elapsed * 1000, 1000));
        return;
      }
      if (audio.paused) {
        try { audio.currentTime = elapsed; } catch {}
        audio.play().catch(() => {});
      } else if (Math.abs(audio.currentTime - elapsed) > 0.35) {
        try { audio.currentTime = elapsed; } catch {}
      }
    }
    function endFinale() {
      fin.playing = false;
      fin.done = true; // stille til verten går tilbake til vanlig
      emit();
    }
    function stopFinale() {
      const resume = fin.resume;
      Object.assign(fin, { key: null, url: null, playing: false, done: false, resume: null });
      audio.pause();
      if (resume && resume.song) {
        st.current = resume.song;
        setMediaSession(resume.song);
        audio.src = songUrl(resume.song);
        audio.addEventListener('loadedmetadata', function once() {
          audio.removeEventListener('loadedmetadata', once);
          try { audio.currentTime = resume.pos; } catch {}
        });
        apply();
      } else next(null);
      emit();
    }

    async function poll() {
      if (!st.started) return;
      let r;
      try {
        const t0 = Date.now();
        r = await (await fetch('api/player?playerId=' + encodeURIComponent(id))).json();
        st.offset = r.serverNow + (Date.now() - t0) / 2 - Date.now();
      } catch {
        return;
      }
      if (st.active && !r.active) return deactivate();
      st.paused = r.paused;
      st.volume = r.volume;
      st.duck = r.duck;
      st.forcePause = r.forcePause;
      syncFinale(r.finale);
      if (st.seq === null) st.seq = r.seq;
      else if (r.seq !== st.seq) {
        st.seq = r.seq;
        if (st.active && r.cmd && !fin.playing && !fin.done) {
          if (r.cmd.type === 'skip') next(finishedId());
          if (r.cmd.type === 'play') start(r.cmd.song);
        }
      }
      // Ny gjestesang i kø mens en reprise går: bytt med en gang. Låter fra spillelisten spilles ferdig først.
      if (st.active && st.current && st.current.kind === 'reprise' && r.queueLength > 0 && !fin.playing && !fin.done) next(null);
      apply();
      emit();
    }

    function report() {
      if (!st.active) return;
      const c = fin.playing || fin.done ? null : st.current;
      post('api/player/report', {
        playerId: id,
        source: opts.source || 'skjerm',
        now: c && {
          id: c.id,
          kind: c.kind || 'guest',
          title: c.kind === 'playlist' ? c.title : (c.result && c.result.title) || c.label,
          guest: c.guest || '',
          label: c.label || '',
          year: c.year || null,
          imageUrl: c.result && c.result.imageUrl,
        },
        position: c ? audio.currentTime || 0 : 0,
        duration: c ? audio.duration || 0 : 0,
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
      get id() { return id; },
      get active() { return st.active; },
      get started() { return st.started; },
      get current() { return fin.playing || fin.done ? null : st.current; },
      get finale() { return fin.playing ? 'playing' : fin.done ? 'done' : null; },
      get awake() { return !!wakeLock; },
      get mix() { return { paused: st.paused, forcePause: st.forcePause, duck: st.duck, volume: st.volume }; },
      /** De neste linjene i sangteksten, fordelt jevnt over sangens lengde. */
      lyricLines(n = 2) {
        const c = api.current;
        if (!c || !c.lines || !c.lines.length || !audio.duration) return [];
        const i = Math.min(c.lines.length - 1, Math.floor((audio.currentTime / audio.duration) * c.lines.length));
        return c.lines.slice(i, i + n);
      },
    };
    return api;
  }

  window.Party = Object.assign(window.Party || {}, { player: create, cleanLyrics });
})();
