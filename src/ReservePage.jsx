import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CSS, Brand, Footer, Fabs, useHubContent, ThemeStyle, LangSwitcher } from "./RootsVillas.jsx";
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
`;

export default function ReservePage() {
  const { content, loaded } = useHubContent();
  const [params] = useSearchParams();
  const p = params.get("vila");
  const initial = p === "sequoia" ? "sequoia" : p === "ambele" || p === "both" ? "both" : "redwood";
  const [villaId, setVillaId] = useState(initial);

  if (!loaded) {
    return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#FBF7EF", fontFamily: "sans-serif", color: "#122B22" }}>Se încarcă…</div>;
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
          </nav>
        </div>
      </header>
      <main className="res-main">
        <div className="res-head">
          <div className="eyebrow" style={{ justifyContent: "center" }}>{t("res_eyebrow")}</div>
          <h2 className="serif" style={{ fontSize: "clamp(32px,5vw,48px)", fontWeight: 500, color: "var(--pine)" }}>{t("res_title")}</h2>
          <p className="lede" style={{ margin: "14px auto 0" }}>{t("res_sub")}</p>
        </div>
        <div className="res-switch">
          <button className={`res-tab ${villaId === "redwood" ? "on" : ""}`} onClick={() => setVillaId("redwood")}>Vila Redwood</button>
          <button className={`res-tab ${villaId === "sequoia" ? "on" : ""}`} onClick={() => setVillaId("sequoia")}>Vila Sequoia</button>
          <button className={`res-tab both ${both ? "on" : ""}`} onClick={() => setVillaId("both")}>{t("both_villas")} · 20 pers.</button>
        </div>
        {both && <p className="res-both-hint">{t("both_hint")}</p>}
        <AvailabilityCalendar
          key={villaId}
          apartmentId={both ? undefined : page.smoobuId}
          apartmentIds={both ? [(pages.redwood || {}).smoobuId, (pages.sequoia || {}).smoobuId] : undefined}
          villaName={both ? t("both_villas_name") : villa.name || "Vila Roots"}
          contact={content.contact}
          capacity={both ? 20 : 10}
          depositPct={30}
        />
      </main>
      <Footer contact={content.contact} logo={content.brand?.logo} />
      <Fabs contact={content.contact} />
    </div>
  );
}
