// fix-brand-overlay.js — adaugă câmpurile overlay-ului de hero în secțiunea „brand"
// (doar dacă lipsesc — nu suprascrie valori setate de admin). Idempotent.
require('dotenv').config();
const { pool, initDb } = require('./db');

const DEFAULTS = {
  heroOverlayFrom: 'jos',      // jos | sus | colturi | plin
  heroOverlayHeight: 85,       // 0–100: cât se întinde gradientul
  heroOverlayOpacity: 80,      // 0–100
  heroOverlayColor: '#0C1F19', // hex
};

(async () => {
  await initDb();
  const r = await pool.query("SELECT draft, published FROM site_content WHERE section_key = 'brand'");
  if (!r.rows.length) { console.log('[fix-brand-overlay] secțiunea brand nu există — rulează întâi seed-brand'); process.exit(1); }
  const row = r.rows[0];
  let changed = false;
  for (const col of ['draft', 'published']) {
    const o = row[col];
    if (!o) continue;
    for (const [k, v] of Object.entries(DEFAULTS)) {
      if (o[k] === undefined) { o[k] = v; changed = true; }
    }
  }
  if (changed) {
    await pool.query(
      `UPDATE site_content SET draft = $1,
         published = COALESCE($2, published),
         published_at = CASE WHEN $2 IS NOT NULL THEN now() ELSE published_at END
       WHERE section_key = 'brand'`,
      [JSON.stringify(row.draft), row.published ? JSON.stringify(row.published) : null]
    );
    console.log('[fix-brand-overlay] câmpuri adăugate în brand.');
  } else {
    console.log('[fix-brand-overlay] nimic de făcut.');
  }
  process.exit(0);
})().catch((e) => { console.error('[fix-brand-overlay] FAIL:', e.message); process.exit(1); });
