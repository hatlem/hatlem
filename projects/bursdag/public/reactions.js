/* Emoji-reaksjoner: trykk på mobilen, så flyr emojien opp over storskjermen. */
(function () {
  const EMOJIS = ['❤️', '😂', '🔥', '🎉', '😮', '👏', '🥳', '😍'];
  function mount(el) {
    el.classList.add('react-bar');
    el.innerHTML = '<div class="react-title">Send en reaksjon til storskjermen</div><div class="react-row">' +
      EMOJIS.map((e) => `<button type="button" aria-label="Send ${e}">${e}</button>`).join('') + '</div>';
    el.addEventListener('click', async (ev) => {
      const b = ev.target.closest('button');
      if (!b) return;
      const e = b.textContent;
      // Liten flyg-animasjon på mobilen også
      const fly = document.createElement('span');
      fly.className = 'react-fly';
      fly.textContent = e;
      const r = b.getBoundingClientRect();
      fly.style.left = r.left + r.width / 2 + 'px';
      fly.style.top = r.top + 'px';
      document.body.append(fly);
      setTimeout(() => fly.remove(), 900);
      if (navigator.vibrate) navigator.vibrate(15);
      const res = await fetch('api/react', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ e, deviceId: Party.deviceId() }) }).catch(() => null);
      if (res && res.status === 429) { b.disabled = true; setTimeout(() => { b.disabled = false; }, 3000); }
    });
  }
  window.Party = Object.assign(window.Party || {}, { reactions: mount });
})();
