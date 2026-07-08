/* One-off: în secțiunile traduse (@en/@he/@fr), numele vilelor rămăseseră „Vila X" —
   le înlocuim cu forma corectă per limbă, în draft + published. */
require('dotenv').config();
const { pool } = require('./db');

const REPL = {
  en: [[/\bVila Redwood\b/g, 'Redwood Villa'], [/\bVila Sequoia\b/g, 'Sequoia Villa'], [/\bvila Redwood\b/g, 'Redwood Villa'], [/\bvila Sequoia\b/g, 'Sequoia Villa']],
  fr: [[/\bVila Redwood\b/g, 'Villa Redwood'], [/\bVila Sequoia\b/g, 'Villa Sequoia'], [/\bvila Redwood\b/g, 'la villa Redwood'], [/\bvila Sequoia\b/g, 'la villa Sequoia']],
  he: [[/\bVila Redwood\b/g, 'וילה Redwood'], [/\bVila Sequoia\b/g, 'וילה Sequoia'], [/\bvila Redwood\b/g, 'וילה Redwood'], [/\bvila Sequoia\b/g, 'וילה Sequoia']],
};

function deepReplace(v, rules) {
  if (typeof v === 'string') {
    let out = v;
    for (const [re, to] of rules) out = out.replace(re, to);
    return out;
  }
  if (Array.isArray(v)) return v.map((x) => deepReplace(x, rules));
  if (v && typeof v === 'object') {
    const o = {};
    for (const k of Object.keys(v)) o[k] = deepReplace(v[k], rules);
    return o;
  }
  return v;
}

(async () => {
  const r = await pool.query("SELECT section_key, draft, published FROM site_content WHERE section_key LIKE '%@%'");
  let changed = 0;
  for (const row of r.rows) {
    const lang = row.section_key.split('@')[1];
    const rules = REPL[lang];
    if (!rules) continue;
    const nd = deepReplace(row.draft, rules);
    const np = row.published ? deepReplace(row.published, rules) : null;
    if (JSON.stringify(nd) !== JSON.stringify(row.draft) || JSON.stringify(np) !== JSON.stringify(row.published)) {
      await pool.query('UPDATE site_content SET draft = $2, published = COALESCE($3, published), published_at = CASE WHEN $3 IS NOT NULL THEN now() ELSE published_at END WHERE section_key = $1',
        [row.section_key, JSON.stringify(nd), np ? JSON.stringify(np) : null]);
      changed++;
      console.log('actualizat:', row.section_key);
    }
  }
  console.log('gata —', changed, 'secțiuni actualizate');
  await pool.end();
})();
