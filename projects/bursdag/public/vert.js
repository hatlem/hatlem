// Stripe nederst når verten er logget inn og gjestene fortsatt ser «Noe kommer». Settes inn av serveren (page()).
(() => {
  const css = `
    .vert-strip { position: fixed; left: 50%; bottom: max(10px, env(safe-area-inset-bottom)); transform: translateX(-50%); z-index: 9999;
      display: flex; gap: 10px; align-items: center; max-width: calc(100vw - 24px); padding: 8px 10px 8px 14px; border-radius: 999px;
      background: rgba(18, 10, 36, 0.92); border: 1px solid rgba(255, 210, 63, 0.55); color: #fff8ec; font: 700 14px/1.3 var(--font, system-ui);
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4); backdrop-filter: blur(8px); }
    .vert-strip small { color: #c9bde6; font-weight: 600; }
    .vert-strip button { border: 0; border-radius: 999px; padding: 7px 12px; background: rgba(255, 255, 255, 0.12); color: inherit; font: inherit; cursor: pointer; white-space: nowrap; }
    .vert-strip button:hover { background: rgba(255, 255, 255, 0.2); }
    .vert-strip > span { white-space: nowrap; }
    @media (max-width: 520px) { .vert-strip { left: 12px; transform: none; max-width: calc(100vw - 120px); font-size: 13px; padding-left: 12px; } .vert-strip small { display: none; } }`;
  const style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);

  const el = document.createElement('div');
  el.className = 'vert-strip';
  el.setAttribute('role', 'status');
  el.innerHTML = '<span>👀 Du ser siden som vert <small>· gjestene ser «Noe kommer» til festdagen</small></span><button type="button">Se som gjest</button>';
  el.querySelector('button').addEventListener('click', async () => {
    await fetch('api/vert/ut', { method: 'POST' }).catch(() => {});
    location.reload();
  });
  document.body.appendChild(el);
})();
