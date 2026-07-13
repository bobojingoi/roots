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

/* Politica de oaspeți PER VILĂ — ține în sinc cu GUEST_POLICY din
   src/AvailabilityCalendar.jsx. Serverul recalculează taxele (nu ne
   bazăm pe sumele trimise de client). */
const GUESTS = { includedAdults: 8, includedChildren: 4, maxExtraAdults: 2, maxExtraChildren: 4, extraAdultFee: 150, extraChildFee: 75 };

const addDay = (s) => {
  const d = new Date(s + "T00:00:00");
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
};

/* ============================================================
   Stripe Checkout pentru avansul rezervării (fără SDK — REST cu
   form-encoding, în stilul integrării Resend). Suma în bani (RON×100).
   Dacă STRIPE_SECRET_KEY lipsește sau apelul eșuează, rezervarea
   rămâne valabilă și fluxul continuă ca înainte (fără plată online).
   ============================================================ */
const SITE_URL = "https://rootsvillas.ro";

async function createDepositCheckout({ deposit, total, villaName, ref, email, arrivalDate, departureDate, nights }) {
  const sk = clean(process.env.STRIPE_SECRET_KEY);
  if (!sk || !(deposit > 0)) return null;
  const site = (clean(process.env.SITE_URL) || SITE_URL).replace(/\/$/, "");
  const p = new URLSearchParams();
  p.set("mode", "payment");
  p.set("success_url", `${site}/rezervare?plata=ok&ref=${encodeURIComponent(ref || "")}`);
  p.set("cancel_url", `${site}/rezervare?plata=anulata&ref=${encodeURIComponent(ref || "")}`);
  if (email) p.set("customer_email", email);
  p.set("line_items[0][quantity]", "1");
  p.set("line_items[0][price_data][currency]", "ron");
  p.set("line_items[0][price_data][unit_amount]", String(Math.round(deposit * 100)));
  p.set("line_items[0][price_data][product_data][name]", `Avans rezervare — ${villaName}`);
  p.set(
    "line_items[0][price_data][product_data][description]",
    `${arrivalDate} → ${departureDate} (${nights} nopți) · total sejur ${total} lei · restul se achită la check-in`
  );
  // ref = ID-urile Smoobu — webhook-ul din Hub leagă plata de rezervare prin el
  p.set("metadata[ref]", String(ref || ""));
  p.set("metadata[villa]", String(villaName || ""));
  p.set("metadata[arrival]", String(arrivalDate || ""));
  p.set("metadata[departure]", String(departureDate || ""));
  p.set("expires_at", String(Math.floor(Date.now() / 1000) + 3600 * 23)); // linkul de plată expiră în ~23h
  try {
    const r = await fetch("https://api.stripe.com/v1/checkout/sessions", {
      method: "POST",
      headers: { Authorization: `Bearer ${sk}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: p.toString(),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.url) {
      console.error("[stripe] checkout fail", r.status, JSON.stringify(j.error || j).slice(0, 300));
      return null;
    }
    return { url: j.url, id: j.id };
  } catch (e) {
    console.error("[stripe] checkout error", String((e && e.message) || e));
    return null;
  }
}

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

  // diagnostic: creează o sesiune Stripe de 2 lei (marcată TEST) ca să verifici
  // cheile fără o rezervare reală. PROTEJAT cu PAYTEST_KEY — altfel oricine ar
  // putea genera sesiuni pe contul Stripe (spam). Apel: /api/book?paytest=1&key=...
  if (req.method === "GET" && (req.query || {}).paytest === "1") {
    const gate = clean(process.env.PAYTEST_KEY);
    if (!gate || (req.query || {}).key !== gate) return res.status(404).json({ error: "Not found" });
    if (!clean(process.env.STRIPE_SECRET_KEY)) return res.status(200).json({ paytest: true, error: "lipsă STRIPE_SECRET_KEY" });
    const s = await createDepositCheckout({
      deposit: 2, total: 2, villaName: "TEST — verificare Stripe", ref: "TEST",
      email: clean(process.env.EMAIL_TO) || undefined,
      arrivalDate: "2099-01-01", departureDate: "2099-01-02", nights: 1,
    });
    return res.status(200).json({ paytest: true, ok: !!s, url: s ? s.url : null });
  }

  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      live,
      configured: !!(apiKey && apiSecret),
      emailConfigured: !!(clean(process.env.RESEND_API_KEY) && clean(process.env.EMAIL_FROM)),
      stripeConfigured: !!clean(process.env.STRIPE_SECRET_KEY),
    });
  }
  if (req.method !== "POST") return res.status(405).json({ error: "Doar POST." });

  if (!apiKey || !apiSecret) {
    return res.status(200).json({ ok: false, error: "Server neconfigurat (credențiale Smoobu)." });
  }

  const { apartmentId, arrivalDate, departureDate, adults = 2, children = 0, firstName, lastName, email, phone, notice, country, extraBed, childAges, needCot } = b;
  // rezervare combinată: apartmentIds = mai multe vile rezervate împreună, aceeași perioadă
  // dedup: ID-uri duplicate ar dubla limitele de oaspeți și ar crea rezervări duble pe aceeași vilă
  const aptIds = [...new Set(
    (Array.isArray(b.apartmentIds) && b.apartmentIds.length ? b.apartmentIds : [apartmentId])
      .filter(Boolean)
      .map(String)
  )];
  if (!aptIds.length || !arrivalDate || !departureDate) {
    return res.status(400).json({ ok: false, error: "apartmentId, arrivalDate și departureDate sunt obligatorii." });
  }

  // --- oaspeți: incluși în preț + extra cu taxă, limitele scalează cu numărul de vile ---
  const nA = Number(adults) || 1;
  const nC = Number(children) || 0;
  const inclA = GUESTS.includedAdults * aptIds.length;
  const inclC = GUESTS.includedChildren * aptIds.length;
  if (nA > inclA + GUESTS.maxExtraAdults * aptIds.length || nC > inclC + GUESTS.maxExtraChildren * aptIds.length) {
    return res.status(400).json({ ok: false, error: "Numărul de oaspeți depășește capacitatea maximă (inclusiv locurile extra)." });
  }
  const extraAdults = Math.max(0, nA - inclA);
  const extraChildren = Math.max(0, nC - inclC);

  // --- re-verifică disponibilitatea + recalculează prețul din Smoobu, per apartament ---
  let total = 0, nights = 0, allFree = true;
  const perAptTotals = {};
  const nightPrices = {};
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
        const p = (info && Number(info.price)) || 0;
        aptTotal += p;
        nightPrices[d] = (nightPrices[d] || 0) + p; // pentru ofertele pe interval
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

  // --- OFERTE + COD DE REDUCERE — recalculate server-side (nu ne bazăm pe client);
  //     aceeași logică există în AvailabilityCalendar.jsx — ține-le în sinc ---
  const HUB = (process.env.HUB_URL || "https://roots-hub-dun.vercel.app").replace(/\/$/, "");
  let offers = [];
  try {
    const r = await fetch(HUB + "/api/v1/offers");
    const j = await r.json();
    offers = j.offers || [];
  } catch (e) { /* fără oferte dacă hub-ul nu răspunde */ }
  let codePct = 0;
  const discountCode = String(b.discountCode || "").trim().toUpperCase();
  if (discountCode) {
    try {
      // codul e valabil doar dacă e ATAȘAT contului cu emailul rezervării (nu circulă liber)
      const r = await fetch(HUB + "/api/v1/discount?code=" + encodeURIComponent(discountCode) + "&email=" + encodeURIComponent(String(email || "").trim().toLowerCase()));
      const j = await r.json();
      if (j.ok) codePct = Number(j.pct) || 0;
    } catch (e) { /* cod ignorat dacă validarea pică */ }
  }
  const baseTotal = total;
  const dayMs = 86400000;
  // „azi" în fusul proprietății (Europe/Bucharest) — identic cu clientul
  const todayBucharest = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Bucharest" }).format(new Date());
  const daysToArrival = Math.round((new Date(arrivalDate + "T00:00:00Z") - new Date(todayBucharest + "T00:00:00Z")) / dayMs);
  const candidates = [];
  for (const o of offers) {
    const pct = Number(o.pct) || 0;
    if (o.type === "interval" && pct > 0) {
      const from = o.date_from ? String(o.date_from).slice(0, 10) : null;
      const to = o.date_to ? String(o.date_to).slice(0, 10) : null;
      let amt = 0;
      for (const [d, p] of Object.entries(nightPrices)) {
        if ((from && d < from) || (to && d > to)) continue;
        amt += (p * pct) / 100;
      }
      if (amt > 0) candidates.push({ title: o.title, amount: amt });
    } else if (o.type === "lastminute" && pct > 0 && daysToArrival >= 0 && daysToArrival <= (Number(o.days_before) || 0)) {
      if (baseTotal > 0) candidates.push({ title: o.title, amount: (baseTotal * pct) / 100 });
    } else if (o.type === "earlybird" && pct > 0 && daysToArrival >= (Number(o.days_before) || 0)) {
      if (baseTotal > 0) candidates.push({ title: o.title, amount: (baseTotal * pct) / 100 });
    } else if (o.type === "longstay" && pct > 0 && Number(o.min_nights) > 0 && nights >= Number(o.min_nights)) {
      if (baseTotal > 0) candidates.push({ title: o.title, amount: (baseTotal * pct) / 100 });
    }
  }
  const bestOffer = candidates.sort((a, b2) => b2.amount - a.amount)[0] || null;
  const offerDiscount = bestOffer ? Math.max(0, Math.round(bestOffer.amount)) : 0;
  const comboOffer = aptIds.length > 1 ? offers.find((o) => o.type === "combo" && Number(o.amount_lei) > 0) : null;
  const comboDiscount = comboOffer ? Math.max(0, Math.min(baseTotal - offerDiscount, Math.round(Number(comboOffer.amount_lei) * nights))) : 0;
  const afterOffers = Math.max(0, baseTotal - offerDiscount - comboDiscount);
  const codeDiscount = codePct ? Math.round((afterOffers * codePct) / 100) : 0;
  const totalDiscount = offerDiscount + comboDiscount + codeDiscount;

  // taxa pentru oaspeții extra — recalculată server-side
  const extraFee = (extraAdults * GUESTS.extraAdultFee + extraChildren * GUESTS.extraChildFee) * nights;
  total = afterOffers - codeDiscount + extraFee;

  // ajustările (extra − reduceri) se distribuie în CASCADĂ peste apartamente,
  // ca suma prețurilor trimise în Smoobu să fie exact totalul promis oaspetelui
  perAptTotals[aptIds[0]] += extraFee;
  let remaining = totalDiscount;
  for (const id of aptIds) {
    if (remaining <= 0) break;
    const cut = Math.min(perAptTotals[id], remaining);
    perAptTotals[id] -= cut;
    remaining -= cut;
  }

  // guard de reconciliere: dacă totalul serverului diferă de cel văzut de client,
  // NU creăm rezervarea — clientul reafișează prețul corect
  const expectedTotal = Number(b.expectedTotal);
  if (Number.isFinite(expectedTotal) && Math.abs(total - expectedTotal) > 1) {
    return res.status(409).json({
      ok: false,
      priceChanged: true,
      price: total,
      error: "Prețul s-a actualizat între timp (oferte/curs). Verifică noul total și retrimite.",
    });
  }

  // detaliile pentru gazde, atașate notiței fiecărei rezervări
  const guestDetails = [
    `Oaspeți: ${nA} adulți + ${nC} copii.`,
    extraFee > 0
      ? `EXTRA: ${extraAdults} adulți + ${extraChildren} copii (${extraAdults * GUESTS.extraAdultFee + extraChildren * GUESTS.extraChildFee} lei/noapte = ${extraFee} lei total) — ${extraBed === "canapea" ? "canapea extensibilă" : "pat suplimentar"} + lenjerie + prosoape.`
      : "",
    childAges ? `Vârste copii: ${String(childAges).slice(0, 120)}.` : "",
    needCot ? "Solicită PĂTUȚ pentru bebeluș (gratuit)." : "",
    offerDiscount > 0 && bestOffer ? `OFERTĂ: ${bestOffer.title} (−${offerDiscount} lei).` : "",
    comboDiscount > 0 && comboOffer ? `COMBO: ${comboOffer.title} (−${comboDiscount} lei).` : "",
    codeDiscount > 0 ? `COD REDUCERE: ${discountCode} −${codePct}% (−${codeDiscount} lei).` : "",
  ].filter(Boolean).join(" ");

  const combined = aptIds.length > 1;
  const guest = {
    channelId: CHANNEL_DIRECT,
    firstName: firstName || "",
    lastName: lastName || "",
    email: email || "",
    phone: phone || "",
    adults: nA,
    children: nC,
    country: (country && String(country).trim()) || "Romania",
  };
  const reservations = aptIds.map((id) => ({
    ...guest,
    arrivalDate,
    departureDate,
    apartmentId: Number(id),
    price: perAptTotals[id],
    notice: [
      notice || (combined ? "Rezervare de pe site (roots) — pachet AMBELE VILE, împreună cu apartamentul " + aptIds.filter((x) => x !== id).join(", ") + "." : "Rezervare de pe site (roots)."),
      guestDetails,
    ].join(" "),
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
    // avansul e CONSTANTĂ DE BUSINESS, nu vine din client: b.depositPct ar permite
    // unui atacator să plătească 1% și să apară totuși „Avans plătit" în admin
    const depositPct = 30;
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

    // plata avansului cu cardul (Stripe Checkout) — dacă e configurat; altfel
    // fluxul rămâne ca înainte (rezervare fără plată online)
    const pay = await createDepositCheckout({
      deposit, total, villaName, ref: reservationId,
      email: guest.email, arrivalDate, departureDate, nights,
    });

    return res.status(200).json({ ok: true, dryRun: false, reservationId, price: total, emailed, payUrl: pay ? pay.url : null });
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
