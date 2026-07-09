// seed-brand.js — secțiunea „brand" (logo-ul site-ului).
// Idempotent: dacă secțiunea există deja, NU o atinge.
// Rulare: node seed-brand.js  (din folderul hub/, cu .env-ul care indică baza de date)
require('dotenv').config();
const { pool, initDb } = require('./db');

// gol = textul „R ROOTS"; adminul pune un URL de imagine (din Galerie media) ca să-l înlocuiască
const BRAND = { logo: '' };

(async () => {
  await initDb();
  const r = await pool.query('SELECT 1 FROM site_content WHERE section_key = $1', ['brand']);
  if (r.rows.length === 0) {
    await pool.query(
      'INSERT INTO site_content (section_key, draft, published, published_at) VALUES ($1, $2, $2, now())',
      ['brand', JSON.stringify(BRAND)]
    );
    console.log('[seed-brand] publicat: brand');
  } else {
    console.log('[seed-brand] există deja, sar: brand');
  }
  process.exit(0);
})().catch((e) => { console.error('[seed-brand] FAIL:', e.message); process.exit(1); });
