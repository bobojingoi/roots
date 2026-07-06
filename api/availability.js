import crypto from "node:crypto";

/* ============================================================
   Proxy serverless (Vercel) pentru disponibilitatea Smoobu.

   Autentificare HMAC-SHA256 (metoda curentă Smoobu):
   headere X-API-Key, X-Timestamp, X-Nonce, X-Signature.
   Cheia + secretul din env (SMOOBU_API_KEY = „Label", SMOOBU_API_SECRET = „Secret"),
   niciodată expuse în frontend.

   Frontend:  GET /api/availability?apartmentId=123&startDate=2026-07-01&endDate=2026-08-31
   Smoobu:    GET https://login.smoobu.com/api/rates?apartments%5B%5D=123&end_date=...&start_date=...
   Răspuns:   { availability: { "YYYY-MM-DD": 0|1 }, mock: false }   (1 = liber, 0 = ocupat)

   Note importante (obținute empiric contra API-ului real):
   - endpoint-ul e /api/rates (fără /api/v1);
   - în string-ul canonic, parametrii se sortează alfabetic ȘI parantezele
     trebuie codate ca %5B%5D (apartments%5B%5D) — altfel semnătura nu se validează;
   - secretul se folosește ca text brut în HMAC (nu se decodează din base64);
   - X-Timestamp în ISO 8601 UTC fără milisecunde.
   ============================================================ */

const BASE = "https://login.smoobu.com";
const RATES_PATH = "/api/rates";

const clean = (v) => (v || "").trim().replace(/^["']|["']$/g, "");

export default async function handler(req, res) {
  const { apartmentId, startDate, endDate } = req.query || {};
  const apiKey = clean(process.env.SMOOBU_API_KEY);
  const apiSecret = clean(process.env.SMOOBU_API_SECRET);

  if (!startDate || !endDate) {
    return res.status(400).json({ error: "startDate și endDate sunt obligatorii (YYYY-MM-DD)." });
  }

  // Lipsește o credențială / ID -> date demonstrative, ca UI-ul să funcționeze oricum.
  if (!apiKey || !apiSecret || !apartmentId) {
    return res.status(200).json({ availability: mockAvailability(startDate, endDate), mock: true });
  }

  // query canonic: perechi sortate alfabetic, paranteze codate (%5B%5D)
  const query = [
    `apartments%5B%5D=${apartmentId}`,
    `end_date=${endDate}`,
    `start_date=${startDate}`,
  ].sort().join("&");

  try {
    const { status, text } = await signedGet(RATES_PATH, query, apiKey, apiSecret);
    if (status < 200 || status >= 300) throw new Error(`Smoobu HTTP ${status}`);
    const json = JSON.parse(text);
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
    });
  }
}

/* Cerere GET semnată HMAC-SHA256 către Smoobu. Întoarce { status, text }. */
async function signedGet(path, query, apiKey, apiSecret) {
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const nonce = crypto.randomUUID();
  const bodyHash = crypto.createHash("sha256").update("").digest("hex"); // GET -> corp gol
  const canonical = ["GET", path, query, timestamp, nonce, bodyHash, apiKey].join("\n");
  const signature = crypto.createHmac("sha256", apiSecret).update(canonical).digest("base64");
  const r = await fetch(`${BASE}${path}?${query}`, {
    method: "GET",
    headers: {
      "X-API-Key": apiKey,
      "X-Timestamp": timestamp,
      "X-Nonce": nonce,
      "X-Signature": signature,
      "Content-Type": "application/json",
    },
  });
  const text = await r.text().catch(() => "");
  return { status: r.status, text };
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
