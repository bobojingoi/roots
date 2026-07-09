import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import HubEditor, { EDIT_MODE } from "./HubEditor.jsx";
import { CSS, ICONS, Brand, useHubContent, ThemeStyle, LangSwitcher } from "./RootsVillas.jsx";
import { t } from "./i18n.js";

/* Pagină de instrucțiuni pentru oaspeți (/welcome-redwood, /welcome-sequoia).
   Conținut din DEFAULT_CONTENT.welcome[villaId]. Mobile-first. */

const WELCOME_CSS = `
.wel-page{background:var(--ivory);min-height:100vh}
.wel-top{padding:16px 20px;border-bottom:1px solid var(--line)}
.wel-top .logo{color:var(--pine)}
.wel{max-width:680px;margin:0 auto;padding:8px 20px 90px}
.wel-heroimg{height:230px;margin:0 -20px;background-size:cover;background-position:center;border-radius:0 0 26px 26px}
.wel-hero{padding:30px 0 20px;text-align:center}
.wel-eyebrow{font-size:12.5px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:var(--ember);margin-bottom:10px}
.wel-hero h1{font-family:'Fraunces',serif;font-weight:500;font-size:clamp(34px,9vw,52px);color:var(--pine);line-height:1.05}
.wel-addr{display:inline-flex;align-items:center;gap:8px;margin-top:12px;color:var(--ink-soft);font-weight:600;font-size:14.5px;text-decoration:none}
.wel-addr:hover{color:var(--ember)}
.wel-addr svg{color:var(--ember)}
.wel-chips{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin:6px 0 26px}
.wel-chip{background:var(--pine);color:var(--ivory);border-radius:16px;padding:14px 18px;text-align:center}
.wel-chip span{display:block;font-size:11.5px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:var(--gold);margin-bottom:5px}
.wel-chip b{font-family:'Fraunces',serif;font-weight:500;font-size:24px;letter-spacing:.02em;word-break:break-word}
.wel-card{background:#fff;border:1px solid var(--line);border-radius:20px;padding:22px;margin-bottom:16px}
.wel-card-h{display:flex;align-items:center;gap:14px;margin-bottom:16px}
.wel-ico{width:44px;height:44px;flex-shrink:0;border-radius:12px;background:var(--sand);display:grid;place-items:center;color:var(--ember)}
.wel-card-h h3{font-family:'Fraunces',serif;font-weight:500;font-size:21px;color:var(--pine)}
.wel-card ul{list-style:none;display:grid;gap:11px}
.wel-card li{position:relative;padding-left:22px;font-size:15px;line-height:1.55;color:var(--ink)}
.wel-card li::before{content:"";position:absolute;left:3px;top:8px;width:7px;height:7px;border-radius:50%;background:var(--ember)}
.wel-help p{font-size:15px;color:var(--ink-soft);line-height:1.6;margin-bottom:16px}
.wel-actions{display:flex;gap:12px;flex-wrap:wrap}
.wel-actions .btn{padding:13px 22px;font-size:14.5px}
.wel-foot{text-align:center;color:var(--ink-soft);font-size:13px;margin-top:26px}
.wel-load{min-height:100vh;display:grid;place-items:center;background:#FBF7EF;font-family:sans-serif;color:#122B22}
.wel-card-img{width:100%;height:190px;border-radius:14px;background-color:#e9ede9;background-size:cover;background-position:center;margin:2px 0 16px}
.wel-steps{display:grid;gap:16px;margin-top:4px}
.wel-step{display:flex;gap:13px;align-items:flex-start}
.wel-step-n{width:27px;height:27px;flex-shrink:0;border-radius:50%;background:var(--ember);color:#fff;font-weight:800;font-size:13.5px;display:grid;place-items:center;margin-top:1px}
.wel-step-body{flex:1;min-width:0}
.wel-step-body p{font-size:15px;line-height:1.55;color:var(--ink)}
.wel-step-img{width:100%;height:160px;border-radius:12px;background-color:#e9ede9;background-size:cover;background-position:center;margin-top:10px}
.wel-dirs{display:flex;flex-wrap:wrap;gap:10px;margin:0 0 26px}
.wel-dir{display:inline-flex;align-items:center;gap:8px;background:#fff;border:1.5px solid var(--line);border-radius:100px;padding:11px 18px;font-weight:700;font-size:14px;color:var(--pine);text-decoration:none}
.wel-dir:hover{border-color:var(--ember);color:var(--ember)}
.wel-dir svg{color:var(--ember);width:18px;height:18px}
.wel-recs{margin-top:10px}
.wel-recs h2{font-family:'Fraunces',serif;font-weight:500;font-size:26px;color:var(--pine);text-align:center;margin-bottom:6px}
.wel-recs>p{text-align:center;color:var(--ink-soft);font-size:14px;line-height:1.5;margin-bottom:24px}
.wel-recgrp{margin-bottom:22px}
.wel-recgrp h4{font-size:12.5px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--ember);margin-bottom:12px}
.wel-reclist{display:flex;flex-wrap:wrap;gap:8px}
.wel-rec{display:inline-flex;align-items:center;gap:7px;background:#fff;border:1px solid var(--line);border-radius:12px;padding:9px 13px;font-size:13.5px;font-weight:600;color:var(--ink);text-decoration:none}
.wel-rec:hover{border-color:var(--ember);color:var(--ember)}
.wel-rec svg{width:15px;height:15px;color:var(--ink-soft);flex-shrink:0}
.wel-rec:hover svg{color:var(--ember)}
`;

