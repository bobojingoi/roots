/* ============================================================
   Marketing & Analytics — GA4, Meta Pixel, TikTok Pixel, MS Clarity.
   - ID-urile vin din Hub (secțiunea CMS `tracking`), editabile din admin.
   - Scripturile se încarcă DOAR după consimțământul cookie (GDPR);
     fără consimțământ totul e no-op.
   - track() traduce evenimente canonice în vocabularul fiecărei platforme.
   - Evenimentele emise ÎNAINTE ca pixelii să fie gata intră într-o coadă
     și pleacă la init — altfel conversia `purchase` de pe pagina de
     mulțumire se putea pierde definitiv (race cu fetch-ul configului).
   - params.eventId (ex. id-ul rezervării) merge ca event ID spre
     Meta/TikTok/GA — pregătit pentru deduplicarea cu Conversions API.
   ============================================================ */

import { getConsent } from "./consent.js";
// compat: CookieBar & co. importau consimțământul de aici
export { CONSENT_KEY, getConsent, setConsent } from "./consent.js";
import { getAttribution } from "./attribution.js";

let CFG = null;
let loaded = false;
let PENDING = []; // [name, params] emise pre-init; plafonat, golit la initTracking
let clarityStopped = false;

function inject(src) {
  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

/* Pagina /smart e magic-link (token în URL) — nu trimitem NIMIC către terți
   de pe ea, ca URL-ul cu token să nu ajungă la GA/Meta/TikTok/Clarity. */
function onSmartPage() {
  // startsWith: și "/smart/" (trailing slash) e tot pagina magic-link
  try { return window.location.pathname.startsWith("/smart"); } catch { return false; }
}

/* Sursa vizitei pentru tag-urile Clarity — clasificare simplificată client-side
   (referința completă e leadSource() din hub/server.js; aici ne trebuie doar
   eticheta de filtrare a înregistrărilor). */
function clientSource() {
  try {
    const a = getAttribution() || {};
    const t = a.last || a.first || {};
    const src = String(t.source || "").toLowerCase();
    if (["facebook", "instagram", "meta", "fb", "ig"].includes(src)) return { source: "meta", campaign: t.campaign };
    if (t.fbclid) return { source: "meta-click", campaign: t.campaign };
    if (t.gclid || src === "google") return { source: "google", campaign: t.campaign };
    if (t.ttclid || src.includes("tiktok")) return { source: "tiktok", campaign: t.campaign };
    if (src) return { source: src, campaign: t.campaign };
    if (t.referrer) return { source: "referral", campaign: null };
    return { source: "direct", campaign: null };
  } catch { return { source: "", campaign: null }; }
}

/* Pornește platformele configurate. Idempotent; rulează doar cu consimțământ. */
export function initTracking(cfg) {
  if (cfg) CFG = cfg;
  if (loaded || !CFG) return;
  if (onSmartPage()) return;
  if (getConsent() !== "yes") return;
  const ga4 = (CFG.ga4 || "").trim();
  const metaPixel = (CFG.metaPixel || "").trim();
  const tiktokPixel = (CFG.tiktokPixel || "").trim();
  const clarityId = (CFG.clarity || "").trim();
  if (!ga4 && !metaPixel && !tiktokPixel && !clarityId) return;
  loaded = true;

  if (ga4) {
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    /* Consent Mode v2 — fără semnalele ad_user_data/ad_personalization Google
       REFUZĂ remarketing/Customer Match pe trafic UE (din martie 2024).
       Scriptul se încarcă doar după acceptul din banner, deci: default =
       denied (starea dinaintea alegerii), imediat update = granted. */
    window.gtag("consent", "default", { ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied", analytics_storage: "denied" });
    window.gtag("consent", "update", { ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted", analytics_storage: "granted" });
    window.gtag("js", new Date());
    window.gtag("config", ga4, { anonymize_ip: true });
    inject("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(ga4));
  }

  if (metaPixel) {
    /* snippet oficial Meta Pixel */
    (function (f, b, e, v, n, t, s) {
      if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
      if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
      t = b.createElement(e); t.async = !0; t.src = v;
      s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
    })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
    window.fbq("init", metaPixel);
    window.fbq("track", "PageView");
  }

  if (tiktokPixel) {
    /* snippet oficial TikTok Pixel */
    (function (w, d, t) {
      w.TiktokAnalyticsObject = t; var ttq = (w[t] = w[t] || []);
      ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie", "holdConsent", "revokeConsent", "grantConsent"];
      ttq.setAndDefer = function (t, e) { t[e] = function () { t.push([e].concat(Array.prototype.slice.call(arguments, 0))); }; };
      for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
      ttq.instance = function (t) { for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]); return e; };
      ttq.load = function (e, n) {
        var r = "https://analytics.tiktok.com/i18n/pixel/events.js";
        ttq._i = ttq._i || {}; ttq._i[e] = []; ttq._i[e]._u = r; ttq._t = ttq._t || {}; ttq._t[e] = +new Date(); ttq._o = ttq._o || {}; ttq._o[e] = n || {};
        var o = document.createElement("script"); o.type = "text/javascript"; o.async = !0; o.src = r + "?sdkid=" + e + "&lib=" + t;
        var a = document.getElementsByTagName("script")[0]; a.parentNode.insertBefore(o, a);
      };
      ttq.load(tiktokPixel);
      ttq.grantConsent(); // rulăm doar post-consimțământ — spunem asta explicit SDK-ului
      ttq.page();
    })(window, document, "ttq");
  }

  if (clarityId) {
    /* snippet oficial MS Clarity — stub cu coadă: clarity(...) merge apelat
       imediat, comenzile se execută când scriptul se încarcă */
    (function (c, l, a, r, i, t, y) {
      c[a] = c[a] || function () { (c[a].q = c[a].q || []).push(arguments); };
      t = l.createElement(r); t.async = 1; t.src = "https://www.clarity.ms/tag/" + i;
      y = l.getElementsByTagName(r)[0]; y.parentNode.insertBefore(t, y);
    })(window, document, "clarity", "script", clarityId);
    try {
      window.clarity("consent"); // Microsoft îl cere explicit pentru trafic SEE
      // tag-uri de filtrare: „arată-mi doar sesiunile venite din Meta Ads"
      const s = clientSource();
      if (s.source) window.clarity("set", "source", s.source);
      if (s.campaign) window.clarity("set", "campaign", String(s.campaign).slice(0, 100));
    } catch { /* noop */ }
  }

  // golim coada de evenimente emise înainte de init (ex. purchase pe thank-you)
  const q = PENDING;
  PENDING = [];
  for (const [name, params] of q) send(name, params);
}

/* Page view la schimbarea rutei în SPA (prima afișare o trimit config/init). */
export function trackPageView(path) {
  if (!loaded) return;
  const smart = String(path || "").startsWith("/smart") || onSmartPage();
  // Clarity înregistrează AUTONOM tot după încărcare — pe /smart oprim explicit
  // (token magic-link în URL), la ieșire repornim
  if (window.clarity) {
    try {
      if (smart && !clarityStopped) { window.clarity("stop"); clarityStopped = true; }
      else if (!smart && clarityStopped) { window.clarity("start"); clarityStopped = false; }
    } catch { /* noop */ }
  }
  if (smart) return;
  try {
    if (window.gtag) window.gtag("event", "page_view", { page_path: path, page_location: window.location.href, page_title: document.title });
    if (window.fbq) window.fbq("track", "PageView");
    if (window.ttq) window.ttq.page();
  } catch { /* nu blocăm site-ul pentru tracking */ }
}

/* Evenimente canonice → vocabularul fiecărei platforme.
   begin_checkout   = a deschis formularul de rezervare
   add_payment_info = a trimis formularul → pleacă spre plată
   generate_lead    = cerere trimisă (dry-run / WhatsApp)
   purchase         = rezervare reală creată (plătită)
   contact          = click pe WhatsApp / telefon */
const META_EVENTS = { begin_checkout: "InitiateCheckout", add_payment_info: "AddPaymentInfo", generate_lead: "Lead", purchase: "Purchase", contact: "Contact" };
const TIKTOK_EVENTS = { begin_checkout: "InitiateCheckout", add_payment_info: "AddPaymentInfo", generate_lead: "SubmitForm", purchase: "CompletePayment", contact: "Contact" };

function send(name, params = {}) {
  const value = params.value != null ? Math.round(Number(params.value)) : undefined;
  const currency = params.currency || "RON";
  const eventId = params.eventId ? String(params.eventId) : null; // dedup viitor cu CAPI
  try {
    if (window.gtag) window.gtag("event", name, { ...params, eventId: undefined, value, currency, ...(eventId ? { transaction_id: eventId } : {}) });
    if (window.fbq) window.fbq("track", META_EVENTS[name] || name, { value, currency, content_name: params.label }, eventId ? { eventID: eventId } : undefined);
    if (window.ttq) window.ttq.track(TIKTOK_EVENTS[name] || name, { value, currency, content_name: params.label, ...(eventId ? { event_id: eventId } : {}) });
    if (window.clarity) window.clarity("event", name); // marcaj și în înregistrări
  } catch { /* noop */ }
}

export function track(name, params = {}) {
  if (onSmartPage()) return;
  if (!loaded) {
    // pixelii nu-s gata (config în zbor / consimțământ dat mai târziu) —
    // reținem evenimentul; init îl trimite. Refuz explicit = se aruncă la init.
    if (getConsent() !== "no" && PENDING.length < 20) PENDING.push([name, params]);
    return;
  }
  send(name, params);
}

/* pixelii sunt încărcați și evenimentele pleacă imediat? — folosit de dedup-ul
   de purchase din ReservePage: flag-ul „trimis" se pune doar când chiar a plecat */
export function isLoaded() { return loaded; }
