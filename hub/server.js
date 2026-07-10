/* Roots Hub — server (Faza 1)
   API-first: adminul e doar un client al /api/v1/*.
   Public: GET /api/v1/site-content (doar conținut publicat, cu ETag). */
require('dotenv').config();
const path = require('path');
const crypto = require('crypto');
const express = require('express');

const { pool, initDb } = require('./db');
const { emit } = require('./events');
const membership = require('./points');
const storage = require('./storage');
const smoobu = require('./smoobu');
const {
  verifyPassword,
  hashPassword,
  setAuthCookie,
  clearAuthCookie,
  attachUser,
  requireAuth,
  requireOwner,
} = require('./auth');

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '30mb' })); // imaginile vin deja optimizate din browser

/* CORS pentru editorul vizual de pe site (Bearer token, fara cookie-uri) */
const CORS_ORIGINS = (process.env.CORS_ORIGINS ||
  'https://roots-opal.vercel.app,https://rootsvillas.ro,https://www.rootsvillas.ro,http://localhost:5173'
).split(',').map((s) => s.trim());
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && CORS_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

app.use(attachUser);

// Serverless: prima cerere per instanță se asigură că schema există (idempotent).
let ready = null;
function ensureReady() {
  if (!ready) ready = initDb().catch((e) => { ready = null; throw e; });
  return ready;
}
app.use(async (req, res, next) => {
  try { await ensureReady(); next(); } catch (e) { res.status(500).json({ error: 'DB indisponibil: ' + e.message }); }
});

const PORT = process.env.PORT || 4000;

/* ============ cache public site-content (invalidat la publicare) ============
   TTL de siguranță: scripturile care scriu direct în DB (seed/fix) nu pot
   invalida cache-ul instanțelor calde — după 60s se reconstruiește oricum
   (CDN-ul are deja max-age=60, deci costul e nul). */
const SITE_CACHE_TTL = 60e3;
let siteCache = null; // { etag, body, at }

async function buildSiteContent() {
  const r = await pool.query(
    'SELECT section_key, published, published_at FROM site_content WHERE published IS NOT NULL'
  );
  const content = {};
  let latest = 0;
  for (const row of r.rows) {
    content[row.section_key] = row.published;
    const t = new Date(row.published_at).getTime();
    if (t > latest) latest = t;
  }
  const body = JSON.stringify({ content, publishedAt: latest ? new Date(latest).toISOString() : null });
  const etag = '"' + crypto.createHash('sha1').update(body).digest('hex') + '"';
  siteCache = { etag, body, at: Date.now() };
  return siteCache;
}

/* ============ PUBLIC ============ */
app.get('/api/v1/site-content', async (req, res) => {
  try {
    const fresh = siteCache && Date.now() - (siteCache.at || 0) < SITE_CACHE_TTL;
    const cache = fresh ? siteCache : await buildSiteContent();
    if (req.headers['if-none-match'] === cache.etag) return res.status(304).end();
    res.setHeader('ETag', cache.etag);
    res.setHeader('Cache-Control', 'public, max-age=60');
    res.setHeader('Content-Type', 'application/json; charset=utf-8');
    res.send(cache.body);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/v1/health', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ ok: true, storage: storage.storageReady() });
  } catch (e) {
    res.status(500).json({ ok: false, error: e.message });
  }
});

