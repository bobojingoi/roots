# ROOTS Villas — context proiect

## Ce este
Recrearea site-ului rootsvillas (Roots Villas Brașov) — două vile private în Stupini, Brașov
(Vila Redwood și Vila Sequoia), pentru grupuri de 8–10 persoane. Site React (Vite) cu
o pagină principală one-page, pagini dedicate per vilă și un panou de Admin (CMS) integrat.

## Starea actuală
- **Routing** (`react-router-dom`): `/` = landing one-page, `/vila-redwood` și `/vila-sequoia`
  = pagini dedicate. `src/App.jsx` = rutele; `src/main.jsx` montează în `<BrowserRouter>`.
- **`src/RootsVillas.jsx`** — pagina principală + CMS-ul. Exportă componentele/stilurile comune
  (`CSS`, `ICONS`, `Header`, `Footer`, `Fabs`, `Ridge`, `Embers`, `useReveal`, `useScrolled`,
  `useSiteContent`, `DEFAULT_CONTENT`, `STORAGE_KEY`) refolosite de paginile de vilă.
- **`src/VillaPage.jsx`** — pagina per vilă: hero cu poză+telefon, calendar, carusele foto
  (exterior/interior), facilități pe categorii, hartă Google (iframe), grilă politici, CTA.
  Conținutul vine din `DEFAULT_CONTENT.pages[redwood|sequoia]`.
- **`src/AvailabilityCalendar.jsx`** — calendar propriu pe 2 luni, zile ocupate hașurate,
  alimentat din `/api/availability`. Fallback pe date mock dacă API-ul nu răspunde.
- **`api/availability.js`** — funcție serverless Vercel: proxy peste Smoobu Rates API
  (`GET login.smoobu.com/api/rates`, header `Api-Key`), returnează `{ "YYYY-MM-DD": 0|1 }`.
  Cheia stă în `SMOOBU_API_KEY` (env), NU în frontend. ID-ul de apartament per vilă se
  setează din Admin (`pages.<id>.smoobuId`). `vite.config.js` are un middleware care
  servește același handler și în `npm run dev` (fără `vercel dev`).
- Conținutul real (texte, facilități, reguli, FAQ, contact) e în `DEFAULT_CONTENT`.
- Panoul de Admin (butonul „Admin", stânga-jos, doar pe `/`) editează secțiunile, inclusiv
  SEO și, la „Vilele", ID-ul Smoobu + hero-ul paginii de vilă.
- Salvarea folosește `window.storage` (shim `localStorage` în `src/main.jsx`).

## Deploy (Vercel)
- `vercel.json` = rewrites SPA (tot ce nu e `/api/*` → `index.html`).
- Setează `SMOOBU_API_KEY` în Project → Settings → Environment Variables.
- `.env` local (din `.env.example`) pentru dezvoltare; e în `.gitignore`.

## Design
Direcția: „Seară la Stupini" — apus cald, creste de brazi, jar de firepit.
- Paletă (CSS variables în constanta `CSS` din RootsVillas.jsx): `--pine` #122B22,
  `--ember` #E8722C, `--gold` #E9B872, `--ivory` #FBF7EF, `--night` #0D1B2A.
- Fonturi: Fraunces (display) + Manrope (body), via Google Fonts `@import`.
- Motion: particule de jar în hero (`Embers`), reveal la scroll (`useReveal` +
  IntersectionObserver, clasa `.rv`), hover pe carduri, `prefers-reduced-motion` respectat.
- Imaginile lipsesc (nu avem pozele clientului) — secțiunile vizuale folosesc scene SVG
  ilustrate; fiecare zonă are câmp „Imagine (URL)" în Admin care le înlocuiește.

## Pași următori probabili (de discutat cu utilizatorul)
1. Conectarea reală Smoobu: completează `SMOOBU_API_KEY` (env) și ID-urile de apartament
   per vilă (Admin → Vilele). Cât timp lipsesc, calendarul arată date demonstrative (`mock:true`).
2. Editare CMS pentru conținutul paginilor de vilă (galerii foto, facilități pe categorii,
   politici) — acum se editează din cod (`DEFAULT_CONTENT.pages`), în Admin sunt doar
   hero + ID Smoobu.
3. Flux de rezervare mai bogat: selecție interval în calendar + trimitere către Smoobu
   (booking) în loc de doar link WhatsApp.
4. Spargerea `RootsVillas.jsx` în componente separate (`components/`, `admin/`).
5. Backend real pentru CMS (înlocuirea shim-ului localStorage): API + DB. Autentificare
   pentru Admin (acum butonul e public, doar pe `/`).
6. SEO real: meta tags server-side / per-rută (SSR/SSG — ex. Next.js/Astro),
   sitemap, schema.org (LodgingBusiness), Open Graph.
7. Upload de imagini (înlocuirea scenelor SVG cu pozele clientului).

## Comenzi
- `npm install`
- `npm run dev` — dev server Vite
- `npm run build` — build de producție

## Limba
Utilizatorul comunică în română; conținutul site-ului este în română.
