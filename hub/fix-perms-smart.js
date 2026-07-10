// fix-perms-smart.js — migrare o singură dată: settings.role_permissions e
// snapshot-ul salvat de owner și NU primește automat zonele noi (merge-ul din
// getRolePerms e pe nivel de ROL). Adăugăm zona 'smart' la admin + curatenie,
// altfel tabul Smart Roots nu apare și API-ul refuză curățenia. Idempotent;
// owner-ul poate revoca oricând din Sistem → Roluri & acces.
require('dotenv').config();
const { pool, initDb } = require('./db');

(async () => {
  await initDb();
  const r = await pool.query("SELECT value FROM settings WHERE key = 'role_permissions'");
  if (!r.rows.length) { console.log('nu există permisiuni salvate — default-urile includ deja smart'); process.exit(0); }
  const perms = r.rows[0].value || {};
  let changed = false;
  for (const role of ['admin', 'curatenie']) {
    if (Array.isArray(perms[role]) && !perms[role].includes('smart')) {
      perms[role].push('smart');
      changed = true;
      console.log(`adăugat 'smart' la rolul ${role}`);
    }
  }
  if (changed) {
    await pool.query("UPDATE settings SET value = $1, updated_at = now() WHERE key = 'role_permissions'", [JSON.stringify(perms)]);
    console.log('permisiuni actualizate');
  } else {
    console.log('nimic de schimbat');
  }
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
