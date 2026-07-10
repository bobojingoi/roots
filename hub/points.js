// points.js — logica sistemului de membership & puncte (Task 3.1).
// Funcțiile de calcul sunt PURE (testate în test-points.js); helper-ele de DB
// primesc pool-ul și aplică tranzacțiile atomic.
const crypto = require('crypto');

/* ---------- setări (persistate în settings.membership, cu default-uri) ---------- */
const DEFAULT_MEMBERSHIP = {
  lei_per_point: 10,              // 10 lei cheltuiți = 1 punct (1000 lei = 100 puncte)
  referral_points_new: 50,        // punctele contului NOU creat cu un cod
  referral_points_inviter: 20,    // punctele invitatorului, per cont nou
  photo_tag_points: 30,           // poză cu #rootsvillas (validare manuală)
  review_points: 50,              // review (validare manuală)
  tier_gold: 1000,                // prag lifetime pentru Gold
  tier_platinum: 5000,            // prag lifetime pentru Platinum
  referral_requires_booking: false, // bonusul invitatorului doar după prima rezervare a noului cont
};

async function getMembershipSettings(pool) {
  try {
    const r = await pool.query("SELECT value FROM settings WHERE key = 'membership'");
    return { ...DEFAULT_MEMBERSHIP, ...((r.rows[0] && r.rows[0].value) || {}) };
  } catch (e) {
    return { ...DEFAULT_MEMBERSHIP };
  }
}

async function saveMembershipSettings(pool, patch) {
  const current = await getMembershipSettings(pool);
  const clean = { ...current };
  for (const k of Object.keys(DEFAULT_MEMBERSHIP)) {
    if (patch[k] === undefined) continue;
    if (k === 'referral_requires_booking') clean[k] = Boolean(patch[k]);
    else {
      const n = Math.round(Number(patch[k]));
      if (Number.isFinite(n) && n >= 0) clean[k] = n;
    }
  }
  if (clean.lei_per_point < 1) clean.lei_per_point = 1;
  await pool.query(
    `INSERT INTO settings (key, value, updated_at) VALUES ('membership', $1, now())
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = now()`,
    [JSON.stringify(clean)]
  );
  return clean;
}

/* ---------- calcule pure (testate) ---------- */
// puncte din cheltuială: floor(lei / lei_per_point); niciodată negativ
function pointsForSpend(amountLei, leiPerPoint) {
  const amount = Number(amountLei);
  const rate = Math.max(1, Number(leiPerPoint) || DEFAULT_MEMBERSHIP.lei_per_point);
  if (!Number.isFinite(amount) || amount <= 0) return 0;
  return Math.floor(amount / rate);
}

// tier derivat din lifetime_points
function tierFor(lifetimePoints, settings) {
  const s = settings || DEFAULT_MEMBERSHIP;
  const lp = Number(lifetimePoints) || 0;
  if (lp >= s.tier_platinum) return 'platinum';
  if (lp >= s.tier_gold) return 'gold';
  return 'silver';
}

// progresul spre următorul tier (pentru bara din dashboard)
function tierProgress(lifetimePoints, settings) {
  const s = settings || DEFAULT_MEMBERSHIP;
  const lp = Number(lifetimePoints) || 0;
  const tier = tierFor(lp, s);
  if (tier === 'platinum') return { tier, next: null, toNext: 0, pct: 100 };
  const [lo, hi] = tier === 'silver' ? [0, s.tier_gold] : [s.tier_gold, s.tier_platinum];
  const pct = Math.max(0, Math.min(100, Math.round(((lp - lo) / Math.max(1, hi - lo)) * 100)));
  return { tier, next: tier === 'silver' ? 'gold' : 'platinum', toNext: Math.max(0, hi - lp), pct };
}

/* ---------- conturi & tranzacții ---------- */
function genReferralCode() {
  // RV-XXXXXX, fără caractere ambigue (0/O, 1/I)
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (const b of crypto.randomBytes(6)) s += alphabet[b % alphabet.length];
  return 'RV-' + s;
}

