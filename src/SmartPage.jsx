import React, { useEffect, useState, useCallback } from "react";
import { HUB_URL } from "./HubEditor.jsx";
import { TreeLoader, Brand, useHubContent } from "./RootsVillas.jsx";
import { t, applyLangDir } from "./i18n.js";

/* tokenul din ?g= se mută în sessionStorage și DISPARE din URL (history/
   ecran partajat); linkul original din WhatsApp rămâne mereu funcțional */
function readToken() {
  const qs = new URLSearchParams(window.location.search);
  const fromUrl = qs.get("g");
  if (fromUrl) {
    try { sessionStorage.setItem("roots_smart_g", fromUrl); } catch { /* privat */ }
    qs.delete("g");
    const clean = window.location.pathname + (qs.toString() ? "?" + qs.toString() : "");
    window.history.replaceState(null, "", clean);
    return fromUrl;
  }
  try { return sessionStorage.getItem("roots_smart_g") || ""; } catch { return ""; }
}

/* Pagina oaspetelui — Smart Roots. Se deschide din magic-link-ul primit la
   rezervare (/smart?g=<token>); fără login clasic. Hub-ul decide ce carduri
   apar și ce comenzi sunt permise — UI-ul doar reflectă. Mobile-first. */

const SMART_CSS = `
.sm{min-height:100vh;background:#0C1F19;color:#FBF7EF;font-family:'Manrope',sans-serif;padding:0 0 60px}
.sm-head{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:18px 20px;max-width:640px;margin:0 auto}
.sm-until{font-size:12.5px;color:rgba(251,247,239,.65);text-align:right;line-height:1.4}
.sm-wrap{max-width:640px;margin:0 auto;padding:0 16px}
.sm h1{font-family:'Fraunces',serif;font-weight:500;font-size:clamp(26px,6vw,34px);margin:10px 0 4px}
.sm-sub{color:rgba(251,247,239,.7);font-size:14.5px;margin-bottom:20px}
.sm-pin{background:rgba(233,184,114,.12);border:1px solid rgba(233,184,114,.4);border-radius:16px;padding:14px 18px;margin-bottom:18px;display:flex;align-items:center;justify-content:space-between;gap:10px}
.sm-pin b{font-size:24px;letter-spacing:4px;color:#E9B872}
.sm-pin span{font-size:13px;color:rgba(251,247,239,.7)}
.sm-card{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:18px;padding:16px 18px;margin-bottom:12px;display:flex;align-items:center;gap:14px;flex-wrap:wrap}
.sm-card .ico{width:44px;height:44px;border-radius:12px;background:rgba(232,114,44,.15);display:grid;place-items:center;font-size:22px;flex-shrink:0}
.sm-card .nm{flex:1;min-width:120px}
.sm-card .nm b{display:block;font-size:15.5px}
.sm-card .nm small{color:rgba(251,247,239,.6);font-size:12.5px}
.sm-btn{border:none;border-radius:100px;padding:12px 22px;font:700 14px 'Manrope',sans-serif;cursor:pointer;background:#E8722C;color:#fff;transition:transform .15s}
.sm-btn:active{transform:scale(.96)}
.sm-btn.off{background:rgba(255,255,255,.14);color:#FBF7EF}
.sm-btn:disabled{opacity:.5;cursor:wait}
.sm-temp{display:flex;align-items:center;gap:10px}
.sm-temp button{width:40px;height:40px;border-radius:50%;border:none;background:rgba(255,255,255,.14);color:#fff;font-size:20px;cursor:pointer}
.sm-temp b{min-width:64px;text-align:center;font-size:18px;color:#E9B872}
.sm-err{max-width:640px;margin:80px auto;text-align:center;padding:0 20px}
.sm-err h2{font-family:'Fraunces',serif;font-weight:500;font-size:26px;margin-bottom:10px}
.sm-err p{color:rgba(251,247,239,.7);line-height:1.6}
.sm-note{font-size:12px;color:rgba(251,247,239,.45);text-align:center;margin-top:24px}
.sm-toast{position:fixed;bottom:20px;left:50%;transform:translateX(-50%);background:#157a55;color:#fff;padding:11px 22px;border-radius:100px;font:600 13.5px 'Manrope',sans-serif;z-index:50}
`;

const TYPE_ICO = { light: "💡", hottub: "♨️", climate: "🌡️", gate: "🚗", lock: "🔑", sensor: "📟" };

function stateLabel(d) {
  const M = { on: t("sm_on"), off: t("sm_off"), heat: t("sm_on"), open: t("sm_open"), closed: t("sm_closed"), locked: "🔒", unlocked: "🔓", unavailable: "—" };
  if (d.type === "climate" && d.attributes && d.attributes.temperature != null) {
    return `${d.attributes.temperature}°C${d.attributes.current_temperature != null ? ` · ${t("sm_now")} ${d.attributes.current_temperature}°C` : ""}`;
  }
  return M[d.state] || d.state;
}

