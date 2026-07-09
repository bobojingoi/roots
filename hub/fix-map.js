// fix-map.js — actualizează harta cu locația reală Roots Villas
// (Str. Fântânii 46, Stupini, Brașov — 45.705599, 25.574160) în secțiunile live.
// Înlocuiește DOAR valorile vechi/generice („Stupini, Brașov"); nu atinge valori personalizate.
require('dotenv').config();
const { pool, initDb } = require('./db');

const NEW_EMBED = 'https://maps.google.com/maps?q=Roots%20Villas%2C%20Strada%20F%C3%A2nt%C3%A2nii%2046%2C%20Bra%C8%99ov&ll=45.705599,25.574160&z=15&output=embed';
const NEW_LINK = 'https://maps.google.com/?cid=8153509057249140820';
const OLD_MARKERS = ['q=Stupini', 'Roots+Villas+Stupini', 'q=Strada%20F%C3%A2nt%C3%A2nii'];

const isOld = (v) => typeof v === 'string' && OLD_MARKERS.some((m) => v.includes(m));

(async () => {
  await initDb();
  // toate variantele de limbă ale secțiunilor relevante (villa_redwood@en, welcome_* etc.)
  const r = await pool.query(
    `SELECT section_key, draft, published FROM site_content
     WHERE section_key LIKE 'villa_%' OR section_key LIKE 'location%' OR section_key LIKE 'welcome_%'`
  );
  for (const row of r.rows) {
    let changed = false;
    for (const col of ['draft', 'published']) {
      const o = row[col];
      if (!o) continue;
      if (isOld(o.mapEmbed)) { o.mapEmbed = NEW_EMBED; changed = true; }
      if (isOld(o.mapsUrl)) { o.mapsUrl = NEW_LINK; changed = true; }
    }
    if (changed) {
      // COALESCE: nu transformăm published NULL în jsonb 'null'; published_at se
      // actualizează doar dacă chiar am scris published
      await pool.query(
        `UPDATE site_content SET draft = $2,
           published = COALESCE($3, published),
           published_at = CASE WHEN $3 IS NOT NULL THEN now() ELSE published_at END
         WHERE section_key = $1`,
        [row.section_key, JSON.stringify(row.draft), row.published ? JSON.stringify(row.published) : null]
      );
      console.log('[fix-map] actualizat:', row.section_key);
    } else {
      console.log('[fix-map] nimic de schimbat:', row.section_key);
    }
  }
  process.exit(0);
})().catch((e) => { console.error('[fix-map] FAIL:', e.message); process.exit(1); });
