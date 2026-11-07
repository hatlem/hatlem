/* Storskjermen: galleri, «Nå spilles», program og felles høydepunkt (kake, quiz, hilsener, finale). */
(function () {
  const esc = Party.esc;
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  // Standard: storskjermen er stille, musikken går fra /musikk. ?lyd=pa gjør denne til lydkilden.
  const SOUND = /^(pa|på|1|ja)$/i.test(params.get('lyd') || '');
  const player = SOUND ? Party.player({ onIntro: () => {} }) : null;
  if (SOUND) $('startHint').textContent = 'Starter fullskjerm og musikk fra denne skjermen.';

  const layers = [$('l0'), $('l1')];
  let active = 0;
  let birthdayName = 'bursdagsbarnet';
  Party.config().then((c) => {
    birthdayName = c.birthdayName;
    $('emptyTitle').textContent = c.partyTitle;
  });
  fetch('api/qr-info').then((r) => r.json()).then((i) => { $('url').textContent = i.base.replace(/^https?:\/\//, ''); });

  // ------------------------------------------------------------------ data
  let data = { gallery: [], nostalgia: [], schedule: [], queue: [], played: [], playing: null, working: 0, takeover: null };
  let fetchedAt = Date.now();
  const seen = new Set();
  const knownSongs = new Set();
  const priority = [];
  let firstLoad = true;
  let failures = 0;
  let lastPlayingId = null;

  async function refresh() {
    try {
      const r = await fetch('api/screen');
      if (!r.ok) throw new Error(r.status);
      data = await r.json();
      fetchedAt = Date.now();
      failures = 0;
      $('offline').hidden = true;
    } catch {
      if (++failures >= 3) $('offline').hidden = false;
      return;
    }
    for (const item of data.gallery) {
      if (seen.has(item.id)) continue;
      seen.add(item.id);
      if (firstLoad) continue;
      priority.push(item);
      toast(item.type === 'greeting' ? `💌 Ny hilsen${item.guest ? ' fra ' + item.guest : ''}!` : `${item.emoji || '✨'} Nytt fra ${item.guest || 'en gjest'}!`);
    }
    for (const s of data.queue) {
      if (knownSongs.has(s.id)) continue;
      knownSongs.add(s.id);
      if (!firstLoad) toast(`🎵 Ny sang i køen${s.guest ? ' fra ' + s.guest : ''}!`);
    }
    // Ny gjestesang starter: vis «Neste sang» over galleriet
    const now = data.playing && data.playing.now;
    if (now && now.id !== lastPlayingId) {
      if (!firstLoad && now.kind === 'guest') showIntro(now);
      lastPlayingId = now.id;
    }
    firstLoad = false;
    const hasSlides = data.gallery.length || data.nostalgia.length;
    $('empty').style.display = hasSlides ? 'none' : '';
    renderSide();
    renderTakeover();
    if (!showing && hasSlides) next();
  }

  // ------------------------------------------------------------------ galleri
  let showing = false, idx = 0, nIdx = 0, slideNo = 0, timer = null;

  function swap(layer) {
    layer.classList.add('on');
    layers[active].classList.remove('on');
    const old = layers[active];
    setTimeout(() => { if (!old.classList.contains('on')) old.innerHTML = ''; }, 1400);
    active = 1 - active;
  }

  function next() {
    clearTimeout(timer);
    if (!data.gallery.length && !data.nostalgia.length) { showing = false; return; }
    showing = true;
    let item, isNew = false;
    while (priority.length && !item) {
      const p = priority.shift();
      item = data.gallery.find((g) => g.id === p.id);
      isNew = !!item;
    }
    slideNo++;
    // Nostalgivegg: hvert tredje lysbilde (eller alle, hvis ingen har laget noe ennå)
    if (!item && data.nostalgia.length && (slideNo % 3 === 0 || !data.gallery.length)) {
      item = data.nostalgia[nIdx % data.nostalgia.length];
      nIdx++;
    }
    if (!item) { item = data.gallery[idx % data.gallery.length]; idx++; }

    const layer = layers[1 - active];
    const badge = isNew ? '<div class="badge-new">NYTT! 🎉</div>' : '';
    const r = item.result || {};

    if (item.type === 'greeting') {
      layer.innerHTML = `<div class="greet-bg"></div><div class="quote"><div class="prompt">${esc(item.emoji)} ${esc(item.label)}</div>
        <blockquote>«${esc(item.text)}»</blockquote><div class="from">${item.guest ? '– ' + esc(item.guest) : ''}</div></div>` + badge;
      timer = setTimeout(next, 9000);
      return swap(layer);
    }
    if (item.type === 'nostalgia') {
      const url = r.imageUrl;
      layer.innerHTML = `<div class="bg" style="background-image:url('${esc(url)}')"></div><img class="kb" src="${esc(url)}" alt="">` +
        (/^\d{4}$/.test(item.label) ? `<div class="year-tag">${esc(item.label)}</div>` : '') +
        (item.guest ? `<div class="caption"><span class="em">🕰️</span><div>${esc(item.guest)}</div></div>` : '');
      timer = setTimeout(next, 8000);
      return swap(layer);
    }

    const src = r.videoUrl || r.imageUrl || item.inputUrl;
    const caption = `<div class="caption"><span class="em">${esc(item.emoji || '✨')}</span><div>${esc(item.label || '')}<small>${item.type === 'drawing' ? 'Tegnet av' : 'Med'} ${esc(item.guest || 'en hemmelig gjest')}</small></div></div>`;
    const bg = `<div class="bg" style="background-image:url('${esc(item.inputUrl || r.imageUrl || '')}')"></div>`;
    if (r.videoUrl) {
      layer.innerHTML = bg + `<video src="${esc(src)}" muted playsinline autoplay></video>` + caption + badge;
      const v = layer.querySelector('video');
      let loops = 0;
      v.addEventListener('ended', () => { loops++; if (loops >= 2 || v.duration > 8) next(); else v.play(); });
      v.addEventListener('error', () => next());
      timer = setTimeout(next, 25000); // sikring
    } else {
      layer.innerHTML = bg + `<img class="kb" src="${esc(src)}" alt="">` + caption + badge;
      timer = setTimeout(next, 9000);
    }
    swap(layer);
  }

  // ------------------------------------------------------------------ sidepanel
  function renderSide() {
    const rep = data.playing;
    const now = rep && rep.now;
    const el = $('now');
    if (now) {
      const cover = now.kind === 'playlist'
        ? `<div class="cover" style="font-size:1.8vw;font-weight:800">${esc(now.year || '🕰️')}</div>`
        : `<div class="cover">${now.imageUrl ? `<img src="${esc(now.imageUrl)}" alt="">` : '🎵'}</div>`;
      const by = now.kind === 'playlist' ? 'Årsspillelisten' : `${now.kind === 'reprise' ? 'Reprise · ' : ''}Laget av ${esc(now.guest || 'en hemmelig gjest')}`;
      el.innerHTML = `<div class="row2">${cover}<div><div class="title">${rep.paused ? '⏸️ ' : '<span class="eq"><i></i><i></i><i></i></span>'}${esc(now.title)}</div>
        <div class="by">${by}</div></div></div><div class="bar"><div id="nowBar"></div></div>`;
      tickBar();
    } else {
      el.innerHTML = '<p class="muted">Ingen musikk ennå. Start <b>/musikk</b> på musikkskjermen 🎵</p>';
    }
    $('queue').innerHTML = data.queue.length
      ? data.queue.slice(0, 4).map((s, i) => `<li><b>${i + 1}</b><div>${esc((s.result && s.result.title) || s.label)}<small>fra ${esc(s.guest || 'en gjest')}</small></div></li>`).join('')
      : '<li class="muted">Tom kø. Skann og lag en sang!</li>';
    const making = data.making || [];
    $('working').innerHTML = making.length
      ? '<h2>Lages nå</h2>' + making.map((m) => `<div class="making">${esc(m.emoji || '✨')} ${esc(m.guest || 'En gjest')} <small>${m.waiting ? 'i kø' : esc(m.label)}</small></div>`).join('') +
        (data.working > making.length ? `<div class="making"><small>+ ${data.working - making.length} til …</small></div>` : '')
      : '';
    renderProgram();
  }

  function tickBar() {
    const rep = data.playing;
    const b = $('nowBar');
    if (!b || !rep || !rep.duration) return;
    const pos = rep.position + (rep.paused ? 0 : (Date.now() - fetchedAt) / 1000);
    b.style.width = Math.min(100, (pos / rep.duration) * 100) + '%';
  }
  setInterval(tickBar, 500);

  let introTimer;
  function showIntro(now) {
    const el = $('songIntro');
    el.innerHTML = `<div><div class="k">🎤 Neste sang</div><div class="t gradient-text">${esc(now.title)}</div><div class="b">laget av ${esc(now.guest || 'en hemmelig gjest')}${now.label ? ' · ' + esc(now.label) : ''}</div></div>`;
    el.classList.add('show');
    clearTimeout(introTimer);
    introTimer = setTimeout(() => el.classList.remove('show'), 6000);
  }

  // ------------------------------------------------------------------ program
  const toMin = (t) => { const [h, m] = String(t).split(':').map(Number); return h * 60 + (m || 0); };
  function renderProgram() {
    const box = $('programBox');
    if (!data.schedule.length) { box.hidden = true; return; }
    box.hidden = false;
    const d = new Date();
    const nowMin = d.getHours() * 60 + d.getMinutes();
    let cur = -1;
    data.schedule.forEach((p, i) => { if (toMin(p.time) <= nowMin) cur = i; });
    $('program').innerHTML = data.schedule.map((p, i) =>
      `<li class="${i === cur ? 'now' : i < cur ? 'past' : ''}"><b>${esc(p.time)}</b><span>${esc(p.emoji)} ${esc(p.title)}</span></li>`).join('');
    const hl = data.schedule.find((p) => p.highlight && toMin(p.time) > nowMin);
    const left = hl ? toMin(hl.time) - nowMin : null;
    $('countdown').textContent = hl && left <= 45 ? `⏰ Om ${left} min: ${hl.title}!` : '';
  }

  // ------------------------------------------------------------------ felles høydepunkt
  let shownTakeover = null, greetTimer = null, finaleAudio = null, quizTimer = null;

  function renderTakeover() {
    const t = data.takeover;
    const el = $('takeover');
    const key = t ? t.mode + t.at : null;
    if (key === shownTakeover) return;
    shownTakeover = key;
    clearInterval(greetTimer);
    clearInterval(quizTimer);
    if (finaleAudio) { finaleAudio.pause(); finaleAudio = null; }
    if (!t) { el.hidden = true; el.innerHTML = ''; return; }
    el.hidden = false;

    if (t.mode === 'cake') {
      el.innerHTML = `<div><div class="huge">🎂</div><h1 class="gradient-text">${esc(t.title)}</h1><p>Samle dere rundt kaka, så synger vi for ${esc(birthdayName)}! 🎉</p></div>`;
      Party.confetti(150);
    } else if (t.mode === 'greetings') {
      const list = t.greetings || [];
      if (!list.length) { el.innerHTML = '<div><div class="huge">💌</div><h1>Ingen hilsener ennå</h1></div>'; return; }
      let i = 0;
      const show = () => {
        const g = list[i % list.length]; i++;
        el.innerHTML = `<div class="quote" style="max-width:85vw"><div class="prompt">${esc(g.emoji)} ${esc(g.label)} · ${i} av ${list.length}</div><blockquote>«${esc(g.text)}»</blockquote><div class="from">${g.guest ? '– ' + esc(g.guest) : ''}</div></div>`;
      };
      show();
      greetTimer = setInterval(show, 12000);
    } else if (t.mode === 'kahoot') {
      el.innerHTML = '';
      quizState = { key: null };
      pollQuiz();
      quizTimer = setInterval(pollQuiz, 700);
    } else if (t.mode === 'finale') {
      renderFinale(el, t);
    }
  }

  function renderFinale(el, t) {
    const f = t.finale;
    if (!f) { el.innerHTML = '<div><div class="huge">🎬</div><h1>Finalen er ikke klar</h1></div>'; return; }
    const title = (f.song && f.song.result && f.song.result.title) || 'Bursdagssangen';
    el.innerHTML = `<div><div class="huge">🎬</div><h1 class="gradient-text">Verdenspremiere!</h1><p>${esc(birthdayName)} synger «${esc(title)}»${f.song && f.song.guest ? `, laget av ${esc(f.song.guest)}` : ''}</p></div>`;
    const key = shownTakeover;
    const end = () => {
      if (shownTakeover !== key) return;
      el.innerHTML = `<div><div class="huge">🎉</div><h1 class="gradient-text">Gratulerer med dagen, ${esc(birthdayName)}!</h1></div>`;
      Party.confetti(220);
    };
    setTimeout(() => {
      if (shownTakeover !== key) return;
      el.innerHTML = `<video class="finale-video" src="${esc(f.videoUrl)}" playsinline ${f.lipsync ? '' : 'muted loop'}></video>`;
      const v = el.querySelector('video');
      if (f.lipsync) v.addEventListener('ended', end);
      else if (f.audioUrl) {
        finaleAudio = new Audio(f.audioUrl);
        finaleAudio.addEventListener('ended', () => { v.pause(); end(); });
        finaleAudio.play().catch(() => {});
      }
      v.play().catch(() => {});
    }, 4000);
  }

  // ------------------------------------------------------------------ live-quiz
  const SYMS = ['▲', '◆', '●', '■'];
  let quizState = { key: null };
  let clockOffset = 0;

  async function pollQuiz() {
    let v;
    try { v = await (await fetch('api/kahoot/screen')).json(); } catch { return; }
    clockOffset = v.serverNow - Date.now();
    const el = $('takeover');
    const key = v.phase + ':' + v.q;
    const changed = key !== quizState.key;
    quizState = { key, v };

    if (v.phase === 'lobby') {
      const names = (v.names || []).map((n) => `<span>${esc(n)}</span>`).join('');
      if (changed) {
        el.innerHTML = `<div class="lq"><div class="lq-center">
          <h1 class="gradient-text">🧠 Quiz om ${esc(birthdayName)}</h1>
          <div class="lq-join"><img src="qr.svg?path=/quiz" alt="QR-kode til quizen"><div><p>📱 Skann og skriv navnet ditt</p><p style="color:var(--muted)">Svar raskt: jo raskere, jo flere poeng!</p><p><b id="lqPlayers"></b></p></div></div>
          <div class="lq-names" id="lqNames"></div></div></div>`;
      }
      $('lqPlayers').textContent = `${v.players} ${v.players === 1 ? 'spiller' : 'spillere'} er med`;
      if ($('lqNames').dataset.n !== names) { $('lqNames').innerHTML = names; $('lqNames').dataset.n = names; }
    } else if (v.phase === 'question' || v.phase === 'reveal') {
      if (changed) {
        el.innerHTML = `<div class="lq">
          <div class="lq-head"><span>Spørsmål ${v.q + 1} av ${v.total}</span><span>${esc(birthdayName)}-quizen 🧠</span></div>
          <div class="lq-q">${esc(v.question)}</div>
          <div class="lq-mid"><div class="lq-timer" id="lqTimer"><span id="lqSec"></span></div><div class="lq-count" id="lqCount"></div></div>
          <div class="lq-grid">${v.options.map((o, i) => `<div class="lq-opt o${i}" id="lqo${i}"><span class="sym">${SYMS[i]}</span><span>${esc(o)}</span><span class="n" id="lqn${i}"></span></div>`).join('')}</div>
        </div>`;
      }
      if (v.phase === 'question') {
        $('lqCount').innerHTML = `${v.answered}<small>av ${v.players} har svart</small>`;
        tickTimer(v);
      } else {
        $('lqTimer').style.setProperty('--p', '0%');
        $('lqSec').textContent = '✓';
        $('lqCount').innerHTML = `Fasit<small>${v.answered} svarte</small>`;
        v.options.forEach((_, i) => {
          $('lqo' + i).classList.toggle('dim', i !== v.correct);
          $('lqo' + i).classList.toggle('ok', i === v.correct);
          $('lqn' + i).textContent = v.counts[i] + ' 👤';
        });
        if (changed) Party.confetti(40);
      }
    } else if (v.phase === 'leaderboard' && changed) {
      el.innerHTML = `<div class="lq"><div class="lq-center" style="width:100%"><h1>🏅 Toppliste</h1><ol class="lq-board">${(v.top || []).map((p, i) =>
        `<li style="animation-delay:${i * 0.12}s"><b>${i + 1}</b>${esc(p.name)}<span class="sc">${p.score}${p.gained ? `<small>+${p.gained}</small>` : ''}</span></li>`).join('') || '<li>Ingen poeng ennå</li>'}</ol>
        <p style="margin-top:2vw">Spørsmål ${v.q + 1} av ${v.total} ferdig</p></div></div>`;
    } else if (v.phase === 'podium' && changed) {
      const t = v.top || [];
      const col = (p, n) => `<div class="p${n}"><div class="nm" style="animation-delay:${(3 - n) * 0.8}s">${p ? esc(p.name) : '–'}<div class="pts">${p ? p.score + ' poeng' : ''}</div></div><div class="blk">${['', '🥇', '🥈', '🥉'][n]}</div></div>`;
      el.innerHTML = `<div class="lq"><div class="lq-center"><h1 class="gradient-text">🏆 Vinnerne!</h1><div class="podium">${col(t[1], 2)}${col(t[0], 1)}${col(t[2], 3)}</div></div></div>`;
      setTimeout(() => Party.confetti(250), 2000);
    } else if (!v.phase && changed) {
      el.innerHTML = '<div><div class="huge">🧠</div><h1>Quizen er ferdig!</h1></div>';
    }
  }

  function tickTimer(v) {
    const left = Math.max(0, v.endsAt - (Date.now() + clockOffset));
    const p = (left / v.durationMs) * 100;
    if ($('lqTimer')) {
      $('lqTimer').style.setProperty('--p', p + '%');
      $('lqSec').textContent = Math.ceil(left / 1000);
    }
  }
  setInterval(() => { if (quizState.v && quizState.v.phase === 'question') tickTimer(quizState.v); }, 200);

  // ------------------------------------------------------------------ toast
  let toastTimer;
  function toast(text) {
    const t = $('toast');
    t.textContent = text;
    t.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => t.classList.remove('show'), 4500);
  }

  // ------------------------------------------------------------------ start
  $('start').addEventListener('click', () => {
    $('start').remove();
    if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
    if (player) player.claim();
  });

  refresh();
  setInterval(refresh, 2000);
})();
