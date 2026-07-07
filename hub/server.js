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

/* ============ AUTH ============ */
app.post('/api/v1/auth/login', async (req, res) => {
  const { email, password, remember } = req.body || {};
  const r = await pool.query('SELECT * FROM users WHERE lower(email) = lower($1)', [String(email || '')]);
  const user = r.rows[0];
  if (!user || !(await verifyPassword(password, user.password_hash))) {
    return res.status(401).json({ error: 'Email sau parolă greșite' });
  }
  setAuthCookie(req, res, user, Boolean(remember));
  res.json({ ok: true, user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

app.post('/api/v1/auth/logout', (req, res) => {
  clearAuthCookie(req, res);
  res.json({ ok: true });
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

/* Optimizarea imaginii se face în BROWSER (canvas → JPEG 1920px + thumb 480px),
   ca payload-ul să încapă în limita serverless Vercel (4,5MB/request). */
app.post('/api/v1/media', requireAuth, async (req, res) => {
  try {
    const { filename, mainBase64, thumbBase64, width, height, alt } = req.body || {};
    if (!mainBase64) return res.status(400).json({ error: 'mainBase64 obligatoriu' });
    const main = Buffer.from(mainBase64, 'base64');
    const thumb = thumbBase64 ? Buffer.from(thumbBase64, 'base64') : null;

    const id = crypto.randomUUID();
    const safe = String(filename || 'imagine.jpg').toLowerCase().replace(/[^a-z0-9.]+/g, '-').slice(0, 60);
    const key = `hub/${id}-${safe.replace(/\.[a-z0-9]+$/, '')}.jpg`;
    const thumbKey = `hub/${id}-thumb.jpg`;

    const url = await storage.putObject(key, main, 'image/jpeg');
    const thumbUrl = thumb ? await storage.putObject(thumbKey, thumb, 'image/jpeg') : null;

    const r = await pool.query(
      `INSERT INTO media (id, storage_key, url, thumb_url, alt, width, height, bytes, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING *`,
      [id, key, url, thumbUrl, alt || null, width || null, height || null, main.length, req.user.id]
    );
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
