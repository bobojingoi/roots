// seed-extra-reviews.js — secțiunea „extra_reviews": recenzii adăugate manual din admin,
// afișate pe site lângă cele de la Google (care sunt limitate la ~5 de API).
// Primul item e un ȘABLON (text gol → nu apare pe site); servește drept model
// pentru butonul „+ Adaugă element" din admin. Idempotent.
require('dotenv').config();
const { pool, initDb } = require('./db');

const EXTRA = {
  items: [
    {
      name: 'Exemplu — șablon (nu apare pe site cât timp textul e gol)',
      text: '',
      rating: 5,
      time: 'august 2025',
      photo: '',
      country: 'il', // il = Israel, ro = România, en, fr …
    },
  ],
};

(async () => {
  await initDb();
  const r = await pool.query('SELECT 1 FROM site_content WHERE section_key = $1', ['extra_reviews']);
  if (r.rows.length === 0) {
    await pool.query(
      'INSERT INTO site_content (section_key, draft, published, published_at) VALUES ($1, $2, $2, now())',
      ['extra_reviews', JSON.stringify(EXTRA)]
    );
    console.log('[seed-extra-reviews] publicat: extra_reviews');
  } else {
    console.log('[seed-extra-reviews] există deja, sar: extra_reviews');
  }
  process.exit(0);
})().catch((e) => { console.error('[seed-extra-reviews] FAIL:', e.message); process.exit(1); });
