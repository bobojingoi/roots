// seed-tracking.js — secțiunea „tracking" (ID-uri GA4 / Meta Pixel / TikTok Pixel).
// Idempotent: dacă secțiunea există deja, NU o atinge.
// Rulare: node seed-tracking.js  (din folderul hub/, cu .env-ul care indică baza de date)
require('dotenv').config();
const { pool, initDb } = require('./db');

// goale = niciun script nu se încarcă pe site; adminul completează ID-urile din
// Hub → Setări site → Marketing & Tracking (ga4: G-XXXX, metaPixel: cifre, tiktokPixel: cod)
const TRACKING = { ga4: '', metaPixel: '', tiktokPixel: '' };

(async () => {
  await initDb();
  const r = await pool.query('SELECT 1 FROM site_content WHERE section_key = $1', ['tracking']);
  if (r.rows.length === 0) {
    await pool.query(
      'INSERT INTO site_content (section_key, draft, published, published_at) VALUES ($1, $2, $2, now())',
      ['tracking', JSON.stringify(TRACKING)]
    );
    console.log('[seed-tracking] publicat: tracking');
  } else {
    console.log('[seed-tracking] există deja, sar: tracking');
  }
  process.exit(0);
})().catch((e) => { console.error('[seed-tracking] FAIL:', e.message); process.exit(1); });
