import React, { useState } from "react";
import { Link } from "react-router-dom";
import { t } from "./i18n.js";
import { getConsent, setConsent, initTracking } from "./tracking.js";

/* Banner de consimțământ cookie — apare doar dacă există pixeli configurați
   și utilizatorul nu a ales încă. Culorile sunt hard-codate (barul trăiește
   în afara wrapper-ului .roots, deci fără variabilele CSS ale temei). */

const CK_CSS = `
.ckbar{position:fixed;left:16px;right:16px;bottom:16px;z-index:120;display:flex;align-items:center;gap:18px;flex-wrap:wrap;
  background:#122B22;color:#FBF7EF;border:1px solid rgba(251,247,239,.14);border-radius:18px;padding:16px 20px;
  box-shadow:0 18px 50px rgba(0,0,0,.35);font-family:'Manrope',system-ui,sans-serif;max-width:860px;margin:0 auto}
.ckbar p{flex:1 1 320px;margin:0;font-size:13.5px;line-height:1.6;color:rgba(251,247,239,.85)}
.ckbar a{color:#E9B872;font-weight:700;text-decoration:underline}
.ck-actions{display:flex;gap:10px;flex-wrap:wrap}
.ckbar button{border:none;border-radius:100px;padding:8px 15px;font:700 12.5px 'Manrope',sans-serif;cursor:pointer;transition:transform .2s}
.ckbar button:hover{transform:translateY(-1px)}
.ck-yes{background:#E8722C;color:#fff}
.ck-no{background:none;color:rgba(251,247,239,.75);border:1.5px solid rgba(251,247,239,.3)!important}
@media(max-width:560px){
  .ckbar{flex-direction:column;align-items:stretch;text-align:center;gap:10px;padding:13px 16px}
  /* în coloană, flex-basis:320px devenea ÎNĂLȚIME (bară uriașă) — o resetăm */
  .ckbar p{flex:0 0 auto;font-size:12.5px}
  .ck-actions{justify-content:center}
  .ckbar button{padding:8px 18px}
}
`;

export default function CookieBar({ cfg }) {
  const [choice, setChoice] = useState(() => getConsent());
  const any = cfg && ((cfg.ga4 || "").trim() || (cfg.metaPixel || "").trim() || (cfg.tiktokPixel || "").trim() || (cfg.clarity || "").trim() || (cfg.googleAds || "").trim());
  if (choice || !any) return null;
  return (
    <div className="ckbar" role="dialog" aria-label="Cookies">
      <style>{CK_CSS}</style>
      <p>
        {t("cookie_msg")}{" "}
        <Link to="/politica-cookies">{t("cookie_more")}</Link>
      </p>
      <div className="ck-actions">
        <button type="button" className="ck-no" onClick={() => { setConsent("no"); setChoice("no"); }}>{t("cookie_decline")}</button>
        <button type="button" className="ck-yes" onClick={() => { setConsent("yes"); setChoice("yes"); initTracking(cfg); }}>{t("cookie_accept")}</button>
      </div>
    </div>
  );
}
