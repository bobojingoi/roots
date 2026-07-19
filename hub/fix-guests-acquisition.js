// fix-guests-acquisition.js — backfill: sursa de achiziție pe profilurile de
// clienți, din rezervările deja finalizate (pending_bookings status='created'
// cu payload->attribution). Doar CRM intern — nu se exportă nicăieri.
// Idempotent: scrie DOAR unde acquisition e NULL (first-touch rămâne al primei
// rezervări; rulările următoare nu suprascriu).
// Rulare: node fix-guests-acquisition.js  (din hub/, cu .env spre DB)
require('dotenv').config();
const { pool, initDb } = require('./db');
const { acquisitionSummary } = require('./attribution-utils');

(async () => {
  await initDb();
  const r = await pool.query(
    `SELECT id, email, created_at, payload->'attribution' AS attribution
     FROM pending_bookings
     WHERE status = 'created' AND email IS NOT NULL AND payload->'attribution' IS NOT NULL
     ORDER BY created_at ASC`
  );
  let set = 0, skipped = 0, noGuest = 0;
  for (const row of r.rows) {
    const acq = acquisitionSummary(row.attribution);
    if (!acq) { skipped++; continue; }
    const touch = [{ at: new Date(row.created_at).toISOString(), source: acq.source, campaign: acq.campaign }];
    const u = await pool.query(
      `UPDATE guests SET acquisition = $2::jsonb, updated_at = now()
       WHERE lower(email) = lower($1) AND acquisition IS NULL`,
      [row.email, JSON.stringify({ ...acq, touches: touch })]
    );
    if (u.rowCount) set += u.rowCount; else noGuest++;
  }
  console.log(`[backfill-acquisition] ${r.rows.length} rezervări cu atribuire · ${set} profiluri completate · ${noGuest} fără profil/deja setate · ${skipped} neclasificabile`);
  process.exit(0);
})().catch((e) => { console.error('[backfill-acquisition] FAIL:', e.message); process.exit(1); });
