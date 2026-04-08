# Bali Trip Planner Improvements — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add password protection, better editing UX (click-to-edit, drag-to-reorder), and photo/link support to the Bali trip planner.

**Architecture:** Express server gains auth middleware (bcrypt + signed cookies), a multer-based upload endpoint that streams to Cloudflare R2, and port/CORS fixes. Frontend gains SortableJS for drag-reorder, a click-to-edit system replacing inline inputs, photo strip with lightbox, and link pills on cards.

**Tech Stack:** Express, bcrypt, cookie-parser, multer, @aws-sdk/client-s3, SortableJS (CDN), Leaflet (existing)

---

## File Structure

| File | Responsibility |
|------|---------------|
| `server.js` | Express server: auth middleware, login routes, data API, upload API, static serving |
| `public/login.html` | **New.** Login page — password field, dark theme, centered card |
| `public/index.html` | Frontend app — all tabs, map, editing, photos, links |
| `package.json` | Dependencies |

---

## Task 1: Dependencies & Port Fix

**Files:**
- Modify: `package.json`
- Modify: `server.js:6`

- [ ] **Step 1: Install dependencies**

```bash
cd ~/Projects/hatlem/projects/bali
npm install bcrypt cookie-parser multer @aws-sdk/client-s3
```

- [ ] **Step 2: Fix port default in server.js**

In `server.js`, change line 6:
```js
// OLD
const PORT = process.env.PORT || 3000;
// NEW
const PORT = process.env.PORT || 4820;
```

- [ ] **Step 3: Verify server starts**

```bash
cd ~/Projects/hatlem/projects/bali && node -e "require('./server.js')" &
# Expected: "Bali Reiseplanlegger on port 4820 → /bali"
kill %1
```

- [ ] **Step 4: Commit**

```bash
cd ~/Projects/hatlem/projects/bali
git add package.json package-lock.json server.js
git commit -m "chore: add auth/upload deps, fix port to 4820"
```

---

## Task 2: Authentication — Server Side

**Files:**
- Modify: `server.js`
- Create: `public/login.html`

- [ ] **Step 1: Add auth imports and middleware to server.js**

At the top of `server.js`, after existing requires, add:

```js
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');
```

After `const app = express();`, add:

```js
const COOKIE_SECRET = process.env.COOKIE_SECRET || 'dev-secret-change-in-prod';
const BALI_PASSWORD = process.env.BALI_PASSWORD || 'matheo2025';

app.use(cookieParser(COOKIE_SECRET));
app.use(express.urlencoded({ extended: false }));
```

- [ ] **Step 2: Generate bcrypt hash on startup and add auth middleware**

After the `initDB()` call, add:

```js
let passwordHash = null;
bcrypt.hash(BALI_PASSWORD, 10).then(h => { passwordHash = h; });

// Auth middleware — protect all /bali/* except /bali/login
function requireAuth(req, res, next) {
  if (req.path === '/bali/login' || req.path.startsWith('/bali/login')) return next();
  const token = req.signedCookies.bali_auth;
  if (token === 'authenticated') return next();
  return res.redirect('/bali/login');
}
app.use('/bali', requireAuth);
```

- [ ] **Step 3: Add login routes**

Before the existing `app.get('/bali/api/data', ...)` route, add:

```js
// Login page
app.get('/bali/login', (req, res) => {
  const error = req.query.error ? '<p class="error">Feil passord. Prøv igjen.</p>' : '';
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Login handler
app.post('/bali/login', async (req, res) => {
  const { password } = req.body;
  if (!passwordHash) {
    return res.redirect('/bali/login?error=1');
  }
  const match = await bcrypt.compare(password || '', passwordHash);
  if (match) {
    res.cookie('bali_auth', 'authenticated', {
      signed: true,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 90 * 24 * 60 * 60 * 1000 // 90 days
    });
    return res.redirect('/bali');
  }
  return res.redirect('/bali/login?error=1');
});
```

- [ ] **Step 4: Create login.html**

Create `public/login.html`:

```html
<!DOCTYPE html>
<html lang="no">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Bali 2026 — Logg inn</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',system-ui,sans-serif;background:#0f172a;color:#f1f5f9;min-height:100vh;display:flex;align-items:center;justify-content:center}
.card{background:#1e293b;border:1px solid #334155;border-radius:16px;padding:2.5rem;width:100%;max-width:380px;text-align:center}
h1{font-size:1.5rem;background:linear-gradient(135deg,#38bdf8,#818cf8,#f472b6);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;margin-bottom:0.5rem}
.sub{color:#94a3b8;font-size:0.85rem;margin-bottom:1.5rem}
input[type="password"]{width:100%;background:#0f172a;border:1px solid #334155;border-radius:8px;padding:0.75rem 1rem;color:#f1f5f9;font-family:inherit;font-size:1rem;margin-bottom:1rem;outline:none;transition:border-color 0.2s}
input[type="password"]:focus{border-color:#38bdf8}
button{width:100%;background:#34d399;color:#0f172a;border:none;border-radius:8px;padding:0.75rem;font-family:inherit;font-size:1rem;font-weight:600;cursor:pointer;transition:opacity 0.2s}
button:hover{opacity:0.9}
.error{color:#ef4444;font-size:0.85rem;margin-bottom:1rem}
</style>
</head>
<body>
<form class="card" method="POST" action="/bali/login">
  <h1>Bali 2026</h1>
  <p class="sub">Skriv inn passord for å se reiseplanen</p>
  <script>if(location.search.includes('error=1'))document.write('<p class="error">Feil passord. Prøv igjen.</p>')</script>
  <input type="password" name="password" placeholder="Passord" autofocus required>
  <button type="submit">Logg inn</button>
</form>
</body>
</html>
```

- [ ] **Step 5: Fix route ordering in server.js**

The auth middleware must come before static serving. Ensure this order in server.js:
1. `cookieParser` and `express.urlencoded` middleware
2. `requireAuth` middleware on `/bali`
3. Login routes (`GET /bali/login`, `POST /bali/login`)
4. API routes (`GET /bali/api/data`, `POST /bali/api/data`)
5. Static serving (`app.use('/bali', express.static(...))`)

- [ ] **Step 6: Test auth locally**

```bash
cd ~/Projects/hatlem/projects/bali
BALI_PASSWORD=matheo2025 COOKIE_SECRET=test-secret node server.js
# In another terminal:
curl -v http://localhost:4820/bali
# Expected: 302 redirect to /bali/login
curl -v http://localhost:4820/bali/login
# Expected: 200, HTML login page
curl -v -X POST -d "password=matheo2025" -c cookies.txt http://localhost:4820/bali/login
# Expected: 302 redirect to /bali with Set-Cookie header
curl -v -b cookies.txt http://localhost:4820/bali
# Expected: 200, main app HTML
curl -v -X POST -d "password=wrong" http://localhost:4820/bali/login
# Expected: 302 redirect to /bali/login?error=1
```

- [ ] **Step 7: Commit**

```bash
cd ~/Projects/hatlem/projects/bali
git add server.js public/login.html
git commit -m "feat: add password auth with signed cookies"
```

---

## Task 3: CORS Fix

**Files:**
- Modify: `server.js`

- [ ] **Step 1: Replace wildcard CORS with restricted policy**

In `server.js`, replace the CORS middleware block:

```js
// OLD
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
```

With:

```js
// CORS — only needed for local dev; Railway serves same-origin
app.use((req, res, next) => {
  const origin = req.headers.origin;
  const allowed = process.env.ALLOWED_ORIGIN || 'http://localhost:4820';
  if (origin === allowed) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    res.header('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Credentials', 'true');
  }
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
```

- [ ] **Step 2: Commit**

```bash
cd ~/Projects/hatlem/projects/bali
git add server.js
git commit -m "fix: restrict CORS to allowed origin only"
```

---

## Task 4: R2 Upload Endpoint

**Files:**
- Modify: `server.js`

- [ ] **Step 1: Add R2/S3 client and multer setup**

At the top of `server.js`, after existing requires:

```js
const multer = require('multer');
const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const crypto = require('crypto');
```

After the bcrypt hash setup, add:

