/* ============================================================
   AURORA 2030 — tema „wow" a site-ului Roots.
   Filozofie: lux nocturn la munte. Canvas aproape negru cu aurora
   vie care respiră în fundal, suprafețe de sticlă, tipografie
   editorială uriașă cu cerneală în gradient, glow de jar pe
   interacțiuni. Aceleași clase ca tema clasică — doar pielea
   se schimbă, deci editorul vizual și structura rămân intacte.
   Activare: body.t-aurora (setat din content.ui.theme).
   ============================================================ */

export const CSS_AURORA = `
/* ---- paleta răsturnată: noapte adâncă, cerneală deschisă ---- */
body.t-aurora{
  --pine:#EAF6EF; --pine-2:#CFE9DB; --pine-3:#0B1512;
  --ember:#FF7A45; --ember-2:#FFA063; --gold:#FFD9A0;
  --ivory:#080F0C; --sand:#0E1813; --ink:#F2F7F4; --ink-soft:#93AA9F;
  --night:#04080A; --line:rgba(235,245,240,.09);
  --r:26px;
  background:#080F0C;
}
body.t-aurora .roots{background:transparent;color:var(--ink)}

/* ---- aurora vie în fundal ---- */
body.t-aurora::before{
  content:"";position:fixed;inset:-20%;z-index:-1;pointer-events:none;
  background:
    radial-gradient(38% 30% at 18% 22%, rgba(255,122,69,.16), transparent 70%),
    radial-gradient(34% 28% at 82% 12%, rgba(64,201,148,.13), transparent 70%),
    radial-gradient(40% 34% at 70% 78%, rgba(255,217,160,.10), transparent 70%),
    radial-gradient(30% 26% at 28% 84%, rgba(56,138,221,.10), transparent 70%);
  filter:blur(40px);
  animation:aurora-drift 26s ease-in-out infinite alternate;
}
@keyframes aurora-drift{
  0%{transform:translate3d(-2%,-1%,0) rotate(0deg) scale(1)}
  50%{transform:translate3d(2%,2%,0) rotate(2deg) scale(1.06)}
  100%{transform:translate3d(-1%,3%,0) rotate(-2deg) scale(1.02)}
}

/* ---- selecție & scrollbar ---- */
body.t-aurora ::selection{background:var(--ember);color:#0A0A0A}
body.t-aurora::-webkit-scrollbar{width:11px}
body.t-aurora::-webkit-scrollbar-thumb{background:linear-gradient(180deg,#FF7A45,#8a4b2d);border-radius:8px;border:3px solid #080F0C}
body.t-aurora::-webkit-scrollbar-track{background:#080F0C}

/* ---- header: pastilă de sticlă plutitoare ---- */
body.t-aurora .hdr{padding:14px 0}
body.t-aurora .hdr .wrap{
  background:rgba(14,24,19,.55);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);
  border:1px solid var(--line);border-radius:100px;padding:10px 22px;
  box-shadow:0 10px 40px rgba(0,0,0,.35);
  max-width:1080px;
}
body.t-aurora .hdr.solid{background:transparent;box-shadow:none;backdrop-filter:none}
body.t-aurora .hdr.solid .wrap{background:rgba(10,18,14,.82)}
body.t-aurora .hdr .logo, body.t-aurora .hdr.solid .logo{color:var(--ink)}
body.t-aurora .nav a, body.t-aurora .hdr.solid .nav a{color:var(--ink-soft)}
body.t-aurora .nav a:hover{color:var(--gold)}
body.t-aurora .nav .cta{background:linear-gradient(120deg,#FF7A45,#FFB35C);color:#160b05;box-shadow:0 6px 26px rgba(255,122,69,.45)}
body.t-aurora .nav .cta:hover{transform:translateY(-2px);box-shadow:0 12px 34px rgba(255,122,69,.6);color:#160b05}

/* ---- hero: cinematic ---- */
body.t-aurora .hero{background:linear-gradient(180deg,#04080A 0%,#0A1512 55%,#13251C 100%)}
body.t-aurora .hero-veil{background:linear-gradient(180deg,rgba(4,8,10,.5),rgba(4,8,10,.08) 45%,rgba(8,15,12,.94) 100%)}
body.t-aurora .hero h1{font-size:clamp(46px,8.4vw,104px);letter-spacing:-.02em}
body.t-aurora .hero h1 .warm{
  color:transparent;background:linear-gradient(100deg,#FFD9A0 10%,#FF7A45 55%,#FF9E6B 90%);
  -webkit-background-clip:text;background-clip:text;font-style:italic;
}
body.t-aurora .hero-eyebrow{color:var(--gold);letter-spacing:.28em}
body.t-aurora .fireglow{background:radial-gradient(ellipse at center,rgba(255,122,69,.55),rgba(255,122,69,.15) 45%,transparent 70%)}
body.t-aurora .btn-ember{background:linear-gradient(120deg,#FF7A45,#FFB35C);color:#160b05;box-shadow:0 14px 44px rgba(255,122,69,.45)}
body.t-aurora .btn-ember:hover{box-shadow:0 20px 60px rgba(255,122,69,.65);transform:translateY(-3px)}
body.t-aurora .btn-ghost{background:rgba(255,255,255,.06);border-color:rgba(255,255,255,.22);backdrop-filter:blur(10px)}
body.t-aurora .btn-pine{background:rgba(255,255,255,.1);color:var(--ink);border:1px solid var(--line)}

/* ---- secțiuni ca panouri bento de sticlă ---- */
body.t-aurora .sec h2{color:var(--ink)}
body.t-aurora .eyebrow{color:var(--ember-2)}
body.t-aurora .eyebrow::before{background:linear-gradient(90deg,#FF7A45,transparent)}
body.t-aurora .lede{color:var(--ink-soft)}
body.t-aurora .villas-band,
body.t-aurora .common,
body.t-aurora .testi-band{
  background:rgba(16,27,21,.55);
  border:1px solid var(--line);
  backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);
  box-shadow:0 30px 90px rgba(0,0,0,.35);
}
body.t-aurora .villas-band h2, body.t-aurora .testi-band h2, body.t-aurora .final h2{color:var(--ink)}
/* .final nu mai e box — pe fundalul închis butonul-fantomă redevine deschis */
body.t-aurora .final .btn-ghost{color:#fff;border-color:rgba(255,255,255,.35)}
body.t-aurora .final .btn-ghost:hover{background:rgba(255,255,255,.12)}
body.t-aurora .common{background:rgba(14,24,18,.5)}

/* ---- carduri vile: sticlă cu margine aurorală ---- */
body.t-aurora .vcard{
  background:linear-gradient(150deg,rgba(255,255,255,.05),rgba(255,255,255,.015));
  border:1px solid rgba(255,255,255,.1);
  backdrop-filter:blur(10px);
}
body.t-aurora .vcard:hover{
  transform:translateY(-10px);
  border-color:rgba(255,170,110,.55);
  box-shadow:0 24px 70px rgba(0,0,0,.5), 0 0 0 1px rgba(255,122,69,.15), 0 18px 60px rgba(255,122,69,.12);
}
body.t-aurora .vcard-tag{background:rgba(8,15,12,.7);border-color:rgba(255,217,160,.4)}
body.t-aurora .feat{border-top-color:rgba(255,255,255,.07)}
body.t-aurora .feat svg{color:var(--gold)}
body.t-aurora .btn-outline-ivory{border-color:rgba(255,255,255,.25)}

/* ---- pastile, reguli, testimoniale ---- */
body.t-aurora .pill{background:rgba(255,255,255,.05);border-color:var(--line);color:var(--ink)}
body.t-aurora .pill:hover{box-shadow:0 12px 32px rgba(255,122,69,.14)}
body.t-aurora .rule{background:rgba(255,255,255,.04);border-color:var(--line)}
body.t-aurora .rule:hover{border-color:rgba(255,122,69,.4);box-shadow:0 18px 44px rgba(0,0,0,.4)}
body.t-aurora .rule .icon{background:rgba(255,122,69,.12);color:var(--ember-2)}
body.t-aurora .rule p{color:var(--ink)}
body.t-aurora .tcard{background:rgba(255,255,255,.045);border-color:rgba(255,255,255,.09)}
body.t-aurora .tcard:hover{border-color:rgba(255,217,160,.45)}
body.t-aurora .rating-badge b{color:transparent;background:linear-gradient(120deg,#FFD9A0,#FF7A45);-webkit-background-clip:text;background-clip:text}

/* ---- FAQ / locație / video ---- */
body.t-aurora .faq-q{color:var(--ink)}
body.t-aurora .faq-q:hover{color:var(--ember-2)}
body.t-aurora .faq-item{border-bottom-color:var(--line)}
body.t-aurora .faq-cat{color:var(--ember-2)}
body.t-aurora .loc-point{border-bottom-color:var(--line)}
body.t-aurora .loc-point b{color:var(--ink)}
body.t-aurora .loc-map{background:linear-gradient(150deg,#12241C,#0B1712);border-color:rgba(255,255,255,.1)}
body.t-aurora .video-card{box-shadow:0 30px 80px rgba(0,0,0,.4)}
body.t-aurora .stat b{color:transparent;background:linear-gradient(120deg,#EAF6EF,#9FE0BF);-webkit-background-clip:text;background-clip:text;font-size:40px}
body.t-aurora .stat{border-left-color:var(--line)}
body.t-aurora .stat-row{border-top-color:var(--line)}

/* ---- footer ---- */
body.t-aurora .foot{background:#04080A}
body.t-aurora .foot h5{color:var(--gold)}

/* ---- pagini vilă / rezervare / blog / welcome ---- */
body.t-aurora .vhero{background:linear-gradient(180deg,#04080A 0%,#0C1A14 60%,#1A2C22 100%)}
body.t-aurora .cal-card{background:rgba(16,27,21,.82);backdrop-filter:blur(20px);border:1px solid var(--line);box-shadow:0 40px 110px rgba(0,0,0,.5)}
body.t-aurora .cal-head h3, body.t-aurora .cal-mname{color:var(--ink)}
body.t-aurora .cal-day{color:var(--ink)}
body.t-aurora .cal-day.free:hover{background:rgba(255,255,255,.08)}
body.t-aurora .cal-day.past{color:var(--ink-soft)}
body.t-aurora .cal-nav button{background:rgba(255,255,255,.06);border-color:var(--line);color:var(--ink)}
body.t-aurora .bk-summary{background:rgba(255,255,255,.05)}
body.t-aurora .bk-row{color:var(--ink)}
body.t-aurora .bk-input{background:rgba(255,255,255,.05);border-color:var(--line);color:var(--ink)}
body.t-aurora .bk-input::placeholder{color:var(--ink-soft)}
body.t-aurora .bk-cta{background:linear-gradient(120deg,#FF7A45,#FFB35C);color:#160b05}
body.t-aurora .bk-back{border-color:var(--line);color:var(--ink)}
body.t-aurora .bk-step button{background:rgba(255,255,255,.08);color:var(--ink)}
body.t-aurora .bk-step{border-color:var(--line)}
body.t-aurora .fac-ico{background:rgba(255,122,69,.12);color:var(--ember-2)}
body.t-aurora .fac-item b{color:var(--ink)}
body.t-aurora .fac-cat{color:var(--ink);border-bottom-color:var(--line)}
body.t-aurora .vpol-col li{border-bottom-color:var(--line)}
body.t-aurora .vpol-col h4{color:var(--ember-2)}
body.t-aurora .vpol-h, body.t-aurora .vg-title{color:var(--ink)}
body.t-aurora .vg-card figcaption{color:var(--ink)}
body.t-aurora .vg-arrow{background:rgba(16,27,21,.9);color:var(--ink);border:1px solid var(--line)}
body.t-aurora .vmap{border-color:var(--line)}
body.t-aurora .vmap iframe{filter:invert(.92) hue-rotate(160deg) saturate(.7) brightness(.9)}
body.t-aurora .vhero-phone{background:rgba(16,27,21,.85);color:var(--ink);border:1px solid var(--line);backdrop-filter:blur(10px)}
body.t-aurora .bpost-card{background:rgba(255,255,255,.045);border-color:var(--line);color:var(--ink)}
body.t-aurora .bpost-body h3, body.t-aurora .post-main h1, body.t-aurora .post-body h2, body.t-aurora .post-body h3{color:var(--ink)}
body.t-aurora .post-body{color:var(--ink)}
body.t-aurora .post-back{color:var(--ink)}
body.t-aurora .res-tab{background:rgba(255,255,255,.05);border-color:var(--line);color:var(--ink)}
body.t-aurora .res-tab.on{background:linear-gradient(120deg,#FF7A45,#FFB35C);border-color:transparent;color:#160b05}
body.t-aurora .wel-card{background:rgba(255,255,255,.045);border-color:var(--line)}
body.t-aurora .wel-card-h h3, body.t-aurora .wel-card li, body.t-aurora .wel-step-body p{color:var(--ink)}
body.t-aurora .wel-ico{background:rgba(255,122,69,.12);color:var(--ember-2)}
body.t-aurora .wel-chip{background:rgba(255,255,255,.06);border:1px solid var(--line)}
body.t-aurora .wel-chip b{color:var(--gold)}
body.t-aurora .wel-hero h1, body.t-aurora .wel-recs h2{color:var(--ink)}
body.t-aurora .wel-rec, body.t-aurora .wel-dir{background:rgba(255,255,255,.05);border-color:var(--line);color:var(--ink)}
body.t-aurora .wel-top{border-bottom-color:var(--line)}
body.t-aurora .wel-top .logo{color:var(--ink)}
body.t-aurora .mnav{background:rgba(4,8,10,.97)}
body.t-aurora .cal-hint{color:var(--ink-soft)}
body.t-aurora .edit-block h3{color:var(--ink)}
body.t-aurora .edit-block p{color:var(--ink-soft)}

/* ---- micro-interacțiuni globale ---- */
body.t-aurora .btn, body.t-aurora .vcard, body.t-aurora .pill, body.t-aurora .rule, body.t-aurora .tcard{will-change:transform}
body.t-aurora .rv{transition-duration:1.1s}
@media(prefers-reduced-motion:reduce){ body.t-aurora::before{animation:none} }
`;

