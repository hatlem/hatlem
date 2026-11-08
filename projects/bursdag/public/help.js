/* «🙋 Hjelp»: enkle tips for siden du er på, og en knapp som roper på en hjelper (vises i admin). */
(function () {
  const page = document.body.dataset.help || 'forside';
  const TIPS = {
    forside: [
      ['🖍️', 'Har du tegnet noe? Velg «Tegning blir film». Ingen tegning? Du kan tegne rett på mobilen.'],
      ['🎤', '«Lag en sang»: skriv et lite minne, eller trykk «Overrask meg». AI-en skriver og synger.'],
      ['🤳', '«Selfie med effekt»: velg en effekt og ta et bilde. Noen andre kan gjerne ta det for deg.'],
      ['📺', 'Alt du lager dukker opp på skjermen.'],
    ],
    tegning: [
      ['📸', 'Legg tegningen på bordet, hold mobilen rett over og trykk på det store feltet for å ta bilde.'],
      ['✏️', 'Ingen tegning? Trykk «Tegn på mobilen» og tegn med fingeren.'],
      ['💡', 'Vet du ikke hva du skal tegne? Trykk «Gi meg en idé».'],
      ['🎬', 'Velg en stil, og trykk «Lag filmen!». Filmen er klar på et par minutter.'],
    ],
    sang: [
      ['💡', 'Sangen kan handle om hva som helst. Trykk på et forslag, eller «Hjelp meg å skrive» og svar på tre korte spørsmål.'],
      ['🎲', '«Overrask meg» velger tema, sjanger og stemning for deg.'],
      ['🎶', 'Trykk «Lag sangen!». Den spilles på festen når den er klar.'],
    ],
    selfie: [
      ['👆', 'Trykk på en effekt du liker, for eksempel tigeren.'],
      ['🧍', 'Skal noe skje rundt bena dine (tiger, UFO, disko), må hele deg være med: få noen til å ta bildet fra 3–4 meter.'],
      ['🤳', 'Slange, trollmann og de andre holder med en vanlig selfie: ansikt og skuldre.'],
      ['🙋', 'Liker du ikke selfie? Velg «Noen tar bildet av meg», eller bruk et bilde du allerede har.'],
    ],
    klipp: [
      ['🎥', 'Trykk på det store feltet og film maks 15 sekunder. Si hei, dans eller vis et triks.'],
      ['📁', 'Har du et klipp fra før? Velg «Velg et klipp jeg har». Er det over 15 sekunder, må du korte det ned i kamerarullen først.'],
      ['⏪', 'Klippet vises frem og tilbake på skjermen, så det ser ut som det lever.'],
    ],
    quiz: [
      ['✍️', 'Skriv navnet ditt og trykk «Bli med».'],
      ['📺', 'Spørsmålene kommer på skjermen. Trykk på fargen med riktig svar på mobilen.'],
    ],
    hilsen: [
      ['💌', 'Velg et tema, skriv noen ord og trykk «Send hilsen».'],
    ],
    status: [
      ['⏳', 'Den lages nå. Du kan legge bort mobilen. Resultatet kommer på skjermen.'],
    ],
  };

  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const store = { get: (k) => { try { return localStorage.getItem(k); } catch { return null; } }, set: (k, v) => { try { localStorage.setItem(k, v); } catch {} } };

  const btn = document.createElement('button');
  btn.className = 'help-fab';
  btn.type = 'button';
  btn.innerHTML = '🙋 <span>Hjelp</span>';
  btn.setAttribute('aria-label', 'Trenger du hjelp?');
  document.body.append(btn);

  const sheet = document.createElement('div');
  sheet.className = 'help-sheet';
  sheet.hidden = true;
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  document.body.append(sheet);

  let reqId = store.get('bursdag-help'), pollTimer = null, places = ['Tegnebordet', 'Fotohjørnet', 'Ved skjermen', 'Annet'];
  if (window.Party && Party.config) Party.config().then((c) => { if (c.helpPlaces && c.helpPlaces.length) places = c.helpPlaces; });

  function render(status) {
    const tips = (TIPS[page] || TIPS.forside).map(([e, t]) => `<li><span>${e}</span><span>${esc(t)}</span></li>`).join('');
    let ask;
    if (status === 'open') ask = `<div class="help-wait"><div class="big">📣</div><b>Vi har sagt fra!</b><p>En hjelper kommer bort til deg så snart som mulig.</p><button type="button" class="btn secondary" data-cancel>Det gikk fint likevel</button></div>`;
    else if (status === 'coming') ask = `<div class="help-wait"><div class="big">🏃</div><b>En hjelper er på vei!</b><p>Bli der du er, så kommer de.</p><button type="button" class="btn secondary" data-cancel>Takk, jeg fikk hjelp</button></div>`;
    else ask = `<form class="help-form"><b>Vil du at noen kommer og hjelper deg?</b>
        <label for="hName">Navnet ditt</label><input type="text" id="hName" maxlength="40" value="${esc(store.get('bursdag-name') || '')}" autocomplete="given-name">
        <label for="hPlace">Hvor er du?</label><select id="hPlace">${places.map((p) => `<option>${esc(p)}</option>`).join('')}</select>
        <p></p><button class="btn">🙋 Rop på en hjelper</button></form>`;
    sheet.innerHTML = `<div class="help-card"><button type="button" class="help-x" aria-label="Lukk">✕</button><h2>Slik gjør du</h2><ul class="help-tips">${tips}</ul><hr>${ask}</div>`;
    sheet.querySelector('.help-x').onclick = close;
    const form = sheet.querySelector('.help-form');
    if (form) form.onsubmit = async (e) => {
      e.preventDefault();
      const name = sheet.querySelector('#hName').value.trim();
      if (name) store.set('bursdag-name', name);
      const r = await fetch('api/help', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceId: deviceId(), name, place: sheet.querySelector('#hPlace').value, page }) }).then((x) => x.json()).catch(() => null);
      if (r && r.id) { reqId = r.id; store.set('bursdag-help', r.id); render(r.status); watch(); }
    };
    const cancel = sheet.querySelector('[data-cancel]');
    if (cancel) cancel.onclick = async () => {
      await fetch('api/help/' + reqId + '/cancel', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ deviceId: deviceId() }) }).catch(() => {});
      reqId = null; store.set('bursdag-help', ''); clearInterval(pollTimer); btn.classList.remove('waiting'); render(null);
    };
    btn.classList.toggle('waiting', status === 'open' || status === 'coming');
  }

  function deviceId() { return window.Party && Party.deviceId ? Party.deviceId() : 'ukjent'; }

  async function check() {
    if (!reqId) return null;
    const r = await fetch('api/help/' + reqId).then((x) => x.json()).catch(() => null);
    if (!r) return null;
    if (r.status === 'done') { reqId = null; store.set('bursdag-help', ''); clearInterval(pollTimer); }
    return r.status === 'done' ? null : r.status;
  }
  function watch() {
    clearInterval(pollTimer);
    pollTimer = setInterval(async () => {
      const st = await check();
      if (!sheet.hidden) render(st);
      else btn.classList.toggle('waiting', !!st);
      if (st === 'coming' && navigator.vibrate) navigator.vibrate([80, 60, 80]);
    }, 4000);
  }

  async function open() { sheet.hidden = false; render(await check()); }
  function close() { sheet.hidden = true; }
  btn.onclick = open;
  sheet.addEventListener('click', (e) => { if (e.target === sheet) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  if (reqId) { check().then((st) => btn.classList.toggle('waiting', !!st)); watch(); }
  window.PartyHelp = { open };
})();
