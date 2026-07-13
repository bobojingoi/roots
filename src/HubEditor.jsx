import React, { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";

/* ============================================================
   Editor vizual pe site (stil Framer-lite):
   - se activează cu ?edit + #hubtok=<token> (deschis din adminul Hub)
   - textele marcate cu data-edit devin editabile inline (contenteditable)
   - Salvează draft / Publică → API-ul Hub cu Bearer token
   ============================================================ */

const qs = new URLSearchParams(window.location.search);
/* ?hub= e acceptat DOAR din lista de host-uri cunoscute — altfel tokenul Bearer
   al editorului ar putea fi exfiltrat către un server străin printr-un link malițios */
const ALLOWED_HUBS = ["https://roots-hub-dun.vercel.app", "https://hub.rootsvillas.ro", "http://localhost:4000"];
const hubParam = qs.get("hub");
export const HUB_URL = ALLOWED_HUBS.includes(hubParam) ? hubParam : "https://roots-hub-dun.vercel.app";
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
/* câmpurile golite rămân vizibile în editor ca placeholder recompletabil */
body.hub-edit [data-edit]:empty{display:revert!important;min-width:50px;min-height:1em}
body.hub-edit a:has(>[data-edit]:empty),body.hub-edit button:has(>[data-edit]:empty){display:revert!important}
body.hub-edit [data-edit]:empty::before{content:"· gol — scrie aici sau lasă șters ·";opacity:.45;font-size:12px;font-style:italic}
.hub-fielddel{position:fixed;z-index:100001;width:26px;height:26px;border-radius:50%;border:none;background:#c0392b;color:#fff;
  font:700 15px/1 'Manrope',sans-serif;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.35)}
