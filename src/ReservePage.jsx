import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CSS, Brand, NavLogin, TreeLoader, Footer, Fabs, useHubContent, ThemeStyle, LangSwitcher } from "./RootsVillas.jsx";
import { t } from "./i18n.js";
import { VILLA_CSS } from "./VillaPage.jsx";
import AvailabilityCalendar from "./AvailabilityCalendar.jsx";
import { HUB_URL } from "./HubEditor.jsx";
import { track } from "./tracking.js";

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
/* cardul de mulțumire (fluxul plată-întâi): rezumatul rezervării confirmate */
.res-thanks{max-width:560px;margin:0 auto 34px;background:#fff;border:1px solid var(--line);border-radius:22px;
  padding:28px 26px;box-shadow:0 16px 44px rgba(18,43,34,.08);text-align:center}
.res-thanks .rt-badge{width:52px;height:52px;border-radius:50%;background:rgba(21,122,85,.12);color:#157a55;
  display:grid;place-items:center;font-size:26px;margin:0 auto 12px}
.res-thanks h3{font-family:'Fraunces',serif;font-weight:500;font-size:26px;color:var(--pine);margin-bottom:6px}
.res-thanks .rt-sub{color:var(--ink-soft);font-size:14.5px;margin-bottom:18px}
.res-thanks .rt-rows{text-align:left;border-top:1px solid var(--line);padding-top:8px}
.res-thanks .rt-row{display:flex;justify-content:space-between;gap:14px;padding:8px 0;font-size:14.5px;border-bottom:1px dashed var(--line)}
.res-thanks .rt-row span{color:var(--ink-soft)}
.res-thanks .rt-row b{color:var(--pine)}
.res-thanks .rt-spin{width:34px;height:34px;border:3px solid var(--line);border-top-color:var(--ember);border-radius:50%;
  margin:6px auto 14px;animation:rtSpin .9s linear infinite}
@keyframes rtSpin{to{transform:rotate(360deg)}}
@media(prefers-reduced-motion:reduce){.res-thanks .rt-spin{animation:none}}
`;

/* Rezultatul plății în fluxul plată-întâi: interoghează starea rezervării în
   așteptare până devine created / conflict_refunded / failed. */
function PaymentResult({ pb }) {
  const [info, setInfo] = useState(null);
  const [gaveUp, setGaveUp] = useState(false);
  useEffect(() => {
    let stop = false, tries = 0;
    const tick = async () => {
      try {
        const r = await fetch(`${HUB_URL}/api/v1/bookings/pending/${encodeURIComponent(pb)}`);
        const j = await r.json();
        if (stop) return;
        setInfo(j);
        if (j.status === "created") {
          // conversia purchase abia ACUM, când plata + rezervarea sunt reale (o singură dată)
          try {
            const k = "pb_purchase_" + pb;
            if (!sessionStorage.getItem(k)) {
              sessionStorage.setItem(k, "1");
              track("purchase", { label: j.villaName || "rezervare", value: j.total || undefined });
            }
          } catch { /* privat */ }
        }
        if (j.status === "pending" || j.status === "paid") {
          if (++tries < 15) setTimeout(tick, 2000);
          else setGaveUp(true);
        }
      } catch {
        if (!stop && ++tries < 15) setTimeout(tick, 2500);
        else setGaveUp(true);
      }
    };
    tick();
    return () => { stop = true; };
  }, [pb]);

  const st = info && info.status;
  // hub complet indisponibil după toate încercările → mesaj liniștitor, nu spinner pe veci
  if (!info) {
    return gaveUp
      ? <div className="res-pay warn">⏳ <b>{t("pay_fail2_t")}</b> — {t("pay_fail2_p")}</div>
      : (
        <div className="res-thanks">
          <div className="rt-spin" aria-hidden="true" />
          <h3>{t("pay_wait_t")}</h3>
          <p className="rt-sub">{t("pay_wait_p")}</p>
        </div>
      );
  }
  if ((st === "pending" || st === "paid") && !gaveUp) {
    return (
      <div className="res-thanks">
        <div className="rt-spin" aria-hidden="true" />
        <h3>{t("pay_wait_t")}</h3>
        <p className="rt-sub">{t("pay_wait_p")}</p>
      </div>
    );
  }
  if (st === "created") {
    const rest = info.total != null && info.deposit != null ? info.total - info.deposit : null;
    const row = (k, v) => (v == null || v === "" ? null : <div className="rt-row" key={k}><span>{k}</span><b>{v}</b></div>);
    return (
      <div className="res-thanks">
        <div className="rt-badge">✓</div>
        <h3>{t("pay_done_t")}</h3>
        <p className="rt-sub">{t("pay_done_p")}</p>
        <div className="rt-rows">
          {row(t("bk_villa"), info.villaName)}
          {row("Check-in", info.arrivalDate)}
          {row("Check-out", info.departureDate)}
          {row(t("bk_nights_g"), info.nights && info.guests ? `${info.nights} · ${info.guests}` : info.nights)}
          {row(t("bk_total"), info.total != null ? info.total.toLocaleString("ro-RO") + " lei" : null)}
          {row(t("pay_paid_deposit"), info.deposit != null ? info.deposit.toLocaleString("ro-RO") + " lei" : null)}
          {row(t("rest_checkin"), rest != null ? rest.toLocaleString("ro-RO") + " lei" : null)}
          {row(t("bk_ref"), info.reservationRef ? "#" + info.reservationRef : null)}
        </div>
      </div>
    );
  }
  if (st === "conflict_refunded") {
    return (
      <div className="res-pay warn">⚠️ <b>{t("pay_conflict_t")}</b> — {t("pay_conflict_p")}</div>
    );
  }
  // failed sau încă în procesare după ce am renunțat la polling
  return (
    <div className="res-pay warn">⏳ <b>{t("pay_fail2_t")}</b> — {t("pay_fail2_p")}</div>
  );
}

export default function ReservePage() {
  const { content, loaded } = useHubContent();
  const [params] = useSearchParams();
  const p = params.get("vila");
  const initial = p === "sequoia" ? "sequoia" : p === "ambele" || p === "both" ? "both" : "redwood";
  const [villaId, setVillaId] = useState(initial);

  // plata anulată → pending-ul se marchează cancelled (curățenie; nu atinge stări plătite)
  useEffect(() => {
    const pb = params.get("pb");
    if (params.get("plata") === "anulata" && pb) {
      fetch(`${HUB_URL}/api/v1/bookings/pending/${encodeURIComponent(pb)}/cancel`, { method: "POST" }).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        {params.get("plata") === "ok" && params.get("pb") && <PaymentResult pb={params.get("pb")} />}
        {params.get("plata") === "ok" && !params.get("pb") && (
          <div className="res-pay ok">✅ <b>{t("pay_ok_t")}</b> — {t("pay_ok_p")}</div>
        )}
        {params.get("plata") === "anulata" && (
          <div className="res-pay warn">⚠️ <b>{params.get("pb") ? t("pay_cancel2_t") : t("pay_cancel_t")}</b> — {params.get("pb") ? t("pay_cancel2_p") : t("pay_cancel_p")}</div>
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
