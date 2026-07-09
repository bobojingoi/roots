// fix-video-cover.js — setează coperta video (poza cu drona) dacă lipsește. Idempotent.
require('dotenv').config();
const { pool, initDb } = require('./db');

const COVER = 'https://pub-df7fda52d56847649a087175edb4abdf.r2.dev/roots-media/hub/98f34b0c-d9f0-4565-9cc1-05e4768476df-dji-0833-ed.webp';

(async () => {
  await initDb();
  const r = await pool.query("SELECT section_key, draft, published FROM site_content WHERE section_key LIKE 'video%'");
  for (const row of r.rows) {
    let changed = false;
    for (const col of ['draft', 'published']) {
      const o = row[col];
      if (o && !o.image) { o.image = COVER; changed = true; }
    }
    if (changed) {
      await pool.query(
        `UPDATE site_content SET draft = $2, published = COALESCE($3, published),
           published_at = CASE WHEN $3 IS NOT NULL THEN now() ELSE published_at END
         WHERE section_key = $1`,
        [row.section_key, JSON.stringify(row.draft), row.published ? JSON.stringify(row.published) : null]
      );
      console.log('[video-cover] setat:', row.section_key);
    } else console.log('[video-cover] avea deja copertă:', row.section_key);
  }
  process.exit(0);
})().catch((e) => { console.error('[video-cover] FAIL:', e.message); process.exit(1); });
