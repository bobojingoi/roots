/* ============================================================
   Trimitere email de confirmare rezervare (Resend API).
   Config din env: RESEND_API_KEY, EMAIL_FROM (expeditor verificat),
   EMAIL_TO (opțional — copie către proprietar).
   Dacă lipsește cheia/expeditorul, funcția întoarce false (fără eroare).
   Fișier prefixat cu _ => Vercel NU îl expune ca endpoint.
   ============================================================ */

const clean = (v) => (v || "").trim().replace(/^["']|["']$/g, "");

export function bookingEmailHtml(d) {
  const row = (k, v) =>
    `<tr><td style="padding:7px 0;color:#5A6A61;font-size:14px">${k}</td>` +
    `<td style="padding:7px 0;text-align:right;font-weight:600;color:#122B22;font-size:14px">${v}</td></tr>`;
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#1E2A24">
    <h2 style="color:#122B22;font-size:20px;margin:0 0 6px">Rezervare înregistrată</h2>
    <p style="font-size:14px;line-height:1.6">Bună ${d.firstName}, îți mulțumim! Am înregistrat rezervarea ta la <b>${d.villaName}</b>.</p>
    <table style="width:100%;border-collapse:collapse;margin:14px 0;border-top:1px solid #eadfce">
      ${row("Check-in", d.arrivalDate)}
      ${row("Check-out", d.departureDate)}
      ${row("Nopți", d.nights)}
      ${row("Oaspeți", d.guests)}
      ${d.total ? row("Total sejur", d.total.toLocaleString("ro-RO") + " lei") : ""}
      ${d.deposit ? row("Avans", d.deposit.toLocaleString("ro-RO") + " lei") : ""}
      ${d.reservationId ? row("Referință", "#" + d.reservationId) : ""}
    </table>
    <p style="color:#5A6A61;font-size:13px;line-height:1.6">Te contactăm în scurt timp pentru confirmarea avansului. Pentru orice întrebare, răspunde la acest email.</p>
    <p style="color:#5A6A61;font-size:13px;margin-top:18px">ROOTS Villas · Stupini, Brașov</p>
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
