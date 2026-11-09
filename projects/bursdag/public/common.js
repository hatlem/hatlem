/* Felles hjelpere for alle sidene */
(function () {
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch { /* privat modus */ } },
  };

  function deviceId() {
    let id = store.get('bursdag-device');
    if (!id) {
      id = Math.random().toString(36).slice(2) + Date.now().toString(36);
      store.set('bursdag-device', id);
    }
    return id;
  }

  let configPromise;
  function config() {
    configPromise = configPromise || fetch('api/config').then((r) => r.json());
    return configPromise;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  }

  /** Skaler ned bildet på mobilen før opplasting (raskere på festnettet), og rett det opp etter EXIF-orienteringen. */
  async function shrinkImage(file, max = 1600) {
    if (file && file.normalized) return file; // allerede rettet opp og skalert
    try {
      const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' });
      const scale = Math.min(1, max / Math.max(bmp.width, bmp.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(bmp.width * scale);
      canvas.height = Math.round(bmp.height * scale);
      canvas.getContext('2d').drawImage(bmp, 0, 0, canvas.width, canvas.height);
      const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.88));
      if (!blob) return file;
      const out = new File([blob], 'bilde.jpg', { type: 'image/jpeg' });
      out.normalized = true;
      return out;
    } catch {
      return file;
    }
  }

  /** Roter bildet 90° (når kameraet eller EXIF tok feil). */
  async function rotateImage(file, deg = 90) {
    const bmp = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bmp.height;
    canvas.height = bmp.width;
    const ctx = canvas.getContext('2d');
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate((deg * Math.PI) / 180);
    ctx.drawImage(bmp, -bmp.width / 2, -bmp.height / 2);
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.9));
    const out = new File([blob || file], 'bilde.jpg', { type: 'image/jpeg' });
    out.normalized = true;
    return out;
  }

  /** Vis et valgt/tegnet bilde i bildefeltet (<label class="photo-drop">): hele bildet, i bildets eget format. */
  function showPhoto(root, file) {
    let img = root.querySelector('img');
    if (!img) {
      img = document.createElement('img');
      img.alt = 'Ditt bilde';
      root.prepend(img);
    }
    const url = URL.createObjectURL(file);
    img.onload = () => { root.style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`; URL.revokeObjectURL(url); };
    img.src = url;
    root.classList.add('has-photo');
    if (!root.querySelector('.retake')) {
      const r = document.createElement('span');
      r.className = 'retake';
      r.textContent = '📷 Ta nytt';
      root.append(r);
    }
  }

  /**
   * Ta imot et bilde (fra kamera, filvelger eller tegnebrett): rett opp og skaler det med en gang,
   * så forhåndsvisningen er nøyaktig det som sendes. «↻ Roter» retter bilder som ble liggende på siden.
   */
  async function attachPhoto(root, file, onChange) {
    let current = await shrinkImage(file);
    showPhoto(root, current);
    onChange(current);
    let rot = root.querySelector('[data-rotate]');
    if (!rot) {
      rot = document.createElement('button');
      rot.type = 'button';
      rot.className = 'rotate';
      rot.dataset.rotate = '1';
      rot.textContent = '↻ Roter';
      rot.setAttribute('aria-label', 'Roter bildet 90 grader');
      root.append(rot);
    }
    rot.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation(); // ikke åpne kameraet
      rot.disabled = true;
      current = await rotateImage(current);
      showPhoto(root, current);
      onChange(current);
      rot.disabled = false;
    };
  }

  /** Kobler en <label class="photo-drop"> med <input type=file> til forhåndsvisning. */
  function photoPicker(root, onChange) {
    const input = root.querySelector('input[type=file]');
    input.addEventListener('change', () => {
      const file = input.files && input.files[0];
      if (!file) return;
      attachPhoto(root, file, onChange);
    });
  }

  const pick = (list) => list[Math.floor(Math.random() * list.length)];

  function chips(container, name, items, { checked = 0, small = false, list = false } = {}) {
    container.classList.add('chips');
    if (small) container.classList.add('small');
    if (list) container.classList.add('list');
    container.innerHTML = items
      .map((it, i) => {
        const value = typeof it === 'string' ? it : it.id;
        const label = typeof it === 'string' ? it : it.name;
        const emoji = typeof it === 'string' ? '' : `<b>${esc(it.emoji)}</b>`;
        // Med «thumb» vises et eksempelbilde av stilen, så man ser hva man velger
        if (it && it.thumb) return `<label class="chip has-pic"><input type="radio" name="${name}" value="${esc(value)}" ${i === checked ? 'checked' : ''}><span><img class="pic" src="${esc(it.thumb)}" alt="" loading="lazy"><em>${emoji} ${esc(label)}</em></span></label>`;
        return `<label class="chip"><input type="radio" name="${name}" value="${esc(value)}" ${i === checked ? 'checked' : ''}><span>${emoji}${esc(label)}</span></label>`;
      })
      .join('');
  }

  /** Fyller inn navnet fra forrige gang, og husker det mens man skriver og når skjemaet sendes. */
  function rememberName(input) {
    if (!input.value) input.value = store.get('bursdag-name') || '';
    const save = () => { const v = input.value.trim(); if (v) store.set('bursdag-name', v); };
    input.addEventListener('input', save);
    input.addEventListener('change', save);
    if (input.form) input.form.addEventListener('submit', save);
  }

  async function submit(url, body) {
    const res = await fetch(url, body instanceof FormData ? { method: 'POST', body } : { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Noe gikk galt. Prøv igjen!');
    return data;
  }

  function confetti(n = 120) {
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const box = document.createElement('div');
    box.className = 'confetti';
    const colors = ['#ffd23f', '#ff4fa3', '#3ee6d8', '#9b6bff', '#ffffff'];
    for (let i = 0; i < n; i++) {
      const p = document.createElement('i');
      p.style.left = Math.random() * 100 + 'vw';
      p.style.background = colors[i % colors.length];
      p.style.animationDuration = 2 + Math.random() * 2.5 + 's';
      p.style.animationDelay = Math.random() * 0.6 + 's';
      box.append(p);
    }
    document.body.append(box);
    setTimeout(() => box.remove(), 5500);
  }

  async function demoBanner(kind) {
    const cfg = await config();
    if (cfg.demo && cfg.demo[kind]) {
      const b = document.createElement('div');
      b.className = 'demo-banner';
      b.textContent = '🧪 Demomodus: API-nøkkel mangler, så du får et testresultat.';
      document.querySelector('.wrap').prepend(b);
    }
  }

  window.Party = { deviceId, config, esc, shrinkImage, rotateImage, photoPicker, showPhoto, attachPhoto, pick, chips, rememberName, submit, confetti, demoBanner };
})();
