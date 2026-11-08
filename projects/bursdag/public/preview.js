/* Forhåndsvisning på tegne- og selfiesiden:
 *  - «Ditt bilde»: gjestens eget bilde animert i valgt stil (smakebit, gratis og med en gang)
 *  - «Ekte eksempel»: en ekte AI-film i samme stil (fra en gjest eller verten)
 */
(function () {
  const COLORS = ['#ffd23f', '#ff4fa3', '#3ee6d8', '#9b6bff', '#ffffff'];
  const rnd = (a, b) => a + Math.random() * (b - a);

  function fx(cls, html, style) {
    const el = document.createElement('div');
    el.className = 'fx ' + cls;
    el.innerHTML = html;
    for (const [k, v] of Object.entries(style || {})) {
      if (k.startsWith('--')) el.style.setProperty(k, v); // CSS-variabler må settes slik
      else el.style[k] = v;
    }
    return el;
  }

  /** Bygg animert smakebit av bildet for en stil/effekt. */
  function scene(id, imageUrl, kind) {
    const pv = document.createElement('div');
    pv.className = 'pv pv-' + id;
    const img = document.createElement('div');
    img.className = 'img';
    img.style.backgroundImage = `url('${imageUrl}')`;
    pv.append(img);
    const add = (...els) => els.forEach((e) => pv.append(e));
    switch (id) {
      case 'tiger': add(fx('t', '🐯')); break;
      case 'spokelse': add(fx('g', '👻'), fx('g', '👻', { left: '20%', animationDelay: '-2.5s', fontSize: '30px' })); break;
      case 'superhelt': for (let i = 0; i < 4; i++) add(fx('c', '☁️', { left: rnd(0, 85) + '%', animationDelay: -i + 's' })); add(fx('c', '🦸', { left: '75%', fontSize: '34px', animation: 'none', top: '8%' })); break;
      case 'disco': add(fx('b', '🪩')); break;
      case 'drage': add(fx('d', '🐉'), fx('f', '🔥')); break;
      case 'ufo': add(fx('u', '🛸')); break;
      case 'konfetti':
        for (let i = 0; i < 36; i++) {
          const a = rnd(0, Math.PI * 2), d = rnd(80, 220);
          add(fx('k', '', { background: COLORS[i % COLORS.length], '--x': `calc(-50% + ${Math.cos(a) * d}px)`, '--y': `calc(-50% + ${Math.sin(a) * d}px)`, animationDelay: rnd(0, 0.15) + 's' }));
        }
        add(fx('k', '🎉', { width: 'auto', height: 'auto', fontSize: '40px', background: 'none', '--x': '-50%', '--y': '-150%' }));
        break;
      case 'is': for (let i = 0; i < 14; i++) add(fx('s', '❄️', { left: rnd(0, 95) + '%', animationDelay: -rnd(0, 4) + 's' })); break;
      case 'attitall': add(fx('r', '<i>●</i> REC  ' + new Date(1986, 10, 17).toLocaleDateString('nb-NO'))); break;
      case 'magisk': for (let i = 0; i < 10; i++) add(fx('sp', '✨', { left: rnd(5, 90) + '%', top: rnd(5, 85) + '%', animationDelay: -rnd(0, 2.4) + 's' })); break;
      case 'anime': for (let i = 0; i < 8; i++) add(fx('p', '🌸', { left: rnd(20, 110) + '%', animationDelay: -rnd(0, 4) + 's' })); break;
      case 'slange': add(fx('sn', '🐍')); break;
      case 'gammel': add(fx('gl', '👓'), fx('age', '+40 år')); break;
      case 'barn': add(fx('age', '5 år!')); for (let i = 0; i < 5; i++) add(fx('bl', '🎈', { left: rnd(0, 90) + '%', animationDelay: -rnd(0, 4) + 's' })); break;
      case 'trex': add(fx('rex', '🦖')); break;
      case 'kake': add(fx('cake', '🎂'), fx('splat', '')); break;
      case 'troll': add(fx('tr', '🧌')); for (let i = 0; i < 3; i++) add(fx('tree', '🌲', { left: [2, 70, 86][i] + '%', fontSize: [70, 60, 80][i] + 'px' })); break;
      case 'ballonger': add(fx('bb', '🎈🎈🎈')); break;
      case 'valper': for (let i = 0; i < 6; i++) add(fx('pup', '🐶', { top: rnd(55, 85) + '%', animationDelay: -i * 0.5 + 's', '--from': i % 2 ? '-30%' : '130%', '--to': i % 2 ? '35%' : '55%' })); break;
      case 'undervann':
        for (let i = 0; i < 10; i++) add(fx('bub', '🫧', { left: rnd(5, 90) + '%', animationDelay: -rnd(0, 4) + 's', fontSize: rnd(14, 28) + 'px' }));
        add(fx('fish', '🐠', { top: '30%' }), fx('fish', '🐢', { top: '65%', animationDelay: '-3s', fontSize: '46px' }));
        break;
      case 'trollmann': add(fx('hat', '🎩')); for (let i = 0; i < 10; i++) add(fx('sp', '✨', { left: rnd(5, 90) + '%', top: rnd(10, 90) + '%', animationDelay: -rnd(0, 2) + 's' })); break;
      default: break;
    }
    return pv;
  }

  /**
   * Kobler forhåndsvisningen til en side.
   * @param {HTMLElement} root  elementet med .pv-tabs og .pv-box
   * @param {'drawing'|'selfie'} kind
   */
  function attach(root, kind) {
    const box = root.querySelector('.pv-box');
    const tabMine = root.querySelector('[data-tab=mine]');
    const tabEx = root.querySelector('[data-tab=example]');
    let imageUrl = null, id = null, names = {}, examples = {}, tab = 'mine';

    function render() {
      box.innerHTML = '';
      const ex = examples[id];
      tabEx.disabled = !ex;
      tabMine.classList.toggle('on', tab === 'mine');
      tabEx.classList.toggle('on', tab === 'example');
      if (tab === 'example' && ex) {
        box.innerHTML = `<video src="${Party.esc(ex.url)}" autoplay muted loop playsinline></video><span class="pv-label">🎬 Ekte AI-film${ex.source === 'gjest' && ex.guest ? ' av ' + Party.esc(ex.guest) : ''}</span>`;
        return;
      }
      if (!imageUrl) {
        box.innerHTML = `<div class="pv-empty"><div><b>${kind === 'selfie' ? '🤳' : '🖍️'}</b>${kind === 'selfie' ? 'Ta en selfie' : 'Ta bilde av tegningen'}, så ser du en smakebit her${ex ? ',<br>eller se et ekte eksempel' : ''}</div></div>`;
        return;
      }
      box.append(scene(id, imageUrl, kind));
      const label = document.createElement('span');
      label.className = 'pv-label';
      label.textContent = '👀 Smakebit · ' + (names[id] || '') + ' · den ekte filmen lages av AI';
      box.append(label);
    }

    // Marker valgknapper som har et ekte eksempel (knappene kan tegnes før eller etter at eksemplene er hentet)
    function markChips() {
      document.querySelectorAll(`input[name=${kind === 'selfie' ? 'effect' : 'style'}]`).forEach((inp) => {
        if (!examples[inp.value]) return;
        const span = inp.nextElementSibling;
        span.classList.add('has-ex');
        if (!span.querySelector('.ex-dot')) span.insertAdjacentHTML('beforeend', '<span class="ex-dot">▶︎</span>');
      });
    }

    tabMine.addEventListener('click', () => { tab = 'mine'; render(); });
    tabEx.addEventListener('click', () => { tab = 'example'; render(); });

    fetch('api/examples').then((r) => r.json()).then((all) => {
      examples = all[kind] || {};
      markChips();
      if (!imageUrl && examples[id]) tab = 'example';
      render();
    }).catch(() => {});

    return {
      setStyle(newId, name) {
        id = newId;
        markChips();
        names[newId] = name;
        if (!imageUrl) tab = examples[id] ? 'example' : 'mine';
        render();
      },
      setImage(url) { imageUrl = url; tab = 'mine'; render(); },
    };
  }

  window.Party = Object.assign(window.Party || {}, { preview: attach });
})();
