/* ============================================================
   Trimitere email de confirmare rezervare (Resend API).
   Config din env: RESEND_API_KEY, EMAIL_FROM (expeditor verificat),
   EMAIL_TO (opțional — copie către proprietar).
   Dacă lipsește cheia/expeditorul, funcția întoarce false (fără eroare).
   Fișier prefixat cu _ => Vercel NU îl expune ca endpoint.

   i18n: emailul se scrie în limba în care a rezervat clientul (ro/en/he/fr),
   fallback pe RO. Dicționarul e OGLINDIT în hub/server.js (deploy separat —
   hub-ul nu poate importa din api/). Dacă modifici aici, actualizează și hub-ul.
   ⚠️ Traducerea HE (ebraică, RTL) e de verificat cu un vorbitor nativ.
   ============================================================ */

const clean = (v) => (v || "").trim().replace(/^["']|["']$/g, "");

export const okLang = (l) => (["ro", "en", "he", "fr"].includes(l) ? l : "ro");

const S = {
  ro: {
    dir: "ltr", locale: "ro-RO", cur: "lei",
    reg_title: "Rezervare înregistrată",
    reg_greet: (n, v) => `Bună ${n}, îți mulțumim! Am înregistrat rezervarea ta la <b>${v}</b>.`,
    checkin: "Check-in", checkout: "Check-out", nights: "Nopți", guests: "Oaspeți",
    total: "Total sejur", deposit: "Avans", ref: "Referință",
    reg_foot: "Te contactăm în scurt timp pentru confirmarea avansului. Pentru orice întrebare, răspunde la acest email.",
    sign: "ROOTS Villas · Stupini, Brașov",
    subj_reg: (v) => `Confirmare rezervare — ${v}`,
  },
  en: {
    dir: "ltr", locale: "en-US", cur: "RON",
    reg_title: "Booking received",
    reg_greet: (n, v) => `Hi ${n}, thank you! We've received your booking at <b>${v}</b>.`,
    checkin: "Check-in", checkout: "Check-out", nights: "Nights", guests: "Guests",
    total: "Stay total", deposit: "Deposit", ref: "Reference",
    reg_foot: "We'll contact you shortly to confirm the deposit. For any questions, just reply to this email.",
    sign: "ROOTS Villas · Stupini, Brașov",
    subj_reg: (v) => `Booking confirmation — ${v}`,
  },
  fr: {
    dir: "ltr", locale: "fr-FR", cur: "RON",
    reg_title: "Réservation enregistrée",
    reg_greet: (n, v) => `Bonjour ${n}, merci ! Nous avons bien enregistré votre réservation à <b>${v}</b>.`,
    checkin: "Arrivée", checkout: "Départ", nights: "Nuits", guests: "Personnes",
    total: "Total du séjour", deposit: "Acompte", ref: "Référence",
    reg_foot: "Nous vous contacterons sous peu pour confirmer l'acompte. Pour toute question, répondez à cet e-mail.",
    sign: "ROOTS Villas · Stupini, Brașov",
    subj_reg: (v) => `Confirmation de réservation — ${v}`,
  },
  he: {
    dir: "rtl", locale: "he-IL", cur: "RON",
    reg_title: "ההזמנה התקבלה",
    reg_greet: (n, v) => `שלום ${n}, תודה! קיבלנו את ההזמנה שלך ב־<b>${v}</b>.`,
    checkin: "צ׳ק-אין", checkout: "צ׳ק-אאוט", nights: "לילות", guests: "אורחים",
    total: "סה״כ שהייה", deposit: "מקדמה", ref: "אסמכתא",
    reg_foot: "ניצור איתך קשר בקרוב לאישור המקדמה. לכל שאלה, השב/י למייל זה.",
    sign: "ROOTS Villas · Stupini, Brașov",
    subj_reg: (v) => `אישור הזמנה — ${v}`,
  },
};

const money = (n, s) => Number(n).toLocaleString(s.locale) + " " + s.cur;

export function bookingSubject(lang, villaName) {
  return S[okLang(lang)].subj_reg(villaName);
}

export function bookingEmailHtml(d, lang) {
  const s = S[okLang(lang)];
  const valAlign = s.dir === "rtl" ? "left" : "right";
  const row = (k, v) =>
    `<tr><td style="padding:7px 0;color:#5A6A61;font-size:14px">${k}</td>` +
    `<td style="padding:7px 0;text-align:${valAlign};font-weight:600;color:#122B22;font-size:14px">${v}</td></tr>`;
  return `<div dir="${s.dir}" style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1E2A24;direction:${s.dir};text-align:${s.dir === "rtl" ? "right" : "left"}">
    <h2 style="color:#122B22;font-size:20px;margin:0 0 6px">${s.reg_title}</h2>
    <p style="font-size:14px;line-height:1.6">${s.reg_greet(d.firstName, d.villaName)}</p>
    <table style="width:100%;border-collapse:collapse;margin:14px 0;border-top:1px solid #eadfce">
      ${row(s.checkin, d.arrivalDate)}
      ${row(s.checkout, d.departureDate)}
      ${row(s.nights, d.nights)}
      ${row(s.guests, d.guests)}
      ${d.total ? row(s.total, money(d.total, s)) : ""}
      ${d.deposit ? row(s.deposit, money(d.deposit, s)) : ""}
      ${d.reservationId ? row(s.ref, "#" + d.reservationId) : ""}
    </table>
    <p style="color:#5A6A61;font-size:13px;line-height:1.6">${s.reg_foot}</p>
    <p style="color:#5A6A61;font-size:13px;margin-top:18px">${s.sign}</p>
  </div>`;
}

export async function sendBookingEmail({ to, subject, html }) {
  const key = clean(process.env.RESEND_API_KEY);
  const from = clean(process.env.EMAIL_FROM);
  const recipients = (to || []).filter(Boolean);
  if (!key || !from || recipients.length === 0) return false;
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: recipients, subject, html }),
    });
    return r.ok;
  } catch {
    return false;
  }
}
