// fix-legal-marketing.js — completările legale aprobate de owner (2026-07-19)
// pentru Faza 0+1 marketing: Clarity, audiențe pseudonimizate, ANSPDCP,
// transferuri extra-SEE, termene de retenție, alinierea §5 cookies la banner.
// Idempotent (guard pe „Clarity"/„ANSPDCP"); dacă o ancoră lipsește (textul a
// fost editat între timp), pagina respectivă e SĂRITĂ, nu coruptă.
// Rulare: node fix-legal-marketing.js  (din hub/, cu .env spre DB)
require('dotenv').config();
const { pool, initDb } = require('./db');

/* aplică o listă de [ancoră, înlocuire]; întoarce null dacă vreo ancoră lipsește */
function applyEdits(body, edits, pageName) {
  let out = body;
  for (const [anchor, replacement] of edits) {
    if (!out.includes(anchor)) {
      console.error(`[legal] ${pageName}: ancoră negăsită, SAR pagina: „${anchor.slice(0, 60)}…"`);
      return null;
    }
    out = out.replace(anchor, replacement);
  }
  return out;
}

const PRIVACY_EDITS = [
  // §5 — destinatari numiți explicit + transferuri extra-SEE
  ['Acești furnizori pot procesa datele doar în scopurile pentru care au fost implicați.',
   `Acești furnizori pot procesa datele doar în scopurile pentru care au fost implicați.

În funcție de instrumentele active, printre destinatari se pot număra: Google (Analytics, Ads), Meta (Facebook/Instagram), TikTok, Microsoft (Clarity), Stripe (procesarea plăților), Smoobu (gestiunea rezervărilor), Resend (trimiterea emailurilor) și furnizorul nostru de găzduire. Unii dintre acești furnizori pot prelucra date în afara Spațiului Economic European (de exemplu în SUA); în aceste cazuri, transferul se face în baza unor garanții adecvate, precum EU–U.S. Data Privacy Framework sau clauzele contractuale standard aprobate de Comisia Europeană.`],
  // secțiuni noi 6+7 inserate înaintea fostei §6 (renumerotată 8)
  ['## 6. Cât timp păstrăm datele',
   `## 6. Marketing și publicitate

Cu acordul tău explicit, exprimat prin căsuțe separate la trimiterea unei rezervări, putem: (a) să îți trimitem pe email oferte și noutăți ROOTS; și/sau (b) să folosim adresa de email și numărul de telefon, în formă pseudonimizată (transformate ireversibil printr-un algoritm de tip hash), pentru a-ți afișa ofertele noastre pe platforme precum Facebook/Instagram, Google sau TikTok (așa-numitele „audiențe personalizate").

Cele două scopuri sunt independente — poți alege oricare, ambele sau niciunul, iar refuzul nu afectează în niciun fel rezervarea. Îți poți retrage oricând acordul, pentru fiecare scop în parte, printr-un email la office@panocube.ro sau prin linkul de dezabonare din mesaje.

## 7. Analiză, atribuire și înregistrări de sesiune

Pentru a înțelege cum ajung vizitatorii la noi și cum folosesc site-ul, reținem — în baza interesului nostru legitim — sursa vizitei (de exemplu campania sau platforma din care ai ajuns pe site) și paginile parcurse, iar aceste informații pot fi asociate rezervării tale.

Cu acordul tău din bannerul de cookie-uri, folosim și Microsoft Clarity, un instrument care înregistrează în mod anonimizat interacțiunea cu paginile (derulare, click-uri); câmpurile în care introduci date personale sunt mascate și nu apar în înregistrări.

## 8. Cât timp păstrăm datele`],
  // fosta §6 (acum 8) — termene concrete
  ['Datele transmise prin formulare de contact sau conversații pot fi păstrate pentru perioada necesară gestionării solicitării și relației cu clientul.',
   `Datele transmise prin formulare de contact sau conversații pot fi păstrate pentru perioada necesară gestionării solicitării și relației cu clientul.

Ca regulă: datele rezervărilor neterminate (începute dar neplătite) se șterg după cel mult 60 de zile; cazurile care implică plăți sau restituiri se păstrează până la 1 an; datele privind sursa vizitei și parcursul pe site se păstrează cel mult 24 de luni; documentele contabile se păstrează conform termenelor legale.`],
  // fosta §7 → 9 + dreptul de plângere la ANSPDCP
  ['## 7. Drepturile tale', '## 9. Drepturile tale'],
  ['Pentru exercitarea drepturilor, ne poți contacta la:',
   `Dacă consideri că prelucrarea datelor tale încalcă legislația, ai dreptul să depui o plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP) — www.dataprotection.ro.

Pentru exercitarea drepturilor, ne poți contacta la:`],
  // dată de actualizare la final
  ['E-mail: office@panocube.ro · Telefon: 0731 700 191',
   `E-mail: office@panocube.ro · Telefon: 0731 700 191

Ultima actualizare: 19.07.2026`],
];

