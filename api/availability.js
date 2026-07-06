import crypto from "node:crypto";

/* ============================================================
   Proxy serverless (Vercel) pentru disponibilitatea Smoobu.
   Autentificare HMAC-SHA256 (metoda curentă Smoobu):
   headere X-API-Key, X-Timestamp, X-Nonce, X-Signature.
   Cheia + secretul stau în env (SMOOBU_API_KEY, SMOOBU_API_SECRET)
   și NU ajung niciodată în frontend.

   Frontend:  GET /api/availability?apartmentId=123&startDate=2026-07-01&endDate=2026-08-31
   Smoobu:    GET https://login.smoobu.com/api/rates?apartments[]=123&start_date=...&end_date=...
   Răspuns:   { "YYYY-MM-DD": 0|1 }   (1 = liber, 0 = ocupat)
   ============================================================ */

const BASE = "https://login.smoobu.com";
const RATES_PATH = "/api/rates";
const DIAG_VERSION = "hmac-v1";

const clean = (v) => (v || "").trim().replace(/^["']|["']$/g, "");
function fingerprint(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

export default async function handler(req, res) {
  const { apartmentId, startDate, endDate } = req.query || {};
  const apiKey = clean(process.env.SMOOBU_API_KEY);
  const apiSecret = clean(process.env.SMOOBU_API_SECRET);

  if (!startDate || !endDate) {
    return res.status(400).json({ error: "startDate și endDate sunt obligatorii (YYYY-MM-DD)." });
  }

  const diag = {
    version: DIAG_VERSION,
    keyPresent: !!apiKey,
    keyLen: apiKey.length,
    keyFp: apiKey ? fingerprint(apiKey) : 0,
    secretPresent: !!apiSecret,
    secretLen: apiSecret.length,
    apartmentId: apartmentId || null,
  };

  // Lipsește ceva -> date demonstrative, ca UI-ul să funcționeze.
  if (!apiKey || !apiSecret || !apartmentId) {
    return res.status(200).json({
      availability: mockAvailability(startDate, endDate),
      mock: true,
      note: "lipsă SMOOBU_API_KEY / SMOOBU_API_SECRET / apartmentId",
      diag,
    });
  }

  // 1) query canonic — perechi sortate alfabetic, paranteze [] literale
  const canonicalQuery = [
    `apartments[]=${apartmentId}`,
    `end_date=${endDate}`,
    `start_date=${startDate}`,
  ].sort().join("&");

  // 2) componente semnătură
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z"); // ISO 8601 UTC, fără milisecunde
  const nonce = crypto.randomUUID();
  const bodyHash = crypto.createHash("sha256").update("").digest("hex"); // GET -> body gol

  // 3) string canonic + semnătură HMAC-SHA256 (base64)
  const canonical = ["GET", RATES_PATH, canonicalQuery, timestamp, nonce, bodyHash, apiKey].join("\n");
  const signature = crypto.createHmac("sha256", apiSecret).update(canonical).digest("base64");

  const url = `${BASE}${RATES_PATH}?${canonicalQuery}`;
  try {
    const r = await fetch(url, {
      method: "GET",
      headers: {
        "X-API-Key": apiKey,
        "X-Timestamp": timestamp,
        "X-Nonce": nonce,
        "X-Signature": signature,
        "Content-Type": "application/json",
      },
    });
    if (!r.ok) {
      const body = await r.text().catch(() => "");
      throw new Error(`Smoobu HTTP ${r.status} ${body.slice(0, 200)}`);
    }
    const json = await r.json();
    const perApt = (json && json.data && json.data[apartmentId]) || {};
    const availability = {};
    for (const [date, info] of Object.entries(perApt)) {
      availability[date] = info && typeof info.available === "number" ? info.available : 1;
    }
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json({ availability, mock: false });
  } catch (e) {
    // Nu stricăm pagina dacă Smoobu e indisponibil — cădem pe date demonstrative.
    return res.status(200).json({
      availability: mockAvailability(startDate, endDate),
      mock: true,
      note: String((e && e.message) || e),
      diag,
    });
  }
}

/* Date demonstrative deterministe (fără random) — câteva zile marcate ocupate. */
function mockAvailability(startDate, endDate) {
  const out = {};
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  if (isNaN(start) || isNaN(end)) return out;
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    const day = d.getDate();
    out[key] = day % 7 === 3 || day % 7 === 4 || day % 11 === 0 ? 0 : 1;
  }
  return out;
}
