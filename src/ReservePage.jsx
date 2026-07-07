import React, { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CSS, Footer, Fabs, useHubContent } from "./RootsVillas.jsx";
import { VILLA_CSS } from "./VillaPage.jsx";
import AvailabilityCalendar from "./AvailabilityCalendar.jsx";

/* Pagina de rezervare — alegi vila, vezi disponibilitatea și trimiți rezervarea. */

const RES_CSS = `
.res-main{max-width:1020px;margin:0 auto;padding:140px 22px 90px}
.res-head{text-align:center;max-width:640px;margin:0 auto 34px}
.res-switch{display:flex;justify-content:center;gap:10px;margin-bottom:30px;flex-wrap:wrap}
.res-tab{border:1.5px solid var(--line);background:#fff;border-radius:100px;padding:12px 26px;font:700 15px 'Manrope',sans-serif;color:var(--ink);cursor:pointer;transition:all .2s}
.res-tab:hover{border-color:var(--ember);color:var(--ember)}
.res-tab.on{background:var(--pine);border-color:var(--pine);color:var(--ivory)}
`;

export default function ReservePage() {
  const { content, loaded } = useHubContent();
  const [params] = useSearchParams();
  const initial = params.get("vila") === "sequoia" ? "sequoia" : "redwood";
  const [villaId, setVillaId] = useState(initial);

  if (!loaded) {
    return <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#FBF7EF", fontFamily: "sans-serif", color: "#122B22" }}>Se încarcă…</div>;
  }

  const villa = (content.villas || []).find((v) => v.id === villaId) || {};
  const page = (content.pages || {})[villaId] || {};

  return (
    <div className="roots">
      <style>{CSS}</style>
      <style>{VILLA_CSS}</style>
      <style>{RES_CSS}</style>
      <header className="hdr solid" style={{ position: "fixed" }}>
        <div className="wrap">
          <Link to="/" className="logo"><span className="logo-ring">R</span>ROOTS</Link>
          <nav className="nav">
            <Link to="/">Acasă</Link>
            <Link to="/vila-redwood">Redwood</Link>
            <Link to="/vila-sequoia">Sequoia</Link>
          </nav>
        </div>
      </header>
      <main className="res-main">
        <div className="res-head">
          <div className="eyebrow" style={{ justifyContent: "center" }}>Rezervare directă</div>
          <h2 className="serif" style={{ fontSize: "clamp(32px,5vw,48px)", fontWeight: 500, color: "var(--pine)" }}>Rezervă la Roots</h2>
          <p className="lede" style={{ margin: "14px auto 0" }}>Alege vila, perioada și numărul de oaspeți — vezi disponibilitatea live și trimite rezervarea.</p>
        </div>
        <div className="res-switch">
          <button className={`res-tab ${villaId === "redwood" ? "on" : ""}`} onClick={() => setVillaId("redwood")}>Vila Redwood</button>
          <button className={`res-tab ${villaId === "sequoia" ? "on" : ""}`} onClick={() => setVillaId("sequoia")}>Vila Sequoia</button>
        </div>
        <AvailabilityCalendar
          key={villaId}
          apartmentId={page.smoobuId}
          villaName={villa.name || "Vila Roots"}
          contact={content.contact}
          capacity={10}
          depositPct={30}
        />
      </main>
      <Footer contact={content.contact} />
      <Fabs contact={content.contact} />
    </div>
  );
}