.hub-fielddel:hover{background:#e74c3c;transform:scale(1.1)}
.hub-imgbtn{position:absolute;top:96px;right:22px;z-index:9;border:none;border-radius:100px;padding:10px 16px;
  background:#157a55;color:#fff;font:700 13px 'Manrope',sans-serif;cursor:pointer;box-shadow:0 8px 24px rgba(0,0,0,.35)}
.hub-imgbtn.mob{top:146px}
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
/* reordonare prin drag & drop (containerele cu data-edit-drag) —
   cursor grab doar pe ce chiar pornește drag-ul (imaginea/placeholder-ul) */
body.hub-edit [data-edit-drag] [data-edit-idx] img,body.hub-edit [data-edit-drag] [draggable="true"]{cursor:grab}
body.hub-edit [data-edit-drag] .hub-dragover{outline:3px solid #157a55!important;outline-offset:3px;border-radius:12px}
.hub-delbtn{position:absolute;top:-10px;right:-10px;z-index:50;width:26px;height:26px;border-radius:50%;border:none;
  background:#c0392b;color:#fff;font:700 15px/1 'Manrope',sans-serif;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.35)}
.hub-delbtn:hover{background:#e74c3c;transform:scale(1.1)}
.hub-addbtn{border:2px dashed rgba(21,122,85,.6);background:rgba(21,122,85,.06);color:#157a55;border-radius:12px;
  padding:12px 18px;font:700 13.5px 'Manrope',sans-serif;cursor:pointer;min-height:54px;width:100%}
.hub-addbtn:hover{background:rgba(21,122,85,.14);border-style:solid}
/* manager slider cu 2 panouri (bibliotecă | poze în slider) */
.hub-picker-box.hub-mgr{max-width:900px}
.hub-mgr-cols{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:720px){.hub-mgr-cols{grid-template-columns:1fr}}
.hub-mgr-title{font:700 12px 'Manrope',sans-serif;color:#5a6b62;margin:2px 0 8px;text-transform:uppercase;letter-spacing:.04em}
.hub-mgr-lib{display:grid;grid-template-columns:repeat(auto-fill,minmax(84px,1fr));gap:8px;max-height:52vh;overflow:auto;padding-right:4px}
.hub-mgr-lib img{width:100%;height:70px;object-fit:cover;border-radius:9px;cursor:pointer;border:3px solid transparent}
.hub-mgr-lib img:hover{border-color:#157a55}
.hub-mgr-slides{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:12px;max-height:52vh;overflow:auto;padding:8px 2px}
.hub-mgr-slide{position:relative;border-radius:10px;cursor:grab}
.hub-mgr-slide img{width:100%;height:78px;object-fit:cover;border-radius:10px;display:block;border:2px solid #e3e8e5}
.hub-mgr-slide.drag{opacity:.4}
.hub-mgr-slide.over img{border-color:#157a55;box-shadow:0 0 0 3px rgba(21,122,85,.35)}
.hub-mgr-slide:hover img{border-color:#157a55}
.hub-mgr-num{position:absolute;top:4px;left:4px;z-index:2;background:rgba(14,31,25,.82);color:#fff;font:700 11px 'Manrope',sans-serif;padding:2px 7px;border-radius:100px}
.hub-mgr-del{position:absolute;top:-9px;right:-9px;z-index:3;width:24px;height:24px;border-radius:50%;border:none;background:#c0392b;color:#fff;font:700 14px/1 'Manrope',sans-serif;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,.3)}
.hub-mgr-del:hover{background:#e74c3c;transform:scale(1.1)}
.hub-mgr-empty{color:#8a988f;font-size:13px;padding:8px 2px}
.hub-mgr-status{margin-top:12px;color:#157a55;font:600 13px 'Manrope',sans-serif}
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

/* dintr-un path de imagine dintr-un array (ex. „common.slides.2.url") derivă
   array-ul de bază + câmpul: { path:"common.slides", field:"url" }.
   Întoarce null pentru imaginile singulare (fără index numeric, ex. „common.image"). */
function sliderInfo(path) {
  const keys = String(path || "").split(".");
  let idx = -1;
  for (let i = keys.length - 1; i >= 0; i--) if (/^\d+$/.test(keys[i])) { idx = i; break; }
  if (idx < 0) return null;
  return { path: keys.slice(0, idx).join("."), field: idx < keys.length - 1 ? keys[idx + 1] : "" };
}

/* citește array-ul din draft de la un path cu puncte (ex. „common.slides") */
function arrayAt(root, path) {
  let o = root;
  for (const k of String(path || "").split(".")) { if (o == null) return []; o = o[k]; }
  return Array.isArray(o) ? o : [];
}

/* verifică în DOM dacă `arrayPath` e un slider real, marcat cu butonul „mai multe
   poze" (data-edit-imgs). Doar așa deschidem managerul — altfel un „cover" (câmp
   imagine singular al unui element de listă) ar fi confundat cu un array de poze.
   Câmpul întors e cel autoritar de pe buton (ex. „url" / „img" / „" pt. string-uri). */
function findImgsTarget(arrayPath) {
  if (!arrayPath) return null;
  let el = null;
  try { el = document.querySelector(`[data-edit-imgs="${arrayPath}"]`); } catch { el = null; }
  return el ? { path: arrayPath, field: el.getAttribute("data-edit-imgs-field") || "" } : null;
}

export default function HubEditor({ hubRaw, setHubRaw }) {
  const [dirty, setDirty] = useState(() => new Set());
  const [status, setStatus] = useState("");
  const [picker, setPicker] = useState(null); // calea de imagine în editare
  const [manager, setManager] = useState(null); // { path, field } — manager slider cu 2 panouri
  const [dragIdx, setDragIdx] = useState(null); // index tras în panoul „în slider"
  const [overIdx, setOverIdx] = useState(null); // index țintă sub cursor la reordonare
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
      const multi = e.target.closest && e.target.closest("[data-edit-imgs]");
      if (multi) {
        e.preventDefault();
        e.stopPropagation();
        setManager({ path: multi.getAttribute("data-edit-imgs"), field: multi.getAttribute("data-edit-imgs-field") || "" });
        return;
      }
      const img = e.target.closest && e.target.closest("[data-edit-img]");
      if (img) {
        e.preventDefault();
        e.stopPropagation();
        const path = img.getAttribute("data-edit-img");
        // slide dintr-un slider real (există butonul „mai multe poze" cu același array)
        // → manager cu 2 panouri; altfel (imagine singulară, cover, mobil) → picker simplu
        const info = !/mobil|mobile/i.test(path) ? sliderInfo(path) : null;
        const mgr = info && findImgsTarget(info.path);
        if (mgr) setManager(mgr);
        else setPicker(path);
        return;
      }
      const ed = e.target.closest && e.target.closest("[data-edit]");
      if (ed && ed.closest("a, button")) { e.preventDefault(); e.stopPropagation(); }
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  // biblioteca media se încarcă la prima deschidere a pickerului sau a managerului
  useEffect(() => {
    if ((picker || manager) && media === null) {
      call("GET", "/api/v1/media")
        .then((j) => setMedia(j.media || []))
        .catch(() => setMedia([]));
    }
  }, [picker, manager]);

  const commit = useCallback(
    (path, value) => {
      setHubRaw((prev) => {
        const next = JSON.parse(JSON.stringify(prev || {}));
        const keys = path.split(".");
        const section = keys[0];
        let o = next[section];
        if (o == null) return prev; // secțiunea trebuie să existe în draft
        // containerele intermediare lipsă se creează (ex. galleryMobile pe secțiuni vechi):
        // cheia următoare numerică => array, altfel obiect.
        // Dacă pe traseu se ADAUGĂ un element de array (ex. „+ foto" pe index nou),
        // reținem locul, ca traducerile să primească un element gol la aceeași poziție.
        let append = null; // { upto, index } — array-ul e la keys[1..upto-1], elementul nou la keys[upto]
        for (let i = 1; i < keys.length - 1; i++) {
          const k = keys[i];
          if (o[k] == null) {
            if (!append && Array.isArray(o) && /^\d+$/.test(k) && Number(k) >= o.length) append = { upto: i, index: Number(k) };
            o[k] = /^\d+$/.test(keys[i + 1]) ? [] : {};
          }
          o = o[k];
        }
        const last = keys[keys.length - 1];
        if (!append && Array.isArray(o) && /^\d+$/.test(last) && Number(last) >= o.length) append = { upto: keys.length - 1, index: Number(last) };
        if (String(o[last] ?? "") === value) return prev;
        o[last] = value;
        setDirty((d) => new Set(d).add(section));
        if (append) {
          // pe @lang intră "" (element final) sau {} (obiect nou) — pe site cad pe română
          const filler = append.upto === keys.length - 1 ? "" : {};
          for (const sect of Object.keys(next).filter((k) => k.startsWith(section + "@"))) {
            let lo = next[sect];
            for (let i = 1; i < append.upto && lo != null; i++) lo = lo[keys[i]];
            if (Array.isArray(lo) && lo.length === append.index) {
              lo.push(JSON.parse(JSON.stringify(filler)));
              setDirty((d) => new Set(d).add(sect));
            }
          }
        }
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

  /* aplică o mutație pe array-ul de bază de la `path` și, în oglindă, pe
     variantele de limbă ale secțiunii (villa_redwood@en etc.), ca listele
     traduse să rămână aliniate index cu index cu originalul.
     - oglindirea rulează DOAR când array-ul @lang are aceeași lungime cu baza
       (altfel indicii ar muta alt conținut) — la lungimi diferite limba e sărită
     - pe @lang elementele noi intră GOALE ("" / {}) — pe site cad pe română
       prin deepLang, nu clonează traduceri vechi
     - dirty se marchează numai pe secțiunile chiar modificate */
  const mutateArray = useCallback(
    (path, fnBase, fnLang) => {
      setHubRaw((prev) => {
        const next = JSON.parse(JSON.stringify(prev || {}));
        const keys = path.split(".");
        // pe secțiunea de bază containerele lipsă se creează (ex. common.slides nou)
        const at = (sect, ensure) => {
          let o = next[sect];
          if (o == null) return null;
          for (let i = 1; i < keys.length; i++) {
            const k = keys[i];
            if (o[k] == null) {
              if (!ensure) return null;
              o[k] = i === keys.length - 1 ? [] : /^\d+$/.test(keys[i + 1]) ? [] : {};
            }
            o = o[k];
          }
          return Array.isArray(o) ? o : null;
        };
        const base = at(keys[0], true);
        if (!base) return prev;
        const baseLenBefore = base.length;
        if (fnBase(base) === false) return prev;
        setDirty((d) => new Set(d).add(keys[0]));
        for (const sect of Object.keys(next).filter((k) => k.startsWith(keys[0] + "@"))) {
          const o = at(sect, false);
          if (!o || o.length !== baseLenBefore) continue; // desincronizat — nu atingem
          if ((fnLang || fnBase)(o) !== false) setDirty((d) => new Set(d).add(sect));
        }
        return next;
      });
    },
    [setHubRaw]
  );

  // element „gol" cu forma template-ului: obiect gol sau string gol
  const emptyLike = (tpl) => (tpl && typeof tpl === "object" && !Array.isArray(tpl) ? {} : "");

  const arrayOp = useCallback(
    (path, op, idx) => {
      if (op === "add") {
        mutateArray(
          path,
          (o) => { o.push(o.length ? JSON.parse(JSON.stringify(o[o.length - 1])) : ""); },
          (o) => { o.push(emptyLike(o[o.length - 1])); }
        );
      } else {
        mutateArray(path, (o) => {
          if (idx < 0 || idx >= o.length) return false;
          o.splice(idx, 1);
        });
      }
    },
    [mutateArray]
  );

  /* reordonare drag & drop pe containerele cu data-edit-drag */
  const arrayMove = useCallback(
    (path, from, to) => {
      if (from === to) return;
      mutateArray(path, (o) => {
        if (from < 0 || from >= o.length || to < 0 || to >= o.length) return false;
        o.splice(to, 0, o.splice(from, 1)[0]);
      });
    },
    [mutateArray]
  );

  /* adaugă în slider o poză deja existentă în bibliotecă (fără upload) —
     baza primește string sau { câmp: url }; traducerile aliniate primesc gol */
  const appendToArray = useCallback(
    (path, field, url) => {
      if (!url) return;
      mutateArray(
        path,
        (o) => { o.push(field ? { [field]: url } : url); },
        (o) => { o.push(field ? {} : ""); }
      );
    },
    [mutateArray]
  );

  useEffect(() => {
    let drag = null; // { path, from, cont }
    const clearMarks = () => document.querySelectorAll(".hub-dragover").forEach((el) => el.classList.remove("hub-dragover"));
    const itemOf = (e) => {
      const item = e.target && e.target.closest && e.target.closest("[data-edit-idx]");
      return item && item.closest("[data-edit-drag]") ? item : null;
    };
    const onDragStart = (e) => {
      const item = itemOf(e);
      if (!item) return;
      // drag pornit din text editabil = selecție de text, nu reordonare
      if (e.target.closest && e.target.closest("[data-edit]")) { e.preventDefault(); return; }
      const cont = item.closest("[data-edit-drag]");
      drag = { path: cont.getAttribute("data-edit-list"), from: Number(item.getAttribute("data-edit-idx")), cont };
      e.dataTransfer.effectAllowed = "move";
      try { e.dataTransfer.setData("text/plain", ""); } catch { /* IE-ism */ }
    };
    const onDragOver = (e) => {
      if (!drag) return;
      const item = itemOf(e);
      if (!item || item.closest("[data-edit-drag]") !== drag.cont) {
        // cât ține reordonarea, textele editabile nu sunt ținte de drop
        // (altfel browserul ar insera imaginea/URL-ul în contenteditable)
        e.preventDefault();
        e.dataTransfer.dropEffect = "none";
        return;
      }
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      clearMarks();
      item.classList.add("hub-dragover");
    };
    const onDrop = (e) => {
      if (!drag) return;
      e.preventDefault(); // un drag de reordonare nu are voie să insereze conținut nicăieri
      const item = itemOf(e);
      if (item && item.closest("[data-edit-drag]") === drag.cont) {
        arrayMove(drag.path, drag.from, Number(item.getAttribute("data-edit-idx")));
      }
      clearMarks();
      drag = null;
    };
    const onDragEnd = () => { clearMarks(); drag = null; };
    document.addEventListener("dragstart", onDragStart);
    document.addEventListener("dragover", onDragOver);
    document.addEventListener("drop", onDrop);
    document.addEventListener("dragend", onDragEnd);
    return () => {
      document.removeEventListener("dragstart", onDragStart);
      document.removeEventListener("dragover", onDragOver);
      document.removeEventListener("drop", onDrop);
      document.removeEventListener("dragend", onDragEnd);
    };
  }, [arrayMove]);

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

  /* butonul „×" de golire: apare lângă blocul de text focusat; golit = ascuns pe
     site (CSS :empty), dar rămâne placeholder editabil în editor */
  const [delBtn, setDelBtn] = useState(null); // { path, top, left }
  useEffect(() => {
    const onFocus = (e) => {
      const el = e.target.closest && e.target.closest("[data-edit]");
      if (!el) { setDelBtn(null); return; }
      const r = el.getBoundingClientRect();
      setDelBtn({ path: el.getAttribute("data-edit"), top: Math.max(4, r.top - 12), left: Math.min(window.innerWidth - 30, r.right - 2) });
    };
    const hide = () => setDelBtn(null);
    // ascunde × când focusul pleacă în afara oricărui bloc editabil
    const onFocusOut = () => {
      setTimeout(() => {
        const ae = document.activeElement;
        if (!ae || !(ae.closest && ae.closest("[data-edit]"))) setDelBtn(null);
      }, 80);
    };
    document.addEventListener("focusin", onFocus);
    document.addEventListener("focusout", onFocusOut);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => {
      document.removeEventListener("focusin", onFocus);
      document.removeEventListener("focusout", onFocusOut);
      window.removeEventListener("scroll", hide, true);
      window.removeEventListener("resize", hide);
    };
  }, []);

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

  /* urcă UN fișier: redimensionare în browser → POST /api/v1/media → întoarce URL-ul */
  const uploadOne = async (f) => {
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
      return j.media.url;
    } finally {
      URL.revokeObjectURL(blobUrl);
    }
  };

  /* upload din picker (un fișier): imaginea nouă se aplică imediat pe zona în editare */
  const uploadFile = async (f) => {
    if (!f) return;
    setUploading(true);
    try {
      const url = await uploadOne(f);
      if (picker) {
        const sect = picker.split(".")[0];
        if (hubRaw && hubRaw[sect]) {
          commit(picker, url);
          setPicker(null);
        } else {
          alert("Imaginea e încărcată în Galerie media, dar secțiunea '" + sect + "' nu poate fi editată de aici. URL: " + url);
        }
      }
    } catch (e) {
      alert("Eroare la încărcare: " + e.message);
    }
    setUploading(false);
  };

  /* upload MULTIPLU: zonele cu data-edit-imgs primesc mai multe poze deodată,
     adăugate la finalul array-ului (stringuri sau obiecte {câmp: url}) */
  const [multiTarget, setMultiTarget] = useState(null); // { path, field }
  const multiRef = useRef(null);
  const uploadMany = async (files, target) => {
    if (!target || !files.length) return;
    setUploading(true);
    const urls = [];
    for (let i = 0; i < files.length; i++) {
      setStatus(`Se încarcă poza ${i + 1} din ${files.length}…`);
      try { urls.push(await uploadOne(files[i])); }
      catch (e) { alert(`Eroare la „${files[i].name}": ${e.message}`); }
    }
    setStatus(urls.length ? `${urls.length} poze adăugate ✓ — nu uita să publici` : "");
    if (urls.length) {
      const { path, field } = target;
      // pozele intră în secțiunea de bază; traducerile aliniate primesc
      // elemente goale la aceleași poziții (pe site cad pe română)
      mutateArray(
        path,
        (o) => { for (const u of urls) o.push(field ? { [field]: u } : u); },
        (o) => { for (let i = 0; i < urls.length; i++) o.push(field ? {} : ""); }
      );
    }
    setTimeout(() => setStatus(""), 3500);
    setUploading(false);
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
    {manager && (() => {
      const items = arrayAt(hubRaw, manager.path);
      const urlOf = (it) => (manager.field ? (it && it[manager.field]) || "" : it || "");
      return (
        <div className="hub-picker" onClick={(e) => { if (e.target.classList.contains("hub-picker")) setManager(null); }}>
          <div className="hub-picker-box hub-mgr">
            <div className="hub-picker-head">
              <b>Poze slider — {items.length}</b>
              <button
                className="hub-upbtn"
                disabled={uploading}
                onClick={() => { setMultiTarget({ path: manager.path, field: manager.field }); if (multiRef.current) multiRef.current.click(); }}
              >
                {uploading ? "Se încarcă…" : "⬆ Încarcă poze noi"}
              </button>
              <button onClick={() => setManager(null)}>Închide</button>
            </div>
            <div className="hub-mgr-cols">
              <div className="hub-mgr-col">
                <div className="hub-mgr-title">Bibliotecă — click pt. a adăuga</div>
                {media === null ? (
                  <p>Se încarcă biblioteca…</p>
                ) : media.length === 0 ? (
                  <p className="hub-mgr-empty">Nicio imagine încă — apasă „Încarcă poze noi".</p>
                ) : (
                  <div className="hub-mgr-lib">
                    {media.map((m) => (
                      <img key={m.id} src={m.thumb_url || m.url} alt={m.alt || ""} title={m.alt || "Adaugă în slider"}
                        onClick={() => appendToArray(manager.path, manager.field, m.url)} />
                    ))}
                  </div>
                )}
              </div>
              <div className="hub-mgr-col">
                <div className="hub-mgr-title">În slider — trage pt. reordonare</div>
                {items.length === 0 ? (
                  <p className="hub-mgr-empty">Niciun slide încă — adaugă din bibliotecă.</p>
                ) : (
                  <div className="hub-mgr-slides">
                    {items.map((it, i) => (
                      <div
                        key={i}
                        className={"hub-mgr-slide" + (dragIdx === i ? " drag" : "") + (overIdx === i && dragIdx !== null && dragIdx !== i ? " over" : "")}
                        draggable
                        onDragStart={() => setDragIdx(i)}
                        onDragOver={(e) => { e.preventDefault(); if (overIdx !== i) setOverIdx(i); }}
                        onDrop={() => { if (dragIdx !== null && dragIdx !== i) arrayMove(manager.path, dragIdx, i); setDragIdx(null); setOverIdx(null); }}
                        onDragEnd={() => { setDragIdx(null); setOverIdx(null); }}
                      >
                        <span className="hub-mgr-num">{i + 1}</span>
                        <img src={urlOf(it)} alt="" draggable={false} />
                        <button
                          type="button"
                          className="hub-mgr-del"
                          title="Scoate poza din slider"
                          onClick={() => { if (window.confirm("Scoți poza din slider?")) arrayOp(manager.path, "remove", i); }}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
            {status && <div className="hub-mgr-status">{status}</div>}
          </div>
        </div>
      );
    })()}
    {delBtn && (
      <button
        type="button"
        className="hub-fielddel"
        title="Golește blocul (dispare de pe site; rămâne placeholder în editor)"
        style={{ top: delBtn.top, left: delBtn.left }}
        onMouseDown={(ev) => {
          ev.preventDefault();
          commit(delBtn.path, "");
          const el = document.querySelector(`[data-edit="${delBtn.path}"]`);
          if (el) el.innerText = "";
          setDelBtn(null);
        }}
      >
        ×
      </button>
    )}
    <input
      ref={multiRef}
      type="file"
      accept="image/*"
      multiple
      style={{ display: "none" }}
      onChange={(e) => { const files = [...e.target.files]; const target = multiTarget; e.target.value = ""; uploadMany(files, target); }}
    />
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
