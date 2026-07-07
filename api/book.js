import { clean, signedGet, signedPost } from "./_smoobu.js";

/* ============================================================
   Creare rezervare Smoobu (POST /api/reservations).
   SIGURANȚĂ:
   - dry-run implicit: NU creează rezervări reale decât dacă
     env BOOKING_LIVE === "true";
   - re-verifică disponibilitatea și recalculează prețul server-side
     (nu ne bazăm pe ce trimite clientul) — anti dublă-rezervare / manipulare preț;
   - probă de semnătură: { probe: true } trimite un POST minim; dacă Smoobu
     răspunde 422 (validare) și nu 401 (auth), semnarea HMAC POST e corectă,
     fără a crea vreo rezervare.
   ============================================================ */

const RESERVATIONS_PATH = "/api/reservations";
const RATES_PATH = "/api/rates";
const CHANNEL_DIRECT = 70; // canalul „booking direct" din Smoobu

const addDay = (s) => {
  const d = new Date(s + "T00:00:00");
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

export default async function handler(req, res) {
  const apiKey = clean(process.env.SMOOBU_API_KEY);
  const apiSecret = clean(process.env.SMOOBU_API_SECRET);
  const live = clean(process.env.BOOKING_LIVE) === "true";
  const b = req.body || {};

  if (!apiKey || !apiSecret) {
    return res.status(200).json({ ok: false, error: "Server neconfigurat (credențiale Smoobu)." });
  }

  // --- probă de semnătură POST (nu creează rezervare; corp minim invalid -> 422 dacă auth OK) ---
  // accesibilă și prin GET ?probe=1 (pentru test rapid), și prin POST { probe: true }
  const isProbe = b.probe === true || (req.method === "GET" && (req.query || {}).probe === "1");
  if (isProbe) {
    const { status, text } = await signedPost(RESERVATIONS_PATH, { channelId: CHANNEL_DIRECT }, apiKey, apiSecret);
    return res.status(200).json({ probe: true, status, live, body: text.slice(0, 240) });
  }

  if (req.method !== "POST") return res.status(405).json({ error: "Doar POST." });

  const { apartmentId, arrivalDate, departureDate, adults = 2, children = 0, firstName, lastName, email, phone, notice } = b;
  if (!apartmentId || !arrivalDate || !departureDate) {
    return res.status(400).json({ ok: false, error: "apartmentId, arrivalDate și departureDate sunt obligatorii." });
  }

  // --- re-verifică disponibilitatea + recalculează prețul din Smoobu ---
  const q = [
    `apartments%5B%5D=${apartmentId}`,
    `end_date=${departureDate}`,
    `start_date=${arrivalDate}`,
  ].sort().join("&");

  let total = 0, nights = 0, allFree = true;
  try {
    const { status, text } = await signedGet(RATES_PATH, q, apiKey, apiSecret);
    if (status < 200 || status >= 300) throw new Error("rates HTTP " + status);
    const json = JSON.parse(text);
    const perApt = (json.data && json.data[apartmentId]) || {};
    for (let d = arrivalDate; d < departureDate; d = addDay(d)) {
      const info = perApt[d];
      if (!info || info.available === 0) allFree = false;
      total += (info && Number(info.price)) || 0;
      nights++;
    }
  } catch (e) {
    return res.status(502).json({ ok: false, error: "Nu am putut verifica disponibilitatea.", detail: String((e && e.message) || e) });
  }

  if (nights < 1) return res.status(400).json({ ok: false, error: "Interval invalid." });
  if (!allFree) return res.status(409).json({ ok: false, error: "Perioada tocmai a fost ocupată. Alege alte date." });

  const reservation = {
    arrivalDate,
    departureDate,
    apartmentId: Number(apartmentId),
    channelId: CHANNEL_DIRECT,
    firstName: firstName || "",
    lastName: lastName || "",
    email: email || "",
    phone: phone || "",
    adults: Number(adults) || 1,
    children: Number(children) || 0,
    price: total,
    notice: notice || "Rezervare de pe site (roots).",
  };

  // --- dry-run: validat, dar fără a crea rezervarea reală ---
  if (!live) {
    return res.status(200).json({ ok: true, dryRun: true, nights, price: total, reservation });
  }

  // --- live: creează rezervarea în Smoobu ---
  try {
    const { status, text } = await signedPost(RESERVATIONS_PATH, reservation, apiKey, apiSecret);
    if (status < 200 || status >= 300) throw new Error("reservations HTTP " + status + " " + text.slice(0, 200));
    const json = JSON.parse(text);
    return res.status(200).json({ ok: true, dryRun: false, reservationId: json.id || json.reservationId || null, price: total });
  } catch (e) {
    return res.status(502).json({ ok: false, error: "Rezervarea nu a putut fi creată.", detail: String((e && e.message) || e) });
  }
}
