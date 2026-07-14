import React, { useRef } from "react";
import { Link } from "react-router-dom";
import HubEditor, { EDIT_MODE } from "./HubEditor.jsx";
import { t } from "./i18n.js";
import {
  CSS,
  ICONS,
  iconsFor,
  Ridge,
  Brand,
  NavLogin,
  TreeLoader,
  Footer,
  Fabs,
  useScrolled,
  useReveal,
  useHubContent,
  ThemeStyle,
  LangSwitcher,
} from "./RootsVillas.jsx";
import AvailabilityCalendar from "./AvailabilityCalendar.jsx";

/* stiluri specifice paginii de vilă (peste design system-ul comun) */
export const VILLA_CSS = `
/* ---- villa hero: poza curată + gradient negru de jos în sus (fără efecte) ---- */
.vhero{position:relative;min-height:74vh;display:flex;align-items:flex-end;color:#fff;overflow:hidden;
  background:linear-gradient(180deg,#16211C 0%,#0C1F19 100%)} /* fallback când lipsește poza */
.vhero-photo{position:absolute;inset:0;background-size:cover;background-position:center}
.vhero-veil{position:absolute;inset:0;background:linear-gradient(0deg,rgba(0,0,0,.78) 0%,rgba(0,0,0,.28) 34%,rgba(0,0,0,0) 62%)}
.vhero-inner{position:relative;z-index:3;width:100%;padding-bottom:150px} /* titlul stă mai sus, departe de cardul calendarului; lateralele vin din .wrap */
@media(max-width:760px){.vhero-inner{padding-bottom:120px}}
.vhero h1{font-family:'Fraunces',serif;font-weight:500;font-size:clamp(40px,7vw,80px);line-height:1.02;letter-spacing:-.02em}
.vhero-sub{margin-top:16px;max-width:48ch;font-size:clamp(15px,1.6vw,18px);line-height:1.6;color:rgba(255,255,255,.85)}
.vhero-phone{display:inline-flex;align-items:center;gap:10px;margin-top:28px;background:#fff;color:var(--pine);font-weight:700;font-size:15px;padding:14px 26px;border-radius:100px;text-decoration:none;box-shadow:0 14px 34px rgba(0,0,0,.28);transition:transform .25s,box-shadow .25s}
.vhero-phone:hover{transform:translateY(-2px);box-shadow:0 18px 40px rgba(0,0,0,.34)}

/* ---- calendar ---- */
.cal-card{max-width:920px;margin:-74px auto 0;position:relative;z-index:5;background:#fff;border-radius:28px;padding:30px 32px 26px;box-shadow:0 34px 80px rgba(13,27,42,.2);border:1px solid var(--line)}
.vp-both{text-align:center;margin-top:16px}
.vp-both a{color:var(--ember);font-weight:700;font-size:14.5px;text-decoration:none}
.vp-both a:hover{text-decoration:underline}
.cal-head{display:flex;align-items:center;justify-content:space-between;margin-bottom:24px}
.cal-head h3{font-family:'Fraunces',serif;font-weight:500;font-size:23px;color:var(--pine)}
.cal-nav{display:flex;gap:8px}
.cal-nav button{width:38px;height:38px;border-radius:50%;border:1.5px solid var(--line);background:#fff;font-size:20px;line-height:1;color:var(--pine);cursor:pointer;transition:border-color .2s,color .2s}
.cal-nav button:hover:not(:disabled){border-color:var(--ember);color:var(--ember)}
.cal-nav button:disabled{opacity:.35;cursor:not-allowed}
.cal-months{display:grid;grid-template-columns:1fr 1fr;gap:44px}
@media(max-width:640px){.cal-months{grid-template-columns:1fr;gap:30px}.cal-card{padding:22px 18px}}
.cal-mhead{text-align:center;margin-bottom:14px}
.cal-myear{display:block;font-size:12px;font-weight:700;letter-spacing:.16em;color:var(--ink-soft)}
.cal-mname{font-family:'Fraunces',serif;font-weight:500;font-size:19px;color:var(--pine);text-transform:uppercase;letter-spacing:.03em}
.cal-dow{display:grid;grid-template-columns:repeat(7,1fr);gap:2px;margin-bottom:6px}
.cal-dow span{text-align:center;font-size:11px;font-weight:800;letter-spacing:.05em;color:var(--ink-soft)}
.cal-grid{display:grid;grid-template-columns:repeat(7,1fr);gap:3px}
.cal-day{aspect-ratio:1;display:grid;place-items:center;font-size:13px;font-weight:600;border-radius:9px;color:var(--ink)}
.cal-day.empty{background:none}
.cal-day.free{color:var(--pine)}
.cal-day.busy{color:#B85575;background:repeating-linear-gradient(-45deg,rgba(230,120,150,.30),rgba(230,120,150,.30) 4px,rgba(230,120,150,.12) 4px,rgba(230,120,150,.12) 8px)}
.cal-day.past{color:var(--ink-soft);opacity:.4}
.cal-day.today{box-shadow:inset 0 0 0 1.6px var(--ember)}
.cal-foot{display:flex;align-items:center;justify-content:space-between;gap:16px;flex-wrap:wrap;margin-top:24px;padding-top:18px;border-top:1px solid var(--line)}
.cal-legend{display:flex;gap:22px;font-size:13px;font-weight:600;color:var(--ink-soft)}
.cal-legend span{display:inline-flex;align-items:center;gap:8px}
.cal-legend .lg{width:16px;height:16px;border-radius:5px;display:inline-block}
.cal-legend .lg.free{border:1.5px solid var(--line)}
.cal-legend .lg.busy{background:repeating-linear-gradient(-45deg,rgba(230,120,150,.5),rgba(230,120,150,.5) 3px,rgba(230,120,150,.2) 3px,rgba(230,120,150,.2) 6px)}
.cal-note{font-size:12.5px;color:var(--ink-soft)}
.cal-note.err{color:#C24}

/* ---- selecție interval + panou rezervare ---- */
.cal-day.free,.cal-day.today{cursor:pointer}
.cal-day.busy{cursor:not-allowed}
.cal-day.free:hover{background:var(--sand)}
.cal-day.sel-start .dn,.cal-day.sel-end .dn{color:var(--pine);font-weight:700}
.cal-day.sel-start::after,.cal-day.sel-end::after{content:"";position:absolute;inset:0;z-index:0;background:var(--ember)}
.cal-day.sel-start::after{clip-path:polygon(100% 0,100% 100%,0 100%)}
.cal-day.sel-end::after{clip-path:polygon(0 0,100% 0,0 100%)}
.cal-day.in-range{background:rgba(232,114,44,.16);color:var(--pine);border-radius:4px}
.cal-legend .lg.sel{background:var(--ember)}
/* zile de turnover: jumătate hașurate (check-in/check-out în aceeași zi) */
.cal-day{position:relative;overflow:hidden}
.cal-day .dn{position:relative;z-index:1}
.cal-day.turn-in,.cal-day.turn-out{color:#B85575;cursor:pointer}
.cal-day.turn-in::before,.cal-day.turn-out::before{content:"";position:absolute;inset:0;z-index:0;background:repeating-linear-gradient(-45deg,rgba(230,120,150,.30),rgba(230,120,150,.30) 4px,rgba(230,120,150,.12) 4px,rgba(230,120,150,.12) 8px)}
.cal-day.turn-in::before{clip-path:polygon(100% 0,100% 100%,0 100%)}
.cal-day.turn-out::before{clip-path:polygon(0 0,100% 0,0 100%)}
.cal-day.turn-in:hover,.cal-day.turn-out:hover{background:var(--sand)}
.cal-day.sel-start::before,.cal-day.sel-end::before,.cal-day.in-range::before{display:none}
.cal-hint{display:flex;align-items:center;gap:12px;margin:-8px 0 16px;font-size:13.5px;font-weight:600;color:var(--ink-soft)}
.cal-clear{background:none;border:none;color:var(--ember);font-family:inherit;font-weight:700;font-size:13px;cursor:pointer;text-decoration:underline}
.bk-panel{margin-top:22px;padding-top:22px;border-top:1px solid var(--line)}
.bk-guests{display:flex;align-items:center;gap:24px;flex-wrap:wrap;margin-bottom:18px}
.bk-guest{display:flex;align-items:center;gap:12px}
.bk-guest>span{font-size:14px;font-weight:600;color:var(--ink)}
.bk-step{display:inline-flex;align-items:center;gap:12px;border:1.5px solid var(--line);border-radius:100px;padding:5px 8px}
.bk-step button{width:28px;height:28px;border-radius:50%;border:none;background:var(--sand);color:var(--pine);font-size:17px;line-height:1;cursor:pointer;display:grid;place-items:center}
.bk-step button:disabled{opacity:.35;cursor:not-allowed}
.bk-step b{min-width:18px;text-align:center;font-size:15px}
.bk-cap{font-size:12.5px;color:var(--ink-soft)}
/* oaspeți extra: alegere pat/canapea + mențiuni; copii: vârste + pătuț */
.bk-extra{background:rgba(232,114,44,.06);border:1px solid rgba(232,114,44,.25);border-radius:16px;padding:14px 16px;margin-bottom:16px}
.bk-extra-q{font-size:13.5px;font-weight:700;color:var(--ink);margin-bottom:10px}
.bk-extra-opts{display:flex;gap:10px;flex-wrap:wrap}
.bk-extra-opts label{display:inline-flex;align-items:center;gap:8px;border:1.5px solid var(--line);border-radius:100px;padding:9px 16px;font-size:13.5px;font-weight:600;cursor:pointer;background:#fff;color:#1E2A24;transition:border-color .2s}
.bk-extra-opts label.on{border-color:var(--ember);color:var(--ember)}
.bk-extra-opts input{accent-color:var(--ember)}
.bk-extra-note{margin-top:12px;font-size:12.5px;line-height:1.6;color:var(--ink-soft)}
.bk-kids{margin-bottom:16px}
.bk-kids-lbl{display:block;font-size:13px;font-weight:700;color:var(--ink);margin-bottom:8px}
.bk-cot{display:flex;align-items:center;gap:9px;margin-top:10px;font-size:13.5px;font-weight:600;color:var(--ink);cursor:pointer}
.bk-cot input{accent-color:var(--ember);width:17px;height:17px}
.bk-summary{background:var(--sand);border-radius:16px;padding:16px 18px;margin-bottom:16px}
.bk-row{display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:14.5px;padding:5px 0;color:var(--ink)}
.bk-row b{font-family:'Fraunces',serif;font-weight:500}
.bk-row.hi{color:var(--ember)}
.bk-row.hi b{color:var(--ember);font-size:19px}
.bk-row.muted{color:var(--ink-soft);font-size:13px}
.bk-row.disc{color:#157a55;font-weight:700;font-size:13.5px}
.bk-perks{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}
.bk-perks span{background:rgba(233,184,114,.16);border:1px solid rgba(233,184,114,.45);border-radius:100px;padding:7px 14px;font-size:12.5px;font-weight:700;color:#7A5A1E}
.bk-cta{display:block;text-align:center;background:var(--ember);color:#fff;font-weight:700;font-size:15px;padding:15px;border-radius:100px;text-decoration:none;box-shadow:0 10px 26px rgba(232,114,44,.4);transition:transform .2s,background .2s}
.bk-cta:hover{background:var(--ember-2);transform:translateY(-2px)}
.bk-cta:disabled{background:var(--sand);color:var(--ink-soft);box-shadow:none;cursor:not-allowed;transform:none}
/* oferta „cont nou = −300 lei" din pasul de date */
.bk-acc300{display:block;width:100%;text-align:center;background:rgba(233,184,114,.16);border:1.5px dashed var(--gold);
  color:var(--ink);font:700 13.5px 'Manrope',sans-serif;padding:12px 14px;border-radius:14px;cursor:pointer;
  margin-top:12px;transition:background .2s,transform .2s}
.bk-acc300:hover{background:rgba(233,184,114,.26);transform:translateY(-1px)}
.bk-cta.grow{flex:1}
.bk-soon{margin-top:12px;font-size:12.5px;color:var(--ink-soft);text-align:center;line-height:1.5}
.bk-soon a{color:var(--ember);font-weight:700}
.bk-fields{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}
@media(max-width:520px){.bk-fields{grid-template-columns:1fr}}
.bk-input{width:100%;font-family:inherit;font-size:14.5px;padding:12px 14px;border:1.5px solid var(--line);border-radius:12px;background:#fff;color:var(--ink);transition:border-color .2s,box-shadow .2s}
.bk-input:focus{outline:none;border-color:var(--ember);box-shadow:0 0 0 3px rgba(232,114,44,.15)}
.bk-actions{display:flex;align-items:center;gap:12px}
.bk-back{background:none;border:1.5px solid var(--line);color:var(--ink);font-family:inherit;font-weight:700;font-size:14px;padding:14px 18px;border-radius:100px;cursor:pointer;transition:border-color .2s}
.bk-back:hover{border-color:var(--ink)}
.bk-done{text-align:center;padding:14px 4px}
.bk-done h4{font-family:'Fraunces',serif;font-weight:500;font-size:24px;color:var(--pine);margin-bottom:8px}
.bk-done.ok h4{color:#2E7D4F}
.bk-done.err h4{color:#C24}
.bk-done p{font-size:14.5px;color:var(--ink-soft);line-height:1.6;margin-bottom:6px}
.bk-done .bk-total{color:var(--ink);font-weight:600}
.bk-badge{width:46px;height:46px;border-radius:50%;background:#2E7D4F;color:#fff;font-size:24px;line-height:46px;text-align:center;margin:0 auto 12px}
.bk-conf{background:var(--sand);border-radius:16px;padding:4px 18px;margin:8px 0 4px;text-align:left}
.bk-crow{display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:14px;padding:9px 0;border-bottom:1px solid var(--line)}
.bk-crow:last-child{border-bottom:none}
.bk-crow span{color:var(--ink-soft)}
.bk-crow b{color:var(--ink);font-weight:700}
.bk-done .bk-cta,.bk-done .bk-actions{margin-top:16px}

/* ---- gallery / carusel ---- */
.vg-title{font-family:'Fraunces',serif;font-weight:500;font-size:clamp(24px,3.4vw,34px);color:var(--pine);text-align:center;margin-bottom:36px}
.vg-wrap{position:relative}
.vg-track{display:flex;gap:22px;overflow-x:auto;scroll-snap-type:x mandatory;padding:4px 2px;scrollbar-width:none;-ms-overflow-style:none}
.vg-track::-webkit-scrollbar{display:none}
.vg-card{flex:0 0 clamp(320px,58%,580px);scroll-snap-align:start;position:relative}
.vg-card .pic-mob-btn{top:12px;bottom:auto} /* nu peste figcaption-ul editabil */
.vg-multi{margin:0 0 16px;border:none;border-radius:100px;padding:10px 18px;background:#157a55;color:#fff;font:700 13px 'Manrope',sans-serif;cursor:pointer}
.vg-card img,.vg-ph{width:100%;height:400px;object-fit:cover;border-radius:20px;display:block}
@media(max-width:600px){.vg-card{flex-basis:86%}.vg-card img,.vg-ph{height:300px}}
/* în editor, butonul „+ Adaugă element" (portalul HubEditor) devine un card vizibil la capătul galeriei */
.vg-track .hub-addbtn{flex:0 0 220px;width:auto;min-height:auto;align-self:stretch;border-radius:20px;font-size:15px}
.vg-ph{position:relative;background:linear-gradient(160deg,#1B4033,#0C1F19);overflow:hidden}
.vg-ph .vg-glow{position:absolute;bottom:-50px;left:50%;transform:translateX(-50%);width:250px;height:130px;border-radius:50%;background:radial-gradient(ellipse,rgba(240,138,60,.5),transparent 70%)}
.vg-ph svg{position:absolute;inset:auto 0 0 0;display:block;width:100%}
.vg-card figcaption{margin-top:14px;font-size:14.5px;font-weight:600;color:var(--ink)}
.vg-arrow{position:absolute;top:200px;transform:translateY(-50%);width:46px;height:46px;border-radius:50%;border:none;background:#fff;box-shadow:0 8px 24px rgba(0,0,0,.16);font-size:22px;color:var(--pine);cursor:pointer;z-index:3;display:grid;place-items:center;transition:transform .2s} /* 200px = jumătatea imaginii de 400px — săgețile stau pe mijlocul pozelor */
.vg-arrow:hover{transform:translateY(-50%) scale(1.08)}
.vg-arrow.left{left:-12px}.vg-arrow.right{right:-12px}
@media(max-width:640px){.vg-arrow{display:none}}

/* ---- facilități ---- */
.fac-head{text-align:center;max-width:640px;margin:0 auto}
.fac-group{margin-top:44px}
.fac-cat{font-family:'Fraunces',serif;font-weight:500;font-size:22px;color:var(--pine);margin-bottom:20px;padding-bottom:12px;border-bottom:1px solid var(--line)}
.fac-grid{display:grid;grid-template-columns:1fr 1fr;gap:20px 44px}
@media(max-width:640px){.fac-grid{grid-template-columns:1fr}}
.fac-item{display:flex;gap:14px;align-items:center}
.fac-ico{width:42px;height:42px;flex-shrink:0;border-radius:12px;background:var(--sand);display:grid;place-items:center;color:var(--ember)}
.fac-item b{display:block;font-size:15px;font-weight:700;color:var(--ink)}
.fac-item small{display:block;font-size:13px;color:var(--ink-soft);margin-top:2px}

/* ---- hartă ---- */
.vmap{margin-top:30px;border-radius:var(--r);overflow:hidden;border:1px solid var(--line);height:440px;background:linear-gradient(150deg,#E8EFE4,#D7E4D2)}
.vmap iframe{width:100%;height:100%;border:0;display:block}
.vmap-link{display:inline-flex;align-items:center;gap:9px;margin-top:16px;color:var(--pine);font-weight:700;font-size:14.5px;text-decoration:none}
.vmap-link:hover{color:var(--ember)}
.vmap-link svg{color:var(--ember)}

/* ---- politici ---- */
.vpol-h{font-family:'Fraunces',serif;font-weight:500;font-size:28px;color:var(--pine);margin-bottom:30px}
.vpol-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:32px}
@media(max-width:900px){.vpol-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:560px){.vpol-grid{grid-template-columns:1fr}}
.vpol-col h4{font-size:13px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--ember);margin-bottom:16px}
.vpol-col ul{list-style:none}
.vpol-col li{font-size:14px;line-height:1.5;color:var(--ink-soft);padding:9px 0;border-bottom:1px solid var(--line)}
.vpol-cta{text-align:center;margin-top:48px}
`;

