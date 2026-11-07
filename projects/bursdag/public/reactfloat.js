/* Viser gjestenes emoji-reaksjoner som flyr opp over skjermen. */
(function () {
  function start(container) {
    let seq = -1;
    async function poll() {
      try {
        const r = await (await fetch('api/reactions' + (seq >= 0 ? '?after=' + seq : ''))).json();
        const first = seq < 0;
        seq = r.seq;
        if (!first) r.list.forEach((e, i) => setTimeout(() => spawn(e), i * 120));
      } catch {}
    }
    function spawn(e) {
      if (container.childElementCount > 80) return;
      const el = document.createElement('div');
      el.className = 'float-emoji';
      el.textContent = e;
      el.style.left = 5 + Math.random() * 85 + '%';
      el.style.fontSize = 3 + Math.random() * 2.5 + 'vw';
      el.style.setProperty('--drift', (Math.random() * 16 - 8) + 'vw');
      el.style.animationDuration = 3.5 + Math.random() * 2 + 's';
      container.append(el);
      setTimeout(() => el.remove(), 6000);
    }
    poll();
    setInterval(poll, 800);
  }
  window.Party = Object.assign(window.Party || {}, { reactFloat: start });
})();
