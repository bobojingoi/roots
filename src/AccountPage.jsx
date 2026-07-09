import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CSS, Brand, Footer, Fabs, useHubContent, ThemeStyle, LangSwitcher } from "./RootsVillas.jsx";
import { HUB_URL } from "./HubEditor.jsx";
import { t } from "./i18n.js";

/* Contul clientului: login cu contul din Roots Hub (Bearer token în localStorage). */

const TOKEN_KEY = "roots_auth";
const ADMIN_URL = "https://roots-hub-dun.vercel.app/admin";

const ACC_CSS = `
.acc-main{max-width:560px;margin:0 auto;padding:150px 22px 90px}
.acc-main h1{font-family:'Fraunces',serif;font-weight:500;font-size:clamp(32px,5vw,46px);color:var(--pine);margin-bottom:20px}
.acc-card{background:#fff;border:1px solid var(--line);border-radius:18px;padding:26px;box-shadow:0 12px 36px rgba(30,42,36,.08)}
.acc-card label{display:block;font-size:13px;font-weight:600;color:var(--ink-soft);margin:14px 0 6px}
.acc-card input,.acc-card select{width:100%;padding:12px 14px;border:1px solid var(--line);border-radius:10px;font:inherit;font-size:15px;background:var(--ivory);color:var(--ink)}
.acc-switch{display:block;width:100%;margin-top:12px;background:none;border:none;color:var(--ember);font:700 14px 'Manrope',sans-serif;cursor:pointer;text-align:center}
.acc-switch:hover{text-decoration:underline}
.acc-btn{margin-top:20px;width:100%;padding:13px;border:0;border-radius:99px;background:var(--ember);color:#fff;font:inherit;font-size:15px;font-weight:700;cursor:pointer}
.acc-btn:disabled{opacity:.6}
.acc-err{margin-top:12px;color:#c0392b;font-size:14px}
.acc-help{margin-top:16px;font-size:13.5px;color:var(--ink-soft);line-height:1.6}
.acc-book{display:flex;justify-content:space-between;gap:12px;padding:14px 0;border-bottom:1px solid var(--line);font-size:14.5px}
.acc-book:last-child{border-bottom:0}
.acc-book b{color:var(--pine)}
.acc-status{font-size:12px;font-weight:700;padding:3px 10px;border-radius:99px;align-self:center;white-space:nowrap}
.acc-status.confirmed{background:#e7f5ee;color:#157a55}
.acc-status.cancelled{background:#fdeaea;color:#c0392b}
.acc-row{display:flex;justify-content:space-between;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:18px}
.acc-link{display:inline-block;margin-top:18px;color:var(--ember);font-weight:700}
body.t-aurora .acc-card{background:rgba(255,255,255,.05);border-color:var(--line)}
body.t-aurora .acc-main h1,body.t-aurora .acc-book b{color:var(--ink)}
body.t-aurora .acc-card input,body.t-aurora .acc-card select{background:rgba(255,255,255,.06);color:var(--ink)}
`;

function AccHeader({ logo }) {
  return (
    <header className="hdr solid" style={{ position: "fixed" }}>
      <div className="wrap">
        <Link to="/" className="logo"><Brand logo={logo} /></Link>
        <nav className="nav">
          <Link to="/">{t("nav_home")}</Link>
          <LangSwitcher />
          <Link to="/rezervare" className="cta">{t("book_now")}</Link>
        </nav>
      </div>
    </header>
  );
}