/* ============ Google Reviews (public, cache 6h) ============ */
const gReviewsCache = {}; // per limbă: { at, data }
app.get('/api/v1/google-reviews', async (req, res) => {
  const key = (process.env.GOOGLE_PLACES_API_KEY || '').trim();
  const placeId = (process.env.GOOGLE_PLACE_ID || '').trim();
  if (!key || !placeId) return res.json({ configured: false, rating: null, reviews: [] });
  const lang = ['ro', 'en', 'he', 'fr', 'es', 'it', 'de'].includes(req.query.lang) ? req.query.lang : 'ro';
  const cached = gReviewsCache[lang];
  if (cached && Date.now() - cached.at < 6 * 3600e3) return res.json(cached.data);
  try {
    const r = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}` +
        `&fields=rating,user_ratings_total,reviews,url&language=${lang === 'he' ? 'iw' : lang}&key=${key}`
    );
    const j = await r.json();
    const out = {
      configured: true,
      rating: (j.result && j.result.rating) || null,
      total: (j.result && j.result.user_ratings_total) || 0,
      url: (j.result && j.result.url) || null,
      reviews: ((j.result && j.result.reviews) || []).map((rv) => ({
        name: rv.author_name,
        rating: rv.rating,
        text: rv.text,
        time: rv.relative_time_description,
        photo: rv.profile_photo_url,
        // limba ORIGINALĂ a recenziei (nu a traducerii Google) — pentru filtrul de naționalitate
        lang: rv.original_language || rv.language || null,
        translated: Boolean(rv.translated),
      })),
    };
    gReviewsCache[lang] = { at: Date.now(), data: out };
    res.json(out);
  } catch (e) {
    res.json({ configured: true, rating: null, reviews: [], error: e.message });
  }
});

/* ============ AUTH ============ */
app.post('/api/v1/auth/login', async (req, res) => {
  const { email, password, remember } = req.body || {};
  const r = await pool.query('SELECT * FROM users WHERE lower(email) = lower($1)', [String(email || '')]);
  const user = r.rows[0];
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return res.status(401).json({ error: 'Email sau parolă greșite' });
  }
  setAuthCookie(req, res, user, Boolean(remember));
  emit('UserLoggedIn', { email: user.email });
  res.json({ ok: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

app.post('/api/v1/auth/logout', (req, res) => {
  clearAuthCookie(req, res);
  res.json({ ok: true });
});

/* token temporar (2h) pentru editorul vizual de pe site */
app.get('/api/v1/editor-token', requirePerm('continut'), (req, res) => {
  const { signToken } = require('./auth');
  res.json({
    token: signToken({ id: req.user.id, role: req.user.role, email: req.user.email }, 2 * 60 * 60),
    siteUrl: process.env.SITE_URL || 'https://roots-opal.vercel.app',
  });
});

/* ============ ROLURI & PERMISIUNI (configurabile de owner) ============
   Fiecare rol vede doar zonele bifate în admin → Sistem → Roluri & acces.
   Owner are mereu tot; adminul pornește cu tot dar POATE fi restrâns. */
const PERM_AREAS = [
  ['panou', 'Panou (statistici)'],
  ['continut', 'Conținut site + editor'],
  ['rezervari', 'Rezervări + sync Smoobu'],
  ['clienti', 'Clienți (CRM)'],
  ['recenzii', 'Recenzii'],
  ['seo', 'Audit SEO'],
  ['heatmap', 'Heatmap'],
  ['blog', 'Articole blog'],
  ['media', 'Galerie media'],
  ['oferte', 'Oferte & Reduceri'],
  ['membership', 'Membership & Puncte'],
];
const AREA_KEYS = PERM_AREAS.map(([k]) => k);
const DEFAULT_PERMS = {
  admin: [...AREA_KEYS],
  curatenie: ['panou', 'rezervari'],
  turist: [],
};
let permsCache = null; // { at, value }
async function getRolePerms() {
  if (permsCache && Date.now() - permsCache.at < 60e3) return permsCache.value;
  let stored = {};
  try {
    const r = await pool.query("SELECT value FROM settings WHERE key = 'role_permissions'");
    if (r.rows[0]) stored = r.rows[0].value || {};
  } catch (e) { /* tabela poate lipsi la primul boot */ }
  const value = { ...DEFAULT_PERMS, ...stored };
  permsCache = { at: Date.now(), value };
  return value;
}
function requirePerm(area) {
  return async (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Autentificare necesară' });
    if (req.user.role === 'owner') return next();
    const perms = await getRolePerms();
    if ((perms[req.user.role] || []).includes(area)) return next();
    return res.status(403).json({ error: 'Rolul tău nu are acces la această zonă.' });
  };
}
const requireOwnerStrict = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'Autentificare necesară' });
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Doar owner-ul poate administra rolurile.' });
  next();
};
app.get('/api/v1/admin/permissions', requireOwnerStrict, async (_req, res) => {
  res.json({ areas: PERM_AREAS, perms: await getRolePerms() });
});
app.put('/api/v1/admin/permissions', requireOwnerStrict, async (req, res) => {
  const input = (req.body && req.body.perms) || {};
  const clean = {};
  for (const [role, list] of Object.entries(input)) {
    const name = String(role).trim().toLowerCase().slice(0, 40);
    if (!name || name === 'owner') continue; // owner nu e configurabil
    if (!Array.isArray(list)) continue;
    clean[name] = list.filter((a) => AREA_KEYS.includes(a));
  }
  await pool.query(
    `INSERT INTO settings (key, value, updated_at) VALUES ('role_permissions', $1, now())
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = now()`,
    [JSON.stringify(clean)]
  );
  permsCache = null;
  emit('PermissionsUpdated', { by: req.user.email, roles: Object.keys(clean) });
  res.json({ ok: true, perms: await getRolePerms() });
});

/* ============ LOGIN DE PE SITE (Bearer, cross-origin) ============ */
app.post('/api/v1/site-login', async (req, res) => {
  const { email, password } = req.body || {};
  const r = await pool.query('SELECT * FROM users WHERE lower(email) = lower($1)', [String(email || '')]);
  const user = r.rows[0];
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return res.status(401).json({ error: 'Email sau parolă greșite' });
  }
  const { signToken } = require('./auth');
  emit('SiteLogin', { email: user.email });
  res.json({
    ok: true,
    token: signToken({ id: user.id, role: user.role, email: user.email }, 30 * 24 * 60 * 60),
    user: { name: user.name, email: user.email, role: user.role },
  });
});

/* ============ ÎNREGISTRARE DE PE SITE (cont client) ============ */
const regHits = new Map(); // anti-abuz simplu per instanță: max 5 înregistrări/oră/IP
app.post('/api/v1/site-register', async (req, res) => {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const now = Date.now();
  const hits = (regHits.get(ip) || []).filter((t) => now - t < 3600e3);
  if (hits.length >= 5) return res.status(429).json({ error: 'Prea multe încercări — reîncearcă mai târziu.' });
  hits.push(now);
  regHits.set(ip, hits);

  const { name, email, password, phone, source, website } = req.body || {};
  if (website) return res.status(400).json({ error: 'Cerere invalidă.' }); // honeypot pentru boți
  const mail = String(email || '').trim().toLowerCase();
  if (!String(name || '').trim() || !/.+@.+\..+/.test(mail)) return res.status(400).json({ error: 'Nume și email valid, te rugăm.' });
  if (String(password || '').length < 6) return res.status(400).json({ error: 'Parola trebuie să aibă minim 6 caractere.' });

  const dup = await pool.query('SELECT 1 FROM users WHERE lower(email) = $1', [mail]);
  if (dup.rows.length) return res.status(409).json({ error: 'Există deja un cont cu acest email — autentifică-te.' });

  const r = await pool.query(
    `INSERT INTO users (email, password_hash, name, role, phone, source)
     VALUES ($1, $2, $3, 'turist', $4, $5) RETURNING id, email, name, role`,
    [mail, await hashPassword(password), String(name).trim().slice(0, 120), String(phone || '').trim().slice(0, 40) || null, String(source || '').trim().slice(0, 120) || null]
  );
  const user = r.rows[0];

  // membership: cont de puncte + bonusuri de referral (o singură dată per cont nou)
  try {
    const refCode = String((req.body || {}).referralCode || '').trim().toUpperCase() || null;
    let inviter = null;
    if (refCode) {
      const inv = await pool.query('SELECT * FROM membership_accounts WHERE upper(referral_code) = $1', [refCode]);
      inviter = inv.rows[0] || null;
    }
    const acc = await membership.ensureAccount(pool, user.id, inviter ? inviter.referral_code : null);
    if (inviter && inviter.user_id !== user.id) {
      const ms = await membership.getMembershipSettings(pool);
      await membership.addPoints(pool, acc.id, ms.referral_points_new, 'referral_bonus_new', {
        sourceRef: String(user.id), description: `Bun venit — cod ${inviter.referral_code}`,
      });
      if (!ms.referral_requires_booking) {
        await membership.addPoints(pool, inviter.id, ms.referral_points_inviter, 'referral_bonus_inviter', {
          sourceRef: String(user.id), description: `Prieten invitat: ${user.email}`,
        });
      }
      emit('ReferralUsed', { code: inviter.referral_code, newUser: user.email });
    }
  } catch (e) { /* membership nu blochează înregistrarea */ }

  const { signToken } = require('./auth');
  emit('SiteRegister', { email: user.email, source: source || null });
  res.json({
    ok: true,
    token: signToken({ id: user.id, role: user.role, email: user.email }, 30 * 24 * 60 * 60),
    user: { name: user.name, email: user.email, role: user.role },
  });
});

/* ============ OFERTE & CODURI DE REDUCERE ============ */
// public: ofertele active — site-ul le aplică la calculul prețului
app.get('/api/v1/offers', async (_req, res) => {
  const r = await pool.query(
    'SELECT id, type, title, pct, amount_lei, min_nights, days_before, date_from, date_to FROM offers WHERE active ORDER BY created_at DESC'
  );
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.json({ offers: r.rows });
});
// public: validare cod (nu expune lista de coduri)
// - rate-limit per IP contra enumerării prin brute-force
// - cu &email= cere ca acel cod să fie ATAȘAT contului cu emailul respectiv
//   (așa îl folosește api/book — codul e legat de cont, nu circulă liber)
const discHits = new Map();
app.get('/api/v1/discount', async (req, res) => {
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const now = Date.now();
  const hits = (discHits.get(ip) || []).filter((t) => now - t < 60e3);
  if (hits.length >= 20) return res.status(429).json({ ok: false, error: 'Prea multe încercări.' });
  hits.push(now);
  discHits.set(ip, hits);

  const code = String(req.query.code || '').trim().toUpperCase();
  if (!code) return res.json({ ok: false });
  const r = await pool.query(
    'SELECT pct FROM discount_codes WHERE upper(code) = $1 AND active AND (expires IS NULL OR expires >= CURRENT_DATE)',
    [code]
  );
  if (!r.rows.length) return res.json({ ok: false });
  const email = String(req.query.email || '').trim().toLowerCase();
  if (email) {
    const u = await pool.query('SELECT 1 FROM users WHERE lower(email) = $1 AND upper(discount_code) = $2', [email, code]);
    if (!u.rows.length) return res.json({ ok: false, reason: 'necuplat' });
  }
  res.json({ ok: true, pct: Number(r.rows[0].pct) });
});
// admin CRUD oferte
const OFFER_TYPES = ['interval', 'lastminute', 'earlybird', 'longstay', 'combo', 'perk'];
app.get('/api/v1/admin/offers', requirePerm('oferte'), async (_req, res) => {
  const r = await pool.query('SELECT * FROM offers ORDER BY created_at DESC');
  res.json({ offers: r.rows });
});
/* normalizare + validare câmpuri ofertă: pct 1–90, sume pozitive, date YYYY-MM-DD */
function offerFields(b) {
  const num = (v) => { const n = Number(v); return Number.isFinite(n) ? n : null; };
  const day = (v) => { const s = String(v || '').slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null; };
  const pct = num(b.pct);
  const amount = num(b.amount_lei);
  const f = {
    pct: pct != null ? pct : null,
    amount_lei: amount != null ? amount : null,
    min_nights: Math.max(0, Math.round(num(b.min_nights) || 0)) || null,
    days_before: Math.max(0, Math.round(num(b.days_before) || 0)) || null,
    date_from: day(b.date_from),
    date_to: day(b.date_to),
  };
  if (['interval', 'lastminute', 'earlybird', 'longstay'].includes(b.type)) {
    if (!f.pct || f.pct < 1 || f.pct > 90) return { error: 'Procentul trebuie să fie între 1 și 90.' };
  }
  if (b.type === 'combo' && (!f.amount_lei || f.amount_lei <= 0)) return { error: 'Suma (lei/noapte) trebuie să fie pozitivă.' };
  return { f };
}
app.post('/api/v1/admin/offers', requirePerm('oferte'), async (req, res) => {
  const b = req.body || {};
  if (!OFFER_TYPES.includes(b.type)) return res.status(400).json({ error: 'Tip de ofertă invalid' });
  if (!String(b.title || '').trim()) return res.status(400).json({ error: 'Titlul e obligatoriu' });
  const { f, error } = offerFields(b);
  if (error) return res.status(400).json({ error });
  const r = await pool.query(
    `INSERT INTO offers (type, title, pct, amount_lei, min_nights, days_before, date_from, date_to, active)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9,true)) RETURNING *`,
    [b.type, String(b.title).trim().slice(0, 120), f.pct, f.amount_lei, f.min_nights, f.days_before, f.date_from, f.date_to, b.active]
  );
  emit('OfferCreated', { title: r.rows[0].title, by: req.user.email });
  res.json({ ok: true, offer: r.rows[0] });
});
app.put('/api/v1/admin/offers/:id', requirePerm('oferte'), async (req, res) => {
  const b = req.body || {};
  if (b.type && !OFFER_TYPES.includes(b.type)) return res.status(400).json({ error: 'Tip de ofertă invalid' });
  const { f, error } = offerFields(b);
  if (error) return res.status(400).json({ error });
  const r = await pool.query(
    `UPDATE offers SET type=COALESCE($10,type), title=COALESCE($2,title), pct=$3, amount_lei=$4, min_nights=$5, days_before=$6,
       date_from=$7, date_to=$8, active=COALESCE($9,active) WHERE id=$1 RETURNING *`,
    [req.params.id, b.title, f.pct, f.amount_lei, f.min_nights, f.days_before, f.date_from, f.date_to, b.active, b.type || null]
  );
  if (!r.rows.length) return res.status(404).json({ error: 'Ofertă inexistentă' });
  res.json({ ok: true, offer: r.rows[0] });
});
app.delete('/api/v1/admin/offers/:id', requirePerm('oferte'), async (req, res) => {
  await pool.query('DELETE FROM offers WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});
// admin CRUD coduri de reducere
app.get('/api/v1/admin/discount-codes', requirePerm('oferte'), async (_req, res) => {
  const r = await pool.query('SELECT * FROM discount_codes ORDER BY created_at DESC');
  res.json({ codes: r.rows });
});
app.post('/api/v1/admin/discount-codes', requirePerm('oferte'), async (req, res) => {
  const code = String((req.body || {}).code || '').trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 30);
  const pct = Number((req.body || {}).pct);
  if (!code || !pct || pct <= 0 || pct > 90) return res.status(400).json({ error: 'Cod și procent (1–90) obligatorii' });
  try {
    const r = await pool.query(
      'INSERT INTO discount_codes (code, pct, expires) VALUES ($1,$2,$3) RETURNING *',
      [code, pct, (req.body || {}).expires || null]
    );
    emit('DiscountCodeCreated', { code, by: req.user.email });
    res.json({ ok: true, code: r.rows[0] });
  } catch (e) {
    res.status(400).json({ error: e.message.includes('duplicate') ? 'Codul există deja' : e.message });
  }
});
app.put('/api/v1/admin/discount-codes/:id', requirePerm('oferte'), async (req, res) => {
  const b = req.body || {};
  // expirarea se modifică DOAR dacă e trimisă explicit (toggle-ul nu o atinge)
  const hasExp = Object.prototype.hasOwnProperty.call(b, 'expires');
  const r = await pool.query(
    `UPDATE discount_codes SET active=COALESCE($2,active), pct=COALESCE($3,pct),
       expires = CASE WHEN $5 THEN $4::date ELSE expires END
     WHERE id=$1 RETURNING *`,
    [req.params.id, b.active, b.pct || null, hasExp ? b.expires || null : null, hasExp]
  );
  if (!r.rows.length) return res.status(404).json({ error: 'Cod inexistent' });
  res.json({ ok: true, code: r.rows[0] });
});
app.delete('/api/v1/admin/discount-codes/:id', requirePerm('oferte'), async (req, res) => {
  await pool.query('DELETE FROM discount_codes WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});
// contul de pe site: atașează un cod de reducere
app.post('/api/v1/my-account/discount', requireAuth, async (req, res) => {
  const code = String((req.body || {}).code || '').trim().toUpperCase();
  if (!code) {
    await pool.query('UPDATE users SET discount_code = NULL WHERE id = $1', [req.user.id]);
    return res.json({ ok: true, discount: null });
  }
  const r = await pool.query(
    'SELECT pct FROM discount_codes WHERE upper(code) = $1 AND active AND (expires IS NULL OR expires >= CURRENT_DATE)',
    [code]
  );
  if (!r.rows.length) return res.status(400).json({ error: 'Cod invalid sau expirat' });
  await pool.query('UPDATE users SET discount_code = $2 WHERE id = $1', [req.user.id, code]);
  emit('DiscountCodeAttached', { code, email: req.user.email });
  res.json({ ok: true, discount: { code, pct: Number(r.rows[0].pct) } });
});

/* ============ MEMBERSHIP & PUNCTE (Task 3.1) ============ */
// dashboard-ul membrului: cont + tier + progres + referral + istoric + catalog
app.get('/api/v1/membership/me', requireAuth, async (req, res) => {
  const settings = await membership.getMembershipSettings(pool);
  const acc = await membership.ensureAccount(pool, req.user.id);
  const progress = membership.tierProgress(acc.lifetime_points, settings);
  const [tx, rewards, redemptions, referred] = await Promise.all([
    pool.query('SELECT amount, type, description, created_at FROM points_transactions WHERE account_id = $1 ORDER BY created_at DESC LIMIT 50', [acc.id]),
    pool.query('SELECT id, title, description, photo, category, points_cost, stock FROM rewards WHERE active ORDER BY category, points_cost'),
    pool.query('SELECT r.id, r.points_spent, r.status, r.code, r.created_at, w.title FROM redemptions r JOIN rewards w ON w.id = r.reward_id WHERE r.account_id = $1 ORDER BY r.created_at DESC LIMIT 30', [acc.id]),
    pool.query("SELECT count(*)::int AS n FROM membership_accounts WHERE referred_by = $1", [acc.referral_code]),
  ]);
  const inviterPoints = await pool.query(
    "SELECT COALESCE(sum(amount),0)::int AS p FROM points_transactions WHERE account_id = $1 AND type = 'referral_bonus_inviter'", [acc.id]
  );
  res.json({
    account: {
      points_balance: acc.points_balance,
      lifetime_points: acc.lifetime_points,
      referral_code: acc.referral_code,
      tier: progress.tier,
      progress,
    },
    thresholds: { gold: settings.tier_gold, platinum: settings.tier_platinum },
    referral: { invited: referred.rows[0].n, earned: inviterPoints.rows[0].p, points_new: settings.referral_points_new, points_inviter: settings.referral_points_inviter },
    transactions: tx.rows,
    rewards: rewards.rows,
    redemptions: redemptions.rows,
  });
});
// revendicare recompensă: scade punctele imediat, voucher pending
app.post('/api/v1/membership/redeem', requireAuth, async (req, res) => {
  const rewardId = String((req.body || {}).reward_id || '');
  const acc = await membership.ensureAccount(pool, req.user.id);
  const rw = await pool.query('SELECT * FROM rewards WHERE id = $1 AND active', [rewardId]);
  if (!rw.rows.length) return res.status(404).json({ error: 'Recompensă inexistentă sau inactivă' });
  const reward = rw.rows[0];
  if (reward.stock != null && reward.stock <= 0) return res.status(409).json({ error: 'Stoc epuizat' });
  if (acc.points_balance < reward.points_cost) return res.status(400).json({ error: 'Puncte insuficiente' });
  const code = 'RW-' + membership.genReferralCode().slice(3);
  await membership.addPoints(pool, acc.id, -reward.points_cost, 'redeem', {
    sourceRef: reward.id, description: `Revendicare: ${reward.title}`, createdBy: req.user.email,
  });
  if (reward.stock != null) await pool.query('UPDATE rewards SET stock = stock - 1 WHERE id = $1', [reward.id]);
  const rd = await pool.query(
    'INSERT INTO redemptions (account_id, reward_id, points_spent, code) VALUES ($1,$2,$3,$4) RETURNING *',
    [acc.id, reward.id, reward.points_cost, code]
  );
  emit('RewardRedeemed', { reward: reward.title, by: req.user.email });
  res.json({ ok: true, redemption: rd.rows[0] });
});
// cerere de puncte (poză #rootsvillas / review) — validată manual de admin
app.post('/api/v1/membership/request', requireAuth, async (req, res) => {
  const type = (req.body || {}).type;
  if (!['photo_tag', 'review'].includes(type)) return res.status(400).json({ error: 'Tip invalid' });
  const acc = await membership.ensureAccount(pool, req.user.id);
  const pending = await pool.query("SELECT count(*)::int AS n FROM points_requests WHERE account_id = $1 AND status = 'pending'", [acc.id]);
  if (pending.rows[0].n >= 5) return res.status(429).json({ error: 'Ai deja 5 cereri în așteptare.' });
  const r = await pool.query(
    'INSERT INTO points_requests (account_id, type, url, note) VALUES ($1,$2,$3,$4) RETURNING *',
    [acc.id, type, String((req.body || {}).url || '').slice(0, 300) || null, String((req.body || {}).note || '').slice(0, 300) || null]
  );
  emit('PointsRequested', { type, by: req.user.email });
  res.json({ ok: true, request: r.rows[0] });
});
// admin: setări
app.get('/api/v1/admin/membership/settings', requirePerm('membership'), async (_req, res) => {
  res.json({ settings: await membership.getMembershipSettings(pool) });
});
app.put('/api/v1/admin/membership/settings', requirePerm('membership'), async (req, res) => {
  const settings = await membership.saveMembershipSettings(pool, req.body || {});
  emit('MembershipSettingsUpdated', { by: req.user.email });
  res.json({ ok: true, settings });
});
// admin: catalog recompense
app.get('/api/v1/admin/rewards', requirePerm('membership'), async (_req, res) => {
  const r = await pool.query('SELECT * FROM rewards ORDER BY created_at DESC');
  res.json({ rewards: r.rows });
});
app.post('/api/v1/admin/rewards', requirePerm('membership'), async (req, res) => {
  const b = req.body || {};
  if (!String(b.title || '').trim()) return res.status(400).json({ error: 'Titlul e obligatoriu' });
  if (!['accommodation', 'cellar'].includes(b.category)) return res.status(400).json({ error: 'Categorie invalidă' });
  const cost = Math.round(Number(b.points_cost));
  if (!Number.isFinite(cost) || cost < 1) return res.status(400).json({ error: 'Costul în puncte trebuie să fie pozitiv' });
  const r = await pool.query(
    `INSERT INTO rewards (title, description, photo, category, points_cost, active, stock)
     VALUES ($1,$2,$3,$4,$5,COALESCE($6,true),$7) RETURNING *`,
    [String(b.title).trim().slice(0, 120), b.description || null, b.photo || null, b.category, cost, b.active, b.stock != null && b.stock !== '' ? Math.max(0, Math.round(Number(b.stock))) : null]
  );
  res.json({ ok: true, reward: r.rows[0] });
});
app.put('/api/v1/admin/rewards/:id', requirePerm('membership'), async (req, res) => {
  const b = req.body || {};
  const cost = b.points_cost != null ? Math.round(Number(b.points_cost)) : null;
  const r = await pool.query(
    `UPDATE rewards SET title=COALESCE($2,title), description=COALESCE($3,description), photo=COALESCE($4,photo),
       category=COALESCE($5,category), points_cost=COALESCE($6,points_cost), active=COALESCE($7,active),
       stock=CASE WHEN $9 THEN $8 ELSE stock END
     WHERE id=$1 RETURNING *`,
    [req.params.id, b.title, b.description, b.photo, b.category, Number.isFinite(cost) && cost > 0 ? cost : null, b.active,
     b.stock != null && b.stock !== '' ? Math.max(0, Math.round(Number(b.stock))) : null,
     Object.prototype.hasOwnProperty.call(b, 'stock')]
  );
  if (!r.rows.length) return res.status(404).json({ error: 'Recompensă inexistentă' });
  res.json({ ok: true, reward: r.rows[0] });
});
app.delete('/api/v1/admin/rewards/:id', requirePerm('membership'), async (req, res) => {
  await pool.query('DELETE FROM rewards WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});
// admin: cereri poză/review
app.get('/api/v1/admin/membership/requests', requirePerm('membership'), async (_req, res) => {
  const r = await pool.query(
    `SELECT pr.*, u.email, u.name FROM points_requests pr
     JOIN membership_accounts ma ON ma.id = pr.account_id
     JOIN users u ON u.id = ma.user_id
     ORDER BY (pr.status = 'pending') DESC, pr.created_at DESC LIMIT 200`
  );
  res.json({ requests: r.rows });
});
app.post('/api/v1/admin/membership/requests/:id/decide', requirePerm('membership'), async (req, res) => {
  const approve = Boolean((req.body || {}).approve);
  const r = await pool.query("SELECT * FROM points_requests WHERE id = $1 AND status = 'pending'", [req.params.id]);
  if (!r.rows.length) return res.status(404).json({ error: 'Cerere inexistentă sau deja decisă' });
  const reqRow = r.rows[0];
  await pool.query('UPDATE points_requests SET status = $2 WHERE id = $1', [reqRow.id, approve ? 'approved' : 'rejected']);
  if (approve) {
    const settings = await membership.getMembershipSettings(pool);
    const pts = reqRow.type === 'photo_tag' ? settings.photo_tag_points : settings.review_points;
    await membership.addPoints(pool, reqRow.account_id, pts, reqRow.type, {
      sourceRef: reqRow.id, description: reqRow.type === 'photo_tag' ? 'Poză cu #rootsvillas' : 'Review', createdBy: req.user.email,
    });
  }
  emit('PointsRequestDecided', { approve, by: req.user.email });
  res.json({ ok: true });
});
// admin: revendicări (onorare / anulare cu retur de puncte)
app.get('/api/v1/admin/redemptions', requirePerm('membership'), async (_req, res) => {
  const r = await pool.query(
    `SELECT rd.*, w.title, u.email FROM redemptions rd
     JOIN rewards w ON w.id = rd.reward_id
     JOIN membership_accounts ma ON ma.id = rd.account_id
     JOIN users u ON u.id = ma.user_id
     ORDER BY (rd.status = 'pending') DESC, rd.created_at DESC LIMIT 200`
  );
  res.json({ redemptions: r.rows });
});
app.post('/api/v1/admin/redemptions/:id/status', requirePerm('membership'), async (req, res) => {
  const status = (req.body || {}).status;
  if (!['fulfilled', 'cancelled'].includes(status)) return res.status(400).json({ error: 'Status invalid' });
  const r = await pool.query("SELECT * FROM redemptions WHERE id = $1 AND status = 'pending'", [req.params.id]);
  if (!r.rows.length) return res.status(404).json({ error: 'Revendicare inexistentă sau deja procesată' });
  const rd = r.rows[0];
  await pool.query('UPDATE redemptions SET status = $2 WHERE id = $1', [rd.id, status]);
  if (status === 'cancelled') {
    await membership.addPoints(pool, rd.account_id, rd.points_spent, 'admin_adjust', {
      description: 'Retur puncte — revendicare anulată', createdBy: req.user.email,
    });
    await pool.query('UPDATE rewards SET stock = stock + 1 WHERE id = $1 AND stock IS NOT NULL', [rd.reward_id]);
  }
  res.json({ ok: true });
});
// admin: conturi + ajustare manuală
app.get('/api/v1/admin/membership/accounts', requirePerm('membership'), async (_req, res) => {
  const settings = await membership.getMembershipSettings(pool);
  const r = await pool.query(
    `SELECT ma.*, u.email, u.name FROM membership_accounts ma JOIN users u ON u.id = ma.user_id
     ORDER BY ma.lifetime_points DESC LIMIT 500`
  );
  res.json({ accounts: r.rows.map((a) => ({ ...a, tier: membership.tierFor(a.lifetime_points, settings) })) });
});
app.get('/api/v1/admin/membership/accounts/:id/transactions', requirePerm('membership'), async (req, res) => {
  const r = await pool.query('SELECT amount, type, description, created_by, created_at FROM points_transactions WHERE account_id = $1 ORDER BY created_at DESC LIMIT 100', [req.params.id]);
  res.json({ transactions: r.rows });
});
app.post('/api/v1/admin/membership/adjust', requirePerm('membership'), async (req, res) => {
  const b = req.body || {};
  const amount = Math.round(Number(b.amount));
  if (!Number.isFinite(amount) || !amount) return res.status(400).json({ error: 'Sumă invalidă' });
  if (!String(b.reason || '').trim()) return res.status(400).json({ error: 'Motivul e obligatoriu' });
  const u = await pool.query('SELECT id FROM users WHERE lower(email) = lower($1)', [String(b.email || '')]);
  if (!u.rows.length) return res.status(404).json({ error: 'Utilizator inexistent' });
  const acc = await membership.ensureAccount(pool, u.rows[0].id);
  if (amount < 0 && acc.points_balance + amount < 0) return res.status(400).json({ error: 'Balanța nu poate deveni negativă' });
  await membership.addPoints(pool, acc.id, amount, 'admin_adjust', { description: String(b.reason).slice(0, 200), createdBy: req.user.email });
  emit('PointsAdjusted', { email: b.email, amount, by: req.user.email });
  res.json({ ok: true });
});
// admin/cron: acordă punctele din sejururile încheiate (idempotent)
app.post('/api/v1/admin/membership/award-stays', requirePerm('membership'), async (req, res) => {
  res.json({ ok: true, ...(await membership.awardStayPoints(pool)) });
});

/* contul clientului: datele lui + rezervările legate de emailul lui */
app.get('/api/v1/my-account', requireAuth, async (req, res) => {
  const u = await pool.query('SELECT name, email, role, discount_code FROM users WHERE id = $1', [req.user.id]);
  const b = await pool.query(
    `SELECT b.villa, b.arrival, b.departure, b.guests_count, b.status
     FROM bookings b JOIN guests g ON g.id = b.guest_id
     WHERE lower(g.email) = lower($1) AND b.status <> 'blocked'
     ORDER BY b.arrival DESC LIMIT 50`,
    [req.user.email]
  );
  const user = u.rows[0] || null;
  // codul salvat, revalidat (poate a expirat între timp)
  let discount = null;
  if (user && user.discount_code) {
    const d = await pool.query(
      'SELECT pct FROM discount_codes WHERE upper(code) = upper($1) AND active AND (expires IS NULL OR expires >= CURRENT_DATE)',
      [user.discount_code]
    );
    if (d.rows.length) discount = { code: user.discount_code, pct: Number(d.rows[0].pct) };
  }
  res.json({ user, bookings: b.rows, discount });
});

app.get('/api/v1/auth/me', requireAuth, async (req, res) => {
  const r = await pool.query('SELECT id, email, name, role FROM users WHERE id = $1', [req.user.id]);
  const user = r.rows[0] || null;
  // zonele vizibile pentru rolul curent (owner = tot + sistem; admin primește sistem)
  let perms = [];
  if (user) {
    if (user.role === 'owner') perms = [...AREA_KEYS, 'sistem'];
    else {
      perms = [...((await getRolePerms())[user.role] || [])];
      if (user.role === 'admin') perms.push('sistem');
    }
  }
  res.json({ user, perms });
});

app.post('/api/v1/auth/change-credentials', requireAuth, async (req, res) => {
  const { currentPassword, newEmail, newPassword, name } = req.body || {};
  const r = await pool.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
  const user = r.rows[0];
  if (!user || !(await verifyPassword(currentPassword, user.password_hash))) {
    return res.status(403).json({ error: 'Parola curentă este greșită' });
  }
  const email = (newEmail || user.email).trim().toLowerCase();
  const hash = newPassword ? await hashPassword(newPassword) : user.password_hash;
  await pool.query('UPDATE users SET email = $1, password_hash = $2, name = COALESCE($3, name) WHERE id = $4', [
    email,
    hash,
    name || null,
    user.id,
  ]);
  res.json({ ok: true });
});

/* ============ CMS: secțiuni (draft / publicare / versiuni) ============ */
app.get('/api/v1/sections', requirePerm('continut'), async (_req, res) => {
  const r = await pool.query(
    'SELECT section_key, draft, published, published_at, updated_at FROM site_content ORDER BY section_key'
  );
  res.json({ sections: r.rows });
});

app.put('/api/v1/sections/:key', requirePerm('continut'), async (req, res) => {
  const { key } = req.params;
  const draft = req.body && req.body.draft;
  if (!draft || typeof draft !== 'object') return res.status(400).json({ error: 'draft (obiect) obligatoriu' });
  const r = await pool.query(
    `UPDATE site_content SET draft = $2, updated_at = now(), updated_by = $3 WHERE section_key = $1
     RETURNING section_key, updated_at`,
    [key, JSON.stringify(draft), req.user.id]
  );
  if (!r.rows.length) return res.status(404).json({ error: 'Secțiune inexistentă' });
  emit('DraftSaved', { section: key, by: req.user.email });
  res.json({ ok: true, updated_at: r.rows[0].updated_at });
});

app.post('/api/v1/sections/:key/publish', requirePerm('continut'), async (req, res) => {
  const { key } = req.params;
  const cur = await pool.query('SELECT draft FROM site_content WHERE section_key = $1', [key]);
  if (!cur.rows.length) return res.status(404).json({ error: 'Secțiune inexistentă' });
  const draft = cur.rows[0].draft;
  await pool.query(
    'UPDATE site_content SET published = $2, published_at = now(), updated_by = $3 WHERE section_key = $1',
    [key, JSON.stringify(draft), req.user.id]
  );
  await pool.query(
    'INSERT INTO site_content_versions (section_key, content, published_by) VALUES ($1, $2, $3)',
    [key, JSON.stringify(draft), req.user.id]
  );
  // păstrăm doar ultimele 10 versiuni per secțiune
  await pool.query(
    `DELETE FROM site_content_versions WHERE section_key = $1 AND id NOT IN (
       SELECT id FROM site_content_versions WHERE section_key = $1 ORDER BY published_at DESC LIMIT 10)`,
    [key]
  );
  siteCache = null; // invalidare cache public
  await emit('ContentPublished', { section: key, by: req.user.email });
  res.json({ ok: true });
});

app.get('/api/v1/sections/:key/versions', requirePerm('continut'), async (req, res) => {
  const r = await pool.query(
    'SELECT id, content, published_at FROM site_content_versions WHERE section_key = $1 ORDER BY published_at DESC LIMIT 10',
    [req.params.key]
  );
  res.json({ versions: r.rows });
});

app.post('/api/v1/sections/:key/restore/:versionId', requirePerm('continut'), async (req, res) => {
  const { key, versionId } = req.params;
  const v = await pool.query(
    'SELECT content FROM site_content_versions WHERE id = $1 AND section_key = $2',
    [versionId, key]
  );
  if (!v.rows.length) return res.status(404).json({ error: 'Versiune inexistentă' });
  await pool.query('UPDATE site_content SET draft = $2, updated_at = now(), updated_by = $3 WHERE section_key = $1', [
    key,
    JSON.stringify(v.rows[0].content),
    req.user.id,
  ]);
  res.json({ ok: true, note: 'Versiunea a fost adusă în draft. Publică pentru a o face live.' });
});

/* ============ MEDIA (bibliotecă centrală, Supabase Storage) ============ */
app.get('/api/v1/media', requirePerm('media'), async (_req, res) => {
  const r = await pool.query('SELECT * FROM media ORDER BY created_at DESC LIMIT 500');
  res.json({ media: r.rows });
});

/* Optimizarea imaginii se face în BROWSER (canvas → WebP/JPEG 1920px + thumb 480px),
   ca payload-ul să încapă în limita serverless Vercel (4,5MB/request). */
app.post('/api/v1/media', requirePerm('media'), async (req, res) => {
  try {
    const { filename, mainBase64, thumbBase64, width, height, alt, mime } = req.body || {};
    if (!mainBase64) return res.status(400).json({ error: 'mainBase64 obligatoriu' });
    const contentType = mime === 'image/webp' ? 'image/webp' : 'image/jpeg';
    const ext = contentType === 'image/webp' ? 'webp' : 'jpg';
    const main = Buffer.from(mainBase64, 'base64');
    const thumb = thumbBase64 ? Buffer.from(thumbBase64, 'base64') : null;

    const id = crypto.randomUUID();
    const safe = String(filename || 'imagine').toLowerCase().replace(/[^a-z0-9.]+/g, '-').slice(0, 60);
    const key = `hub/${id}-${safe.replace(/\.[a-z0-9]+$/, '')}.${ext}`;
    const thumbKey = `hub/${id}-thumb.${ext}`;

    const url = await storage.putObject(key, main, contentType);
    const thumbUrl = thumb ? await storage.putObject(thumbKey, thumb, contentType) : null;

    const r = await pool.query(
      `INSERT INTO media (id, storage_key, url, thumb_url, alt, width, height, bytes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [id, key, url, thumbUrl, alt || null, width || null, height || null, main.length, req.user.id]
    );
    emit('MediaUploaded', { key, by: req.user.email });
    res.json({ ok: true, media: r.rows[0] });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.patch('/api/v1/media/:id', requirePerm('media'), async (req, res) => {
  const r = await pool.query('UPDATE media SET alt = $2 WHERE id = $1 RETURNING *', [
    req.params.id,
    (req.body && req.body.alt) || null,
  ]);
  if (!r.rows.length) return res.status(404).json({ error: 'Imagine inexistentă' });
  res.json({ ok: true, media: r.rows[0] });
});