export default function WelcomePage({ villaId }) {
  const { content, loaded, hubRaw, setHubRaw } = useHubContent();
  const sk = `welcome_${villaId}`; // cheia secțiunii în Hub
  useEffect(() => { window.scrollTo(0, 0); }, [villaId]);

  if (!loaded) return <div className="wel-load">{t("loading")}</div>;

  const villa = (content.villas || []).find((v) => v.id === villaId);
  const w = (content.welcome || {})[villaId];
  const contact = content.contact || {};

  if (!villa || !w) {
    return (
      <div className="roots wel-page" style={{ display: "grid", placeItems: "center" }}>
        <style>{CSS}</style>
        <div style={{ textAlign: "center", padding: 40 }}>
          <p style={{ marginBottom: 16 }}>{t("page_missing")}</p>
          <Link to="/" className="btn btn-ember">{t("back_home")}</Link>
        </div>
      </div>
    );
  }

  const phone = (contact.phone || "").replace(/\s/g, "");
  const wa = (contact.whatsapp || "").replace(/[^0-9]/g, "");

  return (
    <div className="roots wel-page">
      <style>{CSS}</style>
      <ThemeStyle content={content} />
      <style>{WELCOME_CSS}</style>

      <header className="wel-top" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Link to="/" className="logo"><Brand logo={content.brand?.logo} /></Link>
        <LangSwitcher />
      </header>

      <main className="wel">
        {(w.heroImage || EDIT_MODE) && <div className="wel-heroimg" data-edit-img={`${sk}.heroImage`} style={{ backgroundImage: w.heroImage ? `url(${w.heroImage})` : "none", ...(w.heroImage ? {} : { background: "#e3e8e5" }) }} role="img" aria-label={villa.name} />}
        <section className="wel-hero">
          <div className="wel-eyebrow">{t("wel_welcome")}</div>
          <h1>{villa.name}</h1>
          {w.address && (
            <a className="wel-addr" href={w.mapsUrl || "#"} target="_blank" rel="noreferrer">{ICONS.pin} <span data-edit={`${sk}.address`}>{w.address}</span></a>
          )}
        </section>

        <div className="wel-chips">
          {(w.keybox || EDIT_MODE) && <div className="wel-chip"><span>{t("wel_keybox")}</span><b data-edit={`${sk}.keybox`}>{w.keybox}</b></div>}
          {((w.wifi && w.wifi.name) || EDIT_MODE) && <div className="wel-chip"><span>{t("wel_wifi")}</span><b data-edit={`${sk}.wifiName`}>{w.wifi && w.wifi.name}</b></div>}
          {((w.wifi && w.wifi.password) || EDIT_MODE) && <div className="wel-chip"><span>{t("wel_wifipass")}</span><b data-edit={`${sk}.wifiPassword`}>{w.wifi && w.wifi.password}</b></div>}
        </div>

        {w.directions && w.directions.length > 0 && (
          <div className="wel-dirs" data-edit-list={`${sk}.directions`}>
            {w.directions.map((d, i) => (
              <a className="wel-dir" key={i} data-edit-idx={i} href={d.waze} target="_blank" rel="noreferrer">{ICONS.pin} <span data-edit={`${sk}.directions.${i}.label`}>{d.label}</span></a>
            ))}
          </div>
        )}

        <div data-edit-list={`${sk}.sections`}>
        {(w.sections || []).map((s, i) => (
          <section className="wel-card" key={i} data-edit-idx={i}>
            <div className="wel-card-h">
              <span className="wel-ico">{ICONS[s.icon] || ICONS.key}</span>
              <h3 data-edit={`${sk}.sections.${i}.title`}>{s.title}</h3>
            </div>
            {(s.image || EDIT_MODE) && (
              <div
                className="wel-card-img"
                data-edit-img={`${sk}.sections.${i}.image`}
                title="Click pentru a alege imaginea"
                style={{ backgroundImage: s.image ? `url(${s.image})` : "none" }}
              />
            )}
            {(s.lines || []).length > 0 && (
              <ul data-edit-list={`${sk}.sections.${i}.lines`}>
                {s.lines.map((l, j) => <li key={j} data-edit={`${sk}.sections.${i}.lines.${j}`} data-edit-idx={j}>{l}</li>)}
              </ul>
            )}
            {(s.steps || []).length > 0 && (
              <div className="wel-steps" data-edit-list={`${sk}.sections.${i}.steps`}>
                {s.steps.map((st, j) => (
                  <div className="wel-step" key={j} data-edit-idx={j}>
                    <span className="wel-step-n">{j + 1}</span>
                    <div className="wel-step-body">
                      <p data-edit={`${sk}.sections.${i}.steps.${j}.text`}>{st.text}</p>
                      {(st.image || EDIT_MODE) && (
                        <div
                          className="wel-step-img"
                          data-edit-img={`${sk}.sections.${i}.steps.${j}.image`}
                          title="Click pentru a alege imaginea pasului"
                          style={{ backgroundImage: st.image ? `url(${st.image})` : "none" }}
                        />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))}
        </div>

        <section className="wel-card wel-help">
          <div className="wel-card-h">
            <span className="wel-ico">{ICONS.phone}</span>
            <h3>{t("wel_help")}</h3>
          </div>
          <p>{t("wel_help_p")}</p>
          <div className="wel-actions">
            {contact.phone && <a className="btn btn-ember" href={`tel:${phone}`}>{ICONS.phone} {contact.phone}</a>}
            {wa && <a className="btn btn-pine" href={`https://wa.me/${wa}`} target="_blank" rel="noreferrer">{ICONS.wa} WhatsApp</a>}
          </div>
        </section>

        {w.recommendations && w.recommendations.length > 0 && (
          <section className="wel-recs">
            <h2>{t("wel_recs")}</h2>
            <p>{t("wel_recs_p")}</p>
            <div data-edit-list={`${sk}.recommendations`}>
            {w.recommendations.map((g, i) => (
              <div className="wel-recgrp" key={i} data-edit-idx={i}>
                <h4 data-edit={`${sk}.recommendations.${i}.cat`}>{g.cat}</h4>
                <div className="wel-reclist" data-edit-list={`${sk}.recommendations.${i}.items`}>
                  {g.items.map((it, j) => (
                    <a
                      className="wel-rec"
                      key={j}
                      data-edit-idx={j}
                      href={it.tel ? `tel:${it.tel}` : it.waze || "#"}
                      target={it.tel ? undefined : "_blank"}
                      rel="noreferrer"
                    >
                      {it.tel ? ICONS.phone : ICONS.pin} <span data-edit={`${sk}.recommendations.${i}.items.${j}.name`}>{it.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            ))}
            </div>
          </section>
        )}

        <p className="wel-foot">{t("wel_foot")}</p>
      </main>
      {EDIT_MODE && hubRaw && <HubEditor hubRaw={hubRaw} setHubRaw={setHubRaw} />}
    </div>
  );
}
