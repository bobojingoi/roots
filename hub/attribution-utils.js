// attribution-utils.js — clasificarea sursei de trafic din atribuirea first-party
// capturată de site (src/attribution.js) și atașată rezervării/înregistrării.
// Partajat de server.js (Roots Leads, CRM) și de scripturile de backfill —
// o singură definiție, fără derivă între ele.

/* attribution = { first, last, journey, device } — vezi src/attribution.js */
function leadSource(a) {
  if (!a) return null; // fără atribuire (istoric / localStorage blocat) = sursă necunoscută, NU „direct"
  const t = a.last || a.first || {};
  const src = String(t.source || '').toLowerCase();
  const med = String(t.medium || '').toLowerCase();
  const ref = String(t.referrer || '').toLowerCase();
  if (['facebook', 'instagram', 'meta', 'fb', 'ig'].includes(src)) return { key: 'meta', label: 'Meta Ads', campaign: t.campaign || null };
  if (t.gclid || (src === 'google' && ['cpc', 'paid', 'ppc'].includes(med))) return { key: 'google-ads', label: 'Google Ads', campaign: t.campaign || null };
  if (t.ttclid || src.includes('tiktok')) return { key: 'tiktok', label: 'TikTok Ads', campaign: t.campaign || null };
  if (src) return { key: 'campaign', label: src + (med ? ' / ' + med : ''), campaign: t.campaign || null };
  // fbclid FĂRĂ utm: Facebook îl pune pe TOATE click-urile (și share-uri organice),
  // deci nu putem ști dacă a fost reclamă — de aceea UTM-urile primează mai sus
  if (t.fbclid) return { key: 'meta-click', label: 'Facebook/Instagram (click)', campaign: t.campaign || null };
  if (ref.includes('google.')) return { key: 'google', label: 'Google organic', campaign: null };
  if (ref.includes('facebook.') || ref.includes('instagram.') || ref.includes('fb.')) return { key: 'meta-organic', label: 'Facebook/Instagram organic', campaign: null };
  if (t.referrer) {
    try { return { key: 'referral', label: new URL(t.referrer).hostname, campaign: null }; }
    catch { return { key: 'referral', label: 'alt site', campaign: null }; }
  }
  return { key: 'direct', label: 'direct', campaign: null };
}

/* rezumatul scris pe profiluri (guests.acquisition / users.acquisition) */
function acquisitionSummary(a) {
  const src = leadSource(a);
  if (!src) return null;
  const t = (a && (a.first || a.last)) || {};
  return { source: src.key, label: src.label, campaign: src.campaign || null, firstAt: t.at || null };
}

/* sanitizare pentru atribuirea venită direct din internetul public (site-register):
   doar first/last, tipuri + lungimi plafonate — fără journey pe profilul de cont */
function sanitizeTouch(t) {
  if (!t || typeof t !== 'object') return undefined;
  const s = (v, n) => (typeof v === 'string' && v.trim() ? String(v).slice(0, n || 200) : undefined);
  return {
    source: s(t.source), medium: s(t.medium), campaign: s(t.campaign), content: s(t.content), term: s(t.term),
    fbclid: s(t.fbclid, 500), gclid: s(t.gclid, 500), ttclid: s(t.ttclid, 500), msclkid: s(t.msclkid, 500),
    referrer: s(t.referrer, 300), landing: s(t.landing, 200), at: s(t.at, 40),
  };
}
function sanitizeAttribution(a) {
  if (!a || typeof a !== 'object') return null;
  const first = sanitizeTouch(a.first), last = sanitizeTouch(a.last);
  return first || last ? { first, last } : null;
}

module.exports = { leadSource, acquisitionSummary, sanitizeAttribution };