function DeviceCard({ d, onCmd, busy }) {
  const a = d.actions || [];
  const isOn = ["on", "heat", "open"].includes(d.state);
  const temp = (d.attributes && d.attributes.temperature) != null ? Number(d.attributes.temperature) : 21;
  return (
    <div className="sm-card">
      <div className="ico">{TYPE_ICO[d.type] || "⚙️"}</div>
      <div className="nm"><b>{d.label}</b><small>{stateLabel(d)}</small></div>
      {a.includes("set_temperature") && (
        <div className="sm-temp">
          <button type="button" disabled={busy} onClick={() => onCmd(d, "set_temperature", Math.max(18, temp - 0.5))}>−</button>
          <b>{temp}°C</b>
          <button type="button" disabled={busy} onClick={() => onCmd(d, "set_temperature", Math.min(24, temp + 0.5))}>+</button>
        </div>
      )}
      {a.includes("turn_on") && a.includes("turn_off") && (
        <button type="button" className={`sm-btn ${isOn ? "off" : ""}`} disabled={busy}
          onClick={() => onCmd(d, isOn ? "turn_off" : "turn_on")}>
          {isOn ? t("sm_turn_off") : t("sm_turn_on")}
        </button>
      )}
      {a.includes("open") && (
        <button type="button" className={`sm-btn ${isOn ? "off" : ""}`} disabled={busy}
          onClick={() => onCmd(d, d.state === "open" ? "close" : "open")}>
          {d.state === "open" ? t("sm_close") : t("sm_open_btn")}
        </button>
      )}
    </div>
  );
}

export default function SmartPage() {
  const { content, loaded } = useHubContent();
  const [token] = useState(readToken);
  const [sess, setSess] = useState(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  const load = useCallback(() => {
    fetch(HUB_URL + "/api/v1/guest/session", { headers: { "X-Guest-Token": token } })
      .then(async (r) => {
        const j = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(j.error || "Eroare");
        setSess(j);
      })
      .catch((e) => setErr(e.message));
  }, [token]);
  useEffect(() => { if (token) load(); else setErr(t("sm_no_token")); }, [token, load]);
  useEffect(() => {
    document.title = "Smart Roots · ROOTS Villas";
    applyLangDir(); // ebraica are nevoie de RTL și aici (pagina nu trece prin ThemeStyle)
    // fără referrer de pe pagina magic-link
    const m = document.createElement("meta");
    m.name = "referrer";
    m.content = "no-referrer";
    document.head.appendChild(m);
    return () => m.remove();
  }, []);

  async function onCmd(d, action, value) {
    setBusy(true);
    try {
      const r = await fetch(`${HUB_URL}/api/v1/villas/${sess.villa}/devices/${d.id}/command`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Guest-Token": token },
        body: JSON.stringify({ action, value }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Eroare");
      setSess((s) => ({ ...s, devices: s.devices.map((x) => (x.id === d.id ? j.device : x)) }));
      setToast(t("sm_sent"));
      setTimeout(() => setToast(""), 1800);
    } catch (e) {
      setToast(e.message);
      setTimeout(() => setToast(""), 3000);
    }
    setBusy(false);
  }

  if (!loaded) return <TreeLoader label={t("loading")} />;
  const villaName = sess ? ((content.villas || []).find((v) => v.id === sess.villa) || {}).name || sess.villa : "";

  return (
    <div className="sm">
      <style>{SMART_CSS}</style>
      <div className="sm-head">
        <Brand logo={content.brand?.logo} />
        {sess && <div className="sm-until">{t("sm_until")}<br />{new Date(sess.valid_to).toLocaleString("ro-RO", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</div>}
      </div>
      {err ? (
        <div className="sm-err">
          <h2>{t("sm_invalid_title")}</h2>
          <p>{err}</p>
          <p>{t("sm_invalid_hint")}</p>
        </div>
      ) : !sess ? (
        <TreeLoader label={t("loading")} />
      ) : (
        <div className="sm-wrap">
          <h1>{sess.guest_name ? t("sm_hello", { n: sess.guest_name.split(" ")[0] }) : t("sm_hello_anon")}</h1>
          <div className="sm-sub">{t("sm_sub", { v: villaName })}</div>
          {/* PIN-ul ușii apare aici când integrarea igloohome e gata (serverul nu-l trimite încă) */}
          {sess.pin && (
            <div className="sm-pin"><span>{t("sm_pin")}</span><b>{sess.pin}</b></div>
          )}
          {sess.devices.map((d) => <DeviceCard key={d.id} d={d} onCmd={onCmd} busy={busy} />)}
          {!sess.devices.length && <p className="sm-sub">{t("sm_empty")}</p>}
          <div className="sm-note">{t("sm_note")}</div>
        </div>
      )}
      {toast && <div className="sm-toast">{toast}</div>}
    </div>
  );
}
