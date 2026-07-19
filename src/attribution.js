/* ============================================================
   Atribuire first-party — sursa vizitei + parcursul pe site.
   De ce: Meta/Google raportează doar agregate; ca să vedem în Hub
   „cine a rezervat și pe unde a intrat", capturăm noi sursa (UTM,
   fbclid/gclid/ttclid, referrer) și paginile vizitate.
   GDPR/ePrivacy: nimic nu pleacă spre terți; în localStorage scriem
   DOAR cu consimțământul din bannerul de cookies (același ca pentru
   pixeli) — fără consimțământ, datele trăiesc doar în memoria
   paginii și se pierd la închidere. Se trimit exclusiv atașate
   cererii de rezervare pe care oaspetele o trimite el însuși.
   În parcurs intră DOAR pathname-ul (fără query string — să nu
   prindem tokenuri) și niciodată pagina /smart.
   ============================================================ */

import { getConsent } from "./consent.js";

const ATTR_KEY = "roots_attr_v1";
const JOURNEY_KEY = "roots_journey_v1";
const MAX_STEPS = 80;

/* Referreri care NU sunt surse reale de trafic: întoarcerea de la plată
   (Stripe & co.) nu trebuie să suprascrie sursa adevărată (ex. reclama Meta). */
const IGNORED_REF = /(^|\.)(stripe\.com|paypal\.com|netopia-payments\.com|mobilpay\.ro|revolut\.com|klarna\.com)$/i;

let MEM = null; // starea sesiunii — sursa unică de adevăr; localStorage e doar persistență

const canStore = () => getConsent() === "yes";
const read = (k) => {
  try { return JSON.parse(localStorage.getItem(k) || "null"); } catch { return null; }
};
const write = (k, v) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* privat/incognito */ }
};

const isSmart = (p) => String(p || "").startsWith("/smart");
const cut = (v, n) => (typeof v === "string" && v ? v.slice(0, n || 200) : undefined);

function state() {
  if (!MEM) MEM = { attr: read(ATTR_KEY) || {}, journey: read(JOURNEY_KEY) || [] };
  return MEM;
}

/* ePrivacy art. 5(3): pe dispozitiv scriem doar cu acordul din CookieBar.
   Acordul poate veni DUPĂ aterizare — de aceea ținem totul în memorie și
   persistăm la următorul pas de după accept. La refuz explicit, ștergem. */
function persist() {
  if (getConsent() === "no") {
    try { localStorage.removeItem(ATTR_KEY); localStorage.removeItem(JOURNEY_KEY); } catch { /* noop */ }
    return;
  }
  if (!canStore()) return;
  const s = state();
  write(ATTR_KEY, s.attr);
  write(JOURNEY_KEY, s.journey);
}

/* Un „touch" = cum a ajuns vizitatorul pe site în acest moment. */
function touchFromUrl() {
  let q;
  try { q = new URLSearchParams(window.location.search); } catch { q = new URLSearchParams(); }
  const pick = (k) => cut(q.get(k) || "");
  let referrer;
  try {
    const r = document.referrer || "";
    if (r) {
      const u = new URL(r);
      // doar referreri EXTERNI și doar ORIGINEA (fără path/query — pot conține
      // tokenuri sau date personale); procesatorii de plată nu contează ca sursă
      if (u.hostname !== window.location.hostname && !IGNORED_REF.test(u.hostname)) referrer = cut(u.origin, 300);
    }
  } catch { /* referrer invalid */ }
  return {
    source: pick("utm_source"), medium: pick("utm_medium"), campaign: pick("utm_campaign"),
    content: pick("utm_content"), term: pick("utm_term"),
    // click id-urile platformelor (Meta le adaugă automat la linkuri) —
    // păstrate ca valoare, utile mai târziu pentru Conversions API
    fbclid: pick("fbclid"), gclid: pick("gclid"), ttclid: pick("ttclid"), msclkid: pick("msclkid"),
    referrer,
    landing: cut(window.location.pathname, 200),
    at: new Date().toISOString(),
  };
}

const meaningful = (t) =>
  !!(t.source || t.medium || t.campaign || t.fbclid || t.gclid || t.ttclid || t.msclkid || t.referrer);

/* Rulează la încărcarea aplicației: reține primul touch (o singură dată)
   și actualizează ultimul touch la fiecare intrare cu sursă (campanie nouă,
   alt referrer). Notează și pasul de aterizare în parcurs. */
export function captureAttribution() {
  try {
    if (isSmart(window.location.pathname)) return;
    const t = touchFromUrl();
    const s = state();
    if (!s.attr.first) s.attr.first = t; // și vizita directă e un first-touch valid
    if (meaningful(t)) s.attr.last = t;
    persist();
    recordStep(window.location.pathname);
  } catch { /* tracking-ul nu blochează site-ul */ }
}

/* Adaugă un pas în parcurs: pagină vizitată sau eveniment (ex. trimiterea
   rezervării). Plafonat la MAX_STEPS — păstrăm începutul (unde a aterizat)
   și finalul (drumul spre rezervare), tăiem din mijloc. */
export function recordStep(path, event) {
  try {
    const p = cut(String(path || window.location.pathname).split("?")[0], 160) || "/";
    if (isSmart(p)) return;
    const s = state();
    const lastStep = s.journey[s.journey.length - 1];
    // dedup: React poate re-monta ruta — nu dublăm același pas consecutiv
    if (lastStep && lastStep.p === p && lastStep.e === event && Date.now() - lastStep.t < 2000) return;
    s.journey.push(event ? { t: Date.now(), p, e: cut(event, 40) } : { t: Date.now(), p });
    if (s.journey.length > MAX_STEPS) s.journey.splice(10, s.journey.length - MAX_STEPS);
    persist();
  } catch { /* noop */ }
}

/* Pachetul atașat cererii de rezervare — serverul îl re-validează oricum. */
export function getAttribution() {
  try {
    const s = state();
    return {
      first: s.attr.first, last: s.attr.last,
      journey: s.journey,
      device: window.innerWidth < 760 ? "mobile" : "desktop",
    };
  } catch { return undefined; }
}