const COOKIES_EDITS = [
  // §3 analiză — Clarity cu mascare
  ['Exemple posibile: Google Analytics, Meta Pixel sau alte instrumente similare, dacă sunt active pe website.',
   'Exemple posibile: Google Analytics, Meta Pixel sau alte instrumente similare, dacă sunt active pe website. Tot în această categorie folosim, doar cu acordul tău, Microsoft Clarity — un instrument care înregistrează anonimizat interacțiunea cu paginile (derulare, click-uri), cu mascarea câmpurilor în care se introduc date personale.'],
  // §4 — Clarity în lista serviciilor terțe
  ['Meta/Facebook Pixel, Instagram, TikTok, YouTube, WhatsApp, Smoobu',
   'Meta/Facebook Pixel, Instagram, TikTok, Microsoft Clarity, YouTube, WhatsApp, Smoobu'],
  // §5 — aliniat la bannerul real + linkul din footer + curățarea la retragere
  ['La prima accesare a website-ului, poți accepta, refuza sau personaliza cookie-urile care nu sunt strict necesare. Poți modifica oricând preferințele de cookies din bannerul sau panoul de setări disponibil pe website.',
   'La prima accesare a website-ului, poți accepta sau refuza cookie-urile care nu sunt strict necesare, din bannerul afișat. Îți poți schimba oricând alegerea folosind linkul „Setări cookie-uri" din subsolul oricărei pagini — acesta îți resetează preferința și reafișează bannerul; la refuz sau la retragerea acordului, ștergem imediat și cookie-urile de analiză/marketing plasate anterior de pe domeniul nostru.'],
  // §6 — durate concrete
  ['în funcție de scopul pentru care sunt folosite și de setările serviciului care le plasează.',
   `în funcție de scopul pentru care sunt folosite și de setările serviciului care le plasează.

Orientativ, pentru principalele cookie-uri folosite: Google Analytics (_ga) — până la 2 ani; Meta Pixel (_fbp) — aproximativ 90 de zile; TikTok (_ttp) — aproximativ 13 luni; Microsoft Clarity (_clck — până la 1 an, _clsk — o zi). Alegerea ta din bannerul de cookie-uri se păstrează local (localStorage) până când o schimbi.`],
  ['Ultima actualizare: 09.06.2026', 'Ultima actualizare: 19.07.2026'],
];

(async () => {
  await initDb();
  const pages = [
    ['legal_privacy', PRIVACY_EDITS, 'ANSPDCP'],
    ['legal_cookies', COOKIES_EDITS, 'Clarity'],
  ];
  for (const [key, edits, guard] of pages) {
    const r = await pool.query('SELECT draft, published FROM site_content WHERE section_key = $1', [key]);
    if (!r.rows.length) { console.log(`[legal] ${key}: nu există, sar`); continue; }
    const cur = r.rows[0];
    if ((cur.published && String(cur.published.body || '').includes(guard))) {
      console.log(`[legal] ${key}: conține deja „${guard}", sar (idempotent)`);
      continue;
    }
    const patch = {};
    for (const col of ['draft', 'published']) {
      const v = cur[col];
      if (!v || !v.body) continue;
      const nb = applyEdits(String(v.body), edits, key + '.' + col);
      if (nb) patch[col] = { ...v, body: nb };
    }
    if (!patch.published) { console.log(`[legal] ${key}: nimic de aplicat (ancore lipsă)`); continue; }
    await pool.query(
      `UPDATE site_content SET draft = COALESCE($2, draft), published = COALESCE($3, published),
         published_at = now(), updated_at = now() WHERE section_key = $1`,
      [key, patch.draft ? JSON.stringify(patch.draft) : null, JSON.stringify(patch.published)]
    );
    console.log(`[legal] ${key}: actualizat (draft ${patch.draft ? 'da' : 'nu'} + published)`);
  }
  process.exit(0);
})().catch((e) => { console.error('[legal] FAIL:', e.message); process.exit(1); });
