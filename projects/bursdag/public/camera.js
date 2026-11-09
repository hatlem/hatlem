/* Kamera rett i siden (getUserMedia) med rammeguide, snu-knapp og forhåndsvisning.
 * Party.camera({ facing: 'user'|'environment', guide: 'portrait'|'full'|'paper', title })
 *   → Promise<{ file } | { cancel: true } | { fallback: true, error }>
 * «fallback» betyr at kameraet ikke kunne åpnes (ingen tillatelse, ikke støttet); siden bruker da vanlig filvelger.
 */
(function () {
  const CSS = `
    .cam { position: fixed; inset: 0; z-index: 10000; background: #000; color: #fff; display: grid; grid-template-rows: auto 1fr auto; font-family: var(--font, system-ui); }
    .cam-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: max(10px, env(safe-area-inset-top)) 14px 8px; }
    .cam-top b { font-size: 17px; }
    .cam-top .hint { color: #d8d0ee; font-size: 14px; font-weight: 600; text-align: right; }
    .cam-stage { position: relative; overflow: hidden; display: grid; place-items: center; background: #000; }
    .cam-stage video, .cam-stage img { width: 100%; height: 100%; object-fit: contain; display: block; }
    .cam-stage video.mirror { transform: scaleX(-1); }
    .cam-guide { position: absolute; inset: 0; pointer-events: none; }
    .cam-guide svg { width: 100%; height: 100%; }
    .cam-guide path, .cam-guide rect, .cam-guide ellipse, .cam-guide line { fill: none; stroke: rgba(255, 210, 63, 0.9); stroke-width: 3; stroke-dasharray: 12 10; vector-effect: non-scaling-stroke; }
    .cam-guide text { fill: rgba(255, 255, 255, 0.85); font-weight: 700; font-size: 6px; text-anchor: middle; }
    .cam-wait { position: absolute; inset: 0; display: grid; place-items: center; color: #d8d0ee; font-weight: 700; }
    .cam-bar { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; padding: 14px 18px max(18px, env(safe-area-inset-bottom)); gap: 10px; }
    .cam-bar button { font: inherit; font-weight: 700; color: #fff; background: rgba(255, 255, 255, 0.14); border: 0; border-radius: 999px; padding: 12px 16px; cursor: pointer; font-size: 15px; }
    .cam-bar button:disabled { opacity: 0.4; }
    .cam-bar .left { justify-self: start; } .cam-bar .right { justify-self: end; }
    .cam-shutter { width: 76px; height: 76px; border-radius: 50%; background: #fff; border: 5px solid rgba(255, 255, 255, 0.35); padding: 0; box-shadow: 0 0 0 3px #000 inset; }
    .cam-shutter:active { transform: scale(0.94); }
    .cam-ok { background: linear-gradient(90deg, var(--yellow, #ffd23f), var(--pink, #ff4fa3)) !important; color: #2a0b2b !important; font-size: 17px !important; padding: 14px 22px !important; }
    @media (orientation: landscape) and (max-height: 500px) { .cam-shutter { width: 60px; height: 60px; } .cam-bar { padding-top: 8px; } }`;

  const GUIDES = {
    portrait: {
      hint: 'Ansikt og skuldre i rammen',
      svg: '<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet"><ellipse cx="50" cy="42" rx="22" ry="30"/><path d="M14 98 C 18 76, 32 70, 50 70 C 68 70, 82 76, 86 98"/></svg>',
    },
    full: {
      hint: 'Hele deg, fra topp til tå. Stå et stykke unna',
      svg: '<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet"><ellipse cx="50" cy="14" rx="7" ry="8"/><path d="M38 24 L62 24 L66 56 L60 56 L60 92 L52 92 L50 66 L48 92 L40 92 L40 56 L34 56 Z"/><line x1="10" y1="93" x2="90" y2="93"/><text x="50" y="99">føttene på streken</text></svg>',
    },
    paper: {
      hint: 'Hold mobilen rett over arket, få med hele arket',
      svg: '<svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet"><rect x="8" y="8" width="84" height="84" rx="2"/><line x1="50" y1="2" x2="50" y2="14"/><line x1="50" y1="86" x2="50" y2="98"/><line x1="2" y1="50" x2="14" y2="50"/><line x1="86" y1="50" x2="98" y2="50"/></svg>',
    },
  };

  function supported() {
    return !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia && window.isSecureContext);
  }

  function camera({ facing = 'user', guide = null, title = 'Ta bilde' } = {}) {
    return new Promise((resolve) => {
      if (!supported()) return resolve({ fallback: true, error: 'unsupported' });
      if (!document.getElementById('cam-css')) {
        const st = document.createElement('style');
        st.id = 'cam-css';
        st.textContent = CSS;
        document.head.appendChild(st);
      }
      const g = GUIDES[guide] || null;
      const el = document.createElement('div');
      el.className = 'cam';
      el.setAttribute('role', 'dialog');
      el.setAttribute('aria-label', title);
      el.innerHTML = `
        <div class="cam-top"><b>📷 ${title}</b><span class="hint">${g ? g.hint : ''}</span></div>
        <div class="cam-stage">
          <video playsinline autoplay muted></video>
          <div class="cam-guide">${g ? g.svg : ''}</div>
          <div class="cam-wait">Åpner kameraet …</div>
        </div>
        <div class="cam-bar">
          <button type="button" class="left" data-a="cancel">✕ Avbryt</button>
          <button type="button" class="cam-shutter" data-a="shoot" aria-label="Ta bilde" disabled></button>
          <button type="button" class="right" data-a="flip" hidden>🔄 Snu</button>
        </div>`;
      const video = el.querySelector('video');
      const stage = el.querySelector('.cam-stage');
      const bar = el.querySelector('.cam-bar');
      const wait = el.querySelector('.cam-wait');
      let stream = null, shot = null, shotUrl = null;
      const prevOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      document.body.appendChild(el);

      const stop = () => { if (stream) stream.getTracks().forEach((t) => t.stop()); stream = null; };
      const close = (result) => {
        stop();
        if (shotUrl) URL.revokeObjectURL(shotUrl);
        el.remove();
        document.body.style.overflow = prevOverflow;
        resolve(result);
      };

      async function start() {
        stop();
        wait.hidden = false;
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1440 } }, audio: false });
        } catch (error) {
          return close({ fallback: true, error: error && error.name });
        }
        video.srcObject = stream;
        video.classList.toggle('mirror', facing === 'user');
        await video.play().catch(() => {});
        wait.hidden = true;
        el.querySelector('[data-a=shoot]').disabled = false;
        try {
          const cams = (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === 'videoinput');
          el.querySelector('[data-a=flip]').hidden = cams.length < 2;
        } catch { /* ikke viktig */ }
      }

      function shoot() {
        const c = document.createElement('canvas');
        c.width = video.videoWidth || 1280;
        c.height = video.videoHeight || 960;
        c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
        c.toBlob((blob) => {
          if (!blob) return;
          shot = new File([blob], 'kamera.jpg', { type: 'image/jpeg' });
          shotUrl = URL.createObjectURL(shot);
          stop();
          const img = document.createElement('img');
          img.src = shotUrl;
          img.alt = 'Bildet du tok';
          if (facing === 'user') img.style.transform = 'scaleX(-1)'; // vis speilvendt som i søkeren; selve filen er riktig vei
          video.replaceWith(img);
          el.querySelector('.cam-guide').hidden = true;
          bar.innerHTML = '<button type="button" class="left" data-a="retake">↩︎ Ta på nytt</button><button type="button" class="cam-ok" data-a="use">✅ Bruk bildet</button><span></span>';
        }, 'image/jpeg', 0.92);
      }

      function retake() {
        if (shotUrl) URL.revokeObjectURL(shotUrl);
        shot = null; shotUrl = null;
        stage.querySelector('img').replaceWith(video);
        el.querySelector('.cam-guide').hidden = false;
        bar.innerHTML = '<button type="button" class="left" data-a="cancel">✕ Avbryt</button><button type="button" class="cam-shutter" data-a="shoot" aria-label="Ta bilde" disabled></button><button type="button" class="right" data-a="flip" hidden>🔄 Snu</button>';
        start();
      }

      el.addEventListener('click', (e) => {
        const b = e.target.closest('button[data-a]');
        if (!b) return;
        const a = b.dataset.a;
        if (a === 'cancel') close({ cancel: true });
        else if (a === 'shoot') shoot();
        else if (a === 'flip') { facing = facing === 'user' ? 'environment' : 'user'; start(); }
        else if (a === 'retake') retake();
        else if (a === 'use' && shot) close({ file: shot });
      });
      document.addEventListener('keydown', function esc(e) { if (e.key === 'Escape' && document.body.contains(el)) { close({ cancel: true }); } else if (!document.body.contains(el)) document.removeEventListener('keydown', esc); });
      start();
    });
  }

  /**
   * Kobler en «ta bilde»-knapp til kameraet, med vanlig filvelger som reserve.
   * @param {HTMLElement} trigger   elementet gjesten trykker på (f.eks. <label class="photo-drop">)
   * @param {HTMLInputElement} input  skjult <input type=file> som brukes hvis kameraet ikke kan åpnes
   * @param {() => object} opts     kamera-innstillinger (hentes ved hvert trykk, så siden kan bytte retning/guide)
   * @param {(file: File) => void} onFile
   */
  function cameraButton(trigger, input, opts, onFile) {
    let useNative = !supported();
    trigger.addEventListener('click', async (e) => {
      if (useNative || e.target.closest('[data-rotate]')) return; // filvelgeren åpner som vanlig; roter-knappen er sin egen
      e.preventDefault(); // gjelder både <label> og det usynlige feltet oppå
      const r = await camera(opts());
      if (r.file) return onFile(r.file);
      if (r.fallback) {
        useNative = true;
        input.removeAttribute('capture'); // filvelgeren tilbyr både kamera og bilder
        try { input.click(); } catch { /* neste trykk åpner velgeren */ }
      }
    });
  }

  window.Party = Object.assign(window.Party || {}, { camera, cameraButton, cameraSupported: supported });
})();