```js
// R2 setup
const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});
const R2_BUCKET = process.env.R2_BUCKET_NAME || 'bali-photos';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || ''; // e.g. https://pub-abc123.r2.dev

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    cb(null, allowed.includes(file.mimetype));
  },
});
```

- [ ] **Step 2: Add upload endpoint**

After the existing POST `/bali/api/data` route, add:

```js
// Upload photo to R2
app.post('/bali/api/upload', upload.single('photo'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No valid image file' });
    const ext = req.file.mimetype.split('/')[1].replace('jpeg', 'jpg');
    const key = `bali/${crypto.randomUUID()}.${ext}`;
    await r2.send(new PutObjectCommand({
      Bucket: R2_BUCKET,
      Key: key,
      Body: req.file.buffer,
      ContentType: req.file.mimetype,
    }));
    const url = R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${key}` : key;
    res.json({ ok: true, url, key });
  } catch (e) {
    console.error('Upload error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Delete photo from R2
app.delete('/bali/api/upload', async (req, res) => {
  try {
    const key = req.query.key;
    if (!key) return res.status(400).json({ error: 'Missing key' });
    await r2.send(new DeleteObjectCommand({ Bucket: R2_BUCKET, Key: key }));
    res.json({ ok: true });
  } catch (e) {
    console.error('Delete error:', e.message);
    res.status(500).json({ error: e.message });
  }
});
```

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/hatlem/projects/bali
git add server.js
git commit -m "feat: add R2 photo upload/delete endpoints"
```

---

## Task 5: Frontend — Click-to-Edit System

**Files:**
- Modify: `public/index.html`

- [ ] **Step 1: Replace the `ef()` and `efArea()` functions**

In `public/index.html`, replace the existing `ef()` and `efArea()` functions (around line 368-377) with:

```js
// ===== CLICK-TO-EDIT =====
function ef(value, onChange, cls) {
  const c = cls || '';
  const escaped = String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
  return `<span class="ef-display ${c}" tabindex="0"
    onclick="this.style.display='none';const inp=this.nextElementSibling;inp.style.display='';inp.focus();inp.select()"
    onkeydown="if(event.key==='Enter'){this.click()}"
    >${escaped || '<em style=\\'color:var(--dim)\\'>Klikk for å redigere</em>'}</span><input class="ef-input ${c}" style="display:none"
    value="${escaped}"
    onblur="this.style.display='none';const d=this.previousElementSibling;d.style.display='';d.textContent=this.value;${onChange}"
    onkeydown="if(event.key==='Enter'){this.blur()}else if(event.key==='Escape'){this.value=this.previousElementSibling.textContent;this.blur()}"
    onclick="event.stopPropagation()">`;
}

function efArea(value, onChange) {
  const escaped = String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/"/g,'&quot;');
  return `<div class="ef-display ef-area" tabindex="0"
    onclick="this.style.display='none';const ta=this.nextElementSibling;ta.style.display='';ta.focus();ta.style.height=ta.scrollHeight+'px'"
    onkeydown="if(event.key==='Enter'){this.click()}"
    >${escaped || '<em style=\\'color:var(--dim)\\'>Klikk for å redigere</em>'}</div><textarea class="ef-input ef-area-input" style="display:none"
    onblur="this.style.display='none';const d=this.previousElementSibling;d.style.display='';d.textContent=this.value;${onChange}"
    onkeydown="if(event.key==='Escape'){this.value=this.previousElementSibling.textContent;this.blur()}"
    oninput="this.style.height='auto';this.style.height=this.scrollHeight+'px'"
    onclick="event.stopPropagation()">${escaped}</textarea>`;
}
```

- [ ] **Step 2: Update CSS for click-to-edit**

In the `<style>` block, replace the existing `.ef` styles (lines ~46-50) with:

```css
/* Click-to-edit */
.ef-display{display:inline-block;padding:2px 6px;border-radius:4px;cursor:text;border:1px solid transparent;transition:all 0.15s;min-width:30px;min-height:1.4em}
.ef-display:hover{background:rgba(255,255,255,0.04);border-color:var(--brd)}
.ef-display.ef-area{display:block;width:100%;white-space:pre-wrap}
.ef-input{background:rgba(56,189,248,0.06);border:1px solid var(--a1);border-radius:4px;color:inherit;font:inherit;padding:2px 6px;outline:none;width:100%}
.ef-input.ef-area-input{min-height:50px;resize:vertical;width:100%}
.ef-price .ef-display,.ef-price{color:var(--a4);font-weight:600}
.ef-sm .ef-display,.ef-sm{font-size:0.82rem}
```

- [ ] **Step 3: Test click-to-edit in browser**

```bash
cd ~/Projects/hatlem/projects/bali && BALI_PASSWORD=matheo2025 COOKIE_SECRET=test node server.js
```
Open `http://localhost:4820/bali`, log in, click on any text field — it should switch to input mode. Press Enter to save, Escape to cancel.

- [ ] **Step 4: Commit**

```bash
cd ~/Projects/hatlem/projects/bali
git add public/index.html
git commit -m "feat: replace inline inputs with click-to-edit system"
```

---

## Task 6: Frontend — Drag-to-Reorder

**Files:**
- Modify: `public/index.html`

- [ ] **Step 1: Add SortableJS CDN**

In `<head>`, after the Leaflet script tag, add:

```html
<script src="https://cdn.jsdelivr.net/npm/sortablejs@1.15.6/Sortable.min.js"></script>
```

- [ ] **Step 2: Add drag handle CSS**

In the `<style>` block, add:

```css
/* Drag handle */
.drag-handle{position:absolute;left:0;top:0;bottom:0;width:28px;display:flex;align-items:center;justify-content:center;cursor:grab;color:var(--dim);opacity:0;transition:opacity 0.2s;font-size:1rem;user-select:none}
.icard:hover .drag-handle{opacity:0.5}
.drag-handle:hover{opacity:1!important}
.icard{padding-left:2rem}
.sortable-ghost{opacity:0.3;border-color:var(--a1)}
.sortable-chosen{box-shadow:0 8px 25px rgba(0,0,0,0.3);z-index:10}
.overflow-menu{position:absolute;top:0.75rem;right:0.75rem;cursor:pointer;color:var(--dim);font-size:1.1rem;opacity:0;transition:opacity 0.2s;padding:4px}
.icard:hover .overflow-menu{opacity:0.6}
.overflow-menu:hover{opacity:1!important;color:var(--tx)}
.overflow-dropdown{display:none;position:absolute;top:100%;right:0;background:var(--card2);border:1px solid var(--brd);border-radius:8px;padding:4px;min-width:120px;z-index:100;box-shadow:0 4px 12px rgba(0,0,0,0.3)}
.overflow-dropdown.open{display:block}
.overflow-dropdown button{display:block;width:100%;text-align:left;background:none;border:none;color:var(--tx);font:inherit;font-size:0.8rem;padding:0.4rem 0.6rem;border-radius:4px;cursor:pointer}
.overflow-dropdown button:hover{background:rgba(255,255,255,0.06)}
.overflow-dropdown button.danger{color:var(--red)}
```

- [ ] **Step 3: Update card rendering to include drag handles and overflow menu**

In each render function (`renderReiserute`, `renderHotell`, `renderAktiviteter`), replace the `<span class="map-pin">` and `<span class="del-btn">` with:

For the `.icard` opening div, add a drag handle as the first child and replace the pin + delete with an overflow menu:

```js
// Replace in each icard:
// OLD:
//   <span class="map-pin">📍</span>
//   <span class="del-btn" onclick="event.stopPropagation();deleteStop(${i})">✕</span>
// NEW:
`<span class="drag-handle">⠿</span>
<div class="overflow-menu" onclick="event.stopPropagation();this.querySelector('.overflow-dropdown').classList.toggle('open')">⋯
  <div class="overflow-dropdown">
    <button onclick="focusOnItem(...)">📍 Vis på kart</button>
    <button class="danger" onclick="deleteStop(${i})">🗑 Slett</button>
  </div>
</div>`
```

Apply this pattern to `renderReiserute`, `renderHotell`, `renderAktiviteter`, and `renderBudsjett`. Each uses its own delete function and focusOnItem params.

- [ ] **Step 4: Add sortable init after each render**

At the end of `renderReiserute()`, add:

```js
new Sortable(el.querySelector('.stops-list'), {
  handle: '.drag-handle',
  animation: 150,
  ghostClass: 'sortable-ghost',
  chosenClass: 'sortable-chosen',
  onEnd: (evt) => {
    const [item] = DATA.stops.splice(evt.oldIndex, 1);
    DATA.stops.splice(evt.newIndex, 0, item);
    renderReiserute(); drawRoute(); autoSave();
  }
});
```

Wrap the stops cards in a `<div class="stops-list">` container. Repeat the same pattern for hotels (`.hotels-list`, `DATA.hotels`), activities (`.activities-list`, `DATA.activities`), and budget (`.budget-list`, `DATA.budget`).

- [ ] **Step 5: Close overflow menus on outside click**

Add to the script:

```js
document.addEventListener('click', () => {
  document.querySelectorAll('.overflow-dropdown.open').forEach(d => d.classList.remove('open'));
});
```

- [ ] **Step 6: Test drag-to-reorder**

Start server, log in, drag a stop card by its grip handle. Verify:
- Card lifts with shadow
- Ghost shows drop position
- After drop, order updates and auto-saves

- [ ] **Step 7: Commit**

```bash
cd ~/Projects/hatlem/projects/bali
git add public/index.html
git commit -m "feat: add drag-to-reorder with SortableJS and overflow menus"
```

---

## Task 7: Frontend — Photo Upload UI

**Files:**
- Modify: `public/index.html`

- [ ] **Step 1: Add photo/link CSS**

In the `<style>` block, add:

```css
/* Photos */
.photo-strip{display:flex;gap:6px;flex-wrap:wrap;margin-top:0.5rem;align-items:center}
.photo-thumb{width:80px;height:80px;border-radius:8px;object-fit:cover;cursor:pointer;border:1px solid var(--brd);transition:all 0.2s;position:relative}
.photo-thumb:hover{border-color:var(--a1);transform:scale(1.05)}
.photo-wrap{position:relative;display:inline-block}
.photo-del{position:absolute;top:-4px;right:-4px;width:20px;height:20px;border-radius:50%;background:var(--red);color:white;font-size:0.65rem;display:none;align-items:center;justify-content:center;cursor:pointer;border:2px solid var(--card);font-weight:700}
.photo-wrap:hover .photo-del{display:flex}
.photo-add{width:80px;height:80px;border-radius:8px;border:2px dashed var(--brd);display:flex;align-items:center;justify-content:center;cursor:pointer;color:var(--dim);font-size:1.5rem;transition:all 0.2s}
.photo-add:hover{border-color:var(--a1);color:var(--a1)}
.photo-progress{width:80px;height:80px;border-radius:8px;background:var(--card2);display:flex;align-items:center;justify-content:center;font-size:0.7rem;color:var(--dim)}

/* Lightbox */
.lightbox{position:fixed;inset:0;background:rgba(0,0,0,0.9);display:flex;align-items:center;justify-content:center;z-index:9999;cursor:pointer}
.lightbox img{max-width:90vw;max-height:90vh;border-radius:8px}

/* Links */
.link-strip{display:flex;gap:6px;flex-wrap:wrap;margin-top:0.4rem;align-items:center}
.link-pill{display:inline-flex;align-items:center;gap:4px;background:rgba(56,189,248,0.1);border:1px solid rgba(56,189,248,0.2);border-radius:14px;padding:0.2rem 0.6rem;font-size:0.75rem;color:var(--a1);cursor:pointer;transition:all 0.15s;text-decoration:none}
.link-pill:hover{background:rgba(56,189,248,0.2);border-color:var(--a1)}
.link-pill .link-del{color:var(--red);margin-left:4px;font-weight:700;opacity:0;transition:opacity 0.15s}
.link-pill:hover .link-del{opacity:1}
.link-add{display:inline-flex;align-items:center;gap:4px;border:1px dashed var(--brd);border-radius:14px;padding:0.2rem 0.6rem;font-size:0.75rem;color:var(--dim);cursor:pointer;transition:all 0.15s}
.link-add:hover{border-color:var(--a1);color:var(--a1)}
```

- [ ] **Step 2: Add upload and lightbox helper functions**

In the `<script>`, add these helpers:

```js
// ===== PHOTO UPLOAD =====
async function uploadPhoto(type, idx, file) {
  const item = DATA[type][idx];
  if (!item.photos) item.photos = [];
  const formData = new FormData();
  formData.append('photo', file);
  try {
    const r = await fetch(API_BASE + '/upload', { method: 'POST', body: formData });
    if (!r.ok) throw new Error('Upload failed');
    const { url, key } = await r.json();
    item.photos.push({ url, key });
    autoSave();
    render();
  } catch (e) {
    console.error('Upload error:', e);
    alert('Feil ved opplasting: ' + e.message);
  }
}

async function deletePhoto(type, idx, photoIdx) {
  if (!confirm('Slett bilde?')) return;
  const item = DATA[type][idx];
  const photo = item.photos[photoIdx];
  try {
    if (photo.key) {
      await fetch(API_BASE + '/upload?key=' + encodeURIComponent(photo.key), { method: 'DELETE' });
    }
    item.photos.splice(photoIdx, 1);
    autoSave();
    render();
  } catch (e) {
    console.error('Delete error:', e);
  }
}

function openLightbox(url) {
  const lb = document.createElement('div');
  lb.className = 'lightbox';
  lb.innerHTML = `<img src="${url}">`;
  lb.onclick = () => lb.remove();
  document.body.appendChild(lb);
  document.addEventListener('keydown', function esc(e) {
    if (e.key === 'Escape') { lb.remove(); document.removeEventListener('keydown', esc); }
  });
}

function triggerPhotoUpload(type, idx) {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = 'image/jpeg,image/png,image/webp';
  input.onchange = (e) => {
    if (e.target.files[0]) uploadPhoto(type, idx, e.target.files[0]);
  };
  input.click();
}

// ===== LINKS =====
function addLink(type, idx) {
  const item = DATA[type][idx];
  if (!item.links) item.links = [];
  const label = prompt('Lenke-tittel (f.eks. "Booking"):');
  if (!label) return;
  const url = prompt('URL:');
  if (!url) return;
  item.links.push({ label, url });
  autoSave();
  render();
}

function deleteLink(type, idx, linkIdx) {
  DATA[type][idx].links.splice(linkIdx, 1);
  autoSave();
  render();
}
```

- [ ] **Step 3: Add photo/link strip rendering helper**

```js
function renderPhotoStrip(type, idx) {
  const item = DATA[type][idx];
  const photos = item.photos || [];
  const links = item.links || [];
  let html = '<div class="photo-strip" onclick="event.stopPropagation()">';
  photos.forEach((p, pi) => {
    html += `<div class="photo-wrap">
      <img class="photo-thumb" src="${p.url}" onclick="openLightbox('${p.url}')" loading="lazy">
      <span class="photo-del" onclick="event.stopPropagation();deletePhoto('${type}',${idx},${pi})">✕</span>
    </div>`;
  });
  html += `<div class="photo-add" onclick="event.stopPropagation();triggerPhotoUpload('${type}',${idx})">+</div>`;
  html += '</div>';
  html += '<div class="link-strip" onclick="event.stopPropagation()">';
  links.forEach((l, li) => {
    html += `<a class="link-pill" href="${l.url}" target="_blank" rel="noopener" onclick="event.stopPropagation()">
      ${l.label} ↗ <span class="link-del" onclick="event.preventDefault();event.stopPropagation();deleteLink('${type}',${idx},${li})">✕</span>
    </a>`;
  });
  html += `<span class="link-add" onclick="event.stopPropagation();addLink('${type}',${idx})">+ lenke</span>`;
  html += '</div>';
  return html;
}
```

- [ ] **Step 4: Add photo/link strip to card rendering**

In `renderReiserute()`, before each card's closing `</div>`, add:
```js
html += renderPhotoStrip('stops', i);
```

In `renderHotell()`, before each card's closing `</div>`, add:
```js
html += renderPhotoStrip('hotels', i);
```

In `renderAktiviteter()`, before each card's closing `</div>`, add:
```js
html += renderPhotoStrip('activities', i);
```

- [ ] **Step 5: Initialize empty photos/links on default data**

In `initDefaultData()`, add `photos: [], links: []` to each stop, hotel, and activity object. Also update `addStop()`, `addHotel()`, `addActivity()` to include these fields.

- [ ] **Step 6: Test photo upload in browser**

Start server with R2 env vars set. Log in, click "+" on a card, select an image. Verify:
- Thumbnail appears in the photo strip
- Click thumbnail opens lightbox
- Hover shows delete button
- Photo persists after page refresh

- [ ] **Step 7: Commit**

```bash
cd ~/Projects/hatlem/projects/bali
git add public/index.html
git commit -m "feat: add photo upload to R2 and link pills on cards"
```

---

## Task 8: Frontend — Drag-Drop Upload on Cards

**Files:**
- Modify: `public/index.html`

- [ ] **Step 1: Add drop zone CSS**

```css
.icard.dragover{border-color:var(--a1);background:rgba(56,189,248,0.08);box-shadow:0 0 0 2px rgba(56,189,248,0.3)}
```

- [ ] **Step 2: Add drag-drop event handlers**

Add this function and call it at the end of each render function:

```js
function initDropZones(type, containerSelector) {
  document.querySelectorAll(containerSelector + ' .icard').forEach((card, idx) => {
    card.addEventListener('dragover', (e) => { e.preventDefault(); card.classList.add('dragover'); });
    card.addEventListener('dragleave', () => card.classList.remove('dragover'));
    card.addEventListener('drop', (e) => {
      e.preventDefault();
      card.classList.remove('dragover');
      const files = [...e.dataTransfer.files].filter(f => f.type.startsWith('image/'));
      files.forEach(f => uploadPhoto(type, idx, f));
    });
  });
}
```

Call after each render:
- `renderReiserute()` → `initDropZones('stops', '.stops-list')`
- `renderHotell()` → `initDropZones('hotels', '.hotels-list')`
- `renderAktiviteter()` → `initDropZones('activities', '.activities-list')`

- [ ] **Step 3: Commit**

```bash
cd ~/Projects/hatlem/projects/bali
git add public/index.html
git commit -m "feat: add drag-and-drop photo upload on cards"
```

---

## Task 9: Final Polish & Deploy

**Files:**
- Modify: `server.js`
- Modify: `public/index.html`

- [ ] **Step 1: Remove RAILWAY_URL hardcode from index.html**

In `public/index.html`, the `API_BASE` detection (around line 237-239) can be simplified since we now serve same-origin with auth cookies:

```js
const API_BASE = '/bali/api';
```

Remove the `RAILWAY_URL` constant entirely — it's no longer needed since the app is always served from the server.

- [ ] **Step 2: Verify complete server.js**

Read through `server.js` and verify:
1. Imports are at top: express, path, pg, bcrypt, cookieParser, multer, S3Client
2. Middleware order: cookieParser → express.json → express.urlencoded → CORS → requireAuth
3. Routes order: login → API data → API upload → static
4. Port is 4820

- [ ] **Step 3: Test full flow locally**

```bash
cd ~/Projects/hatlem/projects/bali
BALI_PASSWORD=matheo2025 COOKIE_SECRET=test R2_ACCOUNT_ID=test R2_ACCESS_KEY_ID=test R2_SECRET_ACCESS_KEY=test node server.js
```

Test checklist:
- Visit `/bali` → redirected to login
- Enter `matheo2025` → see the app
- Close browser, reopen → still logged in (cookie)
- Click text → editable, Enter saves, Escape cancels
- Drag card → reorders, auto-saves
- Refresh → order persists
- Add link → pill appears, clickable
- Wrong password → error message

- [ ] **Step 4: Commit final changes**

```bash
cd ~/Projects/hatlem/projects/bali
git add -A
git commit -m "feat: final polish — simplify API base, verify route order"
```

- [ ] **Step 5: Push to deploy**

```bash
cd ~/Projects/hatlem && git push
```

Railway auto-deploys from push. After deploy, set these env vars on Railway if not already set:
- `BALI_PASSWORD` = `matheo2025`
- `COOKIE_SECRET` = (generate with `openssl rand -hex 32`)
- `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL`
