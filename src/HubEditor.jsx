import React, { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";

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
body.hub-edit [data-edit-img]{outline:2px dashed rgba(21,122,85,.75);outline-offset:-2px;cursor:pointer}
body.hub-edit [data-edit-img]:hover{outline-style:solid;outline-color:#157a55}
.hub-imgbtn{position:absolute;top:96px;right:22px;z-index:9;border:none;border-radius:100px;padding:10px 16px;
  background:#157a55;color:#fff;font:700 13px 'Manrope',sans-serif;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.35)}
.hub-picker{position:fixed;inset:0;z-index:100000;background:rgba(14,31,25,.55);display:grid;place-items:center;padding:20px}
.hub-picker-box{background:#fff;border-radius:18px;max-width:720px;width:100%;max-height:80vh;overflow:auto;padding:18px;
  font-family:'Manrope',system-ui,sans-serif;color:#14201b}
.hub-picker-head{display:flex;align-items:center;gap:10px;margin-bottom:14px}
.hub-picker-head b{font-size:16px;margin-right:auto}
.hub-picker-head button{border:1.5px solid #e3e8e5;background:#fff;border-radius:100px;padding:8px 14px;font:700 12.5px 'Manrope',sans-serif;cursor:pointer}
.hub-picker-head .hub-upbtn{background:#157a55;border-color:#157a55;color:#fff}
.hub-picker-head .hub-upbtn:disabled{opacity:.6;cursor:wait}
.hub-picker-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:10px}
.hub-picker-grid img{width:100%;height:96px;object-fit:cover;border-radius:10px;cursor:pointer;border:3px solid transparent}
.hub-picker-grid img:hover{border-color:#157a55}
body.hub-edit [data-edit-idx]{position:relative}
.hub-delbtn{position:absolute;top:-10px;right:-10px;z-index:50;width:26px;height:26px;border-radius:50%;border:none;
  background:#c0392b;color:#fff;font:700 15px/1 'Manrope',sans-serif;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.35)}
.hub-delbtn:hover{background:#e74c3c;transform:scale(1.1)}
.hub-addbtn{border:2px dashed rgba(21,122,85,.6);background:rgba(21,122,85,.06);color:#157a55;border-radius:12px;
  padding:12px 18px;font:700 13.5px 'Manrope',sans-serif;cursor:pointer;min-height:54px;width:100%}
.hub-addbtn:hover{background:rgba(21,122,85,.14);border-style:solid}
`;

/* optimizare în browser (identic cu adminul Hub): canvas → WebP 1920px + thumb 480px,
   ca payload-ul să încapă în limita serverless (4,5MB/request) */
function resizeImage(img, maxW, quality) {
  const scale = Math.min(1, maxW / img.naturalWidth);
  const w = Math.round(img.naturalWidth * scale), h = Math.round(img.naturalHeight * scale);
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  c.getContext("2d").drawImage(img, 0, 0, w, h);
  const webp = c.toDataURL("image/webp", quality);
  if (webp.startsWith("data:image/webp")) return { b64: webp.split(",")[1], mime: "image/webp" };
  return { b64: c.toDataURL("image/jpeg", quality).split(",")[1], mime: "image/jpeg" };
}

export default function HubEditor({ hubRaw, setHubRaw }) {
  const [dirty, setDirty] = useState(() => new Set());
  const [status, setStatus] = useState("");
  const [picker, setPicker] = useState(null); // calea de imagine în editare
  const [media, setMedia] = useState(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

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

  // link-urile editabile nu trebuie să navigheze; zonele de imagine deschid pickerul
  useEffect(() => {
    const onClick = (e) => {
      const img = e.target.closest && e.target.closest("[data-edit-img]");
      if (img) {
        e.preventDefault();
        e.stopPropagation();
        setPicker(img.getAttribute("data-edit-img"));
        return;
      }
      const ed = e.target.closest && e.target.closest("[data-edit]");
      if (ed && ed.closest("a, button")) { e.preventDefault(); e.stopPropagation(); }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // biblioteca media se încarcă la prima deschidere a pickerului
  useEffect(() => {
    if (picker && media === null) {
      call("GET", "/api/v1/media")
        .then((j) => setMedia(j.media || []))
        .catch(() => setMedia([]));
    }
  }, [picker]);

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

  /* liste editabile: containerele cu data-edit-list primesc „+ Adaugă",
     elementele cu data-edit-idx primesc „×" — prin portals, ca React să nu se încurce */
  const [listEls, setListEls] = useState([]);
  useEffect(() => {
    const scan = () => {
      const found = [];
      document.querySelectorAll("[data-edit-list]").forEach((el) => {
        const items = [...el.querySelectorAll("[data-edit-idx]")].filter(
          (it) => it.closest("[data-edit-list]") === el
        );
        found.push({ el, path: el.getAttribute("data-edit-list"), items });
      });
      setListEls((prev) => {
        if (
          prev.length === found.length &&
          prev.every((p, i) => p.el === found[i].el && p.items.length === found[i].items.length)
        )
          return prev;
        return found;
      });
    };
    scan();
    const iv = setInterval(scan, 700);
    return () => clearInterval(iv);
  }, []);

  const arrayOp = useCallback(
    (path, op, idx) => {
      setHubRaw((prev) => {
        const next = JSON.parse(JSON.stringify(prev || {}));
        const keys = path.split(".");
        let o = next[keys[0]];
        for (let i = 1; i < keys.length; i++) o = o == null ? null : o[keys[i]];
        if (!Array.isArray(o)) return prev;
        if (op === "add") {
          const tpl = o.length ? JSON.parse(JSON.stringify(o[o.length - 1])) : "";
          o.push(tpl);
        } else {
          o.splice(idx, 1);
        }
        setDirty((d) => new Set(d).add(keys[0]));
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

  /* upload direct din picker: redimensionează în browser → POST /api/v1/media →
     imaginea nouă se aplică imediat pe zona în editare */
  const uploadFile = async (f) => {
    if (!f) return;
    setUploading(true);
    const blobUrl = URL.createObjectURL(f);
    try {
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error("Fișierul nu e o imagine validă"));
        i.src = blobUrl;
      });
      const main = resizeImage(img, 1920, 0.8);
      const thumb = resizeImage(img, 480, 0.72);
      const j = await call("POST", "/api/v1/media", {
        filename: f.name, mainBase64: main.b64, thumbBase64: thumb.b64, mime: main.mime,
        width: Math.min(img.naturalWidth, 1920),
        height: Math.round(img.naturalHeight * Math.min(1, 1920 / img.naturalWidth)),
      });
      setMedia((m) => [j.media, ...(m || [])]);
      if (picker) {
        const sect = picker.split(".")[0];
        if (hubRaw && hubRaw[sect]) {
          commit(picker, j.media.url);
          setPicker(null);
        } else {
          // secțiunea nu e în draft — imaginea e urcată în galerie, dar n-o putem aplica aici
          alert("Imaginea e încărcată în Galerie media, dar secțiunea '" + sect + "' nu poate fi editată de aici. URL: " + j.media.url);
        }
      }
    } catch (e) {
      alert("Eroare la încărcare: " + e.message);
    } finally {
      URL.revokeObjectURL(blobUrl);
      setUploading(false);
    }
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
    <>
    {listEls.map(({ el, path, items }, li) => (
      <React.Fragment key={path + ":" + li}>
        {createPortal(
          <button type="button" className="hub-addbtn" onClick={() => arrayOp(path, "add")}>
            ＋ Adaugă element
          </button>,
          el
        )}
        {items.map((it, i) =>
          createPortal(
            <button
              type="button"
              className="hub-delbtn"
              title="Șterge blocul"
              onClick={() => {
                if (window.confirm("Ștergi acest bloc?")) arrayOp(path, "remove", Number(it.getAttribute("data-edit-idx")));
              }}
            >
              ×
            </button>,
            it
          )
        )}
      </React.Fragment>
    ))}
    {picker && (
      <div className="hub-picker" onClick={(e) => { if (e.target.classList.contains("hub-picker")) setPicker(null); }}>
        <div className="hub-picker-box">
          <div className="hub-picker-head">
            <b>Alege imaginea</b>
            <button className="hub-upbtn" disabled={uploading} onClick={() => fileRef.current && fileRef.current.click()}>
              {uploading ? "Se încarcă…" : "⬆ Încarcă imagine nouă"}
            </button>
            <button onClick={() => { commit(picker, ""); setPicker(null); }}>Fără imagine</button>
            <button onClick={() => setPicker(null)}>Închide</button>
            <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }}
              onChange={(e) => { uploadFile(e.target.files && e.target.files[0]); e.target.value = ""; }} />
          </div>
          {media === null ? (
            <p>Se încarcă biblioteca…</p>
          ) : media.length === 0 ? (
            <p>Nicio imagine încă — apasă „Încarcă imagine nouă" sau adaugă în Galerie media din admin.</p>
          ) : (
            <div className="hub-picker-grid">
              {media.map((m) => (
                <img key={m.id} src={m.thumb_url || m.url} alt={m.alt || ""} title={m.alt || ""}
                  onClick={() => { commit(picker, m.url); setPicker(null); }} />
              ))}
            </div>
          )}
        </div>
      </div>
    )}
    <div className="hub-editbar">
      ✏️ Mod editare — click pe textele conturate
      <b>{dirty.size} {dirty.size === 1 ? "secțiune modificată" : "secțiuni modificate"}</b>
      <button onClick={() => save(false)} disabled={!dirty.size}>Salvează draft</button>
      <button className="pub" onClick={() => save(true)} disabled={!dirty.size}>Publică</button>
      <button onClick={() => { window.location.href = window.location.pathname; }}>Ieși</button>
      {status && <span className="st">{status}</span>}
    </div>
    </>
  );
}
