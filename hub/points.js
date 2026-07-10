// points.js — logica sistemului de membership & puncte (Task 3.1).
// Funcțiile de calcul sunt PURE (testate în test-points.js); helper-ele de DB
// primesc pool-ul și aplică tranzacțiile atomic (BEGIN/COMMIT pe un client dedicat).
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
    console.error('[membership] setările nu au putut fi citite, folosesc default:', e.message);
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
  if (clean.tier_platinum <= clean.tier_gold) {
    throw new Error('Pragul Platinum trebuie să fie mai mare decât pragul Gold.');
  }
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
// cod aleator din alfabet fără caractere ambigue (0/O, 1/I)
function genCode(len) {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (const b of crypto.randomBytes(len)) s += alphabet[b % alphabet.length];
  return s;
}
function genReferralCode() { return 'RV-' + genCode(6); }
function genVoucherCode() { return 'RW-' + genCode(8); }

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
      if (e.code !== '23505') throw e;
      // coliziune pe referral_code (rar) sau cont creat concurent
      const again = await pool.query('SELECT * FROM membership_accounts WHERE user_id = $1', [userId]);
      if (again.rows.length) return again.rows[0];
    }
  }
  throw new Error('Nu am putut genera un cod de referral unic.');
}

// adaugă/scade puncte + tranzacție — ATOMIC (BEGIN/COMMIT pe un client dedicat).
// - idempotent pe (type, source_ref) prin indexul unic parțial → {skipped, duplicate}
// - la scădere, balanța nu poate coborî sub 0 → {insufficient}
// - lifetime crește doar la sume pozitive și doar dacă opts.countsForLifetime !== false
//   (refund-urile NU umflă tier-ul)
async function addPoints(pool, accountId, amount, type, opts = {}) {
  const amt = Math.round(Number(amount) || 0);
  if (!amt) return { skipped: true };
  const countsForLifetime = opts.countsForLifetime !== false;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(
      `INSERT INTO points_transactions (account_id, amount, type, source_ref, description, created_by)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [accountId, amt, type, opts.sourceRef || null, opts.description || null, opts.createdBy || 'system']
    );
    const r = await client.query(
      `UPDATE membership_accounts
         SET points_balance = points_balance + $2,
             lifetime_points = lifetime_points + CASE WHEN $3::boolean AND $2 > 0 THEN $2 ELSE 0 END
       WHERE id = $1 AND points_balance + $2 >= 0
       RETURNING *`,
      [accountId, amt, countsForLifetime]
    );
    if (!r.rows.length) {
      await client.query('ROLLBACK');
      return { insufficient: true };
    }
    await client.query('COMMIT');
    return { account: r.rows[0] };
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    if (e.code === '23505') return { skipped: true, duplicate: true };
    throw e;
  } finally {
    client.release();
  }
}

/* ---------- puncte din rezervări (după checkout) ---------- */
// rulată după sync-ul Smoobu și de cron: caută rezervările încheiate (departure
// trecut, neanulate) ale căror emailuri au cont de membru și acordă punctele o
// singură dată per rezervare (idempotent prin indexul unic type+source_ref).
// Guard anti-preluare: doar sejururile cu plecarea DUPĂ crearea contului de user
// (un cont nou pe un email istoric nu încasează retroactiv — admin poate ajusta manual).
// Tot aici se acordă bonusul invitatorului când referral_requires_booking=true
// (amânat până la primul sejur încheiat al noului cont).
async function awardStayPoints(pool) {
  const settings = await getMembershipSettings(pool);
  const r = await pool.query(
    `SELECT b.id, b.value AS price, b.villa, b.arrival, b.departure, u.id AS user_id
       FROM bookings b
       JOIN guests g ON g.id = b.guest_id
       JOIN users u ON lower(u.email) = lower(g.email)
      WHERE b.status NOT IN ('cancelled', 'blocked')
        AND b.departure < CURRENT_DATE
        AND b.departure >= u.created_at::date
        AND b.value IS NOT NULL AND b.value > 0
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
    if (!res.skipped && !res.insufficient) awarded++;
    // bonusul invitatorului, amânat până la primul sejur (dacă flag-ul e activ);
    // idempotent prin indexul unic (referral_bonus_inviter, source_ref = user_id)
    if (settings.referral_requires_booking && acc.referred_by && settings.referral_points_inviter > 0) {
      try {
        const inv = await pool.query(
          'SELECT * FROM membership_accounts WHERE referral_code = $1 AND user_id <> $2',
          [acc.referred_by, b.user_id]
        );
        if (inv.rows.length) {
          await addPoints(pool, inv.rows[0].id, settings.referral_points_inviter, 'referral_bonus_inviter', {
            sourceRef: String(b.user_id),
            description: 'Bonus recomandare — invitatul a încheiat primul sejur',
          });
        }
      } catch (e) {
        console.error('[membership] bonus inviter eșuat:', e.message);
      }
    }
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
  genVoucherCode,
  ensureAccount,
  addPoints,
  awardStayPoints,
};
