// db.js — pg Pool către Supabase Postgres (schema "hub") + bootstrap schema.sql
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Pool } = require('pg');

// Parola poate conține caractere speciale (!?) — le encodăm ca URL-ul să fie valid.
function sanitizeDbUrl(raw) {
  const uri = (raw || '').trim().replace(/^["']|["']$/g, '');
  const m = uri.match(/^(postgres(?:ql)?:\/\/)([^:@/]+):(.*)@([^@]+)$/);
  if (!m) return uri;
  const [, proto, user, pass, rest] = m;
  return `${proto}${encodeURIComponent(user)}:${encodeURIComponent(pass)}@${rest}`;
}

const pool = new Pool({
  connectionString: sanitizeDbUrl(process.env.DATABASE_URL),
  max: 5,
  // Supabase session pooler: SSL obligatoriu
  ssl: { rejectUnauthorized: false },
  // toate query-urile lucrează în schema hub
  options: '-c search_path=hub,public',
});

async function initDb() {
  const sql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(sql);
  console.log('[db] schema hub ok');
}

module.exports = { pool, initDb };
