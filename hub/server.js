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
const smart = require('./smart');
const ha = require('./integrations/homeassistant');
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
// rawBody e păstrat pentru verificarea semnăturii webhook-urilor (Stripe cere byte-ii exacți)
app.use(express.json({ limit: '30mb', verify: (req, _res, buf) => { req.rawBody = buf; } })); // imaginile vin deja optimizate din browser

/* CORS pentru editorul vizual de pe site (Bearer token, fara cookie-uri) */
const CORS_ORIGINS = (process.env.CORS_ORIGINS ||
  'https://roots-opal.vercel.app,https://rootsvillas.ro,https://www.rootsvillas.ro,http://localhost:5173'
).split(',').map((s) => s.trim());
app.use((req, res, next) => {
  const origin = req.headers.origin;
  if (origin && CORS_ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Guest-Token');
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

/* ---- Stripe webhook: avansul plătit prin Checkout se înregistrează în payments ----
   Semnătura Stripe-Signature = HMAC-SHA256("t.rawBody", STRIPE_WEBHOOK_SECRET);
   verificăm pe byte-ii exacți (req.rawBody), cu toleranță anti-replay de 10 min. */
function stripeSigOk(rawBody, header, secret) {
  try {
    const parts = String(header || '').split(',').map((s) => s.split('='));
    const t = (parts.find((p) => p[0] === 't') || [])[1];
    const v1s = parts.filter((p) => p[0] === 'v1').map((p) => p[1]);
    if (!t || !v1s.length) return false;
    if (Math.abs(Date.now() / 1000 - Number(t)) > 600) return false;
    const expected = crypto.createHmac('sha256', secret).update(t + '.' + rawBody).digest('hex');
    return v1s.some((v) => {
      try { return crypto.timingSafeEqual(Buffer.from(v), Buffer.from(expected)); } catch { return false; }
    });
  } catch { return false; }
}

/* comisionul Stripe nu vine în evenimentul de checkout — îl citim separat din
   balance transaction (necesită STRIPE_SECRET_KEY pe hub; fără ea, fee rămâne gol) */
async function stripeFeeFor(paymentIntentId) {
  const sk = (process.env.STRIPE_SECRET_KEY || '').trim();
  if (!sk || !paymentIntentId) return null;
  const r = await fetch(
    'https://api.stripe.com/v1/payment_intents/' + encodeURIComponent(paymentIntentId) + '?expand[]=latest_charge.balance_transaction',
    { headers: { Authorization: 'Bearer ' + sk } }
  );
  if (!r.ok) return null;
  const j = await r.json();
  const bt = j.latest_charge && j.latest_charge.balance_transaction;
  if (!bt || typeof bt !== 'object' || bt.fee == null) return null;
  return { fee: bt.fee / 100, net: bt.net / 100 };
}

app.post('/api/v1/payments/stripe-webhook', async (req, res) => {
  const secret = (process.env.STRIPE_WEBHOOK_SECRET || '').trim();
  if (!secret) return res.status(503).json({ error: 'Webhook neconfigurat (STRIPE_WEBHOOK_SECRET).' });
  const raw = req.rawBody ? req.rawBody.toString('utf8') : '';
  if (!raw || !stripeSigOk(raw, req.headers['stripe-signature'], secret)) {
    return res.status(400).json({ error: 'Semnătură invalidă.' });
  }
  const ev = req.body || {};
  // try/catch obligatoriu: Express 4 nu prinde rejecțiile handler-elor async, iar pe
  // Node 20 o eroare de DB ar omorî procesul. 500 = Stripe reîncearcă (upsert idempotent).
  try {
    const isPaidEvent = ev.type === 'checkout.session.completed' || ev.type === 'checkout.session.async_payment_succeeded';
    const s = (ev.data && ev.data.object) || {};
    if (isPaidEvent && s.payment_status === 'paid') {
      // doar sesiuni chiar plătite — „completed" poate sosi cu payment_status=unpaid
      // la metodele cu decontare întârziată
      const md = s.metadata || {};
      const email = (s.customer_details && s.customer_details.email) || s.customer_email || null;
      await pool.query(
        `INSERT INTO payments (provider, session_id, ref, amount, currency, status, guest_email, payment_intent, raw)
         VALUES ('stripe', $1, $2, $3, $4, 'paid', $5, $7, $6)
         ON CONFLICT (session_id) DO UPDATE SET status = 'paid', raw = EXCLUDED.raw,
           payment_intent = COALESCE(EXCLUDED.payment_intent, payments.payment_intent)
         WHERE payments.status NOT IN ('refunded', 'disputed')`,
        [
          s.id || null,
          md.ref || null,
          s.amount_total != null ? s.amount_total / 100 : null,
          s.currency || 'ron',
          email,
          JSON.stringify(s),
          (typeof s.payment_intent === 'string' && s.payment_intent) || null,
        ]
      );
      emit('PaymentCompleted', { ref: md.ref || null, sessionId: s.id, amount: s.amount_total != null ? s.amount_total / 100 : null, email });
      // comisionul Stripe (best-effort — nu blocăm 200-ul dacă interogarea pică)
      try {
        const f = await stripeFeeFor((typeof s.payment_intent === 'string' && s.payment_intent) || null);
        if (f) await pool.query('UPDATE payments SET fee = $2, net = $3 WHERE session_id = $1', [s.id, f.fee, f.net]);
      } catch (e) { console.error('[stripe-webhook] fee lookup:', e.message); }
    } else if (ev.type === 'charge.refunded' || ev.type === 'charge.dispute.created') {
      // banii s-au întors / sunt contestați → badge-ul „Avans plătit" dispare
      // (admin listează doar status='paid'); potrivim prin payment_intent
      const c = s;
      const pi = (typeof c.payment_intent === 'string' && c.payment_intent) || null;
      const isDispute = ev.type === 'charge.dispute.created';
      const refundedLei = !isDispute && c.amount_refunded != null ? c.amount_refunded / 100 : null;
      // refund PARȚIAL: reținem suma, dar statusul rămâne 'paid' (avansul încă stă);
      // refund integral sau dispută: statusul se schimbă și badge-ul dispare
      const full = isDispute || c.refunded === true ||
        (c.amount_refunded != null && c.amount != null && c.amount_refunded >= c.amount);
      if (pi) {
        await pool.query(
          `UPDATE payments SET
             refund_amount = COALESCE($2, refund_amount),
             refunded_at = CASE WHEN $2 IS NOT NULL OR $3 THEN now() ELSE refunded_at END,
             status = CASE WHEN $3 THEN $4 ELSE status END
           WHERE provider = 'stripe' AND (payment_intent = $1 OR raw->>'payment_intent' = $1)`,
          [pi, refundedLei, full, isDispute ? 'disputed' : 'refunded']
        );
        if (full) emit('PaymentReversed', { paymentIntent: pi, kind: ev.type });
      }
    }
    // răspundem 200 la orice eveniment semnat corect — Stripe nu retrimite inutil
    res.json({ received: true });
  } catch (e) {
    console.error('[stripe-webhook]', e.message);
    res.status(500).json({ error: 'Eroare temporară — Stripe va reîncerca.' });
  }
});

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
  ['smart', 'Smart Roots (dispozitive)'],
  ['financiar', 'Financiar (plăți online)'],
  ['marketing', 'Marketing (campanii ads)'],
];
const AREA_KEYS = PERM_AREAS.map(([k]) => k);
const DEFAULT_PERMS = {
  admin: [...AREA_KEYS],
  curatenie: ['panou', 'rezervari', 'smart'],
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
  } catch (e) { console.error('[membership] bonus la înregistrare eșuat:', e.message); /* nu blochează înregistrarea */ }

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
// wrapper pentru handler-ele async (Express 4 nu prinde singur rejections)
const mb = (fn) => async (req, res) => {
  try { await fn(req, res); }
  catch (e) { console.error('[membership]', e); res.status(500).json({ error: 'Eroare internă: ' + e.message }); }
};
const isUuid = (s) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(String(s || ''));
// punctele sunt doar pentru conturile de oaspeți (staff-ul nu acumulează)
const requireGuestRole = (req, res) => {
  if (['turist', 'client'].includes(req.user.role)) return true;
  res.status(403).json({ error: 'Punctele sunt disponibile doar conturilor de oaspeți.' });
  return false;
};
// dashboard-ul membrului: cont + tier + progres + referral + istoric + catalog
app.get('/api/v1/membership/me', requireAuth, mb(async (req, res) => {
  if (!requireGuestRole(req, res)) return;
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
}));
// revendicare recompensă: totul într-o SINGURĂ tranzacție SQL (lock pe recompensă,
// scădere condiționată de balanță + stoc — fără curse la cereri simultane)
app.post('/api/v1/membership/redeem', requireAuth, mb(async (req, res) => {
  if (!requireGuestRole(req, res)) return;
  const rewardId = String((req.body || {}).reward_id || '');
  if (!isUuid(rewardId)) return res.status(400).json({ error: 'Recompensă invalidă' });
  const acc = await membership.ensureAccount(pool, req.user.id);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const rw = await client.query('SELECT * FROM rewards WHERE id = $1 AND active FOR UPDATE', [rewardId]);
    if (!rw.rows.length) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Recompensă inexistentă sau inactivă' }); }
    const reward = rw.rows[0];
    if (reward.stock != null && reward.stock <= 0) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Stoc epuizat' }); }
    const upd = await client.query(
      'UPDATE membership_accounts SET points_balance = points_balance - $2 WHERE id = $1 AND points_balance >= $2 RETURNING points_balance',
      [acc.id, reward.points_cost]
    );
    if (!upd.rows.length) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Puncte insuficiente' }); }
    await client.query(
      `INSERT INTO points_transactions (account_id, amount, type, source_ref, description, created_by)
       VALUES ($1, $2, 'redeem', $3, $4, $5)`,
      [acc.id, -reward.points_cost, reward.id, `Revendicare: ${reward.title}`, req.user.email]
    );
    if (reward.stock != null) await client.query('UPDATE rewards SET stock = stock - 1 WHERE id = $1', [reward.id]);
    // codul de voucher: retry pe coliziune (SAVEPOINT — altfel tranzacția moare)
    let redemption = null;
    for (let i = 0; i < 5 && !redemption; i++) {
      await client.query('SAVEPOINT sp_code');
      try {
        const rd = await client.query(
          'INSERT INTO redemptions (account_id, reward_id, points_spent, code) VALUES ($1,$2,$3,$4) RETURNING *',
          [acc.id, reward.id, reward.points_cost, membership.genVoucherCode()]
        );
        redemption = rd.rows[0];
      } catch (e) {
        if (e.code !== '23505') throw e;
        await client.query('ROLLBACK TO SAVEPOINT sp_code');
      }
    }
    if (!redemption) throw new Error('Nu am putut genera un cod de voucher unic.');
    await client.query('COMMIT');
    emit('RewardRedeemed', { reward: reward.title, by: req.user.email });
    res.json({ ok: true, redemption });
  } catch (e) {
    await client.query('ROLLBACK').catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}));
// cerere de puncte (poză #rootsvillas / review) — validată manual de admin
app.post('/api/v1/membership/request', requireAuth, mb(async (req, res) => {
  if (!requireGuestRole(req, res)) return;
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
}));
// admin: setări
app.get('/api/v1/admin/membership/settings', requirePerm('membership'), mb(async (_req, res) => {
  res.json({ settings: await membership.getMembershipSettings(pool) });
}));
app.put('/api/v1/admin/membership/settings', requirePerm('membership'), mb(async (req, res) => {
  let settings;
  try { settings = await membership.saveMembershipSettings(pool, req.body || {}); }
  catch (e) { return res.status(400).json({ error: e.message }); }
  emit('MembershipSettingsUpdated', { by: req.user.email });
  res.json({ ok: true, settings });
}));
// admin: catalog recompense
app.get('/api/v1/admin/rewards', requirePerm('membership'), mb(async (_req, res) => {
  const r = await pool.query('SELECT * FROM rewards ORDER BY created_at DESC');
  res.json({ rewards: r.rows });
}));
app.post('/api/v1/admin/rewards', requirePerm('membership'), mb(async (req, res) => {
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
}));
app.put('/api/v1/admin/rewards/:id', requirePerm('membership'), mb(async (req, res) => {
  if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Recompensă inexistentă' });
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
}));
app.delete('/api/v1/admin/rewards/:id', requirePerm('membership'), mb(async (req, res) => {
  if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Recompensă inexistentă' });
  try {
    await pool.query('DELETE FROM rewards WHERE id = $1', [req.params.id]);
  } catch (e) {
    // are deja revendicări (FK) — nu se poate șterge, doar dezactiva
    if (e.code === '23503') return res.status(409).json({ error: 'Recompensa are revendicări — dezactiveaz-o în loc să o ștergi.' });
    throw e;
  }
  res.json({ ok: true });
}));
// admin: cereri poză/review
app.get('/api/v1/admin/membership/requests', requirePerm('membership'), mb(async (_req, res) => {
  const r = await pool.query(
    `SELECT pr.*, u.email, u.name FROM points_requests pr
     JOIN membership_accounts ma ON ma.id = pr.account_id
     JOIN users u ON u.id = ma.user_id
     ORDER BY (pr.status = 'pending') DESC, pr.created_at DESC LIMIT 200`
  );
  res.json({ requests: r.rows });
}));
app.post('/api/v1/admin/membership/requests/:id/decide', requirePerm('membership'), mb(async (req, res) => {
  if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Cerere inexistentă' });
  const approve = Boolean((req.body || {}).approve);
  // UPDATE condiționat = un singur câștigător la click-uri simultane
  const r = await pool.query(
    "UPDATE points_requests SET status = $2 WHERE id = $1 AND status = 'pending' RETURNING *",
    [req.params.id, approve ? 'approved' : 'rejected']
  );
  if (!r.rows.length) return res.status(404).json({ error: 'Cerere inexistentă sau deja decisă' });
  const reqRow = r.rows[0];
  if (approve) {
    const settings = await membership.getMembershipSettings(pool);
    const pts = reqRow.type === 'photo_tag' ? settings.photo_tag_points : settings.review_points;
    try {
      // idempotent: (type, source_ref=id-ul cererii) e în indexul unic
      await membership.addPoints(pool, reqRow.account_id, pts, reqRow.type, {
        sourceRef: reqRow.id, description: reqRow.type === 'photo_tag' ? 'Poză cu #rootsvillas' : 'Review', createdBy: req.user.email,
      });
    } catch (e) {
      // punctele n-au intrat → readucem cererea la pending ca adminul să poată reîncerca
      await pool.query("UPDATE points_requests SET status = 'pending' WHERE id = $1", [reqRow.id]).catch(() => {});
      throw e;
    }
  }
  emit('PointsRequestDecided', { approve, by: req.user.email });
  res.json({ ok: true });
}));
// admin: revendicări (onorare / anulare cu retur de puncte)
app.get('/api/v1/admin/redemptions', requirePerm('membership'), mb(async (_req, res) => {
  const r = await pool.query(
    `SELECT rd.*, w.title, u.email FROM redemptions rd
     JOIN rewards w ON w.id = rd.reward_id
     JOIN membership_accounts ma ON ma.id = rd.account_id
     JOIN users u ON u.id = ma.user_id
     ORDER BY (rd.status = 'pending') DESC, rd.created_at DESC LIMIT 200`
  );
  res.json({ redemptions: r.rows });
}));
app.post('/api/v1/admin/redemptions/:id/status', requirePerm('membership'), mb(async (req, res) => {
  if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Revendicare inexistentă' });
  const status = (req.body || {}).status;
  if (!['fulfilled', 'cancelled'].includes(status)) return res.status(400).json({ error: 'Status invalid' });
  // UPDATE condiționat = un singur câștigător la click-uri simultane
  const r = await pool.query(
    "UPDATE redemptions SET status = $2 WHERE id = $1 AND status = 'pending' RETURNING *",
    [req.params.id, status]
  );
  if (!r.rows.length) return res.status(404).json({ error: 'Revendicare inexistentă sau deja procesată' });
  const rd = r.rows[0];
  if (status === 'cancelled') {
    try {
      // refund idempotent (redeem_refund + source_ref în indexul unic) care NU umflă lifetime/tier
      await membership.addPoints(pool, rd.account_id, rd.points_spent, 'redeem_refund', {
        sourceRef: rd.id, countsForLifetime: false,
        description: 'Retur puncte — revendicare anulată', createdBy: req.user.email,
      });
    } catch (e) {
      // refundul n-a intrat → readucem revendicarea la pending ca adminul să poată reîncerca
      await pool.query("UPDATE redemptions SET status = 'pending' WHERE id = $1", [rd.id]).catch(() => {});
      throw e;
    }
    await pool.query('UPDATE rewards SET stock = stock + 1 WHERE id = $1 AND stock IS NOT NULL', [rd.reward_id]);
  }
  res.json({ ok: true });
}));
// admin: conturi + ajustare manuală
app.get('/api/v1/admin/membership/accounts', requirePerm('membership'), mb(async (_req, res) => {
  const settings = await membership.getMembershipSettings(pool);
  const r = await pool.query(
    `SELECT ma.*, u.email, u.name FROM membership_accounts ma JOIN users u ON u.id = ma.user_id
     ORDER BY ma.lifetime_points DESC LIMIT 500`
  );
  res.json({ accounts: r.rows.map((a) => ({ ...a, tier: membership.tierFor(a.lifetime_points, settings) })) });
}));
app.get('/api/v1/admin/membership/accounts/:id/transactions', requirePerm('membership'), mb(async (req, res) => {
  if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Cont inexistent' });
  const r = await pool.query('SELECT amount, type, description, created_by, created_at FROM points_transactions WHERE account_id = $1 ORDER BY created_at DESC LIMIT 100', [req.params.id]);
  res.json({ transactions: r.rows });
}));
app.post('/api/v1/admin/membership/adjust', requirePerm('membership'), mb(async (req, res) => {
  const b = req.body || {};
  const amount = Math.round(Number(b.amount));
  if (!Number.isFinite(amount) || !amount) return res.status(400).json({ error: 'Sumă invalidă' });
  if (!String(b.reason || '').trim()) return res.status(400).json({ error: 'Motivul e obligatoriu' });
  const u = await pool.query('SELECT id FROM users WHERE lower(email) = lower($1)', [String(b.email || '')]);
  if (!u.rows.length) return res.status(404).json({ error: 'Utilizator inexistent' });
  const acc = await membership.ensureAccount(pool, u.rows[0].id);
  // addPoints verifică balanța ATOMIC (nu pe snapshot-ul citit mai sus)
  const out = await membership.addPoints(pool, acc.id, amount, 'admin_adjust', { description: String(b.reason).slice(0, 200), createdBy: req.user.email });
  if (out.insufficient) return res.status(400).json({ error: 'Balanța nu poate deveni negativă' });
  emit('PointsAdjusted', { email: b.email, amount, by: req.user.email });
  res.json({ ok: true });
}));
// admin/cron: acordă punctele din sejururile încheiate (idempotent)
app.post('/api/v1/admin/membership/award-stays', requirePerm('membership'), mb(async (req, res) => {
  res.json({ ok: true, ...(await membership.awardStayPoints(pool)) });
}));

/* ============ SMART ROOTS (gateway Home Assistant, conștient de roluri) ============
   Principii: hub-ul e singurul client HA; allowlist server-side (hub/smart.js),
   fail-closed; oaspetele intră cu magic-link (X-Guest-Token) scoped pe vila lui
   și pe fereastra rezervării; totul se auditează în events_log. */
const VILLAS = ['redwood', 'sequoia'];
const validVilla = (v) => VILLAS.includes(String(v || '').toLowerCase());

// rolul Smart al unui utilizator autentificat (staff). Owner/admin = admin;
// orice alt rol (inclusiv curatenie) DOAR dacă are zona 'smart' bifată în
// Roluri & acces — debifarea chiar revocă accesul pe API, nu doar tabul.
async function smartStaffRole(req) {
  if (!req.user) return null;
  if (req.user.role === 'owner' || req.user.role === 'admin') return 'admin';
  if (['turist', 'client'].includes(req.user.role)) return null; // oaspeții intră doar cu magic-link
  const perms = await getRolePerms();
  return (perms[req.user.role] || []).includes('smart') ? 'cleaning' : null;
}

// grant de oaspete valid ACUM — DOAR din header (nu din query, ca tokenul să
// nu ajungă în logurile de request); rezervările anulate pierd accesul imediat
async function guestGrant(req) {
  const token = String(req.headers['x-guest-token'] || '').trim();
  if (!token || token.length < 20) return null;
  const r = await pool.query(
    `SELECT ag.* FROM access_grants ag
       LEFT JOIN bookings b ON ag.booking_id IS NOT NULL AND b.smoobu_id = ag.booking_id
      WHERE ag.token = $1 AND NOT ag.revoked AND now() BETWEEN ag.valid_from AND ag.valid_to
        AND (ag.booking_id IS NULL OR b.id IS NULL OR b.status NOT IN ('cancelled', 'blocked'))`,
    [token]
  );
  return r.rows[0] || null;
}

// contextul Smart al cererii: { role, villaScope, who, rlKey } — null = fără acces
async function smartContext(req) {
  const staff = await smartStaffRole(req);
  if (staff) return { role: staff, villaScope: null, who: req.user.email, rlKey: 'u:' + req.user.id };
  const grant = await guestGrant(req);
  if (grant) return { role: 'guest', villaScope: grant.villa, who: `guest:${grant.guest_name || grant.booking_id || grant.id}`, rlKey: 'g:' + grant.id, grant };
  return null;
}

// rate-limit simplu pe comenzi (best-effort per instanță serverless)
const smartCmdHits = new Map();
function smartCmdLimited(key) {
  const now = Date.now();
  if (smartCmdHits.size > 500) smartCmdHits.clear(); // plasă anti-creștere pe instanțe longevive
  const h = (smartCmdHits.get(key) || []).filter((t) => now - t < 60e3);
  h.push(now);
  smartCmdHits.set(key, h);
  return h.length > 30;
}

// dispozitivele vizibile rolului, cu stare live
app.get('/api/v1/villas/:villa/devices', mb(async (req, res) => {
  const villa = String(req.params.villa || '').toLowerCase();
  if (!validVilla(villa)) return res.status(404).json({ error: 'Vilă necunoscută' });
  const ctx = await smartContext(req);
  if (!ctx) return res.status(401).json({ error: 'Autentificare necesară' });
  if (ctx.villaScope && ctx.villaScope !== villa) return res.status(403).json({ error: 'Accesul tău e limitat la vila rezervării' });
  const r = await pool.query('SELECT * FROM devices WHERE villa = $1 AND active ORDER BY sort, created_at', [villa]);
  const visible = r.rows.filter((d) => smart.canSee(ctx.role, d));
  const states = await ha.getStates(pool, villa, visible.map((d) => d.ha_entity_id));
  res.json({
    villa,
    role: ctx.role,
    devices: visible.map((d) => smart.publicDevice(ctx.role, d, states[d.ha_entity_id])),
  });
}));

// comandă către un dispozitiv — verificată, limitată, auditată; refuz = 403
app.post('/api/v1/villas/:villa/devices/:id/command', mb(async (req, res) => {
  const villa = String(req.params.villa || '').toLowerCase();
  if (!validVilla(villa)) return res.status(404).json({ error: 'Vilă necunoscută' });
  if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Dispozitiv inexistent' });
  const ctx = await smartContext(req);
  if (!ctx) return res.status(401).json({ error: 'Autentificare necesară' });
  if (ctx.villaScope && ctx.villaScope !== villa) return res.status(403).json({ error: 'Accesul tău e limitat la vila rezervării' });
  if (smartCmdLimited(ctx.rlKey)) return res.status(429).json({ error: 'Prea multe comenzi — încearcă peste un minut' });
  const { action, value } = req.body || {};
  const d = await pool.query('SELECT * FROM devices WHERE id = $1 AND villa = $2 AND active', [req.params.id, villa]);
  if (!d.rows.length) return res.status(404).json({ error: 'Dispozitiv inexistent' });
  const device = d.rows[0];
  const check = smart.checkCommand(ctx.role, device, String(action || ''), value);
  if (!check.ok) return res.status(403).json({ error: check.error });
  let result;
  try {
    result = await ha.callService(pool, villa, device.ha_entity_id, String(action), check.value);
  } catch (e) {
    // detaliul tehnic rămâne în audit + loguri; non-adminul primește mesaj generic
    console.error('[smart] comandă eșuată:', villa, device.label, action, e.message);
    await emit('SmartCommandFailed', { villa, device: device.label, action, by: ctx.who, error: e.message });
    return res.status(502).json({ error: ctx.role === 'admin' ? 'Comanda nu a ajuns la vilă: ' + e.message : 'Vila nu răspunde momentan — mai încearcă o dată.' });
  }
  await emit('SmartCommand', { villa, device: device.label, action, value: check.value ?? null, by: ctx.who, role: ctx.role, mode: result.mode });
  const states = await ha.getStates(pool, villa, [device.ha_entity_id]);
  res.json({ ok: true, mode: result.mode, device: smart.publicDevice(ctx.role, device, states[device.ha_entity_id]) });
}));

// sesiunea oaspetelui (pagina /smart de pe site): cine e, până când, ce vede
app.get('/api/v1/guest/session', mb(async (req, res) => {
  const grant = await guestGrant(req);
  if (!grant) return res.status(401).json({ error: 'Link invalid, expirat sau revocat' });
  const r = await pool.query('SELECT * FROM devices WHERE villa = $1 AND active ORDER BY sort, created_at', [grant.villa]);
  const visible = r.rows.filter((d) => smart.canSee('guest', d));
  const states = await ha.getStates(pool, grant.villa, visible.map((d) => d.ha_entity_id));
  res.json({
    villa: grant.villa,
    guest_name: grant.guest_name || '',
    // PIN-ul NU se trimite încă oaspetelui: e placeholder până la integrarea
    // igloohome — un PIN care nu deschide ușa ar fi mai rău decât niciunul
    valid_to: grant.valid_to,
    devices: visible.map((d) => smart.publicDevice('guest', d, states[d.ha_entity_id])),
  });
}));

// dashboard adaptat rolului (staff)
app.get('/api/v1/me/dashboard', requireAuth, mb(async (req, res) => {
  const role = await smartStaffRole(req);
  if (!role) return res.status(403).json({ error: 'Rolul tău nu are acces la Smart Roots' });
  const out = { role, villas: [] };
  for (const villa of VILLAS) {
    const r = await pool.query('SELECT * FROM devices WHERE villa = $1 AND active ORDER BY sort, created_at', [villa]);
    const visible = r.rows.filter((d) => smart.canSee(role, d));
    if (!visible.length) { out.villas.push({ villa, devices: [] }); continue; }
    const states = await ha.getStates(pool, villa, visible.map((d) => d.ha_entity_id));
    out.villas.push({ villa, devices: visible.map((d) => smart.publicDevice(role, d, states[d.ha_entity_id])) });
  }
  if (role === 'cleaning') {
    const u = await pool.query('SELECT access_code FROM users WHERE id = $1', [req.user.id]);
    out.access_code = (u.rows[0] && u.rows[0].access_code) || null;
  }
  res.json(out);
}));

/* ---------- admin: instanțe HA + dispozitive + granturi ---------- */
app.get('/api/v1/admin/smart/instances', requireOwner, mb(async (_req, res) => {
  const r = await pool.query('SELECT * FROM ha_instances ORDER BY villa');
  const list = VILLAS.map((villa) => {
    const row = r.rows.find((x) => x.villa === villa) || { villa, base_url: '', token_env: '', remote_method: 'nabucasa', status: 'mock' };
    // tokenul NU se întoarce niciodată — doar DACĂ env-ul e setat (și doar HA_*)
    return { ...row, token_present: Boolean(row.token_env && /^HA_/.test(row.token_env) && process.env[row.token_env]) };
  });
  res.json({ instances: list });
}));
app.put('/api/v1/admin/smart/instances/:villa', requireOwner, mb(async (req, res) => {
  const villa = String(req.params.villa || '').toLowerCase();
  if (!validVilla(villa)) return res.status(404).json({ error: 'Vilă necunoscută' });
  const b = req.body || {};
  const status = ['mock', 'live'].includes(b.status) ? b.status : 'mock';
  // base_url doar https (comenzile pleacă cu Bearer către el); token_env doar
  // variabile dedicate HA_* — altfel ar fi o primitivă de exfiltrare a env-ului
  const baseUrl = String(b.base_url || '').trim().replace(/\/+$/, '') || null;
  if (baseUrl && !/^https:\/\/[a-z0-9.-]+/i.test(baseUrl)) return res.status(400).json({ error: 'URL-ul de bază trebuie să fie https://…' });
  const tokenEnv = String(b.token_env || '').trim().replace(/[^A-Za-z0-9_]/g, '').toUpperCase() || null;
  if (tokenEnv && !/^HA_[A-Z0-9_]+$/.test(tokenEnv)) return res.status(400).json({ error: 'Variabila de token trebuie să înceapă cu HA_ (ex. HA_REDWOOD_TOKEN)' });
  const r = await pool.query(
    `INSERT INTO ha_instances (villa, base_url, token_env, remote_method, status, updated_at)
     VALUES ($1,$2,$3,$4,$5,now())
     ON CONFLICT (villa) DO UPDATE SET base_url=$2, token_env=$3, remote_method=$4, status=$5, updated_at=now()
     RETURNING *`,
    [villa, baseUrl, tokenEnv, String(b.remote_method || 'nabucasa').slice(0, 40), status]
  );
  await emit('SmartInstanceUpdated', { villa, status, by: req.user.email });
  const row = r.rows[0];
  res.json({ ok: true, instance: { ...row, token_present: Boolean(row.token_env && /^HA_/.test(row.token_env) && process.env[row.token_env]) } });
}));

app.get('/api/v1/admin/smart/devices', requireOwner, mb(async (_req, res) => {
  const r = await pool.query('SELECT * FROM devices ORDER BY villa, sort, created_at');
  res.json({ devices: r.rows });
}));
const DEVICE_TYPES = ['light', 'hottub', 'climate', 'lock', 'gate', 'sensor'];
const SAFETY_CLASSES = ['comfort', 'operational', 'restricted'];
// politica se decide pe `type`, execuția pe domeniul din entity_id — cele două
// TREBUIE să fie coerente, altfel o greșeală de config ocolește allowlist-ul
const TYPE_DOMAINS = {
  light: ['light', 'switch'],
  hottub: ['switch', 'climate', 'water_heater'],
  climate: ['climate'],
  lock: ['lock'],
  gate: ['cover', 'switch'],
  sensor: ['sensor', 'binary_sensor'],
};
function typeMatchesEntity(type, entityId) {
  const domain = String(entityId || '').split('.')[0];
  return (TYPE_DOMAINS[type] || []).includes(domain);
}
function deviceFields(b) {
  const caps = Array.isArray(b.capabilities) ? b.capabilities.map(String).slice(0, 12) : null;
  return {
    label: b.label != null ? String(b.label).trim().slice(0, 80) : null,
    ha_entity_id: b.ha_entity_id != null ? String(b.ha_entity_id).trim().slice(0, 120) : null,
    type: DEVICE_TYPES.includes(b.type) ? b.type : null,
    safety_class: SAFETY_CLASSES.includes(b.safety_class) ? b.safety_class : null,
    capabilities: caps,
    sort: Number.isFinite(Number(b.sort)) ? Math.round(Number(b.sort)) : null,
    active: typeof b.active === 'boolean' ? b.active : null,
  };
}
app.post('/api/v1/admin/smart/devices', requireOwner, mb(async (req, res) => {
  const b = req.body || {};
  const villa = String(b.villa || '').toLowerCase();
  if (!validVilla(villa)) return res.status(400).json({ error: 'Vilă necunoscută' });
  const f = deviceFields(b);
  if (!f.label || !f.ha_entity_id || !f.type) return res.status(400).json({ error: 'Etichetă, entity_id și tip obligatorii' });
  if (!typeMatchesEntity(f.type, f.ha_entity_id)) return res.status(400).json({ error: `Tipul „${f.type}" nu se potrivește cu domeniul entity_id-ului (așteptat: ${TYPE_DOMAINS[f.type].join(' / ')}.…)` });
  try {
    const r = await pool.query(
      `INSERT INTO devices (villa, ha_entity_id, type, label, capabilities, safety_class, sort)
       VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7,0)) RETURNING *`,
      [villa, f.ha_entity_id, f.type, f.label, JSON.stringify(f.capabilities || []), f.safety_class || 'comfort', f.sort]
    );
    await emit('SmartDeviceAdded', { villa, label: f.label, by: req.user.email });
    res.json({ ok: true, device: r.rows[0] });
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Există deja un dispozitiv cu acest entity_id la vila asta' });
    throw e;
  }
}));
app.put('/api/v1/admin/smart/devices/:id', requireOwner, mb(async (req, res) => {
  if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Dispozitiv inexistent' });
  const f = deviceFields(req.body || {});
  const cur = await pool.query('SELECT type, ha_entity_id FROM devices WHERE id = $1', [req.params.id]);
  if (!cur.rows.length) return res.status(404).json({ error: 'Dispozitiv inexistent' });
  // perechea REZULTATĂ (după COALESCE) trebuie să rămână coerentă tip↔domeniu
  const nextType = f.type || cur.rows[0].type;
  const nextEntity = f.ha_entity_id || cur.rows[0].ha_entity_id;
  if (!typeMatchesEntity(nextType, nextEntity)) return res.status(400).json({ error: `Tipul „${nextType}" nu se potrivește cu domeniul entity_id-ului (așteptat: ${(TYPE_DOMAINS[nextType] || []).join(' / ')}.…)` });
  let r;
  try {
    r = await pool.query(
      `UPDATE devices SET label=COALESCE($2,label), ha_entity_id=COALESCE($3,ha_entity_id), type=COALESCE($4,type),
         safety_class=COALESCE($5,safety_class), capabilities=COALESCE($6,capabilities),
         sort=COALESCE($7,sort), active=COALESCE($8,active)
       WHERE id=$1 RETURNING *`,
      [req.params.id, f.label, f.ha_entity_id, f.type, f.safety_class,
       f.capabilities ? JSON.stringify(f.capabilities) : null, f.sort, f.active]
    );
  } catch (e) {
    if (e.code === '23505') return res.status(409).json({ error: 'Există deja un dispozitiv cu acest entity_id la vila asta' });
    throw e;
  }
  if (!r.rows.length) return res.status(404).json({ error: 'Dispozitiv inexistent' });
  await emit('SmartDeviceUpdated', { label: r.rows[0].label, by: req.user.email });
  res.json({ ok: true, device: r.rows[0] });
}));
app.delete('/api/v1/admin/smart/devices/:id', requireOwner, mb(async (req, res) => {
  if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Dispozitiv inexistent' });
  const r = await pool.query('DELETE FROM devices WHERE id = $1 RETURNING label', [req.params.id]);
  if (r.rows.length) await emit('SmartDeviceDeleted', { label: r.rows[0].label, by: req.user.email });
  res.json({ ok: true });
}));

/* granturi de oaspete: legate de o rezervare (fereastra 16:00 → 12:00,
   Europe/Bucharest) sau manuale (interval explicit) */
const SMART_LINK_BASE = (process.env.SITE_URL || 'https://roots-opal.vercel.app').replace(/\/+$/, '');
function villaFromBookingName(name) {
  if (/redwood/i.test(name || '')) return 'redwood';
  if (/sequoia/i.test(name || '')) return 'sequoia';
  return null;
}
app.post('/api/v1/access/guest', requireOwner, mb(async (req, res) => {
  const b = req.body || {};
  let villa, from, to, guestName, bookingId = null;
  if (b.bookingId) {
    const r = await pool.query(
      `SELECT b.*, g.name AS guest_name,
              ((b.arrival::text || ' 16:00')::timestamp AT TIME ZONE 'Europe/Bucharest') AS vfrom,
              ((b.departure::text || ' 12:00')::timestamp AT TIME ZONE 'Europe/Bucharest') AS vto
         FROM bookings b LEFT JOIN guests g ON g.id = b.guest_id
        WHERE b.smoobu_id = $1 OR b.id::text = $1`,
      [String(b.bookingId).trim()]
    );
    if (!r.rows.length) return res.status(404).json({ error: 'Rezervarea nu există în CRM (rulează sync Smoobu)' });
    const bk = r.rows[0];
    if (['cancelled', 'blocked'].includes(bk.status)) return res.status(400).json({ error: 'Rezervarea e anulată' });
    villa = villaFromBookingName(bk.villa);
    if (!villa) return res.status(400).json({ error: 'Nu recunosc vila rezervării: ' + bk.villa });
    from = bk.vfrom; to = bk.vto; guestName = bk.guest_name || ''; bookingId = String(bk.smoobu_id || bk.id);
  } else {
    villa = String(b.villa || '').toLowerCase();
    if (!validVilla(villa)) return res.status(400).json({ error: 'Vilă necunoscută' });
    // datetime-local vine FĂRĂ timezone — îl interpretăm ca oră a României
    // (new Date() l-ar citi ca UTC pe Vercel → fereastră decalată cu 2-3h)
    const naive = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/;
    if (!naive.test(String(b.from || '')) || !naive.test(String(b.to || ''))) return res.status(400).json({ error: 'Interval invalid' });
    const tz = await pool.query(
      `SELECT ($1::timestamp AT TIME ZONE 'Europe/Bucharest') AS f,
              ($2::timestamp AT TIME ZONE 'Europe/Bucharest') AS t`,
      [String(b.from).slice(0, 16), String(b.to).slice(0, 16)]
    );
    from = tz.rows[0].f; to = tz.rows[0].t;
    if (!(new Date(from) < new Date(to))) return res.status(400).json({ error: 'Interval invalid' });
    guestName = String(b.guestName || '').trim().slice(0, 120);
  }
  const token = crypto.randomBytes(24).toString('base64url');
  const pin = String(crypto.randomInt(100000, 1000000)); // PIN igloohome — placeholder până la integrarea reală
  const r2 = await pool.query(
    `INSERT INTO access_grants (booking_id, villa, guest_name, token, pin, valid_from, valid_to, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
    [bookingId, villa, guestName, token, pin, from, to, req.user.email]
  );
  await emit('SmartGrantCreated', { villa, guest: guestName, booking: bookingId, by: req.user.email });
  res.json({ ok: true, grant: r2.rows[0], link: `${SMART_LINK_BASE}/smart?g=${token}` });
}));
app.get('/api/v1/access/guest', requireOwner, mb(async (_req, res) => {
  const r = await pool.query(
    `SELECT *, (NOT revoked AND now() BETWEEN valid_from AND valid_to) AS active_now
       FROM access_grants ORDER BY created_at DESC LIMIT 100`
  );
  res.json({ grants: r.rows.map((g) => ({ ...g, link: `${SMART_LINK_BASE}/smart?g=${g.token}` })) });
}));
app.post('/api/v1/access/guest/:id/revoke', requireOwner, mb(async (req, res) => {
  if (!isUuid(req.params.id)) return res.status(404).json({ error: 'Grant inexistent' });
  const r = await pool.query('UPDATE access_grants SET revoked = true WHERE id = $1 RETURNING villa, guest_name', [req.params.id]);
  if (!r.rows.length) return res.status(404).json({ error: 'Grant inexistent' });
  await emit('SmartGrantRevoked', { villa: r.rows[0].villa, guest: r.rows[0].guest_name, by: req.user.email });
  res.json({ ok: true });
}));

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
  const r = await pool.query('SELECT id, email, name, role, phone, source, access_code, created_at FROM users ORDER BY created_at');
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
  // codul universal de acces (Smart Roots) — fix per persoană, editabil/revocabil de owner
  const hasCode = Object.prototype.hasOwnProperty.call(req.body || {}, 'access_code');
  const accessCode = hasCode ? String(req.body.access_code || '').trim().slice(0, 20) || null : null;
  const r = await pool.query(
    `UPDATE users SET name = COALESCE($2, name), role = COALESCE($3, role), password_hash = COALESCE($4, password_hash),
       access_code = CASE WHEN $6 THEN $5 ELSE access_code END
     WHERE id = $1 RETURNING id, email, name, role, access_code`,
    [req.params.id, name || null, cleanRole, hash, accessCode, hasCode]
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
    try { stays = await membership.awardStayPoints(pool); } catch (e) { console.error('[membership] award-stays după sync:', e); stays = { error: e.message }; }
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
    try { stays = await membership.awardStayPoints(pool); } catch (e) { console.error('[membership] award-stays în cron:', e); stays = { error: e.message }; }
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
  // plățile online (avansuri Stripe) — adminul le potrivește pe rezervări după ref
  // (smoobu_id); fără LIMIT mic: tabela crește lent (doar rezervări directe plătite),
  // iar un cap arbitrar ar face badge-ul să dispară de pe rezervările mai vechi
  const p = await pool.query(
    `SELECT ref, amount, currency, status, guest_email, created_at FROM payments
     WHERE status = 'paid' AND ref IS NOT NULL ORDER BY created_at DESC LIMIT 5000`
  );
  res.json({ bookings: r.rows, payments: p.rows });
});
/* Financiar: toate plățile online, cu comision/net/refund. La fiecare încărcare
   completăm comisioanele lipsă (max 10 — apel Stripe per plată, best-effort). */
app.get('/api/v1/admin/finance', requirePerm('financiar'), async (_req, res) => {
  const stripeConfigured = Boolean((process.env.STRIPE_SECRET_KEY || '').trim());
  if (stripeConfigured) {
    try {
      const missing = await pool.query(
        `SELECT session_id, COALESCE(payment_intent, raw->>'payment_intent') AS pi
         FROM payments
         WHERE fee IS NULL AND status IN ('paid', 'refunded', 'disputed')
           AND COALESCE(payment_intent, raw->>'payment_intent') IS NOT NULL
         ORDER BY created_at DESC LIMIT 10`
      );
      for (const row of missing.rows) {
        const f = await stripeFeeFor(row.pi);
        if (f) {
          await pool.query(
            'UPDATE payments SET fee = $2, net = $3, payment_intent = COALESCE(payment_intent, $4) WHERE session_id = $1',
            [row.session_id, f.fee, f.net, row.pi]
          );
        }
      }
    } catch (e) { console.error('[finance] backfill:', e.message); }
  }
  const r = await pool.query(
    `SELECT session_id, ref, amount, currency, status, guest_email, fee, net,
            refund_amount, refunded_at,
            COALESCE(payment_intent, raw->>'payment_intent') AS payment_intent, created_at
     FROM payments ORDER BY created_at DESC LIMIT 1000`
  );
  res.json({ payments: r.rows, stripeConfigured });
});

/* ============ Marketing: campanii Meta Ads (Graph API, doar citire) ============
   Portat din dashboard-ul TravelScan: insights la nivel de cont + pe campanii,
   cu purchases/valoare (pixelul Roots) → ROAS. Tokenul (ads_read) și contul se
   salvează din admin în settings (fără redeploy); env META_ADS_TOKEN e fallback.
   Cache 30 min per interval — Graph API are rate limits stricte. */
let adsCache = new Map(); // days -> { at, value }

async function metaAdsConfig() {
  try {
    const r = await pool.query("SELECT value FROM settings WHERE key = 'meta_ads'");
    const v = (r.rows[0] && r.rows[0].value) || {};
    if (v.token && v.accountId) return { token: String(v.token), accountId: String(v.accountId) };
  } catch (e) { /* tabela poate lipsi la primul boot */ }
  const token = (process.env.META_ADS_TOKEN || '').trim();
  const accountId = (process.env.META_AD_ACCOUNT_ID || '').trim();
  return token && accountId ? { token, accountId } : null;
}
const metaActId = (id) => (String(id).startsWith('act_') ? String(id) : 'act_' + String(id).replace(/\D+/g, ''));

async function metaGet(cfg, path, params) {
  const q = new URLSearchParams({ ...params, access_token: cfg.token });
  const r = await fetch('https://graph.facebook.com/v21.0/' + path + '?' + q.toString(), { signal: AbortSignal.timeout(20000) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error('Meta API ' + r.status + ': ' + JSON.stringify(j.error && j.error.message ? j.error.message : j).slice(0, 200));
  return j;
}

// purchases + valoarea lor din listele actions/action_values ale Graph API
function metaActions(actions, values) {
  let purchases = 0, leads = 0, purchaseValue = 0;
  for (const a of actions || []) {
    const t = String(a.action_type || '');
    if (t === 'purchase' || t.endsWith('.purchase') || t === 'offsite_conversion.fb_pixel_purchase') purchases = Math.max(purchases, Math.round(Number(a.value) || 0));
    if (t.includes('lead')) leads = Math.max(leads, Math.round(Number(a.value) || 0));
  }
  for (const a of values || []) {
    const t = String(a.action_type || '');
    if (t === 'purchase' || t.endsWith('.purchase') || t === 'offsite_conversion.fb_pixel_purchase') purchaseValue = Math.max(purchaseValue, Number(a.value) || 0);
  }
  return { purchases, leads, purchaseValue };
}

app.get('/api/v1/admin/marketing', requirePerm('marketing'), async (req, res) => {
  const cfg = await metaAdsConfig();
  if (!cfg) return res.json({ configured: false });
  const days = [7, 28, 90].includes(Number(req.query.days)) ? Number(req.query.days) : 28;
  const preset = { 7: 'last_7d', 28: 'last_28d', 90: 'last_90d' }[days];
  const hit = adsCache.get(days);
  if (req.query.refresh !== '1' && hit && Date.now() - hit.at < 30 * 60e3) return res.json(hit.value);
  try {
    const account = metaActId(cfg.accountId);
    const [meta, acc, camp] = await Promise.all([
      metaGet(cfg, account, { fields: 'currency,name' }),
      metaGet(cfg, account + '/insights', { fields: 'spend,impressions,clicks,ctr,cpc,reach,actions,action_values', date_preset: preset }),
      metaGet(cfg, account + '/insights', {
        level: 'campaign',
        fields: 'campaign_name,spend,impressions,clicks,cpc,ctr,actions,action_values',
        date_preset: preset, sort: 'spend_descending', limit: '25',
      }),
    ]);
    const row = (acc.data && acc.data[0]) || {};
    const sums = metaActions(row.actions, row.action_values);
    const spend = Number(row.spend) || 0;
    const value = {
      configured: true, days,
      currency: meta.currency || '', accountName: meta.name || '',
      summary: {
        spend, impressions: Number(row.impressions) || 0, clicks: Number(row.clicks) || 0,
        ctr: Number(row.ctr) || 0, cpc: Number(row.cpc) || 0, reach: Number(row.reach) || 0,
        purchases: sums.purchases, purchaseValue: sums.purchaseValue, leads: sums.leads,
        roas: spend > 0 && sums.purchaseValue > 0 ? sums.purchaseValue / spend : null,
      },
      campaigns: (camp.data || []).map((c) => {
        const s = metaActions(c.actions, c.action_values);
        return {
          name: c.campaign_name || '(fără nume)', spend: Number(c.spend) || 0,
          impressions: Number(c.impressions) || 0, clicks: Number(c.clicks) || 0,
          cpc: Number(c.cpc) || 0, ctr: Number(c.ctr) || 0,
          purchases: s.purchases, purchaseValue: s.purchaseValue,
        };
      }),
      generatedAt: new Date().toISOString(),
    };
    adsCache.set(days, { at: Date.now(), value });
    res.json(value);
  } catch (e) {
    res.status(502).json({ configured: true, error: String((e && e.message) || e) });
  }
});

/* configurarea (token + ad account) — doar owner; tokenul nu se întoarce niciodată întreg */
app.get('/api/v1/admin/marketing/config', requireOwnerStrict, async (_req, res) => {
  const cfg = await metaAdsConfig();
  res.json({ configured: !!cfg, accountId: cfg ? cfg.accountId : '', tokenHint: cfg && cfg.token ? '···' + cfg.token.slice(-4) : '' });
});
app.post('/api/v1/admin/marketing/config', requireOwnerStrict, async (req, res) => {
  const token = String((req.body && req.body.token) || '').trim();
  const accountId = String((req.body && req.body.accountId) || '').trim();
  if (!token || !accountId) return res.status(400).json({ error: 'Token-ul și Ad Account ID-ul sunt obligatorii.' });
  await pool.query(
    `INSERT INTO settings (key, value, updated_at) VALUES ('meta_ads', $1, now())
     ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = now()`,
    [JSON.stringify({ token, accountId })]
  );
  adsCache = new Map();
  res.json({ ok: true });
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
