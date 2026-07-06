/* ============================================================
   Proxy serverless (Vercel) pentru disponibilitatea Smoobu.
   Ține cheia API secretă (process.env.SMOOBU_API_KEY) și
   returnează doar o hartă { "YYYY-MM-DD": 0|1 } către frontend.
   1 = liber, 0 = ocupat.

   Frontend:  GET /api/availability?apartmentId=123&startDate=2026-07-01&endDate=2026-08-31
   Smoobu:    GET https://login.smoobu.com/api/rates?apartments[]=123&start_date=...&end_date=...
   ============================================================ */

export default async function handler(req, res) {
  const { apartmentId, startDate, endDate } = req.query || {};
  const apiKey = process.env.SMOOBU_API_KEY;

  if (!startDate || !endDate) {
    return res.status(400).json({ error: "startDate și endDate sunt obligatorii (YYYY-MM-DD)." });
  }

  // Fără cheie sau fără ID de apartament -> date demonstrative, ca UI-ul să funcționeze.
  if (!apiKey || !apartmentId) {
    return res.status(200).json({ availability: mockAvailability(startDate, endDate), mock: true });
  }

  const url =
    `https://login.smoobu.com/api/rates?apartments[]=${encodeURIComponent(apartmentId)}` +
    `&start_date=${encodeURIComponent(startDate)}&end_date=${encodeURIComponent(endDate)}`;

  try {
    const r = await fetch(url, {
      headers: { "Api-Key": apiKey, "Content-Type": "application/json" },
    });
    if (!r.ok) throw new Error("Smoobu HTTP " + r.status);
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
      diag: { keyPresent: !!apiKey, keyLen: (apiKey || "").length, apartmentId },
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
