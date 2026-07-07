import React, { useEffect, useState, useCallback } from "react";

/* ============================================================
   Editor vizual pe site (stil Framer-lite):
   - se activează cu ?edit + #hubtok=<token> (deschis din adminul Hub)
   - textele marcate cu data-edit devin editabile inline (contenteditable)
   - Salvează draft / Publică → API-ul Hub cu Bearer token
   ============================================================ */

const qs = new URLSearchParams(window.location.search);
export const HUB_URL = qs.get("hub") || "https://roots-hub-dun.vercel.app";
const TOKEN = (window.location.hash.match(/hubtok=([^&]+)/) || [])[1] || "";
export const EDIT_MODE = qs.has("edit") && Boolean(TOKEN);

const EDIT_CSS = `
body.hub-edit [data-edit]{outline:1.5px dashed rgba(232,114,44,.55);outline-offset:3px;cursor:text;border-radius:2px}
body.hub-edit [data-edit]:hover{outline-color:#E8722C;outline-style:solid}
body.hub-edit [data-edit]:focus{outline:2px solid #E8722C;background:rgba(232,114,44,.07)}
.hub-editbar{position:fixed;bottom:18px;left:50%;transform:translateX(-50%);z-index:99999;background:#0e1f19;color:#fff;
  padding:10px 12px 10px 18px;border-radius:100px;display:flex;gap:10px;align-items:center;
  font:600 13.5px 'Manrope',system-ui,sans-serif;box-shadow:0 14px 44px rgba(0,0,0,.45);flex-wrap:wrap;max-width:94vw}
.hub-editbar b{color:#E9B872}
.hub-editbar button{border:none;border-radius:100px;padding:9px 16px;font:700 13px 'Manrope',sans-serif;cursor:pointer;background:#1c3129;color:#fff}
.hub-editbar button:hover{background:#254236}
.hub-editbar button.pub{background:#157a55}
.hub-editbar button.pub:hover{background:#0f6e56}
.hub-editbar button:disabled{opacity:.45;cursor:not-allowed}
.hub-editbar .st{color:#9fd9c3}
`;

export default function HubEditor({ hubRaw, setHubRaw }) {
  const [dirty, setDirty] = useState(() => new Set());
  const [status, setStatus] = useState("");

  // stil + marcaj mod editare
  useEffect(() => {
    document.body.classList.add("hub-edit");
    const style = document.createElement("style");
    style.textContent = EDIT_CSS;
    document.head.appendChild(style);
    return () => {
      document.body.classList.remove("hub-edit");
      style.remove();
    };
  }, []);

  // după fiecare randare, textele marcate devin editabile
  useEffect(() => {
    document.querySelectorAll("[data-edit]").forEach((el) => {
      el.setAttribute("contenteditable", "true");
      el.spellcheck = false;
    });
  });

  // link-urile editabile nu trebuie să navigheze în modul editare
  useEffect(() => {
    const onClick = (e) => {
      const ed = e.target.closest && e.target.closest("[data-edit]");
      if (ed && ed.closest("a")) e.preventDefault();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  const commit = useCallback(
    (path, value) => {
      setHubRaw((prev) => {
        const next = JSON.parse(JSON.stringify(prev || {}));
        const keys = path.split(".");
        const section = keys[0];
        let o = next[section];
        if (o == null) return prev;
        for (let i = 1; i < keys.length - 1; i++) {
          o = o[keys[i]];
          if (o == null) return prev;
        }
        const last = keys[keys.length - 1];
        if (String(o[last] ?? "") === value) return prev;
        o[last] = value;
        setDirty((d) => new Set(d).add(section));
        return next;
      });
    },
    [setHubRaw]
  );

  // la ieșirea din câmp, textul intră în draft
  useEffect(() => {
    const onBlur = (e) => {
      const el = e.target.closest && e.target.closest("[data-edit]");
      if (!el) return;
      commit(el.getAttribute("data-edit"), el.innerText.replace(/\n+$/, "").trim());
    };
    document.addEventListener("focusout", onBlur);
    return () => document.removeEventListener("focusout", onBlur);
  }, [commit]);

  const call = async (method, path, body) => {
    const r = await fetch(HUB_URL + path, {
      method,
      headers: { "Content-Type": "application/json", Authorization: "Bearer " + TOKEN },
      body: body ? JSON.stringify(body) : undefined,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error || "Eroare " + r.status);
    return j;
  };

  const save = async (publish) => {
    setStatus(publish ? "Se publică…" : "Se salvează…");
    try {
      for (const key of dirty) {
        await call("PUT", "/api/v1/sections/" + key, { draft: hubRaw[key] });
        if (publish) await call("POST", "/api/v1/sections/" + key + "/publish");
      }
      setDirty(new Set());
      setStatus(publish ? "Publicat ✓ — live pe site" : "Draft salvat ✓");
      setTimeout(() => setStatus(""), 2600);
    } catch (e) {
      setStatus("");
      alert("Eroare la salvare: " + e.message + (e.message.includes("401") ? " (token expirat — redeschide editorul din admin)" : ""));
    }
  };

  return (
    <div className="hub-editbar">
      ✏️ Mod editare — click pe textele conturate
      <b>{dirty.size} {dirty.size === 1 ? "secțiune modificată" : "secțiuni modificate"}</b>
      <button onClick={() => save(false)} disabled={!dirty.size}>Salvează draft</button>
      <button className="pub" onClick={() => save(true)} disabled={!dirty.size}>Publică</button>
      <button onClick={() => { window.location.href = window.location.pathname; }}>Ieși</button>
      {status && <span className="st">{status}</span>}
    </div>
  );
}
