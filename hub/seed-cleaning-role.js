// seed-cleaning-role.js — actualizează role_permissions STOCAT ca noul tab
// „Curățenie" să fie vizibil corect:
//   - rolul `curatenie` vede DOAR calendarul de curățenie (nimic personal/financiar)
//   - rolul `admin` (non-owner) primește și el accesul la calendarul de curățenie
// Owner-ul vede oricum tot (via AREA_KEYS în cod).
// Rulează DUPĂ ce s-a deployat codul nou (care adaugă zona 'curatenie').
require('dotenv').config();
const { pool, initDb } = require('./db');

(async () => {
  await initDb();
  const r = await pool.query("SELECT value FROM settings WHERE key = 'role_permissions'");
  const perms = (r.rows[0] && r.rows[0].value) || {};
  perms.curatenie = ['curatenie'];
  perms.admin = Array.from(new Set([...(perms.admin || []), 'curatenie']));
  await pool.query(
    `INSERT INTO settings (key, value, updated_at) VALUES ('role_permissions', $1, now())
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = now()`,
    [JSON.stringify(perms)]
  );
  console.log('role_permissions actualizat:', JSON.stringify(perms));
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
