/* ============================================================
   Marketing & Analytics — GA4, Meta Pixel, TikTok Pixel.
   - ID-urile vin din Hub (secțiunea CMS `tracking`), editabile din admin.
   - Scripturile se încarcă DOAR după consimțământul cookie (GDPR);
     fără consimțământ totul e no-op.
   - track() traduce evenimente canonice în vocabularul fiecărei platforme.
   ============================================================ */

export const CONSENT_KEY = "roots_consent_v1";

export function getConsent() {
  try { return localStorage.getItem(CONSENT_KEY); } catch { return null; }
}
export function setConsent(v) {
  try { localStorage.setItem(CONSENT_KEY, v); } catch { /* privat/incognito */ }
}

let CFG = null;
let loaded = false;

function inject(src) {
  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

/* Pornește platformele configurate. Idempotent; rulează doar cu consimțământ. */
export function initTracking(cfg) {
  if (cfg) CFG = cfg;
  if (loaded || !CFG) return;
  if (getConsent() !== "yes") return;
  const ga4 = (CFG.ga4 || "").trim();
  const metaPixel = (CFG.metaPixel || "").trim();
  const tiktokPixel = (CFG.tiktokPixel || "").trim();
  if (!ga4 && !metaPixel && !tiktokPixel) return;
  loaded = true;

  if (ga4) {
    inject("https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(ga4));
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", ga4, { anonymize_ip: true });
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
      ttq.page();
    })(window, document, "ttq");
  }
}

/* Page view la schimbarea rutei în SPA (prima afișare o trimit config/init). */
export function trackPageView(path) {
  if (!loaded) return;
  try {
    if (window.gtag) window.gtag("event", "page_view", { page_path: path, page_location: window.location.href, page_title: document.title });
    if (window.fbq) window.fbq("track", "PageView");
    if (window.ttq) window.ttq.page();
  } catch { /* nu blocăm site-ul pentru tracking */ }
}

/* Evenimente canonice → vocabularul fiecărei platforme.
   begin_checkout = a deschis formularul de rezervare
   generate_lead  = cerere trimisă (dry-run / WhatsApp)
   purchase       = rezervare reală creată
   contact        = click pe WhatsApp / telefon */
const META_EVENTS = { begin_checkout: "InitiateCheckout", generate_lead: "Lead", purchase: "Purchase", contact: "Contact" };
const TIKTOK_EVENTS = { begin_checkout: "InitiateCheckout", generate_lead: "SubmitForm", purchase: "CompletePayment", contact: "Contact" };

export function track(name, params = {}) {
  if (!loaded) return;
  const value = params.value != null ? Math.round(Number(params.value)) : undefined;
  const currency = params.currency || "RON";
  try {
    if (window.gtag) window.gtag("event", name, { ...params, value, currency });
    if (window.fbq) window.fbq("track", META_EVENTS[name] || name, { value, currency, content_name: params.label });
    if (window.ttq) window.ttq.track(TIKTOK_EVENTS[name] || name, { value, currency, content_name: params.label });
  } catch { /* noop */ }
}
