import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CSS, Brand, NavLogin, TreeLoader, Footer, Fabs, useHubContent, ThemeStyle, LangSwitcher } from "./RootsVillas.jsx";
import { t } from "./i18n.js";
import { VILLA_CSS } from "./VillaPage.jsx";
import AvailabilityCalendar from "./AvailabilityCalendar.jsx";

/* Pagina de rezervare — alegi vila, vezi disponibilitatea și trimiți rezervarea. */

const RES_CSS = `
.res-main{max-width:1020px;margin:0 auto;padding:140px 22px 90px}
.res-head{text-align:center;max-width:640px;margin:0 auto 34px}
.res-switch{display:flex;justify-content:center;gap:10px;margin-bottom:30px;flex-wrap:wrap;position:relative;z-index:6}
.res-main .cal-card{margin-top:0}
.res-tab{border:1.5px solid var(--line);background:#fff;border-radius:100px;padding:12px 26px;font:700 15px 'Manrope',sans-serif;color:var(--ink);cursor:pointer;transition:all .2s}
.res-tab:hover{border-color:var(--ember);color:var(--ember)}
.res-tab.on{background:var(--pine);border-color:var(--pine);color:var(--ivory)}
.res-tab.both{border-color:rgba(232,114,44,.45)}
.res-tab.both.on{background:var(--ember);border-color:var(--ember)}
.res-both-hint{max-width:640px;margin:-14px auto 26px;text-align:center;font-size:13.5px;line-height:1.6;color:var(--ink-soft);background:var(--sand,#F4EDE0);border:1px solid var(--line);border-radius:14px;padding:12px 18px}
.res-info{max-width:920px;margin:36px auto 0}
.res-info-h{font-family:'Fraunces',serif;font-weight:500;font-size:24px;color:var(--pine);margin-bottom:18px}
/* bannerul de retur de la plata Stripe (?plata=ok / ?plata=anulata) */
.res-pay{max-width:720px;margin:0 auto 26px;border-radius:16px;padding:16px 20px;font-size:15px;line-height:1.6}
.res-pay.ok{background:rgba(21,122,85,.1);border:1.5px solid rgba(21,122,85,.4);color:var(--pine)}
.res-pay.warn{background:rgba(233,184,114,.16);border:1.5px solid rgba(233,184,114,.55);color:var(--ink)}
`;

export default function ReservePage() {
  const { content, loaded } = useHubContent();
  const [params] = useSearchParams();
  const p = params.get("vila");
  const initial = p === "sequoia" ? "sequoia" : p === "ambele" || p === "both" ? "both" : "redwood";
  const [villaId, setVillaId] = useState(initial);

  if (!loaded) {
    return <TreeLoader label={t("loading")} />;
  }

  const both = villaId === "both";
  const pages = content.pages || {};
  const villa = (content.villas || []).find((v) => v.id === villaId) || {};
  const page = pages[villaId] || {};

  return (
    <div className="roots">
      <style>{CSS}</style>
      <ThemeStyle content={content} />
      <style>{VILLA_CSS}</style>
      <style>{RES_CSS}</style>
      <header className="hdr solid" style={{ position: "fixed" }}>
        <div className="wrap">
          <Link to="/" className="logo"><Brand logo={content.brand?.logo} /></Link>
          <nav className="nav">
            <Link to="/">{t("nav_home")}</Link>
            <Link to="/vila-redwood">Redwood</Link>
            <Link to="/vila-sequoia">Sequoia</Link>
            <LangSwitcher />
            <NavLogin />
          </nav>
        </div>
      </header>
      <main className="res-main">
        {params.get("plata") === "ok" && (
          <div className="res-pay ok">✅ <b>{t("pay_ok_t")}</b> — {t("pay_ok_p")}</div>
        )}
        {params.get("plata") === "anulata" && (
          <div className="res-pay warn">⚠️ <b>{t("pay_cancel_t")}</b> — {t("pay_cancel_p")}</div>
        )}
        <div className="res-head">
          <div className="eyebrow" style={{ justifyContent: "center" }}>{t("res_eyebrow")}</div>
          <h2 className="serif" style={{ fontSize: "clamp(32px,5vw,48px)", fontWeight: 500, color: "var(--pine)" }}>{t("res_title")}</h2>
          <p className="lede" style={{ margin: "14px auto 0" }}>{t("res_sub")}</p>
        </div>
        <div className="res-switch">
          <button className={`res-tab ${villaId === "redwood" ? "on" : ""}`} onClick={() => setVillaId("redwood")}>Vila Redwood</button>
          <button className={`res-tab ${villaId === "sequoia" ? "on" : ""}`} onClick={() => setVillaId("sequoia")}>Vila Sequoia</button>
          <button className={`res-tab both ${both ? "on" : ""}`} onClick={() => setVillaId("both")}>{t("both_villas")}</button>
        </div>
        {both && <p className="res-both-hint">{t("both_hint")}</p>}
        <AvailabilityCalendar
          key={villaId}
          apartmentId={both ? undefined : page.smoobuId}
          apartmentIds={both ? [(pages.redwood || {}).smoobuId, (pages.sequoia || {}).smoobuId] : undefined}
          villaName={both ? t("both_villas_name") : villa.name || "Vila Roots"}
          contact={content.contact}
          depositPct={30}
        />
        {/* info importante: regulile casei + politica de anulare ale vilei selectate */}
        {(() => {
          const src = both ? pages.redwood || {} : page;
          // pozițional (0 = regulile casei, 2 = politica de anulare) — titlurile sunt
          // traduse pe EN/HE/FR, deci un filtru pe text românesc ar goli secțiunea
          const pol = src.policies || [];
          const info = [pol[0], pol[2]].filter((p) => p && (p.items || []).length);
          if (!info.length) return null;
          return (
            <div className="res-info">
              <h3 className="res-info-h">{t("res_info_title")}</h3>
              <div className="vpol-grid">
                {info.map((p, pi) => (
                  <div className="vpol-col" key={pi}>
                    <h4>{p.title}</h4>
                    <ul>{(p.items || []).map((it, i) => <li key={i}>{it}</li>)}</ul>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}
      </main>
      <Footer contact={content.contact} logo={content.brand?.logo} />
      <Fabs contact={content.contact} />
    </div>
  );
}
