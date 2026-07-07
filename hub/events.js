// events.js — evenimente interne decuplate (fundația webhook-urilor Travelscan)
// Emit: BookingCreated, StayCompleted, GuestUpdated, CampaignSent, ContentPublished
const { pool } = require('./db');

const listeners = new Map(); // event -> [fn]

function on(event, fn) {
  if (!listeners.has(event)) listeners.set(event, []);
  listeners.get(event).push(fn);
}

async function emit(event, payload = {}) {
  // jurnalizăm întotdeauna (audit + replay pentru integrarea viitoare)
  try {
    await pool.query('INSERT INTO events_log (event, payload) VALUES ($1, $2)', [
      event,
      JSON.stringify(payload),
    ]);
  } catch (e) {
    console.error('[events] log fail', event, e.message);
  }
  for (const fn of listeners.get(event) || []) {
    // listenerii nu blochează și nu dărâmă fluxul principal
    Promise.resolve()
      .then(() => fn(payload))
      .catch((e) => console.error('[events] listener fail', event, e.message));
  }
}

module.exports = { on, emit };