// contul de membru al unui user (îl creează dacă lipsește)
async function ensureAccount(pool, userId, referredBy) {
  const existing = await pool.query('SELECT * FROM membership_accounts WHERE user_id = $1', [userId]);
  if (existing.rows.length) return existing.rows[0];
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const r = await pool.query(
        'INSERT INTO membership_accounts (user_id, referral_code, referred_by) VALUES ($1, $2, $3) RETURNING *',
        [userId, genReferralCode(), referredBy || null]
      );
      return r.rows[0];
    } catch (e) {
      if (!String(e.message).includes('duplicate')) throw e;
      // coliziune pe referral_code (rar) sau cont creat concurent
      const again = await pool.query('SELECT * FROM membership_accounts WHERE user_id = $1', [userId]);
      if (again.rows.length) return again.rows[0];
    }
  }
  throw new Error('Nu am putut genera un cod de referral unic.');
}

// adaugă/scade puncte + tranzacție; lifetime crește doar la sume pozitive.
// Idempotent pe (type, source_ref) pentru spend_reservation/referral_bonus_new
// (indexul unic din schema) — a doua încercare e ignorată.
async function addPoints(pool, accountId, amount, type, opts = {}) {
  const amt = Math.round(Number(amount) || 0);
  if (!amt) return { skipped: true };
  try {
    await pool.query(
      `INSERT INTO points_transactions (account_id, amount, type, source_ref, description, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [accountId, amt, type, opts.sourceRef || null, opts.description || null, opts.createdBy || 'system']
    );
  } catch (e) {
    if (String(e.message).includes('duplicate')) return { skipped: true, duplicate: true };
    throw e;
  }
  const r = await pool.query(
    `UPDATE membership_accounts
       SET points_balance = points_balance + $2,
           lifetime_points = lifetime_points + GREATEST($2, 0)
     WHERE id = $1 RETURNING *`,
    [accountId, amt]
  );
  return { account: r.rows[0] };
}

/* ---------- puncte din rezervări (după checkout) ---------- */
// rulată după sync-ul Smoobu și de cron: caută rezervările încheiate (departure
// trecut, neanulate) ale căror emailuri au cont de membru și acordă punctele o
// singură dată per rezervare (idempotent prin indexul unic type+source_ref).
async function awardStayPoints(pool) {
  const settings = await getMembershipSettings(pool);
  const r = await pool.query(
    `SELECT b.id, b.price, b.villa, b.arrival, b.departure, u.id AS user_id
       FROM bookings b
       JOIN guests g ON g.id = b.guest_id
       JOIN users u ON lower(u.email) = lower(g.email)
      WHERE b.status NOT IN ('cancelled', 'blocked')
        AND b.departure < CURRENT_DATE
        AND b.price IS NOT NULL AND b.price > 0
        AND NOT EXISTS (
          SELECT 1 FROM points_transactions pt
           WHERE pt.type = 'spend_reservation' AND pt.source_ref = b.id::text
        )
      LIMIT 200`
  );
  let awarded = 0;
  for (const b of r.rows) {
    const pts = pointsForSpend(b.price, settings.lei_per_point);
    if (!pts) continue;
    const acc = await ensureAccount(pool, b.user_id);
    const res = await addPoints(pool, acc.id, pts, 'spend_reservation', {
      sourceRef: String(b.id),
      description: `Sejur ${b.villa || ''} ${String(b.arrival).slice(0, 10)} → ${String(b.departure).slice(0, 10)} (${b.price} lei)`,
    });
    if (!res.skipped) awarded++;
  }
  return { checked: r.rows.length, awarded };
}

module.exports = {
  DEFAULT_MEMBERSHIP,
  getMembershipSettings,
  saveMembershipSettings,
  pointsForSpend,
  tierFor,
  tierProgress,
  genReferralCode,
  ensureAccount,
  addPoints,
  awardStayPoints,
};