export default function AccountPage() {
  const { content } = useHubContent();
  const [token, setToken] = useState(() => { try { return localStorage.getItem(TOKEN_KEY) || ""; } catch { return ""; } });
  const [acc, setAcc] = useState(null);
  const [mode, setMode] = useState("login"); // login | register
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [source, setSource] = useState("");
  const [sourceOther, setSourceOther] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => { document.title = t("acc_title") + " · ROOTS Villas Brașov"; }, []);

  useEffect(() => {
    if (!token) { setAcc(null); return; }
    fetch(HUB_URL + "/api/v1/my-account", { headers: { Authorization: "Bearer " + token } })
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setAcc)
      .catch(() => { setToken(""); try { localStorage.removeItem(TOKEN_KEY); } catch {} });
  }, [token]);

  async function login(e) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const r = await fetch(HUB_URL + "/api/v1/site-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password: pass }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Eroare la autentificare");
      try { localStorage.setItem(TOKEN_KEY, j.token); } catch {}
      setToken(j.token);
    } catch (e2) {
      setErr(e2.message);
    }
    setBusy(false);
  }

  async function register(e) {
    e.preventDefault();
    setBusy(true); setErr("");
    try {
      const src = source === "other" && sourceOther.trim() ? `altele: ${sourceOther.trim()}` : source;
      const r = await fetch(HUB_URL + "/api/v1/site-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), email, password: pass, phone: phone.trim(), source: src }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Eroare la crearea contului");
      try { localStorage.setItem(TOKEN_KEY, j.token); } catch {}
      setToken(j.token);
    } catch (e2) {
      setErr(e2.message);
    }
    setBusy(false);
  }

  function logout() {
    try { localStorage.removeItem(TOKEN_KEY); } catch {}
    setToken(""); setAcc(null);
  }

  const SOURCES = [
    ["google", t("src_google")],
    ["social", t("src_social")],
    ["recomandare", t("src_reco")],
    ["booking/airbnb", t("src_ota")],
    ["oaspete", t("src_stay")],
    ["other", t("src_other")],
  ];

  const isStaff = acc && acc.user && ["owner", "admin", "manager"].includes(acc.user.role);
  const fmt = (d) => new Date(d).toLocaleDateString("ro-RO", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className="roots">
      <style>{CSS}</style>
      <ThemeStyle content={content} />
      <style>{ACC_CSS}</style>
      <AccHeader logo={content.brand?.logo} />
      <main className="acc-main">
        <h1>{t("acc_title")}</h1>
        {!token || !acc ? (
          mode === "login" ? (
            <form className="acc-card" onSubmit={login}>
              <b>{t("acc_login")}</b>
              <label>{t("acc_email")}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              <label>{t("acc_pass")}</label>
              <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} required autoComplete="current-password" />
              {err && <div className="acc-err">{err}</div>}
              <button className="acc-btn" disabled={busy}>{busy ? "…" : t("acc_login")}</button>
              <button type="button" className="acc-switch" onClick={() => { setMode("register"); setErr(""); }}>{t("acc_no_acc")}</button>
              <p className="acc-help">{t("acc_help")}</p>
            </form>
          ) : (
            <form className="acc-card" onSubmit={register}>
              <b>{t("acc_register")}</b>
              <label>{t("acc_name")}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} required autoComplete="name" />
              <label>{t("acc_email")}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
              <label>{t("acc_phone")}</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" />
              <label>{t("acc_pass_min")}</label>
              <input type="password" value={pass} onChange={(e) => setPass(e.target.value)} required minLength={6} autoComplete="new-password" />
              <label>{t("acc_source")}</label>
              <select value={source} onChange={(e) => setSource(e.target.value)} required>
                <option value="" disabled>{t("src_pick")}</option>
                {SOURCES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              {source === "other" && (
                <input style={{ marginTop: 8 }} value={sourceOther} onChange={(e) => setSourceOther(e.target.value)} placeholder={t("src_other") + "…"} />
              )}
              {err && <div className="acc-err">{err}</div>}
              <button className="acc-btn" disabled={busy}>{busy ? "…" : t("acc_register")}</button>
              <button type="button" className="acc-switch" onClick={() => { setMode("login"); setErr(""); }}>{t("acc_have")}</button>
            </form>
          )
        ) : (
          <div className="acc-card">
            <div className="acc-row">
              <b style={{ fontSize: 18 }}>{t("acc_hello", { n: (acc.user && (acc.user.name || acc.user.email)) || "" })}</b>
              <button className="acc-btn" style={{ width: "auto", marginTop: 0, padding: "9px 18px", background: "var(--pine)" }} onClick={logout}>
                {t("acc_logout")}
              </button>
            </div>
            <b>{t("acc_bookings")}</b>
            <div style={{ marginTop: 8 }}>
              {acc.bookings && acc.bookings.length ? (
                acc.bookings.map((b, i) => (
                  <div className="acc-book" key={i}>
                    <div>
                      <b>{b.villa}</b>
                      <div style={{ color: "var(--ink-soft)", marginTop: 2 }}>
                        {fmt(b.arrival)} → {fmt(b.departure)}{b.guests_count ? ` · ${b.guests_count} pers.` : ""}
                      </div>
                    </div>
                    <span className={`acc-status ${b.status}`}>{b.status === "confirmed" ? "Confirmată" : b.status === "cancelled" ? "Anulată" : b.status}</span>
                  </div>
                ))
              ) : (
                <p className="acc-help" style={{ marginTop: 8 }}>{t("acc_none")}</p>
              )}
            </div>
            {isStaff && <a className="acc-link" href={ADMIN_URL} target="_blank" rel="noopener noreferrer">{t("acc_admin")} →</a>}
          </div>
        )}
      </main>
      <Footer contact={content.contact} logo={content.brand?.logo} />
      <Fabs contact={content.contact} />
    </div>
  );
}
