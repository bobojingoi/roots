import React, { useEffect, useRef, useState } from "react";
import { t } from "./i18n.js";
import { EDIT_MODE } from "./HubEditor.jsx";

/* ============================================================
   Modal de întâmpinare (doar pagina principală):
   - apare o singură dată pe sesiune (sessionStorage; dacă storage-ul
     e blocat, cade pe un flag pe window — tot „o dată pe sesiune")
   - întreabă pentru câte persoane e rezervarea; la 1–3 explică
     închirierea integrală (prețul e același ca pentru 4), la 4/4+
     se închide și vizitatorul continuă normal
   - accesibil: role="dialog", aria-modal, focus trap pe Tab,
     închidere cu X / click pe overlay / Esc, focus restaurat la ieșire
   ============================================================ */

const CSS = `
.wm-ovl{position:fixed;inset:0;z-index:9500;background:rgba(12,31,25,.6);backdrop-filter:blur(3px);
  display:grid;place-items:center;padding:20px;animation:wmFade .35s ease}
.wm-box{position:relative;background:var(--ivory);color:var(--ink);border-radius:24px;max-width:520px;width:100%;
  padding:34px 30px 30px;box-shadow:0 30px 80px rgba(0,0,0,.35);animation:wmPop .45s cubic-bezier(.2,.7,.2,1);
  font-family:'Manrope',sans-serif}
@keyframes wmFade{from{opacity:0}}
@keyframes wmPop{from{opacity:0;transform:translateY(18px) scale(.97)}}
.wm-x{position:absolute;top:14px;inset-inline-end:14px;width:34px;height:34px;border-radius:50%;border:1px solid var(--line);
  background:transparent;color:var(--ink-soft);font:400 20px/1 'Manrope',sans-serif;cursor:pointer;transition:background .2s,color .2s}
.wm-x:hover{background:var(--sand);color:var(--ink)}
.wm-eyebrow{font:700 11.5px 'Manrope',sans-serif;letter-spacing:.16em;text-transform:uppercase;color:var(--ember);margin-bottom:10px}
.wm-title{font-family:'Fraunces',serif;font-weight:500;font-size:clamp(22px,3.4vw,28px);line-height:1.2;color:var(--pine);
  margin-bottom:20px;padding-inline-end:26px}
.wm-opts{display:flex;gap:10px;flex-wrap:wrap}
.wm-opt{flex:1;min-width:56px;padding:13px 0;border-radius:100px;border:1.5px solid var(--line);background:#fff;
  color:var(--pine);font:700 16px 'Manrope',sans-serif;cursor:pointer;transition:transform .2s,background .2s,border-color .2s,color .2s}
.wm-opt:hover{border-color:var(--pine);transform:translateY(-1px)}
.wm-opt.on{background:var(--pine);border-color:var(--pine);color:var(--ivory)}
.wm-info{display:flex;gap:12px;align-items:flex-start;background:rgba(233,184,114,.18);border:1px solid rgba(233,184,114,.5);
  border-radius:16px;padding:15px 16px;margin-top:18px;animation:wmPop .4s cubic-bezier(.2,.7,.2,1)}
.wm-info p{font-size:14.5px;line-height:1.55;color:var(--ink)}
.wm-info-ic{font-size:18px;line-height:1.3}
.wm-go{margin-top:16px;width:100%;padding:14px 0;border:none;border-radius:100px;background:var(--ember);color:#fff;
  font:700 15px 'Manrope',sans-serif;cursor:pointer;transition:transform .25s,box-shadow .25s}
.wm-go:hover{transform:translateY(-1px);box-shadow:0 10px 26px rgba(232,114,44,.35)}
@media(max-width:480px){.wm-box{padding:28px 20px 22px}.wm-opt{min-width:48px}}
@media(prefers-reduced-motion:reduce){.wm-ovl,.wm-box,.wm-info{animation:none}}
`;

/* „o dată pe sesiune": sessionStorage pe site-ul real; flag pe window ca
   rezervă când storage-ul e indisponibil (Safari privat, cookies blocate) */
const SEEN_KEY = "roots_welcome_seen";
const seen = () => {
  try { return sessionStorage.getItem(SEEN_KEY) === "1" || window.__rootsWelcomeSeen === true; }
  catch { return window.__rootsWelcomeSeen === true; }
};
const markSeen = () => {
  try { sessionStorage.setItem(SEEN_KEY, "1"); } catch { /* storage blocat — rămâne flag-ul */ }
  window.__rootsWelcomeSeen = true;
};

export default function WelcomeModal() {
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(null); // numărul de persoane ales
  const boxRef = useRef(null);
  const lastFocus = useRef(null); // elementul focusat înainte de modal
  const small = sel != null && sel < 4;

  // se deschide o dată pe sesiune, puțin după încărcare; nu și în editor
  useEffect(() => {
    if (EDIT_MODE || seen()) return;
    const id = setTimeout(() => {
      lastFocus.current = document.activeElement;
      markSeen();
      setOpen(true);
    }, 800);
    return () => clearTimeout(id);
  }, []);

  const close = () => {
    setOpen(false);
    if (lastFocus.current && lastFocus.current.focus) lastFocus.current.focus();
  };

  // Esc închide; Tab ciclează doar prin butoanele modalului (focus trap);
  // fundalul nu se derulează cât timp modalul e deschis
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") { close(); return; }
      if (e.key !== "Tab" || !boxRef.current) return;
      const els = boxRef.current.querySelectorAll("button");
      if (!els.length) return;
      const first = els[0], last = els[els.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const tid = setTimeout(() => {
      const b = boxRef.current && boxRef.current.querySelector(".wm-opt");
      if (b) b.focus();
    }, 30);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
      clearTimeout(tid);
    };
  }, [open]);

  if (!open) return null;

  // 1–3 → info despre închirierea integrală; 4/4+ → continuă direct
  const pick = (n) => {
    setSel(n);
    if (n >= 4) close();
  };

  return (
    <div className="wm-ovl" onClick={(e) => { if (e.target.classList.contains("wm-ovl")) close(); }}>
      <style>{CSS}</style>
      <div className="wm-box" ref={boxRef} role="dialog" aria-modal="true" aria-labelledby="wm-q">
        <button type="button" className="wm-x" aria-label={t("wm_close")} onClick={close}>×</button>
        <div className="wm-eyebrow">{t("wm_eyebrow")}</div>
        <h3 id="wm-q" className="wm-title">{t("wm_question")}</h3>
        <div className="wm-opts">
          {[1, 2, 3, 4].map((n) => (
            <button key={n} type="button" className={"wm-opt" + (sel === n ? " on" : "")} onClick={() => pick(n)}>{n}</button>
          ))}
          <button type="button" className={"wm-opt" + (sel === 5 ? " on" : "")} onClick={() => pick(5)}>4+</button>
        </div>
        {small && (
          <>
            <div className="wm-info" role="note">
              <span className="wm-info-ic" aria-hidden="true">ℹ️</span>
              <p>{t("wm_info")}</p>
            </div>
            <button type="button" className="wm-go" onClick={close}>{t("wm_continue")}</button>
          </>
        )}
      </div>
    </div>
  );
}
