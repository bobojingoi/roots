import crypto from "node:crypto";

/* ============================================================
   Semnare HMAC-SHA256 pentru API-ul Smoobu (partajat între funcții).
   Fișier prefixat cu _ => Vercel NU îl expune ca endpoint.
   Detalii (empiric, contra API-ului real):
   - base https://login.smoobu.com, căi /api/... (fără /api/v1);
   - canonical: METHOD\nPATH\nQUERY\nTIMESTAMP\nNONCE\nBODY_HASH\nAPI_KEY;
   - GET: BODY_HASH = SHA256 hex al string-ului gol; query cu params sortați
     alfabetic ȘI paranteze codate (apartments%5B%5D);
   - POST: QUERY = "" (linie goală); BODY_HASH = SHA256 hex al JSON-ului exact trimis;
   - semnătură = base64(HMAC-SHA256(canonical, secret)); secret ca text brut;
   - X-Timestamp = ISO 8601 UTC fără milisecunde.
   ============================================================ */

export const BASE = "https://login.smoobu.com";
export const clean = (v) => (v || "").trim().replace(/^["']|["']$/g, "");

function authHeaders(method, path, query, body, apiKey, apiSecret) {
  const timestamp = new Date().toISOString().replace(/\.\d{3}Z$/, "Z");
  const nonce = crypto.randomUUID();
  const bodyHash = crypto.createHash("sha256").update(body || "").digest("hex");
  const canonical = [method, path, query || "", timestamp, nonce, bodyHash, apiKey].join("\n");
  const signature = crypto.createHmac("sha256", apiSecret).update(canonical).digest("base64");
  return {
    "X-API-Key": apiKey,
    "X-Timestamp": timestamp,
    "X-Nonce": nonce,
    "X-Signature": signature,
    "Content-Type": "application/json",
  };
}

export async function signedGet(path, query, apiKey, apiSecret) {
  const headers = authHeaders("GET", path, query, "", apiKey, apiSecret);
  const r = await fetch(`${BASE}${path}${query ? "?" + query : ""}`, { method: "GET", headers });
  const text = await r.text().catch(() => "");
  return { status: r.status, text };
}

export async function signedPost(path, bodyObj, apiKey, apiSecret) {
  const body = JSON.stringify(bodyObj);
  const headers = authHeaders("POST", path, "", body, apiKey, apiSecret);
  const r = await fetch(`${BASE}${path}`, { method: "POST", headers, body });
  const text = await r.text().catch(() => "");
  return { status: r.status, text };
}