app.delete('/api/v1/media/:id', requireOwner, async (req, res) => {
  await pool.query('DELETE FROM media WHERE id = $1', [req.params.id]);
  res.json({ ok: true });
});

/* ============ UTILIZATORI (owner/admin) ============ */
app.get('/api/v1/admin/users', requireOwner, async (_req, res) => {
  const r = await pool.query('SELECT id, email, name, role, phone, source, created_at FROM users ORDER BY created_at');
  res.json({ users: r.rows });
});
app.post('/api/v1/admin/users', requireOwner, async (req, res) => {
  const { email, name, password, role } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email și parolă obligatorii' });
  const cleanRole = String(role || 'client').toLowerCase().trim().replace(/[^a-z0-9_-]/g, '') || 'client';
  try {
    const r = await pool.query(
      'INSERT INTO users (email, name, password_hash, role) VALUES (lower($1), $2, $3, $4) RETURNING id, email, name, role',
      [email.trim(), name || '', await hashPassword(password), cleanRole]
    );
    emit('UserCreated', { email: r.rows[0].email, role: cleanRole, by: req.user.email });
    res.json({ ok: true, user: r.rows[0] });
  } catch (e) {
    res.status(400).json({ error: e.message.includes('duplicate') ? 'Email deja folosit' : e.message });
  }
});
app.patch('/api/v1/admin/users/:id', requireOwner, async (req, res) => {
  const { name, role, password } = req.body || {};
  const cleanRole = role ? String(role).toLowerCase().trim().replace(/[^a-z0-9_-]/g, '') : null;
  const hash = password ? await hashPassword(password) : null;
  const r = await pool.query(
    'UPDATE users SET name = COALESCE($2, name), role = COALESCE($3, role), password_hash = COALESCE($4, password_hash) WHERE id = $1 RETURNING id, email, name, role',
    [req.params.id, name || null, cleanRole, hash]
  );
  if (!r.rows.length) return res.status(404).json({ error: 'Utilizator inexistent' });
  emit('UserUpdated', { email: r.rows[0].email, by: req.user.email });
  res.json({ ok: true, user: r.rows[0] });
});
app.delete('/api/v1/admin/users/:id', requireOwner, async (req, res) => {
  if (String(req.params.id) === String(req.user.id)) return res.status(400).json({ error: 'Nu îți poți șterge propriul cont' });
  const r = await pool.query('DELETE FROM users WHERE id = $1 RETURNING email', [req.params.id]);
  if (r.rows.length) emit('UserDeleted', { email: r.rows[0].email, by: req.user.email });
  res.json({ ok: true });
});

