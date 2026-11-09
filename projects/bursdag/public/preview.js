/* «Slik kan det bli» på tegne- og selfiesiden:
 *  - finnes det en ekte AI-film i valgt stil (fra en gjest eller verten), vises den
 *  - ellers vises eksempelbildet for stilen (public/stiler/), tydelig merket som eksempel
 */
(function () {
  const esc = (s) => Party.esc(s);

  /**
   * @param {HTMLElement} root  elementet med .pv-box
   * @param {'drawing'|'selfie'} kind
   */
  function attach(root, kind) {
    const box = root.querySelector('.pv-box');
    let id = null, items = {}, examples = {};

    function render() {
      const ex = examples[id];
      const it = items[id] || {};
      if (ex) {
        box.innerHTML = `<video src="${esc(ex.url)}" autoplay muted loop playsinline></video><span class="pv-label">🎬 Ekte AI-film${ex.source === 'gjest' && ex.guest ? ' av ' + esc(ex.guest) : ''}</span>`;
        return;
      }
      if (it.thumb) {
        box.innerHTML = `<img src="${esc(it.thumb)}" alt="Eksempel på ${esc(it.name || '')}"><span class="pv-label">Eksempel · ${esc(it.name || '')}</span>`;
        return;
      }
      box.innerHTML = `<div class="pv-empty"><div><b>${kind === 'selfie' ? '🤳' : '🖍️'}</b>Send inn, så lager AI-en filmen din</div></div>`;
    }

    // Marker valgknapper som har en ekte film (knappene kan tegnes før eller etter at eksemplene er hentet)
    function markChips() {
      document.querySelectorAll(`input[name=${kind === 'selfie' ? 'effect' : 'style'}]`).forEach((inp) => {
        if (!examples[inp.value]) return;
        const span = inp.nextElementSibling;
        span.classList.add('has-ex');
        if (!span.querySelector('.ex-dot')) span.insertAdjacentHTML('beforeend', '<span class="ex-dot">▶︎ ekte film</span>');
      });
    }

    fetch('api/examples').then((r) => r.json()).then((all) => {
      examples = all[kind] || {};
      markChips();
      render();
    }).catch(() => {});

    return {
      /** @param {string} newId  @param {{name?: string, thumb?: string}} [item] */
      setStyle(newId, item) {
        id = newId;
        if (item) items[newId] = item;
        markChips();
        render();
      },
    };
  }

  window.Party = Object.assign(window.Party || {}, { preview: attach });
})();
