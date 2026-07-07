import React, { useRef } from "react";
import { Link } from "react-router-dom";
import {
  CSS,
  ICONS,
  Ridge,
  Embers,
  Footer,
  Fabs,
  useScrolled,
  useReveal,
  useSiteContent,
} from "./RootsVillas.jsx";
import AvailabilityCalendar from "./AvailabilityCalendar.jsx";

/* stiluri specifice paginii de vilă (peste design system-ul comun) */
const VILLA_CSS = `
/* ---- villa hero ---- */
.vhero{position:relative;min-height:74vh;display:flex;align-items:flex-end;color:#fff;overflow:hidden;
  background:linear-gradient(180deg,#0B1626 0%,#152B3D 42%,#3D4A56 66%,#8A5A46 88%,#C4713C 100%)}
.vhero-photo{position:absolute;inset:0;background-size:cover;background-position:center;opacity:.6;mix-blend-mode:luminosity}
.vhero-veil{position:absolute;inset:0;background:linear-gradient(180deg,rgba(11,22,38,.35),rgba(11,22,38,.1) 40%,rgba(12,31,25,.85) 100%)}
.vhero-inner{position:relative;z-index:3;width:100%;padding:0 0 76px}
.vhero h1{font-family:'Fraunces',serif;font-weight:500;font-size:clamp(40px,7vw,80px);line-height:1.02;letter-spacing:-.02em}
.vhero-sub{margin-top:16px;max-width:48ch;font-size:clamp(15px,1.6vw,18px);line-height:1.6;color:rgba(255,255,255,.85)}
.vhero-phone{display:inline-flex;align-items:center;gap:10px;margin-top:28px;background:#fff;color:var(--pine);font-weight:700;font-size:15px;padding:14px 26px;border-radius:100px;text-decoration:none;box-shadow:0 14px 34px rgba(0,0,0,.28);transition:transform .25s,box-shadow .25s}
.vhero-phone:hover{transform:translateY(-2px);box-shadow:0 18px 40px rgba(0,0,0,.34)}

/* ---- calendar ---- */
.cal-card{max-width:920px;margin:-74px auto 0;position:relative;z-index:5;background:#fff;border-radius:28px;padding:30px 32px 26px;box-shadow:0 34px 80px rgba(13,27,42,.2);border:1px solid var(--line)}
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
.cal-day.sel-start,.cal-day.sel-end{background:var(--ember);color:#fff}
.cal-day.in-range{background:rgba(232,114,44,.16);color:var(--pine);border-radius:4px}
.cal-legend .lg.sel{background:var(--ember)}
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
.bk-summary{background:var(--sand);border-radius:16px;padding:16px 18px;margin-bottom:16px}
.bk-row{display:flex;justify-content:space-between;align-items:center;gap:12px;font-size:14.5px;padding:5px 0;color:var(--ink)}
.bk-row b{font-family:'Fraunces',serif;font-weight:500}
.bk-row.hi{color:var(--ember)}
.bk-row.hi b{color:var(--ember);font-size:19px}
.bk-row.muted{color:var(--ink-soft);font-size:13px}
.bk-cta{display:block;text-align:center;background:var(--ember);color:#fff;font-weight:700;font-size:15px;padding:15px;border-radius:100px;text-decoration:none;box-shadow:0 10px 26px rgba(232,114,44,.4);transition:transform .2s,background .2s}
.bk-cta:hover{background:var(--ember-2);transform:translateY(-2px)}
.bk-cta.disabled{background:var(--sand);color:var(--ink-soft);box-shadow:none;pointer-events:none}
.bk-soon{margin-top:12px;font-size:12.5px;color:var(--ink-soft);text-align:center;line-height:1.5}

/* ---- gallery / carusel ---- */
.vg-title{font-family:'Fraunces',serif;font-weight:500;font-size:clamp(24px,3.4vw,34px);color:var(--pine);text-align:center;margin-bottom:36px}
.vg-wrap{position:relative}
.vg-track{display:flex;gap:22px;overflow-x:auto;scroll-snap-type:x mandatory;padding:4px 2px;scrollbar-width:none;-ms-overflow-style:none}
.vg-track::-webkit-scrollbar{display:none}
.vg-card{flex:0 0 clamp(260px,44%,430px);scroll-snap-align:start}
.vg-card img,.vg-ph{width:100%;height:290px;object-fit:cover;border-radius:20px;display:block}
.vg-ph{position:relative;background:linear-gradient(160deg,#1B4033,#0C1F19);overflow:hidden}
.vg-ph .vg-glow{position:absolute;bottom:-50px;left:50%;transform:translateX(-50%);width:250px;height:130px;border-radius:50%;background:radial-gradient(ellipse,rgba(240,138,60,.5),transparent 70%)}
.vg-ph svg{position:absolute;inset:auto 0 0 0;display:block;width:100%}
.vg-card figcaption{margin-top:14px;font-size:14.5px;font-weight:600;color:var(--ink)}
.vg-arrow{position:absolute;top:145px;transform:translateY(-50%);width:46px;height:46px;border-radius:50%;border:none;background:#fff;box-shadow:0 8px 24px rgba(0,0,0,.16);font-size:22px;color:var(--pine);cursor:pointer;z-index:3;display:grid;place-items:center;transition:transform .2s}
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

const FAC_ICON = {
  "Spații de dormit": "bed",
  "Relaxare și exterior": "tub",
  "Socializare și distracție": "play",
  "Confort și bucătărie": "fire",
};

function VHeader({ contact }) {
  const scrolled = useScrolled();
  const wa = `https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, "")}`;
  return (
    <header className={`hdr ${scrolled ? "solid" : ""}`}>
      <div className="wrap">
        <Link to="/" className="logo">
          <span className="logo-ring">R</span>ROOTS
        </Link>
        <nav className="nav">
          <Link to="/">Acasă</Link>
          <a href="#facilitati">Facilități</a>
          <a href="#locatie">Locație</a>
          <a href={wa} className="cta" target="_blank" rel="noreferrer">Rezervă acum</a>
        </nav>
      </div>
    </header>
  );
}

function Gallery({ title, items }) {
  const ref = useRef(null);
  const scroll = (dir) => {
    const el = ref.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };
  return (
    <section className="sec" style={{ paddingBottom: 40 }}>
      <div className="wrap">
        <h2 className="vg-title rv">{title}</h2>
        <div className="vg-wrap rv rv-d1">
          <button className="vg-arrow left" onClick={() => scroll(-1)} aria-label="Înapoi">‹</button>
          <div className="vg-track" ref={ref}>
            {items.map((it, i) => (
              <figure className="vg-card" key={i}>
                {it.img ? (
                  <img src={it.img} alt={it.caption} loading="lazy" />
                ) : (
                  <div className="vg-ph">
                    <div className="vg-glow" />
                    <Ridge fill="rgba(233,184,114,.18)" height={100} />
                  </div>
                )}
                <figcaption>{it.caption}</figcaption>
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
  const { content, loaded } = useSiteContent();
  useReveal();

  if (!loaded) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#FBF7EF", fontFamily: "sans-serif", color: "#122B22" }}>
        Se încarcă…
      </div>
    );
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
      <style>{VILLA_CSS}</style>
      <VHeader contact={contact} />

      {/* HERO */}
      <section className="vhero">
        {page.heroImage && <div className="vhero-photo" style={{ backgroundImage: `url(${page.heroImage})` }} />}
        <div className="vhero-veil" />
        <Embers />
        <div className="ridge ridge-near" style={{ position: "absolute", inset: "auto 0 0 0" }}>
          <Ridge fill="#0C1F19" height={150} />
        </div>
        <div className="wrap vhero-inner">
          <h1>{villa.name}</h1>
          <p className="vhero-sub">{page.heroSubtitle}</p>
          <a className="vhero-phone" href={`tel:${contact.phone.replace(/\s/g, "")}`}>
            {ICONS.phone} {contact.phone}{page.phoneLabel ? ` · ${page.phoneLabel}` : ""}
          </a>
        </div>
      </section>

      {/* CALENDAR + REZERVARE */}
      <div className="wrap">
        <AvailabilityCalendar
          apartmentId={page.smoobuId}
          villaName={villa.name}
          contact={contact}
          capacity={10}
          depositPct={30}
        />
      </div>

      {/* GALERII */}
      <Gallery title={`Cum arată exteriorul ${genitiv(villa.name)}`} items={page.galleryExterior} />
      <Gallery title={`Cum arată interiorul ${genitiv(villa.name)}`} items={page.galleryInterior} />

      {/* FACILITĂȚI */}
      <section className="sec" id="facilitati" style={{ paddingTop: 60 }}>
        <div className="wrap">
          <div className="fac-head rv">
            <div className="eyebrow" style={{ justifyContent: "center" }}>Detalii vilă</div>
            <h2>Compartimentarea și echiparea vilei</h2>
          </div>
          {page.facilities.map((group) => (
            <div className="fac-group rv" key={group.cat}>
              <h4 className="fac-cat">{group.cat}</h4>
              <div className="fac-grid">
                {group.items.map((it, i) => (
                  <div className="fac-item" key={i}>
                    <span className="fac-ico">{ICONS[FAC_ICON[group.cat]] || ICONS.people}</span>
                    <div>
                      <b>{it.t}</b>
                      {it.s && <small>{it.s}</small>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* LOCAȚIE */}
      <section className="sec" id="locatie" style={{ paddingTop: 40 }}>
        <div className="wrap">
          <div className="rv">
            <div className="eyebrow">Stupini · Brașov</div>
            <h2>Localizată în Brașov, într-un cartier de case liniștit, la 10 minute de centru.</h2>
          </div>
          <div className="vmap rv rv-d1">
            <iframe src={page.mapEmbed} title={`Hartă ${villa.name}`} loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" />
          </div>
          <a className="vmap-link" href={content.location?.mapsUrl || "https://maps.google.com/?q=Stupini+Brasov"} target="_blank" rel="noreferrer">
            {ICONS.pin} Deschide locația în Google Maps
          </a>
        </div>
      </section>

      {/* POLITICI */}
      <section className="sec" style={{ paddingTop: 40 }}>
        <div className="wrap">
          <h3 className="vpol-h rv">Alte informații utile</h3>
          <div className="vpol-grid rv rv-d1">
            {page.policies.map((p) => (
              <div className="vpol-col" key={p.title}>
                <h4>{p.title}</h4>
                <ul>{p.items.map((it, i) => <li key={i}>{it}</li>)}</ul>
              </div>
            ))}
          </div>
          <div className="vpol-cta">
            <a className="btn btn-ember" href={wa} target="_blank" rel="noreferrer">Rezervă acum {ICONS.arrow}</a>
          </div>
        </div>
      </section>

      <Footer contact={contact} />
      <Fabs contact={contact} />
    </div>
  );
}

/* „Vila Redwood" -> „vilei Redwood" pentru titlurile galeriilor */
function genitiv(name) {
  return name.replace(/^Vila\b/i, "vilei");
}
