// integrations/homeassistant.js — adaptorul Home Assistant al hub-ului.
// Hub-ul e SINGURUL client al HA: tokenul stă în env (ha_instances.token_env =
// numele variabilei), nu ajunge niciodată în frontend sau în răspunsuri API.
// Cât timp instanța nu e „live" (fără base_url/token), adaptorul rulează în
// mod MOCK: stările sunt persistate în settings (cheia smart_mock_states),
// deci demo-ul funcționează cap-coadă pe serverless, fără hardware.

const MOCK_KEY = 'smart_mock_states';
const HA_TIMEOUT = 8000; // ms — sub limita serverless

async function getInstance(pool, villa) {
  const r = await pool.query('SELECT * FROM ha_instances WHERE villa = $1', [villa]);
  return r.rows[0] || null;
}

function tokenFor(inst) {
  const name = inst && inst.token_env && String(inst.token_env).trim();
  // DOAR variabile dedicate HA_* — altfel un admin compromis ar putea exfiltra
  // orice secret din env (SMOOBU_API_SECRET etc.) către un base_url controlat
  if (!name || !/^HA_[A-Z0-9_]+$/.test(name)) return null;
  return process.env[name] || null;
}

function isLive(inst) {
  return Boolean(inst && inst.status === 'live' && inst.base_url && tokenFor(inst));
}

async function haFetch(inst, path, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), HA_TIMEOUT);
  try {
    const r = await fetch(String(inst.base_url).replace(/\/+$/, '') + path, {
      ...opts,
      signal: ctrl.signal,
      headers: {
        Authorization: 'Bearer ' + tokenFor(inst),
        'Content-Type': 'application/json',
        ...(opts.headers || {}),
      },
    });
    if (!r.ok) throw new Error('HA ' + r.status + ' ' + (await r.text().catch(() => '')).slice(0, 200));
    return await r.json().catch(() => ({}));
  } finally {
    clearTimeout(t);
  }
}

/* ---------- mock: stări persistate în settings ---------- */
function defaultState(entityId) {
  const domain = String(entityId).split('.')[0];
  if (domain === 'climate') return { state: 'heat', attributes: { temperature: 21, current_temperature: 19.5 } };
  if (domain === 'lock') return { state: 'locked', attributes: {} };
  if (domain === 'cover') return { state: 'closed', attributes: {} };
  if (domain === 'sensor') return { state: '1.4', attributes: { unit_of_measurement: 'bar' } };
  return { state: 'off', attributes: {} }; // light / switch
}

async function readMock(pool) {
  const r = await pool.query('SELECT value FROM settings WHERE key = $1', [MOCK_KEY]);
  return (r.rows[0] && r.rows[0].value) || {};
}

async function writeMock(pool, all) {
  await pool.query(
    `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, now())
     ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = now()`,
    [MOCK_KEY, JSON.stringify(all)]
  );
}

/* ---------- stări ---------- */
// întoarce { entity_id: { state, attributes } } pentru entitățile cerute
async function getStates(pool, villa, entityIds) {
  const inst = await getInstance(pool, villa);
  const out = {};
  if (isLive(inst)) {
    try {
      const all = await haFetch(inst, '/api/states');
      const byId = new Map((Array.isArray(all) ? all : []).map((s) => [s.entity_id, s]));
      for (const id of entityIds) {
        const s = byId.get(id);
        out[id] = s ? { state: s.state, attributes: s.attributes || {} } : { state: 'unavailable', attributes: {} };
      }
      return out;
    } catch (e) {
      for (const id of entityIds) out[id] = { state: 'unavailable', attributes: { error: e.message } };
      return out;
    }
  }
  const mock = await readMock(pool);
  const mv = mock[villa] || {};
  for (const id of entityIds) out[id] = mv[id] || defaultState(id);
  return out;
}

/* ---------- comenzi ---------- */
// (tip dispozitiv, acțiune) → apelul de serviciu HA; necunoscut = null (fail-closed).
// on/off/toggle doar pe domenii de confort — nu pe script/automation/etc.
const SWITCHABLE = ['light', 'switch', 'climate', 'fan', 'media_player', 'water_heater'];
function serviceFor(entityId, action, value) {
  const domain = String(entityId).split('.')[0];
  switch (action) {
    case 'turn_on': return SWITCHABLE.includes(domain) ? { domain, service: 'turn_on', data: {} } : null;
    case 'turn_off': return SWITCHABLE.includes(domain) ? { domain, service: 'turn_off', data: {} } : null;
    case 'toggle': return SWITCHABLE.includes(domain) ? { domain, service: 'toggle', data: {} } : null;
    case 'set_temperature':
      if (domain !== 'climate') return null;
      return { domain: 'climate', service: 'set_temperature', data: { temperature: Number(value) } };
    case 'lock': return domain === 'lock' ? { domain: 'lock', service: 'lock', data: {} } : null;
    case 'unlock': return domain === 'lock' ? { domain: 'lock', service: 'unlock', data: {} } : null;
    case 'open': return domain === 'cover' ? { domain: 'cover', service: 'open_cover', data: {} } : null;
    case 'close': return domain === 'cover' ? { domain: 'cover', service: 'close_cover', data: {} } : null;
    default: return null;
  }
}

async function callService(pool, villa, entityId, action, value) {
  const svc = serviceFor(entityId, action, value);
  if (!svc) throw new Error('Acțiune nesuportată pentru acest dispozitiv');
  const inst = await getInstance(pool, villa);
  if (isLive(inst)) {
    await haFetch(inst, `/api/services/${svc.domain}/${svc.service}`, {
      method: 'POST',
      body: JSON.stringify({ entity_id: entityId, ...svc.data }),
    });
    return { mode: 'live' };
  }
  // mock: aplicăm efectul pe starea persistată
  const mock = await readMock(pool);
  const mv = (mock[villa] = mock[villa] || {});
  const cur = mv[entityId] || defaultState(entityId);
  if (action === 'turn_on') cur.state = String(entityId).startsWith('climate.') ? 'heat' : 'on';
  else if (action === 'turn_off') cur.state = 'off';
  else if (action === 'toggle') cur.state = cur.state === 'on' ? 'off' : 'on';
  else if (action === 'set_temperature') cur.attributes = { ...cur.attributes, temperature: Number(value) };
  else if (action === 'lock') cur.state = 'locked';
  else if (action === 'unlock') cur.state = 'unlocked';
  else if (action === 'open') cur.state = 'open';
  else if (action === 'close') cur.state = 'closed';
  mv[entityId] = cur;
  await writeMock(pool, mock);
  return { mode: 'mock' };
}

module.exports = { getInstance, isLive, getStates, callService, serviceFor, tokenFor };
