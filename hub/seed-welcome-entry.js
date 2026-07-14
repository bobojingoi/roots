// seed-welcome-entry.js — adaugă secțiunea „Cum intri în vilă" ÎNAINTE de
// „Reguli & program" pe ambele pagini welcome (redwood + sequoia), în toate
// limbile (ro/en/he/fr) + publicat. Idempotent (nu adaugă de două ori) și
// non-destructiv (inserează doar, păstrează restul + draft-ul).
// Rulare:  node seed-welcome-entry.js --dry   (doar afișează ce ar face)
//          node seed-welcome-entry.js         (scrie efectiv)
require('dotenv').config();
const { pool, initDb } = require('./db');

const NEW = {
  ro: { title: 'Cum intri în vilă', line: 'La ușa de la intrare găsești o cutie cu cifru — tastează codul, iar cheia e înăuntru.' },
  en: { title: 'How to get in', line: "By the front door there's a lockbox — enter the code and the key is inside." },
  he: { title: 'איך נכנסים לווילה', line: 'ליד דלת הכניסה יש תיבת קוד — הקישו את הקוד והמפתח בפנים.' },
  fr: { title: 'Comment entrer', line: "Près de la porte d'entrée, une boîte à code — saisissez le code, la clé se trouve à l'intérieur." },
};
const sectionFor = (lang) => ({ icon: 'key', title: NEW[lang].title, image: '', lines: [NEW[lang].line], steps: [] });

const VILLAS = ['welcome_redwood', 'welcome_sequoia'];
const LANGS = ['ro', 'en', 'he', 'fr'];
const keyFor = (base, lang) => (lang === 'ro' ? base : `${base}@${lang}`);
const DRY = process.argv.includes('--dry');

// inserează secțiunea într-un obiect de conținut; întoarce {obj, skipped}
function insertInto(obj, idx, sec) {
  if (!obj || typeof obj !== 'object') return { obj, skipped: true };
  const secs = Array.isArray(obj.sections) ? obj.sections.slice() : [];
  if (secs.some((s) => (s.title || '').trim() === sec.title)) return { obj, skipped: true };
  secs.splice(Math.min(idx, secs.length), 0, sec);
  return { obj: { ...obj, sections: secs }, skipped: false };
}

(async () => {
  await initDb();
  let changed = 0;
  for (const base of VILLAS) {
    const ro = await pool.query('SELECT published FROM site_content WHERE section_key = $1', [base]);
    if (!ro.rows.length || !ro.rows[0].published) { console.log('!! lipsă, sar peste:', base); continue; }
    const roSecs = ro.rows[0].published.sections || [];
    let idx = roSecs.findIndex((s) => /reguli/i.test(s.title || ''));
    if (idx < 0) idx = 0;
    console.log(`\n${base}: inserez la index ${idx} (înainte de ${JSON.stringify(roSecs[idx] && roSecs[idx].title)})`);
    for (const lang of LANGS) {
      const key = keyFor(base, lang);
      const row = await pool.query('SELECT draft, published FROM site_content WHERE section_key = $1', [key]);
      if (!row.rows.length) { console.log('   -', key, 'nu există, sar'); continue; }
      const sec = sectionFor(lang);
      const rp = insertInto(row.rows[0].published, idx, sec);
      if (rp.skipped) { console.log('   =', key, 'are deja secțiunea, sar'); continue; }
      const rd = row.rows[0].draft ? insertInto(row.rows[0].draft, idx, sec) : null;
      const newDraft = rd && !rd.skipped ? rd.obj : rp.obj; // fără draft separat → aliniat la published
      if (DRY) { console.log('   [DRY] ar adăuga în', key); continue; }
      await pool.query(
        'UPDATE site_content SET published = $2, draft = $3, published_at = now() WHERE section_key = $1',
        [key, JSON.stringify(rp.obj), JSON.stringify(newDraft)]
      );
      console.log('   ✓', key);
      changed++;
    }
  }
  console.log(`\n${DRY ? '[DRY] ' : ''}gata — ${changed} chei modificate.`);
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
