// fix-tracking-googleads.js — adaugă cheia `googleAds` (șirul send_to al
// conversiei Google Ads: „AW-XXXXXXXXX/ETICHETA") în secțiunea `tracking`
// EXISTENTĂ (draft + published). Formularul din admin randează doar cheile
// prezente în JSON — fără migrarea asta câmpul nu apare.
// Idempotent. Rulare: node fix-tracking-googleads.js  (din hub/, cu .env spre DB)
require('dotenv').config();
const { pool, initDb } = require('./db');

(async () => {
  await initDb();
  const r = await pool.query("SELECT section_key, draft, published FROM site_content WHERE section_key LIKE 'tracking%'");
  if (!r.rows.length) { console.log('[fix-googleads] secțiunea tracking nu există — rulează întâi seed-tracking.js'); process.exit(0); }
  for (const row of r.rows) {
    const patch = {};
    for (const col of ['draft', 'published']) {
      const v = row[col];
      if (v && typeof v === 'object' && !('googleAds' in v)) patch[col] = { ...v, googleAds: '' };
    }
    if (!Object.keys(patch).length) { console.log(`[fix-googleads] ${row.section_key}: are deja googleAds, sar`); continue; }
    await pool.query(
      `UPDATE site_content SET draft = COALESCE($2, draft), published = COALESCE($3, published), updated_at = now() WHERE section_key = $1`,
      [row.section_key, patch.draft ? JSON.stringify(patch.draft) : null, patch.published ? JSON.stringify(patch.published) : null]
    );
    console.log(`[fix-googleads] ${row.section_key}: adăugat câmpul googleAds`);
  }
  process.exit(0);
})().catch((e) => { console.error('[fix-googleads] FAIL:', e.message); process.exit(1); });
