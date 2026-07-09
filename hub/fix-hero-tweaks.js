// fix-hero-tweaks.js — (1) adaugă hero.titleC („În Brașov.") per limbă, dacă lipsește;
// (2) face overlay-ul hero mai transparent (poza vizibilă, gradient doar jos).
require('dotenv').config();
const { pool, initDb } = require('./db');

const TITLE_C = { hero: 'În Brașov.', 'hero@en': 'In Brașov.', 'hero@he': 'בברשוב.', 'hero@fr': 'À Brașov.' };
const OVERLAY = { heroOverlayFrom: 'jos', heroOverlayHeight: 60, heroOverlayOpacity: 50 };

(async () => {
  await initDb();
  for (const [key, text] of Object.entries(TITLE_C)) {
    const r = await pool.query('SELECT draft, published FROM site_content WHERE section_key = $1', [key]);
    if (!r.rows.length) { console.log('[hero-tweaks] lipsă secțiune:', key); continue; }
    const row = r.rows[0];
    let changed = false;
    for (const col of ['draft', 'published']) {
      const o = row[col];
      if (o && o.titleC === undefined) { o.titleC = text; changed = true; }
    }
    if (changed) {
      await pool.query(
        `UPDATE site_content SET draft = $2, published = COALESCE($3, published),
           published_at = CASE WHEN $3 IS NOT NULL THEN now() ELSE published_at END
         WHERE section_key = $1`,
        [key, JSON.stringify(row.draft), row.published ? JSON.stringify(row.published) : null]
      );
      console.log('[hero-tweaks] titleC adăugat:', key);
    } else console.log('[hero-tweaks] titleC exista deja:', key);
  }

  const b = await pool.query("SELECT draft, published FROM site_content WHERE section_key = 'brand'");
  if (b.rows.length) {
    const row = b.rows[0];
    for (const col of ['draft', 'published']) {
      const o = row[col];
      if (o) Object.assign(o, OVERLAY);
    }
    await pool.query(
      `UPDATE site_content SET draft = $1, published = COALESCE($2, published),
         published_at = CASE WHEN $2 IS NOT NULL THEN now() ELSE published_at END
       WHERE section_key = 'brand'`,
      [JSON.stringify(row.draft), row.published ? JSON.stringify(row.published) : null]
    );
    console.log('[hero-tweaks] overlay: from=jos, height=60, opacity=50');
  }
  process.exit(0);
})().catch((e) => { console.error('[hero-tweaks] FAIL:', e.message); process.exit(1); });
