/* «Tegn på mobilen»: enkel tegneflate for de som ikke har tegnet på papir. Gir en PNG tilbake. */
(function () {
  const COLORS = ['#111111', '#e23b3b', '#ff9f1c', '#ffd23f', '#2bb24c', '#2f80ed', '#9b6bff', '#ff4fa3', '#8b5a2b', '#ffffff'];
  const SIZES = [4, 10, 22];

  function open({ idea, onDone }) {
    const wrap = document.createElement('div');
    wrap.className = 'dp';
    wrap.innerHTML = `
      <div class="dp-top">
        <button type="button" class="dp-btn" data-a="close" aria-label="Avbryt">✕</button>
        <div class="dp-idea">${idea ? '💡 ' + idea.replace(/[<>&]/g, '') : '✏️ Tegn med fingeren'}</div>
        <button type="button" class="dp-btn dp-done" data-a="done">✓ Ferdig</button>
      </div>
      <canvas class="dp-canvas"></canvas>
      <div class="dp-tools">
        <div class="dp-colors">${COLORS.map((c, i) => `<button type="button" class="dp-col${i === 0 ? ' on' : ''}" data-c="${c}" style="background:${c}" aria-label="Farge"></button>`).join('')}</div>
        <div class="dp-row">
          ${SIZES.map((s, i) => `<button type="button" class="dp-size${i === 1 ? ' on' : ''}" data-s="${s}" aria-label="Penselstørrelse"><i style="width:${s}px;height:${s}px"></i></button>`).join('')}
          <button type="button" class="dp-btn" data-a="undo" aria-label="Angre">↩️</button>
          <button type="button" class="dp-btn" data-a="clear" aria-label="Tøm">🗑️</button>
        </div>
      </div>`;
    document.body.append(wrap);
    document.body.style.overflow = 'hidden';

    const canvas = wrap.querySelector('canvas');
    const ctx = canvas.getContext('2d');
    let color = COLORS[0], size = SIZES[1], strokes = [], cur = null;

    function fit() {
      const r = canvas.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(r.width * dpr);
      canvas.height = Math.round(r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      redraw();
    }
    function drawStroke(s) {
      ctx.strokeStyle = s.color; ctx.fillStyle = s.color; ctx.lineWidth = s.size; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const pts = s.pts.map(([x, y]) => [x * canvas.clientWidth, y * canvas.clientHeight]);
      if (pts.length === 1) { ctx.beginPath(); ctx.arc(pts[0][0], pts[0][1], s.size / 2, 0, Math.PI * 2); ctx.fill(); return; }
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length - 1; i++) {
        const mx = (pts[i][0] + pts[i + 1][0]) / 2, my = (pts[i][1] + pts[i + 1][1]) / 2;
        ctx.quadraticCurveTo(pts[i][0], pts[i][1], mx, my); // myke streker
      }
      const last = pts[pts.length - 1];
      ctx.lineTo(last[0], last[1]);
      ctx.stroke();
    }
    function redraw() {
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
      strokes.forEach(drawStroke);
    }
    const pos = (e) => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
    canvas.addEventListener('pointerdown', (e) => {
      canvas.setPointerCapture(e.pointerId);
      cur = { color, size, pts: [pos(e)] };
      strokes.push(cur);
      redraw();
    });
    canvas.addEventListener('pointermove', (e) => { if (!cur) return; cur.pts.push(pos(e)); redraw(); });
    const end = () => { cur = null; };
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);

    function finish(ok) {
      window.removeEventListener('resize', fit);
      if (!ok) { wrap.remove(); document.body.style.overflow = ''; return; }
      // Eksporter i fast størrelse (4:3), uavhengig av skjermen
      const out = document.createElement('canvas');
      out.width = 1600; out.height = Math.round(1600 * canvas.clientHeight / canvas.clientWidth);
      const o = out.getContext('2d');
      o.drawImage(canvas, 0, 0, out.width, out.height);
      out.toBlob((blob) => { wrap.remove(); document.body.style.overflow = ''; onDone(blob); }, 'image/png');
    }

    wrap.addEventListener('click', (e) => {
      const c = e.target.closest('[data-c]');
      if (c) { color = c.dataset.c; wrap.querySelectorAll('.dp-col').forEach((x) => x.classList.toggle('on', x === c)); }
      const s = e.target.closest('[data-s]');
      if (s) { size = Number(s.dataset.s); wrap.querySelectorAll('.dp-size').forEach((x) => x.classList.toggle('on', x === s)); }
      const a = e.target.closest('[data-a]');
      if (!a) return;
      if (a.dataset.a === 'undo') { strokes.pop(); redraw(); }
      if (a.dataset.a === 'clear' && (!strokes.length || confirm('Tømme tegningen?'))) { strokes = []; redraw(); }
      if (a.dataset.a === 'close' && (!strokes.length || confirm('Avbryte tegningen?'))) finish(false);
      if (a.dataset.a === 'done') { if (!strokes.length) return alert('Tegn noe først 😊'); finish(true); }
    });
    window.addEventListener('resize', fit);
    requestAnimationFrame(fit);
  }

  window.Party = Object.assign(window.Party || {}, { drawpad: open });
})();
