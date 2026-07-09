import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { CSS, Brand, Footer, Fabs, useHubContent, useScrolled, ThemeStyle, LangSwitcher } from "./RootsVillas.jsx";
import { t } from "./i18n.js";
import { HUB_URL } from "./HubEditor.jsx";

/* Blog public — listă + articol, în designul site-ului (Fraunces/Manrope, pine/ember). */

const BLOG_CSS = `
.blog-main{max-width:1120px;margin:0 auto;padding:150px 22px 90px}
.blog-head{text-align:center;max-width:640px;margin:0 auto 56px}
.blog-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:26px}
.bpost-card{background:#fff;border:1px solid var(--line);border-radius:var(--r);overflow:hidden;text-decoration:none;color:var(--ink);display:flex;flex-direction:column;transition:transform .35s,box-shadow .35s}
.bpost-card:hover{transform:translateY(-6px);box-shadow:0 22px 44px rgba(30,42,36,.12)}
.bpost-cover{height:200px;background:linear-gradient(160deg,#1B4033,#0C1F19);background-size:cover;background-position:center}
.bpost-body{padding:22px 24px 26px;display:flex;flex-direction:column;gap:10px;flex:1}
.bpost-date{font-size:12px;font-weight:700;letter-spacing:.12em;text-transform:uppercase;color:var(--ember)}
.bpost-body h3{font-family:'Fraunces',serif;font-weight:500;font-size:23px;line-height:1.2;color:var(--pine)}
.bpost-body p{font-size:14.5px;line-height:1.65;color:var(--ink-soft);flex:1}
.bpost-more{font-size:13.5px;font-weight:700;color:var(--ember)}
/* articol */
.post-hero{height:380px;background:linear-gradient(160deg,#1B4033,#0C1F19);background-size:cover;background-position:center;border-radius:var(--r);margin-bottom:40px}
.post-main{max-width:760px;margin:0 auto;padding:140px 22px 90px}
.post-main h1{font-family:'Fraunces',serif;font-weight:500;font-size:clamp(32px,5vw,52px);line-height:1.1;color:var(--pine);margin-bottom:14px}
.post-meta{font-size:13px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:var(--ember);margin-bottom:30px}
.post-body{font-size:16.5px;line-height:1.85;color:var(--ink)}
.post-body h2{font-family:'Fraunces',serif;font-weight:500;font-size:30px;color:var(--pine);margin:38px 0 14px}
.post-body h3{font-family:'Fraunces',serif;font-weight:500;font-size:23px;color:var(--pine);margin:30px 0 10px}
.post-body p{margin-bottom:16px}
.post-body ul{margin:0 0 16px 22px}
.post-body li{margin-bottom:8px}
.post-body a{color:var(--ember);font-weight:600}
.post-back{display:inline-flex;align-items:center;gap:8px;margin-top:40px;color:var(--pine);font-weight:700;text-decoration:none}
.post-back:hover{color:var(--ember)}
.blog-empty{text-align:center;color:var(--ink-soft);padding:60px 0}
/* blocuri articol */
.pb-imgs{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:14px;margin:26px 0}
.pb-imgs img{width:100%;height:260px;object-fit:cover;border-radius:16px;display:block}
.pb-slider{position:relative;margin:26px 0}
.pb-track{display:flex;gap:12px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;border-radius:16px;-webkit-overflow-scrolling:touch}
.pb-track::-webkit-scrollbar{display:none}
.pb-track img{flex:0 0 88%;height:380px;object-fit:cover;border-radius:16px;scroll-snap-align:center}
@media(max-width:600px){.pb-track img{height:240px}}
.pb-arr{position:absolute;top:50%;transform:translateY(-50%);z-index:3;width:40px;height:40px;border-radius:50%;border:none;background:rgba(12,31,25,.6);color:#fff;font-size:20px;cursor:pointer;backdrop-filter:blur(6px)}
.pb-arr.left{left:12px}.pb-arr.right{right:12px}
.pb-dots{display:flex;gap:6px;justify-content:center;margin-top:12px}
.pb-dots span{width:7px;height:7px;border-radius:50%;background:rgba(30,42,36,.25)}
.pb-dots span.on{background:var(--ember)}
.pb-compare{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin:26px 0}
@media(max-width:600px){.pb-compare{grid-template-columns:1fr}}
.pb-col{background:#fff;border:1px solid var(--line);border-radius:16px;padding:20px 22px}
.pb-col h4{font-family:'Fraunces',serif;font-weight:500;font-size:21px;color:var(--pine);margin-bottom:12px}
.pb-col ul{list-style:none}
.pb-col li{padding:8px 0;border-bottom:1px solid var(--line);font-size:14.5px;line-height:1.5}
.pb-col li:last-child{border-bottom:0}
.pb-check{background:var(--sand,#F4EDE0);border:1px solid var(--line);border-radius:16px;padding:20px 22px;margin:26px 0}
.pb-check h4{font-family:'Fraunces',serif;font-weight:500;font-size:21px;color:var(--pine);margin-bottom:12px}
.pb-check ul{list-style:none}
.pb-check li{display:flex;gap:10px;align-items:flex-start;padding:6px 0;font-size:15px;line-height:1.6}
.pb-check li .ck{color:#2E7D4F;font-weight:800;flex-shrink:0}
`;

