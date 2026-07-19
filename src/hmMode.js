/* ============================================================
   Modul heatmap (?hm=1) — pagina e randată în iframe-ul Heatmap
   din adminul hub, cu înălțimea întregului document. Acolo un
   „100vh" ar însemna mii de px (hero-ul s-ar umfla cât toată
   pagina și nimic n-ar mai corespunde click-urilor înregistrate).
   Soluția, generică pentru orice stil prezent sau viitor:
   1) rescriem TOATE valorile vh/svh/dvh/lvh din stylesheet-uri
      în px, raportate la un viewport virtual (?hmvh=, default 900);
   2) raportăm părintelui (adminului) înălțimea reală a documentului
      prin postMessage, ca iframe-ul + canvas-ul să fie dimensionate
      exact — fără ghicit din percentila doc_h.
   ============================================================ */

import { HM_MODE } from "./HubEditor.jsx";

export function initHmMode() {
  if (!HM_MODE) return;
  let qs;
  try { qs = new URLSearchParams(window.location.search); } catch { qs = new URLSearchParams(); }
  const VH = Math.max(400, Math.min(2000, Number(qs.get("hmvh")) || 900));

  const done = new WeakSet(); // foile deja rescrise (stilurile React sunt statice după montare)
  const rewriteRule = (rule) => {
    // ATENȚIE: cu CSS nesting, ORICE CSSStyleRule are .cssRules (posibil gol,
    // dar truthy) — întâi procesăm stilul propriu, abia apoi recursăm în copii
    const st = rule.style;
    if (st) {
      for (let i = 0; i < st.length; i++) {
        const prop = st[i];
        const v = st.getPropertyValue(prop);
        if (!/\d(s|l|d)?vh\b/.test(v)) continue;
        const nv = v.replace(/(\d*\.?\d+)(?:s|l|d)?vh\b/g, (_, n) => (Number(n) / 100) * VH + "px");
        st.setProperty(prop, nv, st.getPropertyPriority(prop));
      }
    }
    if (rule.cssRules) for (const r of rule.cssRules) rewriteRule(r); // @media + reguli imbricate
  };
  const fixSheets = () => {
    for (const sheet of document.styleSheets) {
      const key = sheet.ownerNode || sheet;
      if (done.has(key)) continue;
      let rules;
      try { rules = sheet.cssRules; } catch { continue; } // cross-origin (Google Fonts)
      done.add(key);
      for (const r of rules) rewriteRule(r);
    }
  };
  const report = () => {
    try { window.parent.postMessage({ rootsHmH: document.documentElement.scrollHeight }, "*"); } catch { /* noop */ }
  };
  const pass = () => { fixSheets(); report(); };

  // stilurile apar treptat (componente montate pe rând) iar imaginile lazy
  // schimbă înălțimea — câteva treceri programate acoperă și întârziații
  pass();
  window.addEventListener("load", pass);
  [500, 1500, 3000, 6000].forEach((ms) => setTimeout(pass, ms));
  try { new ResizeObserver(report).observe(document.documentElement); } catch { /* browser vechi */ }
}
