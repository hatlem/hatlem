const express = require('express');
const path = require('path');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.PORT || 4820;

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

app.use(express.json({ limit: '5mb' }));

// CORS — allow local HTML files and any origin
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
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
