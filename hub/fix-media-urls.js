// fix-media-urls.js — corectează URL-urile media scrise cu cheia fără prefixul
// de bucket. Cauza: S3_ENDPOINT în Vercel includea și „/roots-media", iar SDK-ul
// a mai adăugat o dată bucket-ul → obiectele au ajuns la cheia „roots-media/hub/…",
// dar publicUrl() a generat „…r2.dev/hub/…" (404). Idempotent.
require('dotenv').config();
const { pool, initDb } = require('./db');

const BROKEN = '.r2.dev/hub/';
const FIXED = '.r2.dev/roots-media/hub/';

(async () => {
  await initDb();
  // 1) tabela media
  const r = await pool.query(
    `UPDATE media SET url = replace(url, $1, $2), thumb_url = replace(thumb_url, $1, $2)
     WHERE url LIKE '%' || $1 || '%' OR thumb_url LIKE '%' || $1 || '%'
     RETURNING id`,
    [BROKEN, FIXED]
  );
  console.log('[fix-media-urls] media corectate:', r.rowCount);

  // 2) secțiunile CMS care ar putea conține deja URL-ul stricat (draft sau publicat)
  const s = await pool.query(
    `SELECT section_key, draft, published FROM site_content
     WHERE draft::text LIKE '%' || $1 || '%' OR published::text LIKE '%' || $1 || '%'`,
    [BROKEN]
  );
  for (const row of s.rows) {
    const fix = (o) => (o ? JSON.parse(JSON.stringify(o).split(BROKEN).join(FIXED)) : o);
    await pool.query(
      `UPDATE site_content SET draft = $2,
         published = COALESCE($3, published),
         published_at = CASE WHEN $3 IS NOT NULL THEN now() ELSE published_at END
       WHERE section_key = $1`,
      [row.section_key, JSON.stringify(fix(row.draft)), row.published ? JSON.stringify(fix(row.published)) : null]
    );
    console.log('[fix-media-urls] secțiune corectată:', row.section_key);
  }
  console.log('[fix-media-urls] gata.');
  process.exit(0);
})().catch((e) => { console.error('[fix-media-urls] FAIL:', e.message); process.exit(1); });
