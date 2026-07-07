/* Roots Hub — server (Faza 1)
   API-first: adminul e doar un client al /api/v1/*.
   Public: GET /api/v1/site-content (doar conținut publicat, cu ETag). */
require('dotenv').config();
const path = require('path');
const crypto = require('crypto');
const express = require('express');

const { pool, initDb } = require('./db');
const { emit } = require('./events');
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

/* ============ cache public site-content (invalidat la publicare) ============ */
let siteCache = null; // { etag, body }

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
  siteCache = { etag, body };
  return siteCache;
}

/* ============ PUBLIC ============ */
app.get('/api/v1/site-content', async (req, res) => {
  try {
    const cache = siteCache || (await buildSiteContent());
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
let gReviewsCache = null; // { at, data }
app.get('/api/v1/google-reviews', async (_req, res) => {
  const key = (process.env.GOOGLE_PLACES_API_KEY || '').trim();
  const placeId = (process.env.GOOGLE_PLACE_ID || '').trim();
  if (!key || !placeId) return res.json({ configured: false, rating: null, reviews: [] });
  if (gReviewsCache && Date.now() - gReviewsCache.at < 6 * 3600e3) return res.json(gReviewsCache.data);
  try {
    const r = await fetch(
      `https://maps.googleapis.com/maps/api/place/details/json?place_id=${encodeURIComponent(placeId)}` +
        `&fields=rating,user_ratings_total,reviews&language=ro&key=${key}`
    );
    const j = await r.json();
    const out = {
      configured: true,
      rating: (j.result && j.result.rating) || null,
      total: (j.result && j.result.user_ratings_total) || 0,
      reviews: ((j.result && j.result.reviews) || []).map((rv) => ({
        name: rv.author_name,
        rating: rv.rating,
        text: rv.text,
        time: rv.relative_time_description,
        photo: rv.profile_photo_url,
      })),
    };
    gReviewsCache = { at: Date.now(), data: out };
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
app.get('/api/v1/editor-token', requireAuth, (req, res) => {
  const { signToken } = require('./auth');
  res.json({
    token: signToken({ id: req.user.id, role: req.user.role, email: req.user.email }, 2 * 60 * 60),
    siteUrl: process.env.SITE_URL || 'https://roots-opal.vercel.app',
  });
});

app.get('/api/v1/auth/me', requireAuth, async (req, res) => {
  const r = await pool.query('SELECT id, email, name, role FROM users WHERE id = $1', [req.user.id]);
  res.json({ user: r.rows[0] || null });
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
app.get('/api/v1/sections', requireAuth, async (_req, res) => {
  const r = await pool.query(
    'SELECT section_key, draft, published, published_at, updated_at FROM site_content ORDER BY section_key'
  );
  res.json({ sections: r.rows });
});

app.put('/api/v1/sections/:key', requireAuth, async (req, res) => {
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

app.post('/api/v1/sections/:key/publish', requireAuth, async (req, res) => {
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

app.get('/api/v1/sections/:key/versions', requireAuth, async (req, res) => {
  const r = await pool.query(
    'SELECT id, content, published_at FROM site_content_versions WHERE section_key = $1 ORDER BY published_at DESC LIMIT 10',
    [req.params.key]
  );
  res.json({ versions: r.rows });
});

app.post('/api/v1/sections/:key/restore/:versionId', requireAuth, async (req, res) => {
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
app.get('/api/v1/media', requireAuth, async (_req, res) => {
  const r = await pool.query('SELECT * FROM media ORDER BY created_at DESC LIMIT 500');
  res.json({ media: r.rows });
});

/* Optimizarea imaginii se face în BROWSER (canvas → WebP/JPEG 1920px + thumb 480px),
   ca payload-ul să încapă în limita serverless Vercel (4,5MB/request). */
app.post('/api/v1/media', requireAuth, async (req, res) => {
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

app.patch('/api/v1/media/:id', requireAuth, async (req, res) => {
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
  const r = await pool.query('SELECT id, email, name, role, created_at FROM users ORDER BY created_at');
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
app.get('/api/v1/admin/activity', requireAuth, async (_req, res) => {
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
  const r = await pool.query('SELECT slug, title, excerpt, cover, body, seo_title, seo_description, published_at FROM posts WHERE slug = $1 AND published_at IS NOT NULL', [req.params.slug]);
  if (!r.rows.length) return res.status(404).json({ error: 'Articol inexistent' });
  res.setHeader('Cache-Control', 'public, max-age=60');
  res.json({ post: r.rows[0] });
});
// admin
app.get('/api/v1/admin/posts', requireAuth, async (_req, res) => {
  const r = await pool.query('SELECT * FROM posts ORDER BY created_at DESC');
  res.json({ posts: r.rows });
});
app.post('/api/v1/admin/posts', requireAuth, async (req, res) => {
  const { title, slug, excerpt, cover, body, seo_title, seo_description } = req.body || {};
  if (!title) return res.status(400).json({ error: 'Titlul e obligatoriu' });
  const finalSlug = (slug || title).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80);
  try {
    const r = await pool.query(
      `INSERT INTO posts (title, slug, excerpt, cover, body, seo_title, seo_description) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [title, finalSlug, excerpt || '', cover || '', body || '', seo_title || '', seo_description || '']
    );
    await emit('PostCreated', { slug: finalSlug, by: req.user.email });
    res.json({ ok: true, post: r.rows[0] });
  } catch (e) {
    res.status(400).json({ error: e.message.includes('duplicate') ? 'Slug deja folosit' : e.message });
  }
});
app.put('/api/v1/admin/posts/:id', requireAuth, async (req, res) => {
  const { title, slug, excerpt, cover, body, seo_title, seo_description } = req.body || {};
  const r = await pool.query(
    `UPDATE posts SET title=COALESCE($2,title), slug=COALESCE($3,slug), excerpt=COALESCE($4,excerpt), cover=COALESCE($5,cover),
       body=COALESCE($6,body), seo_title=COALESCE($7,seo_title), seo_description=COALESCE($8,seo_description), updated_at=now()
     WHERE id=$1 RETURNING *`,
    [req.params.id, title, slug, excerpt, cover, body, seo_title, seo_description]
  );
  if (!r.rows.length) return res.status(404).json({ error: 'Articol inexistent' });
  res.json({ ok: true, post: r.rows[0] });
});
app.post('/api/v1/admin/posts/:id/publish', requireAuth, async (req, res) => {
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

app.post('/api/v1/admin/sync-smoobu', requireAuth, async (req, res) => {
  try {
    const startPage = Math.max(1, parseInt(req.body && req.body.startPage, 10) || 1);
    const out = await runSmoobuSync(startPage);
    res.json({ ok: true, ...out });
  } catch (e) {
    res.status(502).json({ ok: false, error: e.message });
  }
});
// cron Vercel (GET, protejat de header-ul x-vercel-cron)
app.get('/api/v1/cron/sync-smoobu', async (req, res) => {
  if (!req.headers['x-vercel-cron'] && !req.user) return res.status(401).json({ error: 'Doar cron sau autentificat' });
  try { res.json({ ok: true, ...(await runSmoobuSync(1, 8)) }); }
  catch (e) { res.status(502).json({ ok: false, error: e.message }); }
});

app.get('/api/v1/admin/stats', requireAuth, async (req, res) => {
  const year = parseInt(req.query.year, 10) || null;
  const byChannel = await pool.query(
    `SELECT status, COALESCE(channel, 'Direct / Website') AS channel,
            count(*)::int AS n, COALESCE(sum(value),0)::float AS revenue,
            COALESCE(sum(departure - arrival),0)::int AS nights
     FROM bookings
     WHERE status <> 'blocked' AND ($1::int IS NULL OR extract(year from arrival) = $1)
     GROUP BY status, channel`,
    [year]
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

app.get('/api/v1/admin/bookings', requireAuth, async (_req, res) => {
  const r = await pool.query(
    `SELECT b.*, g.name AS guest_name, g.email AS guest_email, g.phone AS guest_phone
     FROM bookings b LEFT JOIN guests g ON g.id = b.guest_id
     ORDER BY b.arrival DESC LIMIT 300`
  );
  res.json({ bookings: r.rows });
});
app.get('/api/v1/admin/guests', requireAuth, async (_req, res) => {
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
app.patch('/api/v1/admin/guests/:id', requireAuth, async (req, res) => {
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
