const express = require('express');
const path = require('path');
const { Pool } = require('pg');
const bcrypt = require('bcrypt');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 4820;

const COOKIE_SECRET = process.env.COOKIE_SECRET || 'dev-secret-change-in-prod';
const BALI_PASSWORD = process.env.BALI_PASSWORD || 'matheo2025';
const SHARE_TOKEN = process.env.SHARE_TOKEN || 'mari-bali-2026';

app.use(cookieParser(COOKIE_SECRET));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: false }));

// CORS — allow local HTML files and any origin
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Postgres connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('railway') ? { rejectUnauthorized: false } : false
});

// Init table
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS trip_data (
      id TEXT PRIMARY KEY DEFAULT 'bali2026',
      data JSONB NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
}
initDB().catch(console.error);

let passwordHash = null;
bcrypt.hash(BALI_PASSWORD, 10).then(h => { passwordHash = h; });

// Login page — unprotected
app.get('/bali/login', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// Login handler — unprotected
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

// Share token endpoint — set cookie from query param so link works
app.get('/bali/share/:token', (req, res) => {
  if (req.params.token === SHARE_TOKEN) {
    res.cookie('bali_auth', 'authenticated', {
      signed: true,
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 90 * 24 * 60 * 60 * 1000
    });
    return res.redirect('/bali');
  }
  return res.redirect('/bali/login');
});

// Auth middleware — protect all /bali/* routes registered after this point
app.use('/bali', (req, res, next) => {
  const token = req.signedCookies.bali_auth;
  if (token === 'authenticated') return next();
  return res.redirect('/bali/login');
});

// Get share URL
app.get('/bali/api/share-url', (req, res) => {
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host = req.headers['x-forwarded-host'] || req.get('host');
  res.json({ url: `${proto}://${host}/bali/share/${SHARE_TOKEN}` });
});

// API: Get data
app.get('/bali/api/data', async (req, res) => {
  try {
    const result = await pool.query('SELECT data FROM trip_data WHERE id = $1', ['bali2026']);
    res.json(result.rows[0]?.data || null);
  } catch (e) {
    console.error('GET error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// API: Save data
app.post('/bali/api/data', async (req, res) => {
  try {
    await pool.query(`
      INSERT INTO trip_data (id, data, updated_at) VALUES ('bali2026', $1, NOW())
      ON CONFLICT (id) DO UPDATE SET data = $1, updated_at = NOW()
    `, [req.body]);
    res.json({ ok: true, time: new Date().toISOString() });
  } catch (e) {
    console.error('POST error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

// Serve frontend at /bali/
app.use('/bali', express.static(path.join(__dirname, 'public')));
app.get('/bali', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

// Redirect root to /bali
app.get('/', (req, res) => res.redirect('/bali'));

app.listen(PORT, () => console.log(`Bali Reiseplanlegger on port ${PORT} → /bali`));
