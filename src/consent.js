/* Consimțământul cookie (bannerul CookieBar) — modul separat ca să poată fi
   importat și de tracking.js și de attribution.js fără import circular. */

export const CONSENT_KEY = "roots_consent_v1";

export function getConsent() {
  try { return localStorage.getItem(CONSENT_KEY); } catch { return null; }
}

/* v = "yes" | "no" | null (null = uită alegerea → bannerul reapare).
   La retragere/refuz ștergem IMEDIAT și urmele lăsate sub consimțământul
   anterior: atribuirea/parcursul din localStorage (cheile din attribution.js —
   hard-codate aici ca să nu creăm import circular) + cookie-urile first-party
   ale pixelilor (_ga*, _fbp, _ttp, _clck/_clsk). */
export function setConsent(v) {
  try {
    if (v == null) localStorage.removeItem(CONSENT_KEY);
    else localStorage.setItem(CONSENT_KEY, v);
  } catch { /* privat/incognito */ }
  if (v !== "yes") clearTrackingArtifacts();
}

function clearTrackingArtifacts() {
  try {
    localStorage.removeItem("roots_attr_v1");
    localStorage.removeItem("roots_journey_v1");
  } catch { /* noop */ }
  try {
    const doomed = /^(_ga($|_)|_gid$|_gcl_|_fbp$|_fbc$|_ttp$|_clck$|_clsk$|MUID$)/;
    const host = window.location.hostname.replace(/^www\./, "");
    for (const c of document.cookie.split(";")) {
      const name = c.split("=")[0].trim();
      if (!doomed.test(name)) continue;
      // ștergere pe toate combinațiile uzuale de domeniu/path
      for (const dom of ["", "; domain=" + host, "; domain=." + host]) {
        document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/${dom}`;
      }
    }
  } catch { /* noop */ }
}
