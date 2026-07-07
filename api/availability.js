import { clean, signedGet } from "./_smoobu.js";

/* ============================================================
   Proxy serverless (Vercel) pentru disponibilitatea Smoobu.
   Autentificare HMAC (vezi _smoobu.js). Cheia + secretul din env.
   Frontend:  GET /api/availability?apartmentId=123&startDate=2026-07-01&endDate=2026-08-31
   Răspuns:   { availability: { "YYYY-MM-DD": 0|1 }, prices: { "YYYY-MM-DD": number }, mock }
   ============================================================ */

const RATES_PATH = "/api/rates";

export default async function handler(req, res) {
  const { apartmentId, startDate, endDate } = req.query || {};
  const apiKey = clean(process.env.SMOOBU_API_KEY);
  const apiSecret = clean(process.env.SMOOBU_API_SECRET);

  if (!startDate || !endDate) {
    return res.status(400).json({ error: "startDate și endDate sunt obligatorii (YYYY-MM-DD)." });
  }

  if (!apiKey || !apiSecret || !apartmentId) {
    return res.status(200).json({ ...mockData(startDate, endDate), mock: true });
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
    const prices = {};
    for (const [date, info] of Object.entries(perApt)) {
      availability[date] = info && typeof info.available === "number" ? info.available : 1;
      if (info && info.price != null) prices[date] = info.price;
    }
    res.setHeader("Cache-Control", "s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json({ availability, prices, mock: false });
  } catch (e) {
    return res.status(200).json({
      ...mockData(startDate, endDate),
      mock: true,
      note: String((e && e.message) || e),
    });
  }
}

/* Date demonstrative deterministe (fără random) — disponibilitate + preț per noapte. */
function mockData(startDate, endDate) {
  const availability = {};
  const prices = {};
  const start = new Date(startDate + "T00:00:00");
  const end = new Date(endDate + "T00:00:00");
  if (isNaN(start) || isNaN(end)) return { availability, prices };
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const key = d.toISOString().slice(0, 10);
    const day = d.getDate();
    const dow = d.getDay();
    availability[key] = day % 7 === 3 || day % 7 === 4 || day % 11 === 0 ? 0 : 1;
    prices[key] = dow === 5 || dow === 6 ? 1600 : 1200;
  }
  return { availability, prices };
}
