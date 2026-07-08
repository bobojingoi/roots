import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { CSS, Footer, Fabs, useHubContent, ThemeStyle, LangSwitcher } from "./RootsVillas.jsx";
import { t } from "./i18n.js";
import { mdToHtml } from "./BlogPage.jsx";

/* Pagini de text (Despre noi, politici legale) — conținut din Hub, markdown. */

const TEXT_CSS = `
.txt-main{max-width:760px;margin:0 auto;padding:150px 22px 90px}
.txt-main h1{font-family:'Fraunces',serif;font-weight:500;font-size:clamp(32px,5vw,50px);line-height:1.1;color:var(--pine);margin-bottom:12px}
.txt-intro{font-size:17px;line-height:1.75;color:var(--ink-soft);margin-bottom:26px}
.txt-body{font-size:15.5px;line-height:1.85;color:var(--ink)}
.txt-body h2{font-family:'Fraunces',serif;font-weight:500;font-size:26px;color:var(--pine);margin:34px 0 12px}
.txt-body h3{font-family:'Fraunces',serif;font-weight:500;font-size:20px;color:var(--pine);margin:26px 0 10px}
.txt-body p{margin-bottom:14px}
.txt-body ul{margin:0 0 14px 22px}
.txt-body li{margin-bottom:7px}
.txt-body a{color:var(--ember);font-weight:600}
body.t-aurora .txt-main h1,body.t-aurora .txt-body h2,body.t-aurora .txt-body h3{color:var(--ink)}
body.t-aurora .txt-body{color:var(--ink)}
`;

function TextHeader() {
  return (
    <header className="hdr solid" style={{ position: "fixed" }}>
      <div className="wrap">
        <Link to="/" className="logo"><span className="logo-ring">R</span>ROOTS</Link>
        <nav className="nav">
          <Link to="/">{t("nav_home")}</Link>
          <Link to="/blog">{t("nav_blog")}</Link>
          <LangSwitcher />
          <Link to="/rezervare" className="cta">{t("book_now")}</Link>
        </nav>
      </div>
    </header>
  );
}

export default function TextPage({ sectionKey }) {
  const { content, loaded, hubRaw } = useHubContent();
  const page = (hubRaw && hubRaw[sectionKey]) || null;

  useEffect(() => {
    if (page && page.title) document.title = page.title + " · ROOTS Villas Brașov";
  }, [page]);

  return (
    <div className="roots">
      <style>{CSS}</style>
      <ThemeStyle content={content} />
      <style>{TEXT_CSS}</style>
      <TextHeader />
      <main className="txt-main">
        {!loaded ? (
          <p className="txt-intro">{t("loading")}</p>
        ) : !page ? (
          <>
            <h1>{t("page_missing")}</h1>
            <p className="txt-intro"><Link to="/">{t("back_home")}</Link></p>
          </>
        ) : (
          <>
            <h1>{page.title}</h1>
            {page.intro && <p className="txt-intro">{page.intro}</p>}
            <div className="txt-body" dangerouslySetInnerHTML={{ __html: mdToHtml(page.body || "") }} />
          </>
        )}
      </main>
      <Footer contact={content.contact} />
      <Fabs contact={content.contact} />
    </div>
  );
}