/* AURORA LIGHT — varianta pe alb: aceeași eleganță, canvas luminos. */
export const CSS_AURORA_LIGHT = `
body.t-al{background:#FBFAF6}
body.t-al::before{
  content:"";position:fixed;inset:-20%;z-index:-1;pointer-events:none;
  background:
    radial-gradient(36% 30% at 16% 18%, rgba(232,114,44,.10), transparent 70%),
    radial-gradient(32% 26% at 84% 10%, rgba(46,125,79,.08), transparent 70%),
    radial-gradient(38% 32% at 72% 82%, rgba(233,184,114,.12), transparent 70%);
  filter:blur(46px);
  animation:aurora-drift 28s ease-in-out infinite alternate;
}
@keyframes aurora-drift{
  0%{transform:translate3d(-2%,-1%,0) scale(1)}
  100%{transform:translate3d(2%,2%,0) scale(1.05)}
}
body.t-al .roots{background:transparent}
body.t-al .hdr .wrap{
  background:rgba(255,255,255,.72);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);
  border:1px solid rgba(30,42,36,.08);border-radius:100px;padding:10px 22px;
  box-shadow:0 10px 36px rgba(30,42,36,.10);max-width:1080px;
}
body.t-al .hdr{padding:14px 0}
body.t-al .hdr.solid{background:transparent;box-shadow:none;backdrop-filter:none}
body.t-al .hdr .logo{color:var(--pine)}
body.t-al .nav a{color:var(--ink-soft)}
body.t-al .nav a:hover{color:var(--ember)}
body.t-al .lang{border-color:var(--line);color:var(--ink-soft)}
body.t-al .burger{border-color:var(--line);color:var(--pine)}
body.t-al .nav .cta{background:linear-gradient(120deg,#E8722C,#F0A051);box-shadow:0 8px 26px rgba(232,114,44,.35)}
body.t-al .hero h1 .warm{
  color:transparent;background:linear-gradient(100deg,#E9B872 5%,#E8722C 60%,#F08A3C 95%);
  -webkit-background-clip:text;background-clip:text;
}
body.t-al .btn-ember{background:linear-gradient(120deg,#E8722C,#F0A051)}
body.t-al .vcard:hover{box-shadow:0 30px 70px rgba(0,0,0,.4), 0 14px 44px rgba(232,114,44,.18)}
body.t-al .sec, body.t-al .villas-band, body.t-al .common, body.t-al .testi-band, body.t-al .final{scroll-margin-top:90px}
body.t-al .rule, body.t-al .pill, body.t-al .bpost-card, body.t-al .wel-card{box-shadow:0 8px 28px rgba(30,42,36,.06)}
body.t-al .rule:hover, body.t-al .pill:hover{box-shadow:0 18px 40px rgba(232,114,44,.14)}
body.t-al .cal-card{box-shadow:0 34px 90px rgba(30,42,36,.16);border:1px solid rgba(30,42,36,.07)}
body.t-al .villas-band, body.t-al .testi-band{box-shadow:0 30px 80px rgba(13,27,42,.25)}
`;

/* Comută tema pe <body> și întoarce stilul de injectat. */
export function applyTheme(theme) {
  document.body.classList.toggle("t-aurora", theme === "aurora");
  document.body.classList.toggle("t-al", theme === "aurora-light");
  return theme === "aurora" ? CSS_AURORA : theme === "aurora-light" ? CSS_AURORA_LIGHT : "";
}
