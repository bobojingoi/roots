import crypto from "node:crypto";

/* ============================================================
   Proxy serverless (Vercel) pentru disponibilitatea Smoobu.
   Autentificare HMAC-SHA256: X-API-Key, X-Timestamp, X-Nonce, X-Signature.
   Cheia + secretul din env (SMOOBU_API_KEY, SMOOBU_API_SECRET), niciodată în frontend.
   Răspuns: { "YYYY-MM-DD": 0|1 }  (1 = liber, 0 = ocupat)
   ============================================================ */

const BASE = "https://login.smoobu.com";
const RATES_PATH = "/api/v1/rates";
const DIAG_VERSION = "hmac-v2";

const clean = (v) => (v || "").trim().replace(/^["']|["']$/g, "");
function fingerprint(s) {
  let h = 5381;
  for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) >>> 0;
  return h;
}

/* Cerere GET semnată HMAC către Smoobu. Întoarce { status, text }. */
async function signedGet(path, canonicalQuery, apiKey, apiSecret) {
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const nonce = crypto.randomUUID();
  const bodyHash = crypto.createHash("sha256").update("").digest("hex");
  const canonical = ["GET", path, canonicalQuery, timestamp, nonce, bodyHash, apiKey].join("\n");
  const signature = crypto.createHmac("sha256", apiSecret).update(canonical).digest("base64");
  const url = `${BASE}${path}${canonicalQuery ? "?" + canonicalQuery : ""}`;
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
  const text = await r.text().catch(() => "");
  return { status: r.status, text };
}

export default async function handler(req, res) {
  const { apartmentId, startDate, endDate, debug } = req.query || {};
  const apiKey = clean(process.env.SMOOBU_API_KEY);
  const apiSecret = clean(process.env.SMOOBU_API_SECRET);

  if (!startDate || !endDate) {
    return res.status(400).json({ error: "startDate și endDate sunt obligatorii (YYYY-MM-DD)." });
  }

  const ratesQuery = [
    `apartments[]=${apartmentId}`,
    `end_date=${endDate}`,
    `start_date=${startDate}`,
  ].sort().join("&");

  /* --- mod de probă: descoperă calea corectă a endpoint-ului --- */
  if (debug === "1" && apiKey && apiSecret && apartmentId) {
    const candidates = [
      ["/api/v1/rates", ratesQuery],
      ["/api/rates", ratesQuery],
      ["/api/v1/availability", ratesQuery],
      ["/api/v1/apartments", ""],
      ["/api/apartments", ""],
    ];
    const results = [];
    for (const [p, q] of candidates) {
      try {
        const { status, text } = await signedGet(p, q, apiKey, apiSecret);
        results.push({ path: p, status, body: text.slice(0, 160) });
      } catch (e) {
        results.push({ path: p, error: String((e && e.message) || e) });
      }
    }
    return res.status(200).json({ debug: true, keyLen: apiKey.length, secretLen: apiSecret.length, results });
  }

  const diag = {
    version: DIAG_VERSION,
    keyPresent: !!apiKey, keyLen: apiKey.length, keyFp: apiKey ? fingerprint(apiKey) : 0,
    secretPresent: !!apiSecret, secretLen: apiSecret.length,
    apartmentId: apartmentId || null,
  };

  if (!apiKey || !apiSecret || !apartmentId) {
    return res.status(200).json({
      availability: mockAvailability(startDate, endDate),
      mock: true,
      note: "lipsă SMOOBU_API_KEY / SMOOBU_API_SECRET / apartmentId",
      diag,
    });
  }

  try {
    const { status, text } = await signedGet(RATES_PATH, ratesQuery, apiKey, apiSecret);
    if (status < 200 || status >= 300) throw new Error(`Smoobu HTTP ${status} ${text.slice(0, 200)}`);
    const json = JSON.parse(text);
    const perApt = (json && json.data && json.data[apartmentId]) || {};
    const availability = {};
    for (const [date, info] of Object.entries(perApt)) {
      availability[date] = info && typeof info.available === "number" ? info.available : 1;
    }
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json({ availability, mock: false });
  } catch (e) {
    return res.status(200).json({
      availability: mockAvailability(startDate, endDate),
      mock: true,
      note: String((e && e.message) || e),
      diag,
    });
  }
}

/* Date demonstrative deterministe (fără random). */
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
