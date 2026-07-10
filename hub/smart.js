// smart.js — motorul de permisiuni Smart Roots: UN SINGUR punct de adevăr.
// Politica e allowlist pe (rol × tip dispozitiv × acțiune) + vizibilitate pe
// safety_class. Tot ce nu e explicit permis e refuzat (fail-closed); UI-ul
// doar reflectă ce întoarce serverul.

// intervalul sigur de termostat pentru oaspeți (°C)
const GUEST_TEMP = { min: 18, max: 24 };

// clase de siguranță vizibile per rol; „restricted" (ex. presiunea centralei)
// e DOAR citire pentru admin — nimeni nu primește comenzi pe ea
const ROLE_RULES = {
  admin: {
    classes: ['comfort', 'operational', 'restricted'],
    actions: {
      light: ['turn_on', 'turn_off', 'toggle'],
      hottub: ['turn_on', 'turn_off', 'set_temperature'],
      climate: ['turn_on', 'turn_off', 'set_temperature'],
      lock: ['lock', 'unlock'],
      gate: ['open', 'close'],
      sensor: [], // senzorii sunt doar citire, pentru oricine
    },
  },
  cleaning: {
    classes: ['comfort', 'operational'],
    actions: {
      light: ['turn_on', 'turn_off', 'toggle'],
      hottub: ['turn_on'],                      // pornire pentru pregătire
      climate: ['turn_on', 'set_temperature'],  // pornește încălzirea
      lock: ['lock', 'unlock'],
      gate: ['open', 'close'],
      sensor: [],
    },
  },
  guest: {
    classes: ['comfort'],
    actions: {
      light: ['turn_on', 'turn_off', 'toggle'],
      hottub: ['turn_on', 'turn_off', 'set_temperature'],
      climate: ['set_temperature'],             // încălzirea doar indirect, prin termostat
      lock: [],                                 // ușa merge pe PIN, nu din aplicație
      gate: ['open', 'close'],
      sensor: [],
    },
  },
};

function rules(role) {
  return ROLE_RULES[role] || null; // rol necunoscut = fără acces
}

// dispozitivul e vizibil pentru rol?
function canSee(role, device) {
  const r = rules(role);
  return Boolean(r && device.active !== false && r.classes.includes(device.safety_class));
}

// acțiunile permise = intersecția (politică rol) ∩ (capabilitățile fizice ale dispozitivului)
function allowedActions(role, device) {
  const r = rules(role);
  if (!r || !canSee(role, device)) return [];
  const policy = r.actions[device.type] || []; // tip necunoscut = nimic
  const caps = Array.isArray(device.capabilities) ? device.capabilities : [];
  return policy.filter((a) => caps.includes(a));
}

// verifică o comandă; întoarce { ok, error?, value? } — value poate fi ajustat
// (ex. termostatul oaspetelui e limitat la intervalul sigur)
function checkCommand(role, device, action, value) {
  if (!canSee(role, device)) return { ok: false, error: 'Dispozitiv inexistent sau inaccesibil' };
  if (!allowedActions(role, device).includes(action)) return { ok: false, error: 'Acțiune nepermisă pentru rolul tău' };
  let v = value;
  if (action === 'set_temperature') {
    v = Number(value);
    if (!Number.isFinite(v)) return { ok: false, error: 'Temperatură invalidă' };
    if (role === 'guest') v = Math.min(GUEST_TEMP.max, Math.max(GUEST_TEMP.min, v));
    else v = Math.min(30, Math.max(10, v));
    v = Math.round(v * 2) / 2; // pași de 0,5 °C
  }
  return { ok: true, value: v };
}

// forma publică a unui dispozitiv; entity_id-ul HA e detaliu intern —
// îl vede doar adminul (îi trebuie la editare). Atributele către non-admin
// sunt pe WHITELIST: fără erori/diagnostice interne HA către oaspeți.
const PUBLIC_ATTRS = ['temperature', 'current_temperature', 'unit_of_measurement'];
function publicDevice(role, device, state) {
  const raw = (state && state.attributes) || {};
  const attributes = role === 'admin'
    ? raw
    : Object.fromEntries(PUBLIC_ATTRS.filter((k) => raw[k] !== undefined).map((k) => [k, raw[k]]));
  return {
    id: device.id,
    villa: device.villa,
    label: device.label,
    type: device.type,
    safety_class: device.safety_class,
    ...(role === 'admin' ? { entity_id: device.ha_entity_id } : {}),
    actions: allowedActions(role, device),
    state: state ? state.state : 'unknown',
    attributes,
  };
}

module.exports = { ROLE_RULES, GUEST_TEMP, canSee, allowedActions, checkCommand, publicDevice };