function VHeader({ contact, logo }) {
  const scrolled = useScrolled();
  const wa = `https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, "")}`;
  return (
    <header className={`hdr ${scrolled ? "solid" : ""}`}>
      <div className="wrap">
        <Link to="/" className="logo">
          <Brand logo={logo} />
        </Link>
        <nav className="nav">
          <Link to="/">{t("nav_home")}</Link>
          <a href="#facilitati">{t("vp_details")}</a>
          <a href="#locatie">{t("nav_location")}</a>
          <LangSwitcher />
          <NavLogin />
        </nav>
      </div>
    </header>
  );
}

function Gallery({ title, items: rawItems, basePath }) {
  const ref = useRef(null);
  // pe site nu afișăm cardurile complet goale (rămase din editor);
  // în editor le păstrăm pe toate, ca indicii data-edit să corespundă draftului
  const items = EDIT_MODE ? rawItems : rawItems.filter((it) => it && (it.img || it.caption));
  const scroll = (dir) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };
  if (!items.length && !EDIT_MODE) return null;
  return (
    <section className="sec" style={{ paddingBottom: 40 }}>
      <div className="wrap">
        <h2 className="vg-title rv">{title}</h2>
        {EDIT_MODE && basePath ? (
          <button type="button" className="vg-multi" data-edit-imgs={basePath} data-edit-imgs-field="img" data-edit-imgs-mobfield="imgMobile">⬆ Adaugă mai multe poze deodată</button>
        ) : null}
        <div className="vg-wrap rv rv-d1">
          <button className="vg-arrow left" onClick={() => scroll(-1)} aria-label="Înapoi">‹</button>
          {/* data-edit-drag: în editor pozele se reordonează prin drag & drop (HubEditor) */}
          <div className="vg-track" ref={ref} data-edit-list={basePath || undefined} data-edit-drag={EDIT_MODE && basePath ? "" : undefined}>
            {items.map((it, i) => (
              <figure className="vg-card" key={i} data-edit-idx={basePath ? i : undefined}>
                {it.img ? (
                  <>
                    <picture>
                      {it.imgMobile ? <source media="(max-width:760px)" srcSet={it.imgMobile} /> : null}
                      <img src={it.img} alt={it.caption} loading="lazy" data-edit-img={basePath ? `${basePath}.${i}.img` : undefined} />
                    </picture>
                    {EDIT_MODE && basePath ? (
                      <button type="button" className="pic-mob-btn" data-edit-img={`${basePath}.${i}.imgMobile`}>📱 mobil</button>
                    ) : null}
                  </>
                ) : (
                  <div className="vg-ph" draggable={EDIT_MODE && basePath ? true : undefined} data-edit-img={basePath ? `${basePath}.${i}.img` : undefined}>
                    <div className="vg-glow" />
                    <Ridge fill="rgba(233,184,114,.18)" height={100} />
                  </div>
                )}
                <figcaption data-edit={basePath ? `${basePath}.${i}.caption` : undefined}>{it.caption}</figcaption>
              </figure>
            ))}
          </div>
          <button className="vg-arrow right" onClick={() => scroll(1)} aria-label="Înainte">›</button>
        </div>
      </div>
    </section>
  );
}

