// seed-smart.js — Smart Roots Faza 1: instanța HA (mock) + dispozitivele
// de pornire pentru Vila Redwood. Entity_id-urile sunt PLACEHOLDER-e —
// se editează din admin → Smart Roots când există lista reală din HA.
// Idempotent (ON CONFLICT DO NOTHING / upsert pe instanță).
require('dotenv').config();
const { pool, initDb } = require('./db');

const DEVICES = [
  { villa: 'redwood', entity: 'light.terasa', type: 'light', label: 'Lumini terasă', caps: ['turn_on', 'turn_off', 'toggle'], cls: 'comfort', sort: 1 },
  { villa: 'redwood', entity: 'light.living', type: 'light', label: 'Lumini living', caps: ['turn_on', 'turn_off', 'toggle'], cls: 'comfort', sort: 2 },
  { villa: 'redwood', entity: 'switch.ciubar', type: 'hottub', label: 'Ciubăr', caps: ['turn_on', 'turn_off'], cls: 'comfort', sort: 3 },
  { villa: 'redwood', entity: 'climate.parter', type: 'climate', label: 'Termostat parter', caps: ['turn_on', 'turn_off', 'set_temperature'], cls: 'comfort', sort: 4 },
  { villa: 'redwood', entity: 'cover.poarta', type: 'gate', label: 'Poartă auto', caps: ['open', 'close'], cls: 'comfort', sort: 5 },
  { villa: 'redwood', entity: 'lock.usa_principala', type: 'lock', label: 'Ușă principală', caps: ['lock', 'unlock'], cls: 'operational', sort: 6 },
  { villa: 'redwood', entity: 'sensor.presiune_centrala', type: 'sensor', label: 'Presiune centrală Viessmann', caps: [], cls: 'restricted', sort: 7 },
];

(async () => {
  await initDb();
  await pool.query(
    `INSERT INTO ha_instances (villa, base_url, token_env, remote_method, status)
     VALUES ('redwood', NULL, 'HA_REDWOOD_TOKEN', 'nabucasa', 'mock')
     ON CONFLICT (villa) DO NOTHING`
  );
  let added = 0;
  for (const d of DEVICES) {
    const r = await pool.query(
      `INSERT INTO devices (villa, ha_entity_id, type, label, capabilities, safety_class, sort)
       VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (villa, ha_entity_id) DO NOTHING RETURNING id`,
      [d.villa, d.entity, d.type, d.label, JSON.stringify(d.caps), d.cls, d.sort]
    );
    if (r.rows.length) { added++; console.log('adăugat:', d.villa, d.label, `(${d.entity})`); }
  }
  console.log(added ? `${added} dispozitive noi` : 'dispozitivele existau deja');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