/* markdown minim: ## titluri, - liste, **bold**, *italic*, [text](url) */
export function mdToHtml(md) {
  const esc = (t) => t.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  // doar http(s) sau căi relative; ghilimelele se codează — altfel un URL cu " ar
  // putea evada din atributul href și injecta handlere (stored XSS)
  const safeHref = (u) => (/^(https?:\/\/|\/)/i.test(u) ? u.replace(/"/g, "%22").replace(/'/g, "%27") : null);
  const inline = (t) =>
    t
      .replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>")
      .replace(/\*([^*]+)\*/g, "<i>$1</i>")
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, txt, url) => {
        const href = safeHref(url);
        if (!href) return m;
        const ext = /^https?:/i.test(href);
        return `<a href="${href}"${ext ? ' target="_blank" rel="noreferrer"' : ""}>${txt}</a>`;
      });
  const lines = esc(md || "").split(/\r?\n/);
  let html = "", inList = false, para = [];
  const flushPara = () => { if (para.length) { html += `<p>${inline(para.join(" "))}</p>`; para = []; } };
  const closeList = () => { if (inList) { html += "</ul>"; inList = false; } };
  for (const line of lines) {
    const l = line.trim();
    if (!l) { flushPara(); closeList(); continue; }
    if (l.startsWith("### ")) { flushPara(); closeList(); html += `<h3>${inline(l.slice(4))}</h3>`; }
    else if (l.startsWith("## ")) { flushPara(); closeList(); html += `<h2>${inline(l.slice(3))}</h2>`; }
    else if (l.startsWith("- ")) { flushPara(); if (!inList) { html += "<ul>"; inList = true; } html += `<li>${inline(l.slice(2))}</li>`; }
    else para.push(l);
  }
  flushPara(); closeList();
  return html;
}