export default function VillaPage({ villaId }) {
  const { content, loaded, hubRaw, setHubRaw } = useHubContent();
  const sk = `villa_${villaId}`; // cheia secțiunii în Hub
  useReveal();

  if (!loaded) {
    return <TreeLoader label={t("loading")} />;
  }

  const villa = (content.villas || []).find((v) => v.id === villaId);
  const page = (content.pages || {})[villaId];
  const contact = content.contact;

  if (!villa || !page) {
    return (
      <div className="roots" style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
        <style>{CSS}</style>
        <div style={{ textAlign: "center" }}>
          <p style={{ marginBottom: 16 }}>Vila nu a fost găsită.</p>
          <Link to="/" className="btn btn-ember">Înapoi la pagina principală</Link>
        </div>
      </div>
    );
  }

  const wa = `https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent("Bună! Aș dori o rezervare la " + villa.name)}`;

  return (
    <div className="roots">
      <style>{CSS}</style>
      <ThemeStyle content={content} />
      <style>{VILLA_CSS}</style>
      <VHeader contact={contact} logo={content.brand?.logo} />

      {/* HERO */}
      <section className="vhero">
        {page.heroImage && <div className="vhero-photo pic-desk" style={{ backgroundImage: `url(${page.heroImage})` }} />}
        {(page.heroImageMobile || page.heroImage) && <div className="vhero-photo pic-mob" style={{ backgroundImage: `url(${page.heroImageMobile || page.heroImage})` }} />}
        <div className="vhero-veil" />
        {EDIT_MODE && (
          <>
            <button type="button" className="hub-imgbtn" data-edit-img={`${sk}.heroImage`}>📷 Imagine desktop</button>
            <button type="button" className="hub-imgbtn mob" data-edit-img={`${sk}.heroImageMobile`}>📱 Imagine mobil</button>
          </>
        )}
        <div className="wrap vhero-inner">
          <h1>{villa.name}</h1>
          <p className="vhero-sub" data-edit={`${sk}.heroSubtitle`}>{page.heroSubtitle}</p>
        </div>
      </section>

      {/* CALENDAR + REZERVARE */}
      <div className="wrap">
        <AvailabilityCalendar
          apartmentId={page.smoobuId}
          villaName={villa.name}
          contact={contact}
          depositPct={30}
        />
        <p className="vp-both">
          <Link to="/rezervare?vila=ambele">{t("want_both")}</Link>
        </p>
      </div>

      {/* GALERII */}
      <Gallery title={t("vp_gal_ext", { v: villa.name })} items={page.galleryExterior} basePath={`${sk}.galleryExterior`} />
      <Gallery title={t("vp_gal_int", { v: villa.name })} items={page.galleryInterior} basePath={`${sk}.galleryInterior`} />

      {/* FACILITĂȚI */}
      <section className="sec" id="facilitati" style={{ paddingTop: 60 }}>
        <div className="wrap">
          <div className="fac-head rv">
            <div className="eyebrow" style={{ justifyContent: "center" }}>{t("vp_details")}</div>
            <h2>{t("vp_facilities")}</h2>
          </div>
          <div data-edit-list={`${sk}.facilities`}>
            {page.facilities.map((group, gi) => (
              <div className="fac-group rv" key={gi} data-edit-idx={gi}>
                <h4 className="fac-cat" data-edit={`${sk}.facilities.${gi}.cat`}>{group.cat}</h4>
                <div className="fac-grid" data-edit-list={`${sk}.facilities.${gi}.items`}>
                  {group.items.map((it, i, all) => (
                    <div className="fac-item" key={i} data-edit-idx={i}>
                      <span className="fac-ico">{ICONS[iconsFor(all.map((x) => x.t))[i]]}</span>
                      <div>
                        <b data-edit={`${sk}.facilities.${gi}.items.${i}.t`}>{it.t}</b>
                        {(it.s || EDIT_MODE) && <small data-edit={`${sk}.facilities.${gi}.items.${i}.s`}>{it.s}</small>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* LOCAȚIE */}
      <section className="sec" id="locatie" style={{ paddingTop: 40 }}>
        <div className="wrap">
          <div className="rv">
            <div className="eyebrow">Stupini · Brașov</div>
            <h2>{t("vp_loc_title")}</h2>
          </div>
          <div className="vmap rv rv-d1">
            <iframe src={page.mapEmbed} title={`Hartă ${villa.name}`} loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" />
          </div>
          <a className="vmap-link" href={content.location?.mapsUrl || "https://maps.google.com/?q=Stupini+Brasov"} target="_blank" rel="noreferrer">
            {ICONS.pin} {t("vp_open_maps")}
          </a>
        </div>
      </section>

      {/* POLITICI */}
      <section className="sec" style={{ paddingTop: 40 }}>
        <div className="wrap">
          <h3 className="vpol-h rv">{t("vp_more_info")}</h3>
          <div className="vpol-grid rv rv-d1" data-edit-list={`${sk}.policies`}>
            {page.policies.map((p, pi) => (
              <div className="vpol-col" key={pi} data-edit-idx={pi}>
                <h4 data-edit={`${sk}.policies.${pi}.title`}>{p.title}</h4>
                <ul data-edit-list={`${sk}.policies.${pi}.items`}>
                  {p.items.map((it, i) => <li key={i} data-edit={`${sk}.policies.${pi}.items.${i}`} data-edit-idx={i}>{it}</li>)}
                </ul>
              </div>
            ))}
          </div>
          <div className="vpol-cta">
            <Link className="btn btn-ember" to={`/rezervare?vila=${villaId}`}>{t("book_now")} {ICONS.arrow}</Link>
          </div>
        </div>
      </section>

      <Footer contact={contact} logo={content.brand?.logo} />
      <Fabs contact={contact} />
      {EDIT_MODE && hubRaw && <HubEditor hubRaw={hubRaw} setHubRaw={setHubRaw} />}
    </div>
  );
}

/* „Vila Redwood" -> „vilei Redwood" pentru titlurile galeriilor */
function genitiv(name) {
  return name.replace(/^Vila\b/i, "vilei");
}