/* ============ ACTIVITATE (jurnal) ============ */
app.get('/api/v1/admin/activity', requireOwner, async (_req, res) => {
  const r = await pool.query('SELECT event, payload, created_at FROM events_log ORDER BY created_at DESC LIMIT 150');
  res.json({ activity: r.rows });
});

/* ============ BLOG ============ */
// public: doar articole publicate
app.get('/api/v1/posts', async (_req, res) => {
  const r = await pool.query(
    'SELECT slug, title, excerpt, cover, published_at FROM posts WHERE published_at IS NOT NULL ORDER BY published_at DESC LIMIT 100'
  );
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.json({ posts: r.rows });
});
app.get('/api/v1/posts/:slug', async (req, res) => {
  const r = await pool.query('SELECT slug, title, excerpt, cover, body, blocks, seo_title, seo_description, published_at FROM posts WHERE slug = $1 AND published_at IS NOT NULL', [req.params.slug]);
  if (!r.rows.length) return res.status(404).json({ error: 'Articol inexistent' });
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.json({ post: r.rows[0] });
});
// admin
app.get('/api/v1/admin/posts', requirePerm('blog'), async (_req, res) => {
  const r = await pool.query('SELECT * FROM posts ORDER BY created_at DESC');
  res.json({ posts: r.rows });
});
app.post('/api/v1/admin/posts', requirePerm('blog'), async (req, res) => {
  const { title, slug, excerpt, cover, body, blocks, seo_title, seo_description } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Titlul e obligatoriu' });
  const finalSlug = (slug || title).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  try {
    const r = await pool.query(
      `INSERT INTO posts (title, slug, excerpt, cover, body, blocks, seo_title, seo_description) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [title, finalSlug, excerpt || '', cover || '', body || '', Array.isArray(blocks) && blocks.length ? JSON.stringify(blocks) : null, seo_title || '', seo_description || '']
    );
    await emit('PostCreated', { slug: finalSlug, by: req.user.email });
    res.json({ ok: true, post: r.rows[0] });
  } catch (e) {
    res.status(400).json({ error: e.message.includes('duplicate') ? 'Slug deja folosit' : e.message });
  }
});
app.put('/api/v1/admin/posts/:id', requirePerm('blog'), async (req, res) => {
  const { title, slug, excerpt, cover, body, blocks, seo_title, seo_description } = req.body || {};
  // blocks se trimite mereu din admin: array gol = articolul revine pe body simplu
  const blocksVal = blocks === undefined ? undefined : (Array.isArray(blocks) && blocks.length ? JSON.stringify(blocks) : null);
  const r = await pool.query(
    `UPDATE posts SET title=COALESCE($2,title), slug=COALESCE($3,slug), excerpt=COALESCE($4,excerpt), cover=COALESCE($5,cover),
       body=COALESCE($6,body), blocks=CASE WHEN $9 THEN $10::jsonb ELSE blocks END,
       seo_title=COALESCE($7,seo_title), seo_description=COALESCE($8,seo_description), updated_at=now()
     WHERE id=$1 RETURNING *`,
    [req.params.id, title, slug, excerpt, cover, body, seo_title, seo_description, blocksVal !== undefined, blocksVal === undefined ? null : blocksVal]
  );
  if (!r.rows.length) return res.status(404).json({ error: 'Articol inexistent' });
  res.json({ ok: true, post: r.rows[0] });
});
app.post('/api/v1/admin/posts/:id/publish', requirePerm('blog'), async (req, res) => {
  const on = req.body && req.body.unpublish ? null : new Date();
  const r = await pool.query('UPDATE posts SET published_at=$2, updated_at=now() WHERE id=$1 RETURNING slug, published_at', [req.params.id, on]);
  if (!r.rows.length) return res.status(404).json({ error: 'Articol inexistent' });
  await emit(on ? 'PostPublished' : 'PostUnpublished', { slug: r.rows[0].slug, by: req.user.email });
  res.json({ ok: true, published_at: r.rows[0].published_at });
});
app.delete('/api/v1/admin/posts/:id', requireOwner, async (req, res) => {
  await pool.query('DELETE FROM posts WHERE id=$1', [req.params.id]);
  res.json({ ok: true });
});

/* ============ CRM: sync Smoobu + rezervări + clienți ============ */
async function upsertGuestAndBooking(b) {
  const name = b['guest-name'] || [b.firstname, b.lastname].filter(Boolean).join(' ') || null;
  const email = (b.email || '').trim().toLowerCase() || null;
  const phone = (b.phone || '').replace(/\s+/g, '') || null;
  let guestId = null;
  if (email || phone) {
    const g = await pool.query(
      'SELECT id FROM guests WHERE (lower(email) = $1 AND $1 IS NOT NULL) OR (phone = $2 AND $2 IS NOT NULL) LIMIT 1',
      [email, phone]
    );
    if (g.rows.length) {
      guestId = g.rows[0].id;
      await pool.query('UPDATE guests SET name = COALESCE($2, name), email = COALESCE($3, email), phone = COALESCE($4, phone), updated_at = now() WHERE id = $1', [guestId, name, email, phone]);
    } else {
      const ins = await pool.query('INSERT INTO guests (name, email, phone) VALUES ($1, $2, $3) RETURNING id', [name, email, phone]);
      guestId = ins.rows[0].id;
    }
  }
  const villa = (b.apartment && b.apartment.name) || String((b.apartment && b.apartment.id) || '');
  const channel = (b.channel && (b.channel.name || b.channel.id)) ? String(b.channel.name || b.channel.id) : null;
  const status = b['is-blocked-booking'] ? 'blocked' : (b.type === 'cancellation' ? 'cancelled' : 'confirmed');
  const r = await pool.query(
    `INSERT INTO bookings (smoobu_id, villa, arrival, departure, guests_count, value, status, guest_id, raw, channel)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     ON CONFLICT (smoobu_id) DO UPDATE SET villa=$2, arrival=$3, departure=$4, guests_count=$5, value=$6, status=$7, guest_id=COALESCE($8, bookings.guest_id), raw=$9, channel=$10, updated_at=now()
     RETURNING (xmax = 0) AS inserted`,
    [String(b.id), villa, b.arrival, b.departure, (Number(b.adults) || 0) + (Number(b.children) || 0) || null, b.price || null, status, guestId, JSON.stringify(b), channel]
  );
  return r.rows[0].inserted;
}

async function runSmoobuSync(startPage = 1, maxPagesPerCall = 5) {
  if (!smoobu.smoobuReady()) throw new Error('SMOOBU_API_KEY / SMOOBU_API_SECRET lipsesc din env.');
  let page = startPage, pages = startPage, created = 0, seen = 0, processed = 0;
  const to = new Date(Date.now() + 2 * 365 * 86400e3).toISOString().slice(0, 10);
  while (page <= pages && processed < maxPagesPerCall) {
    // query canonic: parametri sortați alfabetic (cerință semnătură HMAC)
    const q = ['from=2019-01-01', 'page=' + page, 'showCancellation=true', 'to=' + to].join('&');
    const j = await smoobu.signedGet('/api/reservations', q);
    pages = j.page_count || j.pageCount || 1;
    const list = j.bookings || [];
    for (const b of list) {
      seen++;
      const inserted = await upsertGuestAndBooking(b);
      if (inserted) { created++; await emit('BookingSynced', { smoobu_id: String(b.id), villa: (b.apartment && b.apartment.name) || '' }); }
    }
    page++; processed++;
  }
  return { seen, created, pages, nextPage: page <= pages ? page : null };
}

app.post('/api/v1/admin/sync-smoobu', requirePerm('rezervari'), async (req, res) => {
  try {
    const startPage = Math.max(1, parseInt(req.body && req.body.startPage, 10) || 1);
    const out = await runSmoobuSync(startPage);
    // punctele din sejururile încheiate se acordă după fiecare sync (idempotent)
    let stays = null;
    try { stays = await membership.awardStayPoints(pool); } catch (e) { /* nu blocăm sync-ul */ }
    res.json({ ok: true, ...out, membership: stays });
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message });
  }
});
// cron Vercel (GET, protejat de header-ul x-vercel-cron)
app.get('/api/v1/cron/sync-smoobu', async (req, res) => {
  if (!req.headers['x-vercel-cron'] && !req.user) return res.status(401).json({ error: 'Doar cron sau autentificat' });
  try {
    const out = await runSmoobuSync(1, 8);
    let stays = null;
    try { stays = await membership.awardStayPoints(pool); } catch (e) { /* nu blocăm cron-ul */ }
    res.json({ ok: true, ...out, membership: stays });
  } catch (e) { res.status(502).json({ ok: false, error: e.message }); }
});

app.get('/api/v1/admin/stats', requirePerm('panou'), async (req, res) => {
  const year = parseInt(req.query.year, 10) || null;
  const month = parseInt(req.query.month, 10) || null;
  const byChannel = await pool.query(
    `SELECT status, COALESCE(channel, 'Direct / Website') AS channel,
            count(*)::int AS n, COALESCE(sum(value),0)::float AS revenue,
            COALESCE(sum(departure - arrival),0)::int AS nights
     FROM bookings
     WHERE status <> 'blocked' AND ($1::int IS NULL OR extract(year from arrival) = $1)
       AND ($2::int IS NULL OR extract(month from arrival) = $2)
     GROUP BY status, channel`,
    [year, month]
  );
  const monthly = await pool.query(
    `SELECT extract(month from arrival)::int AS month,
            COALESCE(sum(value),0)::float AS revenue, count(*)::int AS n,
            COALESCE(sum(departure - arrival),0)::int AS nights
     FROM bookings
     WHERE status = 'confirmed' AND ($1::int IS NULL OR extract(year from arrival) = $1)
     GROUP BY 1 ORDER BY 1`,
    [year]
  );
  const years = await pool.query(
    `SELECT DISTINCT extract(year from arrival)::int AS y FROM bookings ORDER BY 1 DESC`
  );
  const timeline = await pool.query(
    `SELECT extract(year from arrival)::int AS y, extract(month from arrival)::int AS m,
            COALESCE(sum(value),0)::float AS revenue, count(*)::int AS n
     FROM bookings WHERE status = 'confirmed'
     GROUP BY 1, 2 ORDER BY 1, 2`
  );
  res.json({ byChannel: byChannel.rows, monthly: monthly.rows, years: years.rows.map((x) => x.y), timeline: timeline.rows });
});

app.get('/api/v1/admin/bookings', requirePerm('rezervari'), async (_req, res) => {
  const r = await pool.query(
    `SELECT b.*, g.name AS guest_name, g.email AS guest_email, g.phone AS guest_phone
     FROM bookings b LEFT JOIN guests g ON g.id = b.guest_id
     ORDER BY b.arrival DESC LIMIT 300`
  );
  res.json({ bookings: r.rows });
});
app.get('/api/v1/admin/guests', requirePerm('clienti'), async (_req, res) => {
  const r = await pool.query(
    `SELECT g.*, count(b.id)::int AS stays, COALESCE(sum(b.value),0)::numeric AS total_value,
            max(b.departure) AS last_departure,
            array_remove(array_agg(DISTINCT b.channel), NULL) AS channels,
            array_remove(array_agg(DISTINCT extract(year from b.arrival)::int), NULL) AS years
     FROM guests g LEFT JOIN bookings b ON b.guest_id = g.id AND b.status = 'confirmed'
     GROUP BY g.id ORDER BY max(b.arrival) DESC NULLS LAST LIMIT 500`
  );
  res.json({ guests: r.rows });
});
app.patch('/api/v1/admin/guests/:id', requirePerm('clienti'), async (req, res) => {
  const { notes, marketing_consent } = req.body || {};
  const r = await pool.query(
    `UPDATE guests SET notes = COALESCE($2, notes),
       marketing_consent = COALESCE($3, marketing_consent),
       consent_source = CASE WHEN $3 IS NOT NULL THEN 'admin' ELSE consent_source END,
       consent_at = CASE WHEN $3 IS NOT NULL THEN now() ELSE consent_at END,
       updated_at = now()
     WHERE id = $1 RETURNING *`,
    [req.params.id, notes ?? null, typeof marketing_consent === 'boolean' ? marketing_consent : null]
  );
  if (!r.rows.length) return res.status(404).json({ error: 'Client inexistent' });
  emit('GuestUpdated', { id: req.params.id, by: req.user.email });
  res.json({ ok: true, guest: r.rows[0] });
});

/* ============ HEATMAP: tracking public + agregare admin ============ */
app.post('/api/v1/track', async (req, res) => {
  try {
    const { path: p, device, x, y, dh } = req.body || {};
    const cleanPath = String(p || '').slice(0, 200);
    const fx = Number(x), fy = Math.round(Number(y));
    if (!cleanPath.startsWith('/') || !(fx >= 0 && fx <= 1) || !(fy >= 0 && fy < 200000)) {
      return res.status(400).json({ error: 'payload invalid' });
    }
    await pool.query(
      'INSERT INTO page_events (path, device, x, y, doc_h) VALUES ($1, $2, $3, $4, $5)',
      [cleanPath, device === 'mobile' ? 'mobile' : 'desktop', fx, fy, Math.round(Number(dh)) || null]
    );
    res.status(204).end();
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

app.get('/api/v1/admin/heatmap', requirePerm('heatmap'), async (req, res) => {
  const p = String(req.query.path || '/');
  const device = req.query.device === 'mobile' ? 'mobile' : 'desktop';
  const days = Math.min(365, parseInt(req.query.days, 10) || 90);
  const pts = await pool.query(
    `SELECT x, y FROM page_events
     WHERE path = $1 AND device = $2 AND created_at > now() - ($3 || ' days')::interval
     ORDER BY created_at DESC LIMIT 20000`,
    [p, device, days]
  );
  const meta = await pool.query(
    `SELECT count(*)::int AS total, COALESCE(percentile_cont(0.9) WITHIN GROUP (ORDER BY doc_h), 4000)::int AS doc_h
     FROM page_events
     WHERE path = $1 AND device = $2 AND created_at > now() - ($3 || ' days')::interval AND doc_h IS NOT NULL`,
    [p, device, days]
  );
  res.json({ points: pts.rows, total: meta.rows[0].total, docH: meta.rows[0].doc_h });
});

/* ============ AUDIT SEO (Google + LLM) ============ */
const SITE_URL = (process.env.SITE_URL || 'https://roots-opal.vercel.app').replace(/\/$/, '');

async function fetchText(url) {
  try {
    const r = await fetch(url, { headers: { 'User-Agent': 'RootsHub-SEO-Audit/1.0' }, redirect: 'follow' });
    return { status: r.status, text: r.ok ? await r.text() : '' };
  } catch (e) {
    return { status: 0, text: '', error: e.message };
  }
}

function auditHtml(html, path) {
  const checks = [];
  const add = (level, title, advice) => checks.push({ level, title, advice });
  const pick = (re) => { const m = html.match(re); return m ? m[1].trim() : null; };

  const title = pick(/<title[^>]*>([^<]*)<\/title>/i);
  if (!title) add('fail', 'Lipsește <title>', 'Adaugă un titlu unic pe pagină (50–60 caractere, cu „Brașov" și numele vilei).');
  else if (title.length < 25 || title.length > 65) add('warn', `Titlul are ${title.length} caractere: „${title.slice(0, 60)}"`, 'Ideal 50–60 caractere, cu cuvintele cheie la început.');
  else add('ok', `Titlu: „${title.slice(0, 60)}"`, 'Lungime bună.');

  const desc = pick(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i) || pick(/<meta\s+content=["']([^"']*)["']\s+name=["']description["']/i);
  if (!desc) add('fail', 'Lipsește meta description', 'Adaugă o descriere de 140–160 caractere — apare în rezultatele Google și influențează rata de click.');
  else if (desc.length < 70 || desc.length > 170) add('warn', `Meta description are ${desc.length} caractere`, 'Ideal 140–160 caractere.');
  else add('ok', 'Meta description prezentă', `${desc.length} caractere.`);

  if (!/<link[^>]+rel=["']canonical["']/i.test(html)) add('warn', 'Lipsește link canonical', 'Adaugă <link rel="canonical"> ca Google să știe URL-ul principal al paginii (evită conținut duplicat, mai ales cu ?lang=).');
  else add('ok', 'Canonical prezent', '');

  if (!/<meta\s+property=["']og:title["']/i.test(html)) add('warn', 'Lipsesc tagurile Open Graph', 'og:title, og:description, og:image — controlează cum arată linkul pe WhatsApp/Facebook, unde vin mulți oaspeți.');
  else add('ok', 'Open Graph prezent', '');

  const h1s = (html.match(/<h1[\s>]/gi) || []).length;
  if (h1s === 0) add('fail', 'Niciun <h1> în HTML-ul livrat', 'Google și LLM-urile citesc HTML-ul inițial — dacă h1 vine doar din JavaScript, multe crawlere nu îl văd.');
  else if (h1s > 1) add('warn', `${h1s} taguri <h1>`, 'Păstrează un singur h1 pe pagină.');
  else add('ok', 'Un singur <h1>', '');

  const imgs = html.match(/<img[^>]*>/gi) || [];
  const noAlt = imgs.filter((i) => !/alt=["'][^"']+["']/i.test(i)).length;
  if (imgs.length && noAlt) add('warn', `${noAlt}/${imgs.length} imagini fără alt`, 'Textul alternativ ajută Google Images și cititoarele de ecran.');
  else if (imgs.length) add('ok', 'Toate imaginile au alt', '');

  if (!/hreflang/i.test(html)) add('warn', 'Lipsesc tagurile hreflang', 'Site-ul e în RO/EN/HE/FR — adaugă <link rel="alternate" hreflang="…"> ca Google să servească limba corectă.');
  else add('ok', 'hreflang prezent', '');

  if (!/application\/ld\+json/i.test(html)) add('warn', 'Lipsește schema.org (JSON-LD)', 'Adaugă LodgingBusiness / VacationRental cu adresă, rating, prețuri — apare în rezultate îmbogățite și e citit de LLM-uri.');
  else add('ok', 'JSON-LD prezent', '');

  if (!/<html[^>]+lang=/i.test(html)) add('warn', 'Lipsește atributul lang pe <html>', 'Setează lang="ro" (și schimbă-l dinamic pe alte limbi).');
  else add('ok', 'Atribut lang prezent', '');

  // detecție SPA: conținutul e randat din JavaScript?
  const bodyText = (html.split(/<body[^>]*>/i)[1] || '').replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (bodyText.length < 300) {
    add('fail', `Conținut vizibil în HTML: doar ~${bodyText.length} caractere`, 'Pagina e o aplicație JavaScript (SPA) — Google o poate randa, dar ChatGPT, Claude, Perplexity și alte LLM-uri văd o pagină goală. Soluția: pre-randare / SSR (ex. prerender la build sau migrare pe Next.js/Astro). Este cea mai importantă îmbunătățire pentru vizibilitate în AI.');
  } else {
    add('ok', `~${bodyText.length} caractere de conținut în HTML`, 'Crawlerele văd conținutul fără să execute JavaScript.');
  }
  return checks;
}

app.get('/api/v1/admin/seo-audit', requirePerm('seo'), async (req, res) => {
  const p = String(req.query.path || '/');
  const page = await fetchText(SITE_URL + p);
  if (!page.status || page.status >= 400) {
    return res.json({ path: p, status: page.status, checks: [{ level: 'fail', title: `Pagina nu răspunde (HTTP ${page.status})`, advice: page.error || 'Verifică URL-ul.' }] });
  }
  const checks = auditHtml(page.text, p);
  if (p === '/') {
    const [robots, sitemap, llms] = await Promise.all([
      fetchText(SITE_URL + '/robots.txt'),
      fetchText(SITE_URL + '/sitemap.xml'),
      fetchText(SITE_URL + '/llms.txt'),
    ]);
    // SPA-ul răspunde 200 cu HTML la orice cale — validăm conținutul, nu doar statusul
    const robotsOk = robots.status === 200 && /user-agent/i.test(robots.text);
    checks.push(robotsOk && /sitemap/i.test(robots.text)
      ? { level: 'ok', title: 'robots.txt cu sitemap', advice: '' }
      : { level: robotsOk ? 'warn' : 'fail', title: robotsOk ? 'robots.txt fără link către sitemap' : 'Lipsește robots.txt', advice: 'Spune-le crawlerelor ce pot indexa și unde e sitemap-ul.' });
    checks.push(sitemap.status === 200 && /<urlset/i.test(sitemap.text)
      ? { level: 'ok', title: 'sitemap.xml prezent', advice: '' }
      : { level: 'fail', title: 'Lipsește sitemap.xml', advice: 'Lista tuturor paginilor — Google le descoperă și indexează mai repede.' });
    checks.push(llms.status === 200 && !/<!doctype/i.test(llms.text) && llms.text.length > 100
      ? { level: 'ok', title: 'llms.txt prezent', advice: '' }
      : { level: 'warn', title: 'Lipsește llms.txt', advice: 'Standard nou citit de ChatGPT, Claude, Perplexity: un rezumat al site-ului în text simplu, la /llms.txt. Crește șansa ca AI-ul să recomande corect vilele.' });
  }
  res.json({ path: p, status: page.status, checks });
});

/* ============ pagini ============ */
app.use(express.static(path.join(__dirname, 'public'), { index: false }));

app.get('/login', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/admin', (req, res) => {
  if (!req.user) return res.redirect('/login');
  res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});
app.get('/', (req, res) => res.redirect(req.user ? '/admin' : '/login'));

/* ============ start ============ */
// Vercel: exportăm app-ul (api/index.js). Local: node server.js.
if (require.main === module) {
  ensureReady()
    .then(() => app.listen(PORT, () => console.log(`[hub] http://localhost:${PORT}`)))
    .catch((e) => { console.error('[hub] DB init fail:', e.message); process.exit(1); });
}

module.exports = app;
