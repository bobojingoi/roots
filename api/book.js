import { clean, signedGet, signedPost } from "./_smoobu.js";
import { sendBookingEmail, bookingEmailHtml } from "./_email.js";

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

  // status sigur (nu creează nimic): confirmă dacă rezervările live sunt active
  if (req.method === "GET" && (req.query || {}).emailtest === "1") {
    const key = clean(process.env.RESEND_API_KEY);
    const from = clean(process.env.EMAIL_FROM);
    const to = clean(process.env.EMAIL_TO);
    if (!key || !from || !to) return res.status(200).json({ emailtest: true, error: "lipsă RESEND_API_KEY / EMAIL_FROM / EMAIL_TO" });
    try {
      const r = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [to], subject: "Test ROOTS — email de rezervare", html: "<p>Acesta e un email de test de pe site-ul ROOTS. Dacă îl vezi, trimiterea funcționează.</p>" }),
      });
      const body = await r.text();
      return res.status(200).json({ emailtest: true, status: r.status, body: body.slice(0, 300) });
    } catch (e) {
      return res.status(200).json({ emailtest: true, error: String((e && e.message) || e) });
    }
  }

  if (req.method === "GET" && (req.query || {}).emailcheck === "1") {
    const key = clean(process.env.RESEND_API_KEY);
    const from = clean(process.env.EMAIL_FROM);
    const m = from.match(/@([^>\s]+)/);
    const fromDomain = m ? m[1] : null;
    if (!key) return res.status(200).json({ emailcheck: true, hasKey: false, fromDomain });
    try {
      const r = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${key}` } });
      const j = await r.json().catch(() => ({}));
      const domains = (j.data || []).map((d) => ({ name: d.name, status: d.status }));
      return res.status(200).json({ emailcheck: true, hasKey: true, fromDomain, resendStatus: r.status, domains });
    } catch (e) {
      return res.status(200).json({ emailcheck: true, hasKey: true, fromDomain, error: String((e && e.message) || e) });
    }
  }

  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      live,
      configured: !!(apiKey && apiSecret),
      emailConfigured: !!(clean(process.env.RESEND_API_KEY) && clean(process.env.EMAIL_FROM)),
    });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Doar POST." });

  if (!apiKey || !apiSecret) {
    return res.status(200).json({ ok: false, error: "Server neconfigurat (credențiale Smoobu)." });
  }

  const { apartmentId, arrivalDate, departureDate, adults = 2, children = 0, firstName, lastName, email, phone, notice, country } = b;
  // rezervare combinată: apartmentIds = mai multe vile rezervate împreună, aceeași perioadă
  const aptIds = (Array.isArray(b.apartmentIds) && b.apartmentIds.length ? b.apartmentIds : [apartmentId])
    .filter(Boolean)
    .map(String);
  if (!aptIds.length || !arrivalDate || !departureDate) {
    return res.status(400).json({ ok: false, error: "apartmentId, arrivalDate și departureDate sunt obligatorii." });
  }

  // --- re-verifică disponibilitatea + recalculează prețul din Smoobu, per apartament ---
  let total = 0, nights = 0, allFree = true;
  const perAptTotals = {};
  try {
    for (const id of aptIds) {
      const q = [
        `apartments%5B%5D=${id}`,
        `end_date=${departureDate}`,
        `start_date=${arrivalDate}`,
      ].sort().join("&");
      const { status, text } = await signedGet(RATES_PATH, q, apiKey, apiSecret);
      if (status < 200 || status >= 300) throw new Error("rates HTTP " + status);
      const json = JSON.parse(text);
      const perApt = (json.data && json.data[id]) || {};
      let aptTotal = 0, aptNights = 0;
      for (let d = arrivalDate; d < departureDate; d = addDay(d)) {
        const info = perApt[d];
        if (!info || info.available === 0) allFree = false;
        aptTotal += (info && Number(info.price)) || 0;
        aptNights++;
      }
      perAptTotals[id] = aptTotal;
      total += aptTotal;
      nights = aptNights;
    }
  } catch (e) {
    return res.status(502).json({ ok: false, error: "Nu am putut verifica disponibilitatea.", detail: String((e && e.message) || e) });
  }

  if (nights < 1) return res.status(400).json({ ok: false, error: "Interval invalid." });
  if (!allFree) {
    return res.status(409).json({
      ok: false,
      error: aptIds.length > 1 ? "Cel puțin una dintre vile tocmai a fost ocupată în perioada aleasă. Alege alte date." : "Perioada tocmai a fost ocupată. Alege alte date.",
    });
  }

  const combined = aptIds.length > 1;
  const guest = {
    channelId: CHANNEL_DIRECT,
    firstName: firstName || "",
    lastName: lastName || "",
    email: email || "",
    phone: phone || "",
    adults: Number(adults) || 1,
    children: Number(children) || 0,
    country: (country && String(country).trim()) || "Romania",
  };
  const reservations = aptIds.map((id) => ({
    ...guest,
    arrivalDate,
    departureDate,
    apartmentId: Number(id),
    price: perAptTotals[id],
    notice: notice || (combined ? "Rezervare de pe site (roots) — pachet AMBELE VILE, împreună cu apartamentul " + aptIds.filter((x) => x !== id).join(", ") + "." : "Rezervare de pe site (roots)."),
  }));

  // --- dry-run: validat, dar fără a crea rezervarea reală ---
  if (!live) {
    return res.status(200).json({ ok: true, dryRun: true, nights, price: total, reservation: combined ? reservations : reservations[0] });
  }

  // --- live: creează rezervarea în Smoobu (una per apartament, secvențial) ---
  const createdIds = [];
  try {
    for (const r of reservations) {
      const { status, text } = await signedPost(RESERVATIONS_PATH, r, apiKey, apiSecret);
      if (status < 200 || status >= 300) throw new Error("reservations HTTP " + status + " " + text.slice(0, 200));
      const json = JSON.parse(text);
      createdIds.push(json.id || json.reservationId || null);
    }
    const reservationId = createdIds.filter(Boolean).join(" + ") || null;

    // email de confirmare (oaspete + proprietar) — nu blochează rezervarea dacă eșuează
    const depositPct = Number(b.depositPct) || 30;
    const villaName = (b.villaName && String(b.villaName)) || "Vila ROOTS";
    const deposit = Math.round(total * depositPct / 100);
    const html = bookingEmailHtml({
      villaName,
      firstName: guest.firstName || "oaspete",
      arrivalDate,
      departureDate,
      nights,
      guests: guest.adults + guest.children,
      total,
      deposit,
      reservationId,
    });
    const emailed = await sendBookingEmail({
      to: [guest.email, clean(process.env.EMAIL_TO)],
      subject: `Confirmare rezervare — ${villaName}`,
      html,
    });

    return res.status(200).json({ ok: true, dryRun: false, reservationId, price: total, emailed });
  } catch (e) {
    // creare parțială la pachet: raportăm ce s-a creat deja, ca proprietarul să poată interveni
    if (createdIds.length) {
      return res.status(502).json({
        ok: false,
        error: "Rezervarea a fost creată doar parțial — te contactăm noi pentru finalizare, sau scrie-ne pe WhatsApp.",
        partial: true,
        createdIds,
        detail: String((e && e.message) || e),
      });
    }
    return res.status(502).json({ ok: false, error: "Rezervarea nu a putut fi creată.", detail: String((e && e.message) || e) });
  }
}
