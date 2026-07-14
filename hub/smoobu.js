// smoobu.js — client HMAC Smoobu (portat din integrarea site-ului, verificată în producție).
// Detalii critice: base login.smoobu.com, căi /api/*, canonical cu query sortat + %5B%5D,
// secret ca text brut, timestamp ISO fără milisecunde.
require('dotenv').config();
const crypto = require('crypto');

const BASE = 'https://login.smoobu.com';
const clean = (v) => (v || '').trim().replace(/^["']|["']$/g, '');

function smoobuReady() {
  return Boolean(clean(process.env.SMOOBU_API_KEY) && clean(process.env.SMOOBU_API_SECRET));
}

async function signedGet(path, query) {
  const apiKey = clean(process.env.SMOOBU_API_KEY);
  const apiSecret = clean(process.env.SMOOBU_API_SECRET);
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const nonce = crypto.randomUUID();
  const bodyHash = crypto.createHash('sha256').update('').digest('hex');
  const canonical = ['GET', path, query || '', timestamp, nonce, bodyHash, apiKey].join('\n');
  const signature = crypto.createHmac('sha256', apiSecret).update(canonical).digest('base64');
  const r = await fetch(`${BASE}${path}${query ? '?' + query : ''}`, {
    headers: {
      'X-API-Key': apiKey,
      'X-Timestamp': timestamp,
      'X-Nonce': nonce,
      'X-Signature': signature,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(20000),
  });
  const text = await r.text().catch(() => '');
  if (r.status < 200 || r.status >= 300) throw new Error(`Smoobu HTTP ${r.status} ${text.slice(0, 160)}`);
  return JSON.parse(text);
}

// POST semnat (creare rezervări) — canonical: QUERY = linie goală, BODY_HASH pe JSON-ul exact trimis
async function signedPost(path, bodyObj) {
  const apiKey = clean(process.env.SMOOBU_API_KEY);
  const apiSecret = clean(process.env.SMOOBU_API_SECRET);
  const body = JSON.stringify(bodyObj);
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
  const nonce = crypto.randomUUID();
  const bodyHash = crypto.createHash('sha256').update(body).digest('hex');
  const canonical = ['POST', path, '', timestamp, nonce, bodyHash, apiKey].join('\n');
  const signature = crypto.createHmac('sha256', apiSecret).update(canonical).digest('base64');
  const r = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      'X-API-Key': apiKey,
      'X-Timestamp': timestamp,
      'X-Nonce': nonce,
      'X-Signature': signature,
      'Content-Type': 'application/json',
    },
    body,
    signal: AbortSignal.timeout(20000),
  });
  const text = await r.text().catch(() => '');
  if (r.status < 200 || r.status >= 300) throw new Error(`Smoobu HTTP ${r.status} ${text.slice(0, 200)}`);
  return JSON.parse(text);
}

module.exports = { signedGet, signedPost, smoobuReady };
