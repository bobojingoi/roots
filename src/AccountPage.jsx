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
.acc-code-row{display:flex;gap:10px;margin-top:10px}
.acc-code-row input{flex:1;text-transform:uppercase;letter-spacing:.06em}
.acc-code-active{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:10px;background:#e7f5ee;border:1px solid rgba(21,122,85,.3);border-radius:12px;padding:12px 16px;font-size:13.5px;font-weight:600;color:#157a55}
.acc-code-rm{background:none;border:none;color:#c0392b;font:700 13px 'Manrope',sans-serif;cursor:pointer}
.acc-code-rm:hover{text-decoration:underline}
/* ===== membership (stil OMV) ===== */
.mb-wrap{margin-top:26px}
.mb-card{background:linear-gradient(145deg,var(--pine,#122B22),#0D1B2A);color:#FBF7EF;border-radius:20px;padding:24px;position:relative;overflow:hidden}
.mb-card::after{content:"";position:absolute;top:-70px;right:-70px;width:200px;height:200px;border-radius:50%;background:radial-gradient(circle,rgba(233,184,114,.35),transparent 70%)}
.mb-hello{font-size:15px;font-weight:700;opacity:.9}
.mb-balance{margin-top:8px;display:flex;align-items:baseline;gap:10px}
.mb-balance b{font-family:'Fraunces',serif;font-weight:500;font-size:52px;color:#E9B872;line-height:1}
.mb-balance span{font-size:13px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;opacity:.7}
.mb-tierline{margin-top:10px;font-size:14px;font-weight:600;opacity:.9}
.mb-tiers{display:flex;gap:8px;margin-top:14px}
.mb-tier{flex:1;text-align:center;font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;padding:7px 4px;border-radius:100px;border:1.5px solid rgba(255,255,255,.25);color:rgba(255,255,255,.6)}
.mb-tier.on{background:#E9B872;border-color:#E9B872;color:#122B22}
.mb-bar{margin-top:12px;height:8px;border-radius:6px;background:rgba(255,255,255,.15);overflow:hidden}
.mb-bar i{display:block;height:100%;background:linear-gradient(90deg,#E9B872,#E8722C);border-radius:6px;transition:width .6s ease}
.mb-next{margin-top:8px;font-size:12.5px;font-weight:600;opacity:.75}
.mb-sec{margin-top:22px}
.mb-sec>b{display:block;margin-bottom:10px;color:var(--pine)}
.mb-refrow{display:flex;gap:10px;align-items:center}
.mb-refrow code{flex:1;background:var(--ivory);border:1.5px dashed rgba(18,43,34,.35);border-radius:12px;padding:12px 16px;font:700 16px monospace;letter-spacing:.12em;color:var(--pine)}
.mb-refrow button{border:none;border-radius:100px;padding:12px 20px;background:var(--pine);color:#fff;font:700 13.5px 'Manrope',sans-serif;cursor:pointer}
.mb-earnrow{display:flex;gap:10px;flex-wrap:wrap}
.mb-earnrow button{border:1.5px solid var(--line);background:#fff;border-radius:100px;padding:11px 18px;font:600 13.5px 'Manrope',sans-serif;color:var(--ink);cursor:pointer;transition:border-color .2s}
.mb-earnrow button:hover{border-color:var(--ember)}
.mb-msg{margin-top:14px;background:#e7f5ee;border:1px solid rgba(21,122,85,.3);border-radius:12px;padding:12px 16px;font-size:13.5px;font-weight:600;color:#157a55}
.mb-cats{display:flex;gap:8px;margin-bottom:12px}
.mb-cats button{border:1.5px solid var(--line);background:#fff;border-radius:100px;padding:8px 16px;font:700 12.5px 'Manrope',sans-serif;color:var(--ink);cursor:pointer}
.mb-cats button.on{background:var(--ember);border-color:var(--ember);color:#fff}
.mb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:14px}
.mb-reward{background:#fff;border:1px solid var(--line);border-radius:16px;overflow:hidden;display:flex;flex-direction:column}
.mb-reward img,.mb-ph{width:100%;height:130px;object-fit:cover;background:linear-gradient(150deg,#E8EFE4,#D7E4D2)}
.mb-rbody{padding:12px 14px;display:flex;flex-direction:column;gap:6px;flex:1}
.mb-rbody b{font-size:14.5px;color:var(--pine)}
.mb-rbody p{font-size:12.5px;color:var(--ink-soft);line-height:1.5;flex:1}
.mb-rfoot{display:flex;justify-content:space-between;align-items:center;margin-top:6px}
.mb-cost{font-weight:800;font-size:13px;color:var(--ember)}
.mb-rfoot button{border:none;border-radius:100px;padding:8px 16px;background:var(--pine);color:#fff;font:700 12.5px 'Manrope',sans-serif;cursor:pointer}
.mb-rfoot button:disabled{opacity:.4;cursor:not-allowed}
.mb-voucher{display:flex;align-items:center;gap:12px;padding:10px 0;border-bottom:1px solid var(--line);font-size:14px;flex-wrap:wrap}
.mb-voucher span{flex:1;min-width:140px}
.mb-voucher code{font:700 14px monospace;letter-spacing:.08em;color:var(--pine)}
.mb-voucher em{font-style:normal;font-size:12px;font-weight:700;padding:3px 10px;border-radius:99px;background:#FDF3E4;color:#9A6A1C}
.mb-voucher em.fulfilled{background:#e7f5ee;color:#157a55}
.mb-voucher em.cancelled{background:#fdeaea;color:#c0392b}
.mb-tx{display:flex;justify-content:space-between;gap:12px;padding:9px 0;border-bottom:1px solid var(--line);font-size:13.5px}
.mb-tx small{display:block;color:var(--ink-soft);margin-top:2px}
.mb-tx b.plus{color:#157a55}
.mb-tx b.minus{color:#c0392b}
body.t-aurora .mb-sec>b,body.t-aurora .mb-rbody b{color:var(--ink)}
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
  const [refCode, setRefCode] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  // membership: dashboard-ul cu puncte (stil OMV)
  const [mb, setMb] = useState(null);
  const [mbCat, setMbCat] = useState("all");
  const [copied, setCopied] = useState(false);
  const [mbMsg, setMbMsg] = useState("");
  const loadMb = React.useCallback((tok) => {
    fetch(HUB_URL + "/api/v1/membership/me", { headers: { Authorization: "Bearer " + tok } })
      .then((r) => (r.ok ? r.json() : null))
      .then(setMb)
      .catch(() => {});
  }, []);
  useEffect(() => { if (token && acc) loadMb(token); }, [token, acc, loadMb]);

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
        body: JSON.stringify({ name: name.trim(), email, password: pass, phone: phone.trim(), source: src, referralCode: refCode.trim() || undefined }),
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

  const [codeInput, setCodeInput] = useState("");
  const [codeErr, setCodeErr] = useState("");
  async function saveCode(remove) {
    setCodeErr("");
    try {
      const r = await fetch(HUB_URL + "/api/v1/my-account/discount", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ code: remove ? "" : codeInput.trim() }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Eroare");
      setAcc((a) => ({ ...a, discount: j.discount }));
      setCodeInput("");
    } catch (e) { setCodeErr(e.message); }
  }

  async function redeem(rewardId) {
    setMbMsg("");
    try {
      const r = await fetch(HUB_URL + "/api/v1/membership/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ reward_id: rewardId }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Eroare");
      setMbMsg(t("mb_redeemed", { c: j.redemption.code }));
      loadMb(token);
    } catch (e) { setMbMsg(e.message); }
  }
  async function mbRequest(type) {
    const url = window.prompt(t("mb_req_url"));
    if (url === null) return;
    setMbMsg("");
    try {
      const r = await fetch(HUB_URL + "/api/v1/membership/request", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ type, url: url.trim() }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Eroare");
      setMbMsg(t("mb_req_sent"));
    } catch (e) { setMbMsg(e.message); }
  }
  function copyRef() {
    try { navigator.clipboard.writeText(mb.account.referral_code); setCopied(true); setTimeout(() => setCopied(false), 2000); } catch { /* clipboard indisponibil */ }
  }
  const TIER_LABEL = { silver: "Silver", gold: "Gold", platinum: "Platinum" };

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
              <label>{t("acc_referral_reg")}</label>
              <input value={refCode} onChange={(e) => setRefCode(e.target.value.toUpperCase())} placeholder="RV-XXXXXX" style={{ textTransform: "uppercase" }} />
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
            <div style={{ marginTop: 22 }}>
              <b>{t("acc_code")}</b>
              {acc.discount ? (
                <div className="acc-code-active">
                  <span>🏷 {t("acc_code_active", { c: acc.discount.code, p: acc.discount.pct })}</span>
                  <button type="button" className="acc-code-rm" onClick={() => saveCode(true)}>{t("acc_code_remove")}</button>
                </div>
              ) : (
                <div className="acc-code-row">
                  <input value={codeInput} onChange={(e) => setCodeInput(e.target.value.toUpperCase())} placeholder={t("acc_code_ph")} />
                  <button type="button" className="acc-btn" style={{ width: "auto", marginTop: 0, padding: "11px 18px" }} onClick={() => saveCode(false)} disabled={!codeInput.trim()}>
                    {t("acc_code_save")}
                  </button>
                </div>
              )}
              {codeErr && <div className="acc-err">{codeErr}</div>}
            </div>

            {/* ===== MEMBERSHIP — dashboard stil OMV ===== */}
            {mb && (
              <div className="mb-wrap">
                <div className="mb-card">
                  <div className="mb-hello">{t("mb_hello", { n: ((acc.user && acc.user.name) || "").split(" ")[0] || "" })}</div>
                  <div className="mb-balance"><b>{mb.account.points_balance}</b><span>{t("mb_points")}</span></div>
                  <div className="mb-tierline">{t("mb_status", { t: TIER_LABEL[mb.account.tier] })}</div>
                  <div className="mb-tiers">
                    {["silver", "gold", "platinum"].map((tr) => (
                      <span key={tr} className={"mb-tier" + (mb.account.tier === tr ? " on" : "")}>{TIER_LABEL[tr]}</span>
                    ))}
                  </div>
                  <div className="mb-bar"><i style={{ width: mb.account.progress.pct + "%" }} /></div>
                  <div className="mb-next">
                    {mb.account.progress.next
                      ? t("mb_to_next", { n: mb.account.progress.toNext, t: TIER_LABEL[mb.account.progress.next] })
                      : t("mb_top")}
                  </div>
                </div>

                <div className="mb-sec">
                  <b>{t("mb_referral")}</b>
                  <div className="mb-refrow">
                    <code>{mb.account.referral_code}</code>
                    <button type="button" onClick={copyRef}>{copied ? t("mb_ref_copied") : t("mb_ref_copy")}</button>
                  </div>
                  <p className="acc-help" style={{ marginTop: 8 }}>
                    {t("mb_ref_stats", { n: mb.referral.invited, p: mb.referral.earned })}<br />
                    {t("mb_ref_how", { a: mb.referral.points_new, b: mb.referral.points_inviter })}
                  </p>
                </div>

                <div className="mb-sec">
                  <b>{t("mb_earn_more")}</b>
                  <div className="mb-earnrow">
                    <button type="button" onClick={() => mbRequest("photo_tag")}>{t("mb_req_photo")}</button>
                    <button type="button" onClick={() => mbRequest("review")}>{t("mb_req_review")}</button>
                  </div>
                </div>

                {mbMsg && <div className="mb-msg">{mbMsg}</div>}

                {mb.rewards.length > 0 && (
                  <div className="mb-sec">
                    <b>{t("mb_rewards")}</b>
                    <div className="mb-cats">
                      {[["all", t("mb_cat_all")], ["accommodation", t("mb_cat_stay")], ["cellar", t("mb_cat_cellar")]].map(([k, l]) => (
                        <button type="button" key={k} className={mbCat === k ? "on" : ""} onClick={() => setMbCat(k)}>{l}</button>
                      ))}
                    </div>
                    <div className="mb-grid">
                      {mb.rewards.filter((r) => mbCat === "all" || r.category === mbCat).map((r) => (
                        <div className="mb-reward" key={r.id}>
                          {r.photo ? <img src={r.photo} alt={r.title} loading="lazy" /> : <div className="mb-ph" />}
                          <div className="mb-rbody">
                            <b>{r.title}</b>
                            {r.description ? <p>{r.description}</p> : null}
                            <div className="mb-rfoot">
                              <span className="mb-cost">{t("mb_pts", { n: r.points_cost })}</span>
                              <button
                                type="button"
                                disabled={mb.account.points_balance < r.points_cost}
                                title={mb.account.points_balance < r.points_cost ? t("mb_no_points") : ""}
                                onClick={() => redeem(r.id)}
                              >
                                {t("mb_redeem")}
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {mb.redemptions.length > 0 && (
                  <div className="mb-sec">
                    <b>{t("mb_my_vouchers")}</b>
                    {mb.redemptions.map((r) => (
                      <div className="mb-voucher" key={r.id}>
                        <span>{r.title}</span>
                        <code>{r.code}</code>
                        <em className={r.status}>{r.status}</em>
                      </div>
                    ))}
                  </div>
                )}

                {mb.transactions.length > 0 && (
                  <div className="mb-sec">
                    <b>{t("mb_history")}</b>
                    {mb.transactions.map((tx, i) => (
                      <div className="mb-tx" key={i}>
                        <span>{tx.description || tx.type}<small>{fmt(tx.created_at)}</small></span>
                        <b className={tx.amount > 0 ? "plus" : "minus"}>{tx.amount > 0 ? "+" : ""}{tx.amount}</b>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {isStaff && <a className="acc-link" href={ADMIN_URL} target="_blank" rel="noopener noreferrer">{t("acc_admin")} →</a>}
          </div>
        )}
      </main>
      <Footer contact={content.contact} logo={content.brand?.logo} />
      <Fabs contact={content.contact} />
    </div>
  );
}
