// fix-i18n-align.js — aliniază lungimile array-urilor din secțiunile traduse
// (@en/@he/@fr) cu secțiunea de bază: elementele lipsă intră GOALE ({} pentru
// obiecte, "" pentru stringuri) și cad pe română pe site prin deepLang.
// Fără asta, reordonarea/ștergerea din editor nu se poate oglinvi pe traduceri
// (lungimi diferite = indici care ar muta alt conținut). Idempotent; draft + published.
require('dotenv').config();
const { pool, initDb } = require('./db');

function filler(baseItem) {
  if (Array.isArray(baseItem)) return [];
  if (baseItem && typeof baseItem === 'object') return {};
  return '';
}

// completează în adâncime; întoarce true dacă a modificat ceva
function padDeep(base, over) {
  if (Array.isArray(base) && Array.isArray(over)) {
    let changed = false;
    const shared = Math.min(base.length, over.length);
    for (let i = 0; i < shared; i++) if (padDeep(base[i], over[i])) changed = true;
    for (let i = over.length; i < base.length; i++) { over.push(filler(base[i])); changed = true; }
    return changed;
  }
  if (base && over && typeof base === 'object' && typeof over === 'object' && !Array.isArray(base) && !Array.isArray(over)) {
    let changed = false;
    for (const k of Object.keys(base)) {
      if (over[k] !== undefined && padDeep(base[k], over[k])) changed = true;
    }
    return changed;
  }
  return false;
}

(async () => {
  await initDb();
  const r = await pool.query('SELECT section_key, draft, published FROM site_content');
  const byKey = new Map(r.rows.map((x) => [x.section_key, x]));
  let fixed = 0;
  for (const row of r.rows) {
    if (!row.section_key.includes('@')) continue;
    const base = byKey.get(row.section_key.split('@')[0]);
    if (!base) continue;
    const dDraft = Boolean(base.draft && row.draft && padDeep(base.draft, row.draft));
    const dPub = Boolean(base.published && row.published && padDeep(base.published, row.published));
    if (dDraft || dPub) {
      await pool.query(
        `UPDATE site_content SET draft = $2, published = COALESCE($3, published), updated_at = now() WHERE section_key = $1`,
        [row.section_key, JSON.stringify(row.draft), dPub ? JSON.stringify(row.published) : null]
      );
      console.log('aliniat:', row.section_key, dDraft ? '[draft]' : '', dPub ? '[published]' : '');
      fixed++;
    }
  }
  console.log(fixed ? `${fixed} secțiuni aliniate` : 'nimic de aliniat — totul e deja sincron');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