function BlogHeader({ logo }) {
  const scrolled = useScrolled(10);
  return (
    <header className={`hdr solid`} style={{ position: "fixed" }}>
      <div className="wrap">
        <Link to="/" className="logo"><Brand logo={logo} /></Link>
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

const fmtDate = (d) => new Date(d).toLocaleDateString("ro-RO", { day: "numeric", month: "long", year: "numeric" });

/* ---- blocurile articolului (text/poze/slider/comparație/checklist) ---- */
function BlockSlider({ urls }) {
  const ref = React.useRef(null);
  const [cur, setCur] = useState(0);
  // RTL-safe: scrollIntoView + Math.abs (în ebraică scrollLeft e negativ)
  const go = (n) => {
    const el = ref.current;
    if (!el) return;
    const i = Math.max(0, Math.min(urls.length - 1, n));
    if (el.children[i]) el.children[i].scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };
  const onScroll = () => {
    const el = ref.current;
    if (!el || !el.firstChild) return;
    setCur(Math.round(Math.abs(el.scrollLeft) / Math.max(1, el.firstChild.clientWidth + 12)));
  };
  return (
    <div className="pb-slider">
      <div className="pb-track" ref={ref} onScroll={onScroll}>
        {urls.map((u, i) => <img key={i} src={u} alt="" loading="lazy" />)}
      </div>
      {urls.length > 1 && (
        <>
          <button type="button" className="pb-arr left" onClick={() => go(cur - 1)} aria-label="Înapoi">‹</button>
          <button type="button" className="pb-arr right" onClick={() => go(cur + 1)} aria-label="Înainte">›</button>
          <div className="pb-dots" aria-hidden="true">{urls.map((_, i) => <span key={i} className={i === cur ? "on" : ""} />)}</div>
        </>
      )}
    </div>
  );
}

function PostBlocks({ blocks }) {
  return (
    <>
      {blocks.map((b, i) => {
        if (!b || !b.type) return null;
        if (b.type === "text") return <div key={i} className="post-body" dangerouslySetInnerHTML={{ __html: mdToHtml(b.md || "") }} />;
        if (b.type === "images") return (
          <div key={i} className="pb-imgs">{(b.urls || []).map((u, j) => <img key={j} src={u} alt="" loading="lazy" />)}</div>
        );
        if (b.type === "slider") return <BlockSlider key={i} urls={b.urls || []} />;
        if (b.type === "compare") return (
          <div key={i} className="pb-compare">
            <div className="pb-col"><h4>{b.title_a}</h4><ul>{(b.rows || []).map((r, j) => <li key={j}>{r.a}</li>)}</ul></div>
            <div className="pb-col"><h4>{b.title_b}</h4><ul>{(b.rows || []).map((r, j) => <li key={j}>{r.b}</li>)}</ul></div>
          </div>
        );
        if (b.type === "checklist") return (
          <div key={i} className="pb-check">
            {b.title ? <h4>{b.title}</h4> : null}
            <ul>{(b.items || []).map((it, j) => <li key={j}><span className="ck">✓</span>{it}</li>)}</ul>
          </div>
        );
        return null;
      })}
    </>
  );
}

export function BlogList() {
  const { content } = useHubContent();
  const [posts, setPosts] = useState(null);
  useEffect(() => {
    document.title = "Blog · ROOTS Villas Brașov";
    fetch(HUB_URL + "/api/v1/posts").then((r) => r.json()).then((j) => setPosts(j.posts || [])).catch(() => setPosts([]));
  }, []);
  return (
    <div className="roots">
      <style>{CSS}</style>
      <ThemeStyle content={content} />
      <style>{BLOG_CSS}</style>
      <BlogHeader logo={content.brand?.logo} />
      <main className="blog-main">
        <div className="blog-head">
          <div className="eyebrow" style={{ justifyContent: "center" }}>{t("blog_eyebrow")}</div>
          <h2 className="serif" style={{ fontSize: "clamp(34px,5vw,52px)", fontWeight: 500, color: "var(--pine)" }}>Blog</h2>
          <p className="lede" style={{ margin: "16px auto 0" }}>{t("blog_lede")}</p>
        </div>
        {posts === null ? (
          <div className="blog-empty">{t("loading")}</div>
        ) : posts.length === 0 ? (
          <div className="blog-empty">{t("blog_empty")}</div>
        ) : (
          <div className="blog-grid">
            {posts.map((p) => (
              <Link className="bpost-card" to={`/blog/${p.slug}`} key={p.slug}>
                <div className="bpost-cover" style={p.cover ? { backgroundImage: `url(${p.cover})` } : undefined} />
                <div className="bpost-body">
                  <span className="bpost-date">{fmtDate(p.published_at)}</span>
                  <h3>{p.title}</h3>
                  {p.excerpt && <p>{p.excerpt}</p>}
                  <span className="bpost-more">{t("blog_read")}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>
      <Footer contact={content.contact} logo={content.brand?.logo} />
      <Fabs contact={content.contact} />
    </div>
  );
}

export function BlogPost() {
  const { slug } = useParams();
  const { content } = useHubContent();
  const [post, setPost] = useState(null);
  const [missing, setMissing] = useState(false);
  useEffect(() => {
    fetch(HUB_URL + "/api/v1/posts/" + encodeURIComponent(slug))
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((j) => {
        setPost(j.post);
        document.title = (j.post.seo_title || j.post.title) + " · ROOTS Villas";
        const md = document.querySelector('meta[name="description"]');
        if (md && (j.post.seo_description || j.post.excerpt)) md.setAttribute("content", j.post.seo_description || j.post.excerpt);
      })
      .catch(() => setMissing(true));
  }, [slug]);
  return (
    <div className="roots">
      <style>{CSS}</style>
      <ThemeStyle content={content} />
      <style>{BLOG_CSS}</style>
      <BlogHeader logo={content.brand?.logo} />
      <main className="post-main">
        {missing ? (
          <div className="blog-empty">{t("blog_missing")} <Link to="/blog">{t("blog_back")}</Link></div>
        ) : !post ? (
          <div className="blog-empty">{t("loading")}</div>
        ) : (
          <article>
            {post.cover && <div className="post-hero" style={{ backgroundImage: `url(${post.cover})` }} />}
            <h1>{post.title}</h1>
            <div className="post-meta">{fmtDate(post.published_at)} · Roots Villas</div>
            {Array.isArray(post.blocks) && post.blocks.length ? (
              <PostBlocks blocks={post.blocks} />
            ) : (
              <div className="post-body" dangerouslySetInnerHTML={{ __html: mdToHtml(post.body) }} />
            )}
            <Link className="post-back" to="/blog">{t("blog_all")}</Link>
          </article>
        )}
      </main>
      <Footer contact={content.contact} logo={content.brand?.logo} />
      <Fabs contact={content.contact} />
    </div>
  );
}
