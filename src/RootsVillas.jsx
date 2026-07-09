import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Link } from "react-router-dom";
import HubEditor, { HUB_URL, EDIT_MODE } from "./HubEditor.jsx";
import { CSS_AURORA, CSS_AURORA_LIGHT, applyTheme } from "./theme2030.js";
import { LANG, LANGS, setLang, applyLangDir, t } from "./i18n.js";
import { track } from "./tracking.js";

/* ============================================================
   ROOTS VILLAS — site + CMS
   Design: "Seară la Stupini" — apus cald, brazi, jar de firepit
   ============================================================ */

export const STORAGE_KEY = "roots_cms_v2";

/* ---- date comune paginilor de vilă (facilități, politici, hartă) ---- */
const DORM_SUB = "pat king-size pentru 2 persoane + baie proprie";
const villaFacilities = (socializare) => [
  {
    cat: "Spații de dormit",
    items: [
      { t: "Dormitor 1 · parter", s: DORM_SUB },
      { t: "Dormitor 2 · etaj", s: DORM_SUB },
      { t: "Dormitor 3 · etaj", s: DORM_SUB },
      { t: "Dormitor 4 · etaj", s: DORM_SUB },
    ],
  },
  {
    cat: "Relaxare și exterior",
    items: [
      { t: "Ciubăr pe gaz – temperatură constantă" },
      { t: "Saună privată la interior" },
      { t: "Terasă acoperită" },
      { t: "Vatră de foc + grătar cu lemne" },
      { t: "Grătar pe gaz" },
      { t: "Curte și spațiu exterior privat" },
    ],
  },
  { cat: "Socializare și distracție", items: socializare.map((t) => ({ t })) },
  {
    cat: "Confort și bucătărie",
    items: [
      { t: "Bucătărie complet utilată" },
      { t: "Cafea" },
      { t: "Mașină de spălat vase" },
      { t: "Mașină de spălat rufe" },
      { t: "Lemne de foc" },
    ],
  },
];
const VILLA_POLICIES = [
  { title: "Regulile casei", items: ["Check-in după 16:00", "Checkout înainte de 12:00", "8 adulți + 4 copii incluși în preț (extra: max 2 adulți la 150 lei/noapte și 4 copii la 75 lei/noapte)", "Ore de liniște între 22:00 și 08:00", "Acceptăm animalele de companie"] },
  { title: "Safety & Property", items: ["Camere video în exteriorul proprietății", "Alarmă pentru monoxid de carbon", "Alarmă de incendiu", "Alarmă de efracție"] },
  { title: "Politica de anulare", items: ["Anularea este gratuită până la 15 zile înainte de check-in", "Mai multe detalii în secțiunea „Întrebări frecvente”"] },
  { title: "Despre unitate", items: ["Tip proprietate: vilă privată, închiriere integrală", "Capacitate: 8 adulți + 4 copii incluși; locuri extra contra cost (pat suplimentar/canapea extensibilă)", "Dormitoare: 4 dormitoare duble", "Băi: 4 băi private", "Wellness: ciubăr privat încălzit pe gaz și saună", "Localizare: Stupini, Brașov"] },
];
/* Locația reală: Roots Villas, Str. Fântânii 46, Stupini, Brașov (45.705599, 25.574160) */
const VILLA_MAP_EMBED = "https://maps.google.com/maps?q=Roots%20Villas%2C%20Strada%20F%C3%A2nt%C3%A2nii%2046%2C%20Bra%C8%99ov&ll=45.705599,25.574160&z=15&output=embed";
const VILLA_MAPS_LINK = "https://maps.google.com/?cid=8153509057249140820"; // fișa business (recenzii, navigare)

/* ---- instrucțiuni pentru oaspeți (pagini /welcome-*) ---- */
const welcomeSections = (entertainment) => [
  {
    icon: "in",
    title: "Reguli & program",
    lines: [
      "Check-in: 16:00 – 22:00 · Check-out: până la 12:00",
      "Ore de liniște: 22:00 – 10:00",
      "Maxim 8–10 persoane",
      "Evenimentele și petrecerile se anunță și se aprobă în prealabil",
      "Animalele de companie – doar cu acord prealabil",
    ],
  },
  {
    icon: "parking",
    title: "Parcare",
    lines: [
      "Parcare gratuită în curte sau pe aleea de acces",
      "Pe alee, parchează pe partea dreaptă, ca să lași acces la vila vecină",
    ],
  },
  {
    icon: "tub",
    title: "Ciubăr",
    lines: [
      "Program de funcționare: 20:00 – 23:00",
      "Anunță-ne cu minim 4 ore înainte, ca să fie cald la timp",
      "Cele 3 butoane controlează: jeturile, bulele și lumina",
    ],
  },
  {
    icon: "fire",
    title: "Saună",
    lines: [
      "Setează temperatura dorită din meniu și apasă ON",
      "Termometrul devine roșu când sauna funcționează",
      "⚠️ Nu lăsa sauna pornită nesupravegheată",
    ],
  },
  {
    icon: "fire",
    title: "Vatră de foc & lumini exterioare",
    lines: [
      "Lemnele de foc sunt sub scările de la intrare",
      "Luminile exterioare pornesc pe senzor de mișcare",
      "Cele 4 întrerupătoare sunt în dulapul chiuvetei exterioare",
    ],
  },
  {
    icon: "key",
    title: "Bucătărie",
    lines: [
      "Espressorul funcționează doar cu boabe",
      "Tabletele pentru mașina de spălat vase sunt sub chiuvetă",
    ],
  },
  { icon: "play", title: "Divertisment", lines: entertainment },
];

/* recomandări locale (comune ambelor vile) — link-uri de navigare Waze */
const wz = (q) => `https://ul.waze.com/ul?q=${encodeURIComponent(q + ", Brașov")}&navigate=yes`;
const recNames = (names) => names.map((n) => ({ name: n, waze: wz(n) }));
const WELCOME_RECS = [
  { cat: "Cumpărături", items: recNames(["Dodo Market", "La doi pași", "Lidl"]) },
  { cat: "Tradițional", items: recNames(["Ograda", "Sergiana", "La Ceaun", "Gaura Dulce", "Calul Bălan", "Casa Tudor", "Roata Norocului", "Coliba Haiducilor – Poiana Brașov", "Stâna Turistică – Poiana Brașov"]) },
  { cat: "Restaurante italienești", items: recNames(["Dei Frati", "Bistro de l'Arte", "Trattoria del Chianti", "Don Antonio – Coresi", "Pizza Hot"]) },
  { cat: "Fine dining", items: recNames(["Casa Hirscher", "Prato", "Luther Brasserie", "Sub Tâmpa", "Ma Cocotte", "Artegianale", "Kasho Lounge", "Aha Lounge", "Millenium", "Das Fort – Râșnov"]) },
  { cat: "Burgeri", items: recNames(["Passage", "Terroir Boutique du Vin", "The Food Guys"]) },
  { cat: "Vinoteci", items: recNames(["Somelier – Centrul Vechi", "Terroir Boutique du Vin", "Ma Cocotte", "Artegianale"]) },
  { cat: "Cafenele", items: recNames(["CH9 – Centrul Vechi", "ZATZ", "Cafeteca", "NOLA – Centrul Vechi", "Shake Coffee", "Galeria Art and Coffee"]) },
  { cat: "Piscine", items: recNames(["Paradisul Acvatic", "Bielmann", "K-Tribute", "Hotel Belvedere", "Hotel Aro Palace"]) },
  { cat: "Viața de noapte", items: recNames(["Kayus Lounge", "K Tribute", "Times", "Al Camin"]) },
  { cat: "Aventură", items: [{ name: "ATV / Moto – Sorin Dumitru", tel: "0722840744" }, ...recNames(["Kowa Park & Lounge", "Aventura Park", "MasterKart", "Poiana Brașov"])] },
  { cat: "Plimbări", items: recNames(["Tâmpa", "Canionul Șapte Scări", "Masivul Postăvaru", "Promenada Nouă"]) },
];
const WELCOME_SHOP_DIRS = [
  { label: "Dodo Market", waze: "https://ul.waze.com/ul?q=Strada%20Fagurului%2032A%2C%20Stupini%2C%20Brasov%2C%20Romania&navigate=yes" },
  { label: "Lidl", waze: "https://ul.waze.com/ul?q=Bulevardul%20Grivitei%202E%2C%20500182%20Brasov%2C%20Romania&navigate=yes" },
];

export const DEFAULT_CONTENT = {
  // overlay-ul hero: de unde pornește (jos/sus/colturi/plin), cât se întinde (0–100),
  // opacitate (0–100) și culoare — editabile din Hub admin → Setări site → Logo & Brand
  brand: { logo: "", heroOverlayFrom: "jos", heroOverlayHeight: 85, heroOverlayOpacity: 80, heroOverlayColor: "#0C1F19" },
  tracking: { ga4: "", metaPixel: "", tiktokPixel: "" },
  extraReviews: [],
  seo: {
    title: "ROOTS Villas Brașov — Două vile private cu ciubăr și saună",
    description:
      "Două vile private în Stupini, Brașov, pentru grupuri de 8–10 persoane. 4 dormitoare cu baie proprie, ciubăr încălzit pe gaz, saună, firepit și spațiu exterior privat.",
    keywords:
      "vile Brașov, cazare grup Brașov, vilă cu ciubăr, vilă cu saună, Stupini, Poiana Brașov, vacanță cu prietenii",
    ogImage: "",
  },
  hero: {
    eyebrow: "Stupini · Brașov · la 10 minute de centru",
    titleA: "Tot ce îți poți imagina.",
    titleB: "Într-un singur loc.",
    subtitle:
      "Două vile private pentru grupuri de 8–10 persoane — ciubăr sub cerul liber, saună, firepit și liniștea unei seri la munte.",
    ctaPrimary: "Rezervă acum",
    ctaSecondary: "Descoperă vilele",
    image: "",
  },
  about: {
    title: "Cele două vile ROOTS",
    text1:
      "ROOTS Villas reunește două vile private în Brașov, Vila Redwood și Vila Sequoia, fiecare potrivită pentru grupuri de 8–10 persoane. Fiecare vilă are 4 dormitoare duble cu baie proprie, living, bucătărie echipată, ciubăr încălzit pe gaz, saună, firepit, grătar cu lemne și spațiu exterior privat.",
    text2:
      "Vilele sunt potrivite pentru weekenduri cu prietenii, vacanțe în familie, aniversări restrânse și escapade la munte. ROOTS Villas este situat în Stupini, Brașov, la aproximativ 10–12 minute de centrul orașului și cu acces rapid spre Poiana Brașov.",
  },
  villas: [
    {
      id: "redwood",
      name: "Vila Redwood",
      tagline: "Seri de film văzute din ciubăr",
      description:
        "Vilă privată pentru 8–10 persoane, cu 4 dormitoare duble cu baie proprie, ciubăr încălzit pe gaz, saună, firepit, masă de ping-pong și videoproiector vizibil din ciubăr.",
      features: [
        "8–10 persoane",
        "Închiriere integrală — toată vila",
        "4 dormitoare cu baie proprie",
        "Ciubăr încălzit pe gaz",
        "Zonă de foc cu grătar și lemne",
        "Ping-pong & videoproiector",
      ],
      image: "",
      accent: "ember",
    },
    {
      id: "sequoia",
      name: "Vila Sequoia",
      tagline: "Biliard, cramă și povești lungi",
      description:
        "Vilă privată pentru 8–10 persoane, cu 4 dormitoare duble cu baie proprie, ciubăr încălzit pe gaz, saună, firepit, biliard și cramă.",
      features: [
        "8–10 persoane",
        "Închiriere integrală — toată vila",
        "4 dormitoare cu baie proprie",
        "Ciubăr încălzit pe gaz",
        "Zonă de foc cu grătar și lemne",
        "Biliard & cramă",
      ],
      image: "",
      accent: "gold",
    },
  ],
  editorial: [
    {
      title: "Pentru cine este potrivit ROOTS Villas?",
      paragraphs: [
        "ROOTS Villas este potrivit pentru grupuri de prieteni, familii cu copii, aniversări restrânse și escapade de weekend în Brașov. Fiecare vilă se închiriază integral, astfel încât oaspeții au intimitate, ciubăr și saună private, plus spațiu suficient pentru socializare.",
        "Locația este mai puțin potrivită pentru evenimente mari, deoarece se respectă orele de liniște și capacitatea maximă a fiecărei vile.",
      ],
    },
    {
      title: "Ce diferențe sunt între Vila Redwood și Vila Sequoia?",
      paragraphs: [
        "Vila Redwood și Vila Sequoia au aceeași capacitate și aceleași facilități principale: 4 dormitoare duble cu baie proprie, ciubăr încălzit pe gaz, saună, firepit, grătar cu lemne, PlayStation 5, terasă și spațiu exterior privat.",
        "Vila Redwood are masă de ping-pong și videoproiector vizibil direct din ciubăr. Vila Sequoia are biliard și cramă. Alegerea depinde în principal de tipul de activități pe care grupul le preferă.",
        "În spatele celor două vile se află spațiile comune ale locației, cu teren de sport și loc de joacă pentru copii, accesibile oaspeților cazați la Roots Villas.",
      ],
    },
  ],
  common: {
    title: "Spații comune pentru ambele vile",
    text: "În spatele celor două vile am creat o zonă pentru grupurile care vor să petreacă timp împreună: loc de joacă pentru copii și teren de sport. Accesul se face pe o alee comună, iar fiecare vilă are parcare privată.",
    features: [
      "Loc de joacă pentru copii",
      "Teren de sport",
      "Parcare privată pe alee și în curte",
    ],
  },
  rules: {
    title: "Regulile casei",
    intro:
      "Pentru ca fiecare sejur să fie confortabil și bine organizat, te rugăm să consulți principalele reguli ale casei înainte de sosire.",
    items: [
      { icon: "in", text: "Check-in între 16:00 și 22:00" },
      { icon: "out", text: "Check-out înainte de 12:00" },
      { icon: "quiet", text: "Ore de liniște între 22:00 și 10:00" },
      { icon: "people", text: "Numărul maxim de persoane: 8–10" },
      { icon: "party", text: "Evenimentele sau petrecerile trebuie anunțate și aprobate în prealabil" },
      { icon: "pet", text: "Animalele de companie sunt acceptate doar cu acord în prealabil" },
    ],
  },
  video: {
    title: "Video Roots",
    text: "Vezi câteva momente de liniște surprinse la Roots, în Brașov și în Poiana Brașov.",
    youtubeUrl: "https://www.youtube.com/@rootsvillas",
    label: "Roots Teaser | 2022",
  },
  testimonials: {
    title: "Ce spun alți clienți",
    intro:
      "Înainte să alegi, e normal să vrei să știi cum s-au simțit cei care au stat deja la ROOTS.",
    rating: "4.9",
    items: [
      {
        name: "Andreea M.",
        text: "Ciubărul cald, focul de tabără și liniștea din Stupini — exact ce ne trebuia după un an lung. Ne întoarcem sigur.",
        stay: "Weekend cu prietenii · Vila Redwood",
      },
      {
        name: "Radu & familia",
        text: "Copiii nu au mai vrut să plece de la locul de joacă. Vila impecabilă, gazde extrem de atente la detalii.",
        stay: "Vacanță în familie · Vila Sequoia",
      },
      {
        name: "Ioana P.",
        text: "Am sărbătorit 30 de ani aici. Saună, biliard, cramă și un apus superb peste Brașov. Recomand din tot sufletul.",
        stay: "Aniversare · Vila Sequoia",
      },
    ],
  },
  faq: [
    { cat: "Rezervare", q: "Pot rezerva ambele vile împreună?", a: "Da, cele două vile pot fi rezervate împreună pentru grupuri mai mari, până la 20 de persoane în total. Scrie-ne pe WhatsApp pentru disponibilitate." },
    { cat: "Rezervare", q: "Trebuie achitat un avans?", a: "Da, rezervarea se confirmă cu un avans, iar diferența se achită la check-in. Detaliile exacte le primești la confirmarea rezervării." },
    { cat: "Rezervare", q: "Acceptați și 10 persoane?", a: "Da, fiecare vilă găzduiește confortabil 8–10 persoane, în 4 dormitoare duble cu baie proprie." },
    { cat: "Facilități", q: "Este inclus ciubărul în preț?", a: "Da, ciubărul încălzit pe gaz este inclus în prețul de închiriere al vilei." },
    { cat: "Facilități", q: "Ciubărul are program de funcționare?", a: "Ciubărul poate fi folosit pe toată durata sejurului, cu respectarea orelor de liniște (22:00–10:00)." },
    { cat: "Facilități", q: "Avem lemne de foc?", a: "Da, punem la dispoziție lemne de foc pentru firepit și grătar." },
    { cat: "Facilități", q: "Ce diferențe sunt între cele 2 vile ca și facilități?", a: "Redwood are ping-pong și videoproiector vizibil din ciubăr; Sequoia are biliard și cramă. Restul facilităților sunt identice." },
    { cat: "Plata", q: "Care sunt metodele de plată?", a: "Acceptăm transfer bancar, card și numerar la check-in." },
    { cat: "Plata", q: "Se poate achita cu tichete de vacanță?", a: "Da, acceptăm plata cu tichete de vacanță. Contactează-ne pentru detalii." },
    { cat: "Politica de anulare", q: "Până când pot anula gratuit?", a: "Poți anula gratuit până la termenul comunicat la rezervare. După acest termen, avansul nu se mai returnează, cu excepția condițiilor excepționale." },
    { cat: "General", q: "Vilele sunt private sau se împart cu alți oaspeți?", a: "Fiecare vilă se închiriază integral — nu împarți spațiul cu alți oaspeți." },
    { cat: "General", q: "Sunt acceptate animalele de companie?", a: "Da, dar doar cu acord în prealabil. Te rugăm să ne anunți la rezervare." },
    { cat: "General", q: "Este permis fumatul în vile?", a: "Fumatul este permis doar în exterior, pe terasă și în curte." },
    { cat: "General", q: "Oferiți reduceri pentru sejururi mai lungi?", a: "Da, pentru sejururi mai lungi oferim tarife preferențiale. Scrie-ne pentru o ofertă." },
  ],
  location: {
    title: "Unde ne aflăm",
    text: "ROOTS Villas este situat în cartierul Stupini, Brașov, la aproximativ 10–12 minute cu mașina de centrul orașului. Locația oferă acces rapid spre Poiana Brașov, Piața Sfatului și principalele atracții din Brașov, păstrând în același timp intimitatea unei zone rezidențiale.",
    mapsUrl: VILLA_MAPS_LINK,
    points: [
      { label: "Centrul Brașovului", value: "10–12 min" },
      { label: "Poiana Brașov", value: "25 min" },
      { label: "Piața Sfatului", value: "12 min" },
    ],
  },
  contact: {
    phone: "+40 731 700 191",
    email: "office@panocube.ro",
    whatsapp: "+40731700191",
    instagram: "https://instagram.com/rootsvillas",
    tiktok: "https://tiktok.com/@rootsvillas",
  },
  pages: {
    redwood: {
      heroSubtitle: "Vilă privată pentru weekenduri cu prietenii sau familia, la câteva minute de Brașov, cu ciubăr, saună și curte.",
      heroImage: "",
      phoneLabel: "Bogdan Jingoi",
      smoobuId: "506559",
      galleryExterior: [
        { img: "", caption: "Ciubăr privat pentru 8 persoane" },
        { img: "", caption: "Videoproiector vizibil din ciubăr" },
        { img: "", caption: "Vatră de foc și grătar cu lemne" },
        { img: "", caption: "Terasă acoperită și curte privată" },
      ],
      galleryInterior: [
        { img: "", caption: "Living-room cu canapea extensibilă" },
        { img: "", caption: "Play-Station 5" },
        { img: "", caption: "Masă de ping-pong" },
        { img: "", caption: "Bucătărie complet utilată" },
      ],
      facilities: villaFacilities(["Videoproiector vizibil din ciubăr", "Masă de ping-pong", "Play-Station 5", "Living și zonă de dining"]),
      policies: VILLA_POLICIES,
      mapEmbed: VILLA_MAP_EMBED,
    },
    sequoia: {
      heroSubtitle: "Vilă privată pentru grupuri de 8–10 persoane, cu ciubăr, saună, biliard și cramă, la câteva minute de Brașov.",
      heroImage: "",
      phoneLabel: "Bogdan Jingoi",
      smoobuId: "867949",
      galleryExterior: [
        { img: "", caption: "Ciubăr privat încălzit pe gaz" },
        { img: "", caption: "Saună privată la interior" },
        { img: "", caption: "Vatră de foc și grătar cu lemne" },
        { img: "", caption: "Terasă acoperită și curte privată" },
      ],
      galleryInterior: [
        { img: "", caption: "Living și zonă de dining" },
        { img: "", caption: "Masă de biliard" },
        { img: "", caption: "Cramă privată" },
        { img: "", caption: "Play-Station 5" },
      ],
      facilities: villaFacilities(["Biliard", "Cramă privată", "Play-Station 5", "Living și zonă de dining"]),
      policies: VILLA_POLICIES,
      mapEmbed: VILLA_MAP_EMBED,
    },
  },
  welcome: {
    redwood: {
      address: "Strada Fântânii 46, Brașov 500482",
      mapsUrl: VILLA_MAPS_LINK,
      wifi: { name: "", password: "" },
      keybox: "1965",
      heroImage: "",
      sections: welcomeSections([
        "Pe barul din bucătărie sunt 2 telecomenzi – cea din dreapta e pentru videoproiector",
        "PlayStation 5 în living",
        "Masă de ping-pong",
      ]),
      directions: [{ label: "Navighează la vilă", waze: wz("Strada Fântânii 46") }, ...WELCOME_SHOP_DIRS],
      recommendations: WELCOME_RECS,
    },
    sequoia: {
      address: "Stupini, Brașov",
      mapsUrl: VILLA_MAPS_LINK,
      wifi: { name: "", password: "" },
      keybox: "",
      heroImage: "",
      sections: welcomeSections([
        "Masă de biliard",
        "Cramă",
        "PlayStation 5 în living",
      ]),
      directions: [{ label: "Navighează la vilă", waze: wz("Stupini") }, ...WELCOME_SHOP_DIRS],
      recommendations: WELCOME_RECS,
    },
  },
};

/* ============ Continut din Roots Hub (CMS) ============ */
/* Adaptor: formatul sectiunilor din Hub -> formatul folosit de componente. */
export function hubToSite(h) {
  if (!h) return {};
  const out = {};
  const txt = (x) => (typeof x === "string" ? x : (x && x.text) || "");
  if (h.brand) out.brand = { ...DEFAULT_CONTENT.brand, ...h.brand };
  if (h.tracking) out.tracking = { ...DEFAULT_CONTENT.tracking, ...h.tracking };
  if (h.seo) out.seo = { ...DEFAULT_CONTENT.seo, ...h.seo };
  if (h.hero) out.hero = { ...DEFAULT_CONTENT.hero, ...h.hero };
  if (h.about) out.about = { title: h.about.title || "", text1: h.about.p1 || "", text2: h.about.p2 || "" };
  if (h.villas && Array.isArray(h.villas.items))
    out.villas = h.villas.items.map((v, i) => ({
      id: v.slug || (i === 0 ? "redwood" : "sequoia"),
      name: v.name || "",
      tagline: v.tagline || "",
      description: v.description || "",
      features: (v.features || []).map(txt),
      image: v.cover || v.image || "",
      imageMobile: v.coverMobile || "",
      gallery: v.gallery || [], // BRUT, cu găuri — indicii trebuie să corespundă draftului din Hub
      galleryMobile: v.galleryMobile || [], // paralel cu gallery (variantele de mobil)
      accent: i === 0 ? "ember" : "gold",
    }));
  if (h.editorial && Array.isArray(h.editorial.blocks))
    out.editorial = h.editorial.blocks.map((b) => ({ title: b.title || "", paragraphs: (b.paragraphs || []).map(txt) }));
  if (h.common) out.common = h.common;
  if (h.rules) out.rules = h.rules;
  if (h.testimonials) out.testimonials = h.testimonials;
  if (h.reviews) out.reviews = h.reviews; // setările din admin → Recenzii (minRating, hidden…)
  if (h.extra_reviews) out.extraReviews = h.extra_reviews.items || [];
  if (h.video) out.video = h.video;
  if (h.faq && Array.isArray(h.faq.items)) out.faq = h.faq.items;
  if (h.location) out.location = h.location;
  if (h.contact) out.contact = { ...DEFAULT_CONTENT.contact, ...h.contact };
  if (h.ui) out.ui = h.ui;
  const pages = {};
  if (h.villa_redwood) pages.redwood = h.villa_redwood;
  if (h.villa_sequoia) pages.sequoia = h.villa_sequoia;
  if (Object.keys(pages).length) out.pages = { ...DEFAULT_CONTENT.pages, ...pages };
  const mapW = (w) => ({ ...w, wifi: { name: w.wifiName || "", password: w.wifiPassword || "" } });
  const wl = {};
  if (h.welcome_redwood) wl.redwood = mapW(h.welcome_redwood);
  if (h.welcome_sequoia) wl.sequoia = mapW(h.welcome_sequoia);
  if (Object.keys(wl).length) out.welcome = { ...DEFAULT_CONTENT.welcome, ...wl };
  return out;
}

/* In modul editare citim DRAFTURILE (cu token); altfel continutul publicat. */
export async function loadHubRaw() {
  if (EDIT_MODE) {
    try {
      const tok = (window.location.hash.match(/hubtok=([^&]+)/) || [])[1] || "";
      const r = await fetch(HUB_URL + "/api/v1/sections", { headers: { Authorization: "Bearer " + tok } });
      if (r.ok) {
        const j = await r.json();
        const raw = {};
        for (const sct of j.sections) raw[sct.section_key] = sct.draft;
        return raw;
      }
    } catch (e) { /* cadem pe published */ }
  }
  const r = await fetch(HUB_URL + "/api/v1/site-content");
  const j = await r.json();
  return mergeLang(j.content || {});
}

/* pentru limbile non-RO, secțiunea tradusă acoperă originalul CÂMP CU CÂMP:
   câmpurile care nu există în traducere (ex. galerii sau imagini adăugate după
   generarea traducerilor) cad pe valoarea de bază — media nu rămâne „înghețată" */
function deepLang(base, over) {
  if (over === undefined) return base;
  if (Array.isArray(over)) {
    if (!Array.isArray(base)) return over;
    return over.map((item, i) => deepLang(base[i], item));
  }
  if (over && typeof over === "object") {
    const isObj = base && typeof base === "object" && !Array.isArray(base);
    const out = {};
    for (const k of new Set([...Object.keys(isObj ? base : {}), ...Object.keys(over)])) {
      out[k] = deepLang(isObj ? base[k] : undefined, over[k]);
    }
    return out;
  }
  return over;
}
function mergeLang(content) {
  if (LANG === "ro") return content;
  const out = {};
  for (const [k, v] of Object.entries(content)) {
    if (k.includes("@")) continue;
    const tr = content[k + "@" + LANG];
    out[k] = tr ? deepLang(v, tr) : v;
  }
  return out;
}

/* ---------- ICONS (inline, un singur stil de linie) ---------- */
export const Ic = ({ d, size = 22, sw = 1.6 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {d}
  </svg>
);
export const ICONS = {
  people: <Ic d={<><circle cx="9" cy="8" r="3.2" /><path d="M3.5 19c.6-3.2 2.9-5 5.5-5s4.9 1.8 5.5 5" /><circle cx="17" cy="9.5" r="2.4" /><path d="M15.5 14.4c2.3.3 4 1.8 4.6 4.3" /></>} />,
  key: <Ic d={<><circle cx="8" cy="14" r="4" /><path d="M11 11 20 3.5M16 7l3 3M13.5 9.5l2 2" /></>} />,
  bed: <Ic d={<><path d="M3 18v-7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v7" /><path d="M3 15h18M3 18v1.5M21 18v1.5M6.5 9V7.5a1.5 1.5 0 0 1 1.5-1.5h8a1.5 1.5 0 0 1 1.5 1.5V9" /></>} />,
  tub: <Ic d={<><path d="M4 12h16v3a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4v-3Z" /><path d="M7 9c0-1 .8-1.4.8-2.4S7 5.2 7 4.2M11 9c0-1 .8-1.4.8-2.4S11 5.2 11 4.2M15 9c0-1 .8-1.4.8-2.4S15 5.2 15 4.2" /></>} />,
  fire: <Ic d={<><path d="M12 21c-3.6 0-6-2.3-6-5.4 0-2.6 1.7-4.3 3-6 .5 1.2 1.2 1.8 2 2.2-.3-2.6.6-5.6 3-7.8-.2 2.2.5 3.4 1.8 4.9 1.3 1.5 2.2 3 2.2 5.1 0 4-2.4 7-6 7Z" /></>} />,
  in: <Ic d={<><path d="M10 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h4" /><path d="M14 12H21M18 9l3 3-3 3" /></>} />,
  out: <Ic d={<><path d="M14 4h4a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-4" /><path d="M3 12h7M7 9l-3 3 3 3" /></>} />,
  quiet: <Ic d={<><path d="M4 9v6h3l4 4V5L7 9H4Z" /><path d="M16 9l5 6M21 9l-5 6" /></>} />,
  party: <Ic d={<><path d="M5 21 8.5 9.5 14.5 15.5 3 19" /><path d="M14 3l.6 2 2 .6-2 .6-.6 2-.6-2-2-.6 2-.6.6-2ZM19.5 9.5l.4 1.4 1.4.4-1.4.4-.4 1.4-.4-1.4-1.4-.4 1.4-.4.4-1.4Z" /></>} />,
  pet: <Ic d={<><circle cx="7" cy="9" r="1.6" /><circle cx="12" cy="7" r="1.6" /><circle cx="17" cy="9" r="1.6" /><path d="M12 12c-2.8 0-5 2.2-4.4 4.6.4 1.6 2 2.4 4.4 2.4s4-.8 4.4-2.4C17 14.2 14.8 12 12 12Z" /></>} />,
  play: <Ic d={<><path d="M4 18h4l3-9 3 9h4" /><path d="M8 18v2M16 18v2M12 6V4M9.5 6.5 8 5M14.5 6.5 16 5" /></>} />,
  sport: <Ic d={<><circle cx="12" cy="12" r="8.5" /><path d="M12 3.5v17M3.5 12h17" /><path d="M6 5.5c1.6 1.8 2.6 4 2.6 6.5S7.6 16.7 6 18.5M18 5.5c-1.6 1.8-2.6 4-2.6 6.5s1 4.7 2.6 6.5" /></>} />,
  parking: <Ic d={<><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M9.5 16.5V7.5H13a2.7 2.7 0 1 1 0 5.4H9.5" /></>} />,
  pin: <Ic d={<><path d="M12 21s-6.5-5.4-6.5-10.4A6.5 6.5 0 0 1 12 4a6.5 6.5 0 0 1 6.5 6.6C18.5 15.6 12 21 12 21Z" /><circle cx="12" cy="10.5" r="2.3" /></>} />,
  phone: <Ic d={<path d="M5 4h4l1.5 4.5L8 10a13 13 0 0 0 6 6l1.5-2.5L20 15v4a1.5 1.5 0 0 1-1.7 1.5C10.5 19.6 4.4 13.5 3.5 5.7A1.5 1.5 0 0 1 5 4Z" />} />,
  mail: <Ic d={<><rect x="3" y="5.5" width="18" height="13" rx="2.5" /><path d="m4 7.5 8 6 8-6" /></>} />,
  star: <Ic size={16} sw={0} d={<path fill="currentColor" d="M12 2.8 14.6 8.3 20.6 9.1 16.2 13.3 17.3 19.3 12 16.4 6.7 19.3 7.8 13.3 3.4 9.1 9.4 8.3Z" />} />,
  arrow: <Ic size={18} d={<path d="M4 12h15M13.5 6.5 19 12l-5.5 5.5" />} />,
  chev: <Ic size={18} d={<path d="m6 9 6 6 6-6" />} />,
  wa: <Ic d={<><path d="M12 3.5a8.5 8.5 0 0 0-7.3 12.8L3.5 20.5l4.3-1.1A8.5 8.5 0 1 0 12 3.5Z" /><path d="M9 8.8c.4-.9 1-.9 1.3-.2l.5 1.1c.1.3 0 .6-.2.9l-.4.5c.5 1 1.6 2 2.6 2.5l.6-.5c.2-.2.6-.3.8-.1l1.1.6c.6.3.5 1-.3 1.4-2.9 1.5-7.4-3-6-6.2Z" /></>} />,
  edit: <Ic size={18} d={<><path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3Z" /><path d="m14.5 7.5 3 3" /></>} />,
  save: <Ic size={18} d={<><path d="M5 4h11l3.5 3.5V19a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z" /><path d="M8 4v5h7V4M8 20v-6h8v6" /></>} />,
  x: <Ic size={18} d={<path d="M6 6l12 12M18 6 6 18" />} />,
  plus: <Ic size={16} d={<path d="M12 5v14M5 12h14" />} />,
  trash: <Ic size={16} d={<><path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6.5 7l1 12a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1l1-12" /></>} />,
  eye: <Ic size={18} d={<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.8" /></>} />,
  ig: <Ic size={18} d={<><rect x="4" y="4" width="16" height="16" rx="4.5" /><circle cx="12" cy="12" r="3.6" /><circle cx="16.8" cy="7.2" r=".9" /></>} />,
  seo: <Ic size={18} d={<><circle cx="10.5" cy="10.5" r="6" /><path d="m15 15 5.5 5.5" /><path d="M8 10.5h5M10.5 8v5" /></>} />,
};

const FEATURE_ICON_ORDER = ["people", "key", "bed", "tub", "fire", "play"];
const COMMON_ICON_ORDER = ["play", "sport", "parking"];

/* ============================ STYLES ============================ */
export const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Manrope:wght@400;500;600;700;800&display=swap');

:root{
  --pine:#122B22; --pine-2:#1B4033; --pine-3:#0C1F19;
  --ember:#E8722C; --ember-2:#F08A3C; --gold:#E9B872;
  --ivory:#FBF7EF; --sand:#F2EADC; --ink:#1E2A24; --ink-soft:#5A6A61;
  --night:#0D1B2A; --line:rgba(30,42,36,.12);
  --r:22px;
}
*{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
.roots{font-family:'Manrope',sans-serif;color:var(--ink);background:var(--ivory);-webkit-font-smoothing:antialiased;overflow-x:hidden}
/* blocurile CMS golite din editor dispar de pe site (și butoanele/containerele
   care le conțin — reguli separate, ca un browser fără :has să nu le arunce pe toate) */
.roots [data-edit]:empty{display:none}
.roots a:has(>[data-edit]:empty){display:none}
.roots button:has(>[data-edit]:empty){display:none}
.roots .feat:has(>span[data-edit]:empty){display:none}
.roots .pill:has(>span[data-edit]:empty){display:none}
.roots .rule:has(>p[data-edit]:empty){display:none}
.roots .fac-item:has(b[data-edit]:empty){display:none}
.roots .faq-item:has(.faq-q>span[data-edit]:empty){display:none}
.roots .loc-point:has(>span[data-edit]:empty){display:none}
/* imagini separate desktop / mobil: două elemente, câte unul vizibil per breakpoint */
.pic-desk{display:block}
.pic-mob{display:none}
@media(max-width:760px){.pic-desk{display:none}.pic-mob{display:block}}
.roots ::selection{background:var(--ember);color:#fff}
.serif{font-family:'Fraunces',serif}
.wrap{max-width:1120px;margin:0 auto;padding:0 22px}
section{position:relative}

/* ---- reveal ---- */
.rv{opacity:0;transform:translateY(26px);transition:opacity .9s cubic-bezier(.2,.7,.2,1),transform .9s cubic-bezier(.2,.7,.2,1)}
.rv.on{opacity:1;transform:none}
.rv-d1{transition-delay:.12s}.rv-d2{transition-delay:.24s}.rv-d3{transition-delay:.36s}

/* ---- header ---- */
.hdr{position:fixed;inset:0 0 auto 0;z-index:60;transition:background .4s,box-shadow .4s,backdrop-filter .4s;padding:18px 0}
.hdr.solid{background:rgba(251,247,239,.86);backdrop-filter:blur(14px);box-shadow:0 1px 0 var(--line);padding:12px 0}
.hdr .wrap{display:flex;align-items:center;justify-content:space-between}
.logo{font-family:'Fraunces',serif;font-weight:600;font-size:24px;letter-spacing:.14em;color:#fff;text-decoration:none;display:flex;align-items:center;gap:10px;transition:color .4s}
.hdr.solid .logo{color:var(--pine)}
.logo-ring{width:30px;height:30px;border-radius:50%;border:1.5px solid currentColor;display:grid;place-items:center;font-size:13px;letter-spacing:0}
.logo-txt{display:inline-flex;align-items:center;gap:10px}
.logo-img{height:38px;width:auto;max-width:180px;object-fit:contain;display:block}
.foot .logo-img{max-width:160px}
@media(max-width:760px){.logo-img{height:32px;max-width:150px}}
.nav{display:flex;gap:26px;align-items:center}
.nav a{color:rgba(255,255,255,.85);text-decoration:none;font-size:14.5px;font-weight:600;transition:color .3s}
.hdr.solid .nav a{color:var(--ink-soft)}
.nav a:hover{color:var(--ember-2)}
.nav .cta{color:#fff;background:var(--ember);padding:10px 20px;border-radius:100px;box-shadow:0 6px 18px rgba(232,114,44,.35)}
.nav .cta:hover{color:#fff;background:var(--ember-2);transform:translateY(-1px)}
@media(max-width:760px){.nav a:not(.cta){display:none}.nav:has(.burger) .cta{display:none}.nav .cta{padding:9px 16px;font-size:13.5px}}
/* language dropdown (flag) */
.langdd{position:relative}
.langdd-btn{display:flex;align-items:center;gap:6px;border:1.5px solid rgba(255,255,255,.3);background:none;color:rgba(255,255,255,.9);border-radius:9px;padding:6px 9px;cursor:pointer;transition:border-color .25s,background .25s}
.hdr.solid .langdd-btn{border-color:var(--line);color:var(--ink)}
.langdd-btn:hover{border-color:var(--ember)}
.langdd-flag{width:24px;height:17px;border-radius:4px;overflow:hidden;display:grid;place-items:center;flex-shrink:0}
.langdd-flag svg{width:100%;height:100%;display:block;object-fit:cover}
.langdd-chev{opacity:.7;transition:transform .25s}
.langdd.open .langdd-chev{transform:rotate(180deg)}
.langdd-menu{position:absolute;top:calc(100% + 8px);right:0;min-width:158px;background:#fff;border:1px solid var(--line);border-radius:12px;box-shadow:0 18px 44px rgba(12,31,25,.18);padding:6px;z-index:90;animation:langpop .18s ease}
[dir="rtl"] .langdd-menu{right:auto;left:0}
@keyframes langpop{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:none}}
.langdd-item{display:flex;align-items:center;gap:10px;width:100%;background:none;border:none;padding:9px 10px;border-radius:8px;cursor:pointer;font:600 14px 'Manrope',sans-serif;color:var(--ink);text-align:left;transition:background .2s}
.langdd-item:hover{background:var(--sand)}
.langdd-item.on{background:rgba(232,114,44,.12);color:var(--ember)}
.langdd-item .langdd-flag{width:26px;height:19px}
.langdd-name{white-space:nowrap}
[dir="rtl"] .hero h1,[dir="rtl"] .sec h2,[dir="rtl"] .lede{text-align:right}
[dir="rtl"] .eyebrow::before{display:none}
.burger{display:none;width:42px;height:42px;border-radius:10px;border:1.5px solid rgba(255,255,255,.4);background:none;color:#fff;font-size:19px;cursor:pointer;flex-shrink:0}
.hdr.solid .burger{border-color:var(--line);color:var(--pine)}
@media(max-width:760px){.burger{display:grid;place-items:center}}
.mnav{position:fixed;inset:0;z-index:80;background:rgba(12,31,25,.97);display:flex;flex-direction:column;align-items:center;justify-content:center;gap:24px}
.mnav a{color:#fff;font-size:21px;font-weight:600;text-decoration:none;font-family:'Fraunces',serif}
.mnav a.cta{background:var(--ember);padding:14px 34px;border-radius:100px;font-family:'Manrope',sans-serif;font-size:16px;font-weight:700}
.mnav .close{position:absolute;top:20px;right:22px;background:none;border:none;color:#fff;font-size:34px;cursor:pointer;line-height:1}

/* ---- hero: scena de seară ---- */
.hero{min-height:100svh;display:flex;align-items:flex-end;color:#fff;overflow:hidden;
  background:linear-gradient(180deg,#0B1626 0%,#152B3D 30%,#3D4A56 52%,#8A5A46 68%,#C4713C 80%,#E88940 92%)}
.hero-photo{position:absolute;inset:0;background-size:cover;background-position:center}
.hero-veil{position:absolute;inset:0} /* fundalul vine inline, din setările Logo & Brand (admin) */
.ridge{position:absolute;left:0;right:0;pointer-events:none}
.ridge svg{display:block;width:100%;height:auto}
.ridge-far{bottom:120px;opacity:.5}
.ridge-near{bottom:0}
.hero-inner{position:relative;z-index:3;width:100%;padding:0 22px 96px}
.hero-eyebrow{display:inline-flex;align-items:center;gap:10px;font-size:13px;font-weight:700;letter-spacing:.18em;text-transform:uppercase;color:var(--gold);margin-bottom:22px}
.hero-eyebrow::before{content:"";width:34px;height:1px;background:var(--gold)}
.hero h1{font-family:'Fraunces',serif;font-weight:500;font-size:clamp(42px,7.2vw,84px);line-height:1.04;letter-spacing:-.015em;max-width:13ch}
.hero h1 .warm{color:var(--gold);font-style:italic}
.hero-sub{margin-top:22px;max-width:52ch;font-size:clamp(15px,1.6vw,18px);line-height:1.65;color:rgba(255,255,255,.82)}
.hero-ctas{margin-top:34px;display:flex;gap:14px;flex-wrap:wrap}
.h1-line{display:block;overflow:hidden}
.h1-line span{display:block;transform:translateY(110%);animation:rise 1.1s cubic-bezier(.2,.7,.2,1) forwards}
.h1-line:nth-child(2) span{animation-delay:.14s}
.fade-up{opacity:0;animation:fadeUp 1s .5s cubic-bezier(.2,.7,.2,1) forwards}
.fade-up.d2{animation-delay:.7s}
@keyframes rise{to{transform:none}}
@keyframes fadeUp{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:none}}
@keyframes drip{0%{opacity:0;transform:translateY(0)}30%{opacity:1}100%{opacity:0;transform:translateY(12px)}}

/* embers */
.embers{position:absolute;inset:0;z-index:2;pointer-events:none;overflow:hidden}
.ember{position:absolute;bottom:-8px;border-radius:50%;background:radial-gradient(circle,#FFD9A0 0%,#F08A3C 55%,transparent 75%);animation:float linear infinite;opacity:0}
@keyframes float{
  0%{opacity:0;transform:translate(0,0) scale(1)}
  8%{opacity:.9}
  60%{opacity:.6}
  100%{opacity:0;transform:translate(var(--dx),-92vh) scale(.4)}
}
.fireglow{position:absolute;bottom:-140px;left:50%;transform:translateX(-50%);width:640px;height:340px;border-radius:50%;z-index:1;
  background:radial-gradient(ellipse at center,rgba(240,138,60,.5),rgba(240,138,60,.14) 45%,transparent 70%);
  animation:breathe 5.5s ease-in-out infinite}
@keyframes breathe{0%,100%{opacity:.75;transform:translateX(-50%) scale(1)}50%{opacity:1;transform:translateX(-50%) scale(1.07)}}

/* buttons */
.btn{display:inline-flex;align-items:center;gap:10px;padding:15px 30px;border-radius:100px;font-weight:700;font-size:15px;text-decoration:none;cursor:pointer;border:none;transition:transform .25s,box-shadow .25s,background .25s;font-family:inherit}
.btn-ember{background:var(--ember);color:#fff;box-shadow:0 10px 26px rgba(232,114,44,.4)}
.btn-ember:hover{background:var(--ember-2);transform:translateY(-2px);box-shadow:0 14px 32px rgba(232,114,44,.5)}
.btn-ghost{background:rgba(255,255,255,.1);color:#fff;border:1.5px solid rgba(255,255,255,.35);backdrop-filter:blur(6px)}
.btn-ghost:hover{background:rgba(255,255,255,.2);transform:translateY(-2px)}
.btn-pine{background:var(--pine);color:var(--ivory)}
.btn-pine:hover{background:var(--pine-2);transform:translateY(-2px)}
.btn svg{transition:transform .25s}
.btn:hover svg{transform:translateX(3px)}

/* section scaffolding */
.sec{padding:72px 0}
@media(max-width:760px){.sec{padding:50px 0}}
.eyebrow{display:inline-flex;align-items:center;gap:10px;font-size:12.5px;font-weight:800;letter-spacing:.2em;text-transform:uppercase;color:var(--ember);margin-bottom:16px}
.eyebrow::before{content:"";width:28px;height:1px;background:var(--ember)}
.sec h2{font-family:'Fraunces',serif;font-weight:500;font-size:clamp(30px,4.4vw,50px);line-height:1.12;letter-spacing:-.01em;color:var(--pine)}
.lede{margin-top:20px;font-size:17px;line-height:1.75;color:var(--ink-soft);max-width:62ch}

/* roots divider */
.root-divider{height:70px;display:flex;justify-content:center;opacity:.5}
.root-divider svg{height:100%;width:auto}

/* about */
.about-grid{display:grid;grid-template-columns:1.05fr .95fr;gap:64px;align-items:start}
@media(max-width:860px){.about-grid{grid-template-columns:1fr;gap:36px}}
.stat-row{display:flex;gap:0;margin-top:44px;border-top:1px solid var(--line)}
.stat{flex:1;padding:22px 18px 0;border-left:1px solid var(--line)}
/* pe mobil 4 coloane nu încap — trecem pe grilă 2×2 */
@media(max-width:560px){
  .stat-row{display:grid;grid-template-columns:1fr 1fr;border-top:0}
  .stat{border-top:1px solid var(--line);padding:16px 12px 0}
  .stat:nth-child(odd){border-left:0;padding-left:0}
  .stat b{font-size:28px!important}
}
.stat:first-child{border-left:none;padding-left:0}
.stat b{display:block;font-family:'Fraunces',serif;font-weight:500;font-size:34px;color:var(--pine)}
.stat span{font-size:13px;font-weight:600;color:var(--ink-soft);letter-spacing:.04em}

/* villa cards */
.villas-band{background:var(--pine);color:var(--ivory);border-radius:44px;margin:0 14px;padding:74px 0}
@media(max-width:760px){.villas-band{padding:52px 0;border-radius:30px}}
.villas-band .eyebrow{color:var(--gold)}.villas-band .eyebrow::before{background:var(--gold)}
.villas-band h2{color:var(--ivory)}
.villas-band .lede{color:rgba(251,247,239,.72)}
.villa-grid{display:grid;grid-template-columns:1fr 1fr;gap:26px;margin-top:56px}
@media(max-width:860px){.villa-grid{grid-template-columns:1fr}}
.vcard{background:rgba(251,247,239,.05);border:1px solid rgba(251,247,239,.12);border-radius:var(--r);overflow:hidden;transition:transform .45s cubic-bezier(.2,.7,.2,1),box-shadow .45s,border-color .45s}
.vcard:hover{transform:translateY(-8px);border-color:rgba(233,184,114,.4);box-shadow:0 30px 60px rgba(0,0,0,.35)}
.vcard-media{height:340px;position:relative;overflow:hidden;background:linear-gradient(160deg,#1B4033,#0C1F19)}
@media(max-width:760px){.vcard-media{height:260px}}
.vcard-media .ph{position:absolute;inset:0;background-size:cover;background-position:center;transition:transform 1.2s cubic-bezier(.2,.7,.2,1)}
.vcard:hover .vcard-media .ph{transform:scale(1.06)}
/* slider în cardul vilei */
.vslides{position:absolute;inset:0;display:flex;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;-webkit-overflow-scrolling:touch}
.vslides::-webkit-scrollbar{display:none}
.vslide{flex:0 0 100%;scroll-snap-align:center;position:relative}
.vslide-bg{position:absolute;inset:0;background-size:cover;background-position:center}
.vs-arr{position:absolute;top:50%;transform:translateY(-50%);z-index:3;width:38px;height:38px;border-radius:50%;border:none;background:rgba(12,31,25,.55);color:#fff;font-size:20px;line-height:1;cursor:pointer;backdrop-filter:blur(6px);display:grid;place-items:center;transition:background .2s}
.vs-arr:hover{background:rgba(12,31,25,.85)}
.vs-arr.left{left:12px}.vs-arr.right{right:12px}
.vs-dots{position:absolute;bottom:12px;left:50%;transform:translateX(-50%);z-index:3;display:flex;gap:6px}
.vs-dots span{width:7px;height:7px;border-radius:50%;background:rgba(255,255,255,.45);transition:background .2s}
.vs-dots span.on{background:var(--gold)}
.vs-add{position:absolute;bottom:12px;right:12px;z-index:4;border:none;border-radius:100px;padding:8px 14px;background:#157a55;color:#fff;font:700 12px 'Manrope',sans-serif;cursor:pointer}
.vs-add.multi{bottom:52px;background:#0e5e40}
.pic-mob-btn{position:absolute;bottom:12px;left:12px;z-index:4;border:none;border-radius:100px;padding:8px 14px;background:#157a55;color:#fff;font:700 12px 'Manrope',sans-serif;cursor:pointer}
.vcard-media .glow{position:absolute;bottom:-70px;left:50%;transform:translateX(-50%);width:320px;height:170px;border-radius:50%;background:radial-gradient(ellipse,rgba(240,138,60,.55),transparent 70%)}
.vcard-tag{position:absolute;top:16px;left:16px;background:rgba(12,31,25,.6);backdrop-filter:blur(8px);border:1px solid rgba(233,184,114,.35);color:var(--gold);font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;padding:7px 14px;border-radius:100px}
.vcard-body{padding:30px 30px 34px}
.vcard h3{font-family:'Fraunces',serif;font-weight:500;font-size:30px;margin-bottom:6px}
.vcard .tagline{color:var(--gold);font-size:14px;font-weight:600;font-style:italic;font-family:'Fraunces',serif}
.vcard p.desc{margin-top:14px;font-size:14.5px;line-height:1.7;color:rgba(251,247,239,.72)}
.feat-list{margin-top:22px;display:grid;gap:0}
.feat{display:flex;gap:14px;align-items:center;padding:13px 0;border-top:1px solid rgba(251,247,239,.1);font-size:14.5px;font-weight:600;color:rgba(251,247,239,.9)}
.feat svg{color:var(--gold);flex-shrink:0}
.vcard-ctas{margin-top:26px;display:flex;gap:12px;flex-wrap:wrap}
.vcard-ctas .btn{padding:12px 24px;font-size:14px}
.btn-outline-ivory{background:transparent;color:var(--ivory);border:1.5px solid rgba(251,247,239,.35)}
.btn-outline-ivory:hover{border-color:var(--gold);color:var(--gold);transform:translateY(-2px)}

/* editorial */
.edit-grid{display:grid;grid-template-columns:1fr 1fr;gap:64px;margin-top:10px}
@media(max-width:860px){.edit-grid{grid-template-columns:1fr;gap:44px}}
.edit-block h3{font-family:'Fraunces',serif;font-weight:500;font-size:26px;line-height:1.25;color:var(--pine);margin-bottom:18px}
.edit-block p{font-size:15.5px;line-height:1.78;color:var(--ink-soft)}
.edit-block p+p{margin-top:14px}

/* common spaces */
.common{background:var(--sand);border-radius:44px;margin:0 14px;padding:70px 0}
@media(max-width:760px){.common{padding:50px 0;border-radius:30px}}
.common-grid{display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center}
@media(max-width:860px){.common-grid{grid-template-columns:1fr;gap:36px}}
.pill-list{margin-top:30px;display:grid;gap:14px}
.pill{display:flex;align-items:center;gap:16px;background:var(--ivory);border:1px solid var(--line);border-radius:16px;padding:17px 20px;font-weight:700;font-size:15px;color:var(--pine);transition:transform .3s,box-shadow .3s}
.pill:hover{transform:translateX(6px);box-shadow:0 10px 24px rgba(30,42,36,.08)}
.pill svg{color:var(--ember)}
.common-art{border-radius:var(--r);overflow:hidden;aspect-ratio:4/4.4;background:linear-gradient(160deg,#26543F,#122B22);position:relative}
.common-art .sun{position:absolute;top:14%;right:16%;width:80px;height:80px;border-radius:50%;background:radial-gradient(circle,#FFE1AE,#E9B872 60%,transparent 72%);animation:breathe 6s ease-in-out infinite}
.common-art .ph{position:absolute;inset:0;background-size:cover;background-position:center}

/* rules */
.rules-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:52px}
@media(max-width:900px){.rules-grid{grid-template-columns:repeat(2,1fr)}}
@media(max-width:600px){.rules-grid{grid-template-columns:1fr}}
.rule{background:#fff;border:1px solid var(--line);border-radius:18px;padding:26px 24px;display:flex;flex-direction:column;gap:14px;transition:transform .3s,box-shadow .3s,border-color .3s}
.rule:hover{transform:translateY(-4px);box-shadow:0 16px 34px rgba(30,42,36,.09);border-color:rgba(232,114,44,.35)}
.rule .icon{width:44px;height:44px;border-radius:12px;background:var(--sand);display:grid;place-items:center;color:var(--ember)}
.rule p{font-size:14.5px;font-weight:600;line-height:1.55;color:var(--ink)}

/* testimonials — „Trust Wall": score card + zid masonry de recenzii */
.testi-band{background:radial-gradient(130% 100% at 85% -20%,#14304A 0%,var(--night) 58%);color:#fff;border-radius:44px;margin:0 14px;padding:56px 0 48px;overflow:hidden;position:relative}
@media(max-width:760px){.testi-band{padding:44px 0 36px;border-radius:30px}}
.testi-band .eyebrow{color:var(--gold)}.testi-band .eyebrow::before{background:var(--gold)}
.testi-band h2{color:#fff}
.testi-band .lede{color:rgba(255,255,255,.65)}
.testi-head{display:flex;justify-content:space-between;align-items:flex-end;gap:30px;flex-wrap:wrap}
/* stiva de avatare din header — semnal social la nivel de scanare */
.ava-stack{display:flex;flex-direction:column;align-items:flex-end;gap:8px}
.ava-row{display:flex;padding-inline-start:10px}
.ava-row img,.ava-row .plus{width:34px;height:34px;border-radius:50%;border:2px solid rgba(13,27,42,.8);margin-inline-start:-10px;object-fit:cover}
.ava-row .plus{display:grid;place-items:center;background:rgba(233,184,114,.25);color:var(--gold);font:800 11px 'Manrope',sans-serif}
.ava-stack small{font-size:12.5px;font-weight:700;color:rgba(255,255,255,.6)}
.ava-stack small b{color:var(--gold)}
/* filtrul pe naționalități */
.testi-filter{display:flex;gap:8px;flex-wrap:wrap;margin-top:26px}
.testi-filter button{border:1.5px solid rgba(255,255,255,.22);background:none;color:rgba(255,255,255,.78);border-radius:100px;padding:8px 16px;font:700 13px 'Manrope',sans-serif;cursor:pointer;transition:all .2s}
.testi-filter button:hover{border-color:rgba(233,184,114,.55)}
.testi-filter button.on{background:var(--gold);border-color:var(--gold);color:var(--night)}
.testi-note{margin-top:16px;font-size:13.5px;color:rgba(255,255,255,.6)}
/* zidul masonry — absoarbe orice lungimi de text, zero găuri, zero orfani */
.testi-wall{columns:2 340px;column-gap:18px;margin-top:38px}
.testi-filter+.testi-wall{margin-top:24px}
.testi-wall>*{display:inline-block;width:100%;break-inside:avoid;margin:0 0 18px;vertical-align:top}
/* score card — ancora de încredere, prima placă a zidului */
.score-card{background:linear-gradient(160deg,rgba(233,184,114,.16),rgba(233,184,114,.03));border:1px solid rgba(233,184,114,.45);border-radius:26px;padding:32px 28px;text-align:center}
.score-card .num{display:block;font:500 74px/1 'Fraunces',serif;color:var(--gold)}
.score-card .num small{font-size:22px;color:rgba(255,255,255,.4);margin-inline-start:4px}
.score-card .verdict{font:600 19px 'Fraunces',serif;color:#fff;margin-top:10px}
.stars-fill{position:relative;display:inline-flex;gap:3px;margin-top:12px;color:rgba(255,255,255,.22)}
.stars-fill .st{display:inline-flex;opacity:0;transition:opacity .4s ease calc(var(--i,0)*70ms)}
.rv.on .stars-fill .st{opacity:1}
.stars-fill .fill{position:absolute;inset:0;inset-inline-start:0;width:0;overflow:hidden;white-space:nowrap;display:inline-flex;gap:3px;color:var(--gold);transition:width .7s ease .35s}
.rv.on .stars-fill .fill{width:var(--pct)}
.g-chip{display:inline-flex;align-items:center;gap:8px;background:#fff;color:#3C4043;border-radius:100px;padding:7px 14px;font:700 12.5px 'Manrope',sans-serif;margin-top:16px}
.score-cta{display:inline-flex;align-items:center;margin-top:14px;padding:12px 22px;border-radius:100px;background:var(--gold);color:var(--night);font:800 14px 'Manrope',sans-serif;text-decoration:none;transition:transform .25s,box-shadow .25s}
.score-cta:hover{transform:translateY(-2px);box-shadow:0 12px 30px rgba(233,184,114,.3)}
.score-note{margin-top:12px;font-size:12px;color:rgba(255,255,255,.55);font-weight:600}
/* cardul de recenzie — reveal doar prin fade (transform-ul rămâne al hover-ului),
   cu delay-urile de stagger declarate longhand ca să nu fie resetate de shorthand */
.tcard{position:relative;background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.12);border-radius:22px;padding:24px;transition:transform .35s,border-color .35s,opacity .9s cubic-bezier(.2,.7,.2,1)}
.tcard.rv{transform:none}
.tcard.rv-d1{transition-delay:0s,0s,.12s}
.tcard.rv-d2{transition-delay:0s,0s,.24s}
.tcard.rv-d3{transition-delay:0s,0s,.36s}
.tcard:hover{transform:translateY(-6px);border-color:rgba(233,184,114,.45)}
.q-mark{position:absolute;top:6px;inset-inline-end:20px;font:500 80px/1 'Fraunces',serif;color:rgba(233,184,114,.1);pointer-events:none;user-select:none}
.t-id{display:flex;align-items:center;gap:12px;margin-bottom:14px;padding-inline-end:30px}
.t-id b{display:block;font-size:14.5px}
.t-id .t-meta{display:block;font-size:12.5px;color:rgba(255,255,255,.5);font-weight:600;margin-top:2px}
.t-id .t-meta .t-stars{color:var(--gold);letter-spacing:1px}
.t-id .g-mini{position:absolute;top:22px;inset-inline-end:22px}
.t-ava{width:44px;height:44px;border-radius:50%;flex-shrink:0;object-fit:cover;border:2px solid rgba(233,184,114,.5)}
.t-ava-ph{width:44px;height:44px;border-radius:50%;flex-shrink:0;display:grid;place-items:center;font:500 18px 'Fraunces',serif;color:var(--gold);box-shadow:0 0 0 1.5px rgba(233,184,114,.5)}
.tcard p{font-size:15px;line-height:1.7;color:rgba(255,255,255,.85)}
.tcard p.clamp{display:-webkit-box;-webkit-line-clamp:8;-webkit-box-orient:vertical;overflow:hidden}
.t-more{background:none;border:none;padding:0;margin-top:10px;color:var(--gold);font:700 13px 'Manrope',sans-serif;cursor:pointer}
.t-more:hover{text-decoration:underline}
/* dublura CTA — doar pe mobil (pe desktop CTA-ul trăiește în score card) */
.testi-more{display:none;justify-content:center;margin-top:20px}
.testi-more a{display:inline-flex;align-items:center;justify-content:center;width:100%;border:1.5px solid rgba(233,184,114,.5);color:var(--gold);border-radius:100px;padding:13px 24px;font:700 14px 'Manrope',sans-serif;text-decoration:none;transition:background .3s}
.testi-more a:hover{background:rgba(233,184,114,.12)}
body.t-al .testi-more a{color:var(--gold)}
/* mobil: zidul devine rail orizontal cu snap (score card = primul slide) */
@media(max-width:760px){
  .testi-wall{columns:auto;display:flex;overflow-x:auto;scroll-snap-type:x mandatory;gap:14px;margin-inline:-22px;padding-inline:22px;padding-bottom:10px;scrollbar-width:none;-webkit-overflow-scrolling:touch}
  .testi-wall::-webkit-scrollbar{display:none}
  .testi-wall>*{flex:0 0 86%;scroll-snap-align:center;margin:0}
  /* în rail reveal-ul e dezactivat: slide-urile din afara ecranului trebuie să se
     vadă la peek/swipe, nu să aștepte IntersectionObserver-ul */
  .testi-wall .rv{opacity:1;transform:none}
  .score-card .num{font-size:60px}
  .testi-more{display:flex}
  .ava-stack{align-items:flex-start}
}
@media(prefers-reduced-motion:reduce){
  .stars-fill .st{opacity:1;transition:none}
  .stars-fill .fill{transition:none;width:var(--pct)}
}

/* video */
.video-card{margin-top:48px;border-radius:var(--r);overflow:hidden;position:relative;aspect-ratio:16/9;background:linear-gradient(160deg,#152B3D,#0C1F19);display:grid;place-items:center}
.video-card .video-frame{position:absolute;inset:0;width:100%;height:100%;border:0;display:block}
.video-card .video-poster{position:absolute;inset:0;width:100%;height:100%;padding:0;margin:0;border:0;background:none;cursor:pointer;display:grid;place-items:center}
.video-card .video-thumb{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.video-card .video-poster::after{content:"";position:absolute;inset:0;background:linear-gradient(180deg,rgba(10,20,15,.15),rgba(10,20,15,.45))}
.video-card .ridgebg{position:absolute;inset:auto 0 0 0;opacity:.6}
.video-url-edit{display:inline-flex;align-items:center;gap:8px;margin-top:12px;background:#fff;border:1.5px dashed rgba(21,122,85,.6);border-radius:12px;padding:8px 14px;font:600 13px 'Manrope',monospace;color:#157a55;max-width:100%;overflow-wrap:anywhere}
.video-card .playbtn{position:relative;z-index:2;width:88px;height:88px;border-radius:50%;background:var(--ember);display:grid;place-items:center;color:#fff;box-shadow:0 0 0 0 rgba(232,114,44,.5);animation:pulse 2.4s infinite}
@keyframes pulse{0%{box-shadow:0 0 0 0 rgba(232,114,44,.5)}70%{box-shadow:0 0 0 26px rgba(232,114,44,0)}100%{box-shadow:0 0 0 0 rgba(232,114,44,0)}}
.video-card .vlabel{position:absolute;top:22px;left:24px;z-index:2;color:#fff;font-weight:700;font-size:14px;display:flex;gap:10px;align-items:center}
.video-card .vlabel .dot{width:8px;height:8px;border-radius:50%;background:#E33;animation:blink 1.6s infinite}
@keyframes blink{50%{opacity:.3}}

/* FAQ */
.faq-wrap{max-width:780px;margin:52px auto 0}
.faq-cat{font-size:13px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:var(--ember);margin:38px 0 8px}
.faq-item{border-bottom:1px solid var(--line)}
.faq-q{width:100%;display:flex;justify-content:space-between;align-items:center;gap:20px;padding:22px 4px;background:none;border:none;cursor:pointer;font-family:inherit;font-size:16.5px;font-weight:700;color:var(--pine);text-align:left;transition:color .25s}
.faq-q:hover{color:var(--ember)}
.faq-q svg{flex-shrink:0;transition:transform .35s;color:var(--ink-soft)}
.faq-item.open .faq-q svg{transform:rotate(180deg);color:var(--ember)}
.faq-a{max-height:0;overflow:hidden;transition:max-height .45s cubic-bezier(.2,.7,.2,1)}
.faq-a p{padding:0 4px 24px;font-size:15px;line-height:1.75;color:var(--ink-soft);max-width:62ch}

/* location */
.loc-grid{display:grid;grid-template-columns:1fr 1fr;gap:60px;align-items:center}
@media(max-width:860px){.loc-grid{grid-template-columns:1fr;gap:36px}}
.loc-points{margin-top:32px;display:grid;gap:0;border-top:1px solid var(--line)}
.loc-point{display:flex;justify-content:space-between;align-items:center;padding:17px 4px;border-bottom:1px solid var(--line);font-size:15px}
.loc-point span{font-weight:600;color:var(--ink-soft)}
.loc-point b{font-family:'Fraunces',serif;font-weight:500;font-size:19px;color:var(--pine)}
.loc-map{border-radius:var(--r);overflow:hidden;aspect-ratio:4/4;border:1px solid var(--line);background:linear-gradient(150deg,#E8EFE4,#D7E4D2)}
.loc-map iframe{width:100%;height:100%;border:0;display:block}
.loc-map-link{display:inline-flex;align-items:center;gap:9px;margin-top:16px;color:var(--pine);font-weight:700;font-size:14.5px;text-decoration:none}
.loc-map-link:hover{color:var(--ember)}
.loc-map-link svg{color:var(--ember)}

/* final CTA — fără box: text direct pe fundalul paginii, culori închise */
.final{padding:64px 0 72px;text-align:center}
@media(max-width:760px){.final{padding:44px 0 52px}}
.final h2{color:var(--pine);max-width:22ch;margin:0 auto}
.final .final-l1,.final .final-l2{display:block}
.final .final-l2{color:var(--ember);font-style:italic}
.final .lede{margin-left:auto;margin-right:auto}
.final .hero-ctas{justify-content:center}
.final .btn-ghost{background:none;color:var(--pine);border-color:rgba(18,43,34,.35);backdrop-filter:none}
.final .btn-ghost:hover{background:rgba(18,43,34,.07)}

/* footer */
.foot{background:var(--night);color:#fff;padding:84px 0 40px;margin-top:24px}
.foot-grid{display:grid;grid-template-columns:1.4fr 1fr 1fr 1fr;gap:44px}
@media(max-width:860px){.foot-grid{grid-template-columns:1fr 1fr}}
@media(max-width:560px){.foot-grid{grid-template-columns:1fr}}
.foot h5{font-size:12.5px;font-weight:800;letter-spacing:.18em;text-transform:uppercase;color:var(--gold);margin-bottom:20px}
.foot a,.foot p{display:flex;align-items:center;gap:10px;color:rgba(255,255,255,.75);text-decoration:none;font-size:14.5px;line-height:1.6;margin-bottom:12px;transition:color .25s}
.foot a:hover{color:var(--gold)}
.foot .logo{color:#fff;margin-bottom:18px}
.foot-bottom{margin-top:56px;padding-top:26px;border-top:1px solid rgba(255,255,255,.1);display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;font-size:13px;color:rgba(255,255,255,.4)}

/* floating actions */
.fabs{position:fixed;right:20px;bottom:20px;z-index:70;display:flex;flex-direction:column;gap:12px}
.fab{width:54px;height:54px;border-radius:50%;display:grid;place-items:center;color:#fff;cursor:pointer;border:none;box-shadow:0 12px 28px rgba(0,0,0,.25);transition:transform .25s}
.fab:hover{transform:translateY(-3px) scale(1.05)}
.fab-wa{background:#25D366}
.fab-call{background:var(--pine-2)}
.admin-fab{position:fixed;left:20px;bottom:20px;z-index:70;display:inline-flex;align-items:center;gap:9px;background:var(--ink);color:#fff;border:none;border-radius:100px;padding:12px 20px;font-family:inherit;font-weight:700;font-size:13.5px;cursor:pointer;box-shadow:0 12px 28px rgba(0,0,0,.3);transition:transform .25s,background .25s}
.admin-fab:hover{transform:translateY(-3px);background:#000}

/* ======================= ADMIN ======================= */
.adm{position:fixed;inset:0;z-index:100;display:flex;font-family:'Manrope',sans-serif;color:var(--ink)}
.adm-scrim{position:absolute;inset:0;background:rgba(12,31,25,.55);backdrop-filter:blur(4px)}
.adm-panel{position:relative;margin-left:auto;width:min(920px,100%);height:100%;background:var(--ivory);display:flex;box-shadow:-30px 0 80px rgba(0,0,0,.35);animation:slideIn .45s cubic-bezier(.2,.7,.2,1)}
@keyframes slideIn{from{transform:translateX(60px);opacity:0}to{transform:none;opacity:1}}
.adm-nav{width:230px;flex-shrink:0;background:var(--pine);color:var(--ivory);padding:26px 14px;overflow-y:auto}
.adm-nav .adm-logo{font-family:'Fraunces',serif;letter-spacing:.12em;font-size:19px;padding:0 12px 20px;display:block}
.adm-nav button{display:flex;align-items:center;gap:10px;width:100%;background:none;border:none;color:rgba(251,247,239,.65);font-family:inherit;font-size:13.5px;font-weight:700;padding:11px 12px;border-radius:10px;cursor:pointer;text-align:left;transition:background .2s,color .2s;margin-bottom:2px}
.adm-nav button:hover{color:#fff;background:rgba(255,255,255,.06)}
.adm-nav button.act{background:var(--ember);color:#fff}
.adm-main{flex:1;display:flex;flex-direction:column;min-width:0}
.adm-head{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:20px 28px;border-bottom:1px solid var(--line);background:#fff}
.adm-head h3{font-family:'Fraunces',serif;font-weight:500;font-size:22px;color:var(--pine)}
.adm-head .acts{display:flex;gap:10px;align-items:center}
.adm-body{flex:1;overflow-y:auto;padding:28px}
.adm-body .hint{font-size:13px;color:var(--ink-soft);background:var(--sand);border:1px solid var(--line);border-radius:12px;padding:12px 16px;margin-bottom:22px;line-height:1.6}
.fld{margin-bottom:18px}
.fld label{display:block;font-size:12px;font-weight:800;letter-spacing:.1em;text-transform:uppercase;color:var(--ink-soft);margin-bottom:8px}
.fld input,.fld textarea,.fld select{width:100%;font-family:inherit;font-size:14.5px;padding:12px 14px;border:1.5px solid var(--line);border-radius:12px;background:#fff;color:var(--ink);transition:border-color .2s,box-shadow .2s;resize:vertical}
.fld input:focus,.fld textarea:focus{outline:none;border-color:var(--ember);box-shadow:0 0 0 3px rgba(232,114,44,.15)}
.fld .chars{font-size:11.5px;color:var(--ink-soft);margin-top:5px;font-weight:600}
.fld .chars.warn{color:#C24}
.row2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
@media(max-width:640px){.row2{grid-template-columns:1fr}}
.list-item{display:flex;gap:10px;align-items:flex-start;margin-bottom:10px}
.list-item input,.list-item textarea{flex:1;font-family:inherit;font-size:14px;padding:11px 13px;border:1.5px solid var(--line);border-radius:11px;background:#fff}
.icon-btn{width:38px;height:38px;flex-shrink:0;border-radius:10px;border:1.5px solid var(--line);background:#fff;display:grid;place-items:center;cursor:pointer;color:var(--ink-soft);transition:all .2s}
.icon-btn:hover{border-color:#C24;color:#C24;background:#FDF3F4}
.add-btn{display:inline-flex;align-items:center;gap:8px;background:var(--sand);border:1.5px dashed rgba(30,42,36,.3);color:var(--pine);font-family:inherit;font-weight:700;font-size:13.5px;padding:10px 18px;border-radius:11px;cursor:pointer;transition:all .2s}
.add-btn:hover{border-color:var(--ember);color:var(--ember)}
.card-ed{background:#fff;border:1px solid var(--line);border-radius:16px;padding:20px;margin-bottom:18px}
.card-ed .ce-head{display:flex;justify-content:space-between;align-items:center;margin-bottom:14px}
.card-ed .ce-head b{font-size:14px;color:var(--pine)}
.adm-save{display:inline-flex;align-items:center;gap:9px;background:var(--pine);color:#fff;border:none;border-radius:100px;padding:11px 22px;font-family:inherit;font-weight:700;font-size:14px;cursor:pointer;transition:background .2s,transform .2s}
.adm-save:hover{background:var(--pine-2);transform:translateY(-1px)}
.adm-save.saved{background:#2E7D4F}
.adm-close{width:40px;height:40px;border-radius:50%;border:1.5px solid var(--line);background:#fff;display:grid;place-items:center;cursor:pointer;color:var(--ink-soft);transition:all .2s}
.adm-close:hover{border-color:var(--ink);color:var(--ink);transform:rotate(90deg)}
.seo-preview{background:#fff;border:1px solid var(--line);border-radius:14px;padding:18px 20px;margin-bottom:24px}
.seo-preview .spl{font-size:11px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:var(--ink-soft);margin-bottom:10px}
.seo-preview .st{color:#1a0dab;font-size:18px;margin-bottom:3px;font-weight:500}
.seo-preview .su{color:#006621;font-size:13px;margin-bottom:5px}
.seo-preview .sd{color:#545454;font-size:13.5px;line-height:1.5}
.reset-link{background:none;border:none;color:#C24;font-family:inherit;font-size:13px;font-weight:700;cursor:pointer;text-decoration:underline;margin-top:26px}
.toast{position:fixed;bottom:28px;left:50%;transform:translateX(-50%);z-index:200;background:var(--pine);color:#fff;padding:13px 26px;border-radius:100px;font-weight:700;font-size:14px;box-shadow:0 16px 40px rgba(0,0,0,.3);animation:fadeUp .4s}

@media(prefers-reduced-motion:reduce){
  *,*::before,*::after{animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}
  .rv{opacity:1;transform:none}
  .h1-line span{transform:none}.fade-up{opacity:1}
}
`;

/* ============================ HOOKS ============================ */
export function useReveal() {
  useEffect(() => {
    const els = document.querySelectorAll(".rv");
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && e.target.classList.add("on")),
      { threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  });
}

export function useScrolled(threshold = 40) {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}

/* Hook partajat: conținut + draft brut editabil (pentru editorul vizual) */
export function useHubContent() {
  const [hubRaw, setHubRaw] = useState(null);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    (async () => {
      try { setHubRaw(await loadHubRaw()); } catch (e) { /* fallback implicit */ }
      setLoaded(true);
    })();
  }, []);
  const content = useMemo(() => ({ ...DEFAULT_CONTENT, ...hubToSite(hubRaw || {}) }), [hubRaw]);
  return { content, loaded, hubRaw, setHubRaw };
}

/* Încarcă conținutul CMS (read-only) — folosit de paginile de vilă */
export function useSiteContent() {
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        const raw = await loadHubRaw();
        setContent({ ...DEFAULT_CONTENT, ...hubToSite(raw) });
      } catch (e) {
        /* fără conținut salvat — folosim varianta implicită */
      }
      setLoaded(true);
    })();
  }, []);
  return { content, loaded };
}

/* Selector de limbă (RO / EN / HE / FR) */
/* steaguri SVG (emoji-urile de steag nu se randează pe Windows) */
const FLAGS = {
  ro: <svg viewBox="0 0 3 2"><rect width="1" height="2" fill="#002B7F"/><rect x="1" width="1" height="2" fill="#FCD116"/><rect x="2" width="1" height="2" fill="#CE1126"/></svg>,
  en: <svg viewBox="0 0 60 40"><rect width="60" height="40" fill="#012169"/><path d="M0,0 60,40M60,0 0,40" stroke="#fff" strokeWidth="7"/><path d="M0,0 60,40M60,0 0,40" stroke="#C8102E" strokeWidth="4"/><path d="M30,0V40M0,20H60" stroke="#fff" strokeWidth="13"/><path d="M30,0V40M0,20H60" stroke="#C8102E" strokeWidth="7"/></svg>,
  he: <svg viewBox="0 0 60 44"><rect width="60" height="44" fill="#fff"/><rect y="5" width="60" height="6" fill="#0038B8"/><rect y="33" width="60" height="6" fill="#0038B8"/><path d="M30 13.5 36.5 25 23.5 25Z M30 30.5 23.5 19 36.5 19Z" fill="none" stroke="#0038B8" strokeWidth="2.4"/></svg>,
  fr: <svg viewBox="0 0 3 2"><rect width="1" height="2" fill="#002395"/><rect x="1" width="1" height="2" fill="#fff"/><rect x="2" width="1" height="2" fill="#ED2939"/></svg>,
};

export function LangSwitcher() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return;
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("pointerdown", h);
    return () => document.removeEventListener("pointerdown", h);
  }, [open]);
  const cur = LANGS.find((l) => l.code === LANG) || LANGS[0];
  return (
    <div className={`langdd ${open ? "open" : ""}`} ref={ref}>
      <button type="button" className="langdd-btn" onClick={() => setOpen((o) => !o)} aria-label={cur.name} aria-expanded={open}>
        <span className="langdd-flag">{FLAGS[cur.code] || cur.label}</span>
        <svg className="langdd-chev" width="10" height="6" viewBox="0 0 10 6" fill="none"><path d="M1 1l4 4 4-4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </button>
      {open && (
        <div className="langdd-menu">
          {LANGS.map((l) => (
            <button key={l.code} type="button" className={`langdd-item ${l.code === LANG ? "on" : ""}`} onClick={() => { setLang(l.code); setOpen(false); }}>
              <span className="langdd-flag">{FLAGS[l.code] || l.label}</span>
              <span className="langdd-name">{l.name}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* Tema activă a site-ului (Versiuni UI din admin): classic | aurora | aurora-light */
export function ThemeStyle({ content }) {
  const theme = (content && content.ui && content.ui.theme) || "aurora-light";
  useEffect(() => { applyTheme(theme); applyLangDir(); }, [theme]);
  const css = theme === "aurora" ? CSS_AURORA : theme === "aurora-light" ? CSS_AURORA_LIGHT : "";
  return css ? <style>{css}</style> : null;
}

/* ============================ DECOR ============================ */
export const Ridge = ({ fill, height = 140 }) => (
  <svg viewBox="0 0 1440 200" preserveAspectRatio="none" style={{ height }}>
    <path
      fill={fill}
      d="M0,200 L0,120 L60,96 L90,120 L140,70 L200,120 L240,100 L300,140 L360,80 L420,130 L470,105 L540,150 L600,90 L660,135 L720,100 L790,145 L850,85 L920,130 L980,110 L1040,150 L1100,95 L1160,135 L1220,105 L1290,145 L1350,100 L1440,140 L1440,200 Z"
    />
    {/* brazi */}
    {[110, 330, 620, 905, 1195, 1390].map((x, i) => (
      <g key={i} fill={fill}>
        <path d={`M${x},${118 - (i % 3) * 8} l14,34 h-8 l12,26 h-9 l10,24 h-38 l10,-24 h-9 l12,-26 h-8 Z`} />
      </g>
    ))}
  </svg>
);

export const RootDivider = () => (
  <div className="root-divider" aria-hidden="true">
    <svg viewBox="0 0 120 70" fill="none" stroke="#1B4033" strokeWidth="1.4" strokeLinecap="round">
      <path d="M60 4v22M60 26c0 10-14 8-18 18M60 26c0 10 14 8 18 18M60 26v34M42 44c-3 6-10 5-13 12M78 44c3 6 10 5 13 12M60 46c-5 4-11 3-13 10M60 46c5 4 11 3 13 10" />
      <circle cx="60" cy="4" r="2.4" fill="#E8722C" stroke="none" />
    </svg>
  </div>
);

export const Embers = () => {
  const embers = useRef(
    Array.from({ length: 26 }, (_, i) => ({
      left: 30 + Math.random() * 40,
      size: 3 + Math.random() * 5,
      dur: 7 + Math.random() * 9,
      delay: Math.random() * 12,
      dx: (Math.random() - 0.5) * 240,
    }))
  ).current;
  return (
    <div className="embers" aria-hidden="true">
      {embers.map((e, i) => (
        <span
          key={i}
          className="ember"
          style={{
            left: `${e.left}%`,
            width: e.size,
            height: e.size,
            animationDuration: `${e.dur}s`,
            animationDelay: `${e.delay}s`,
            "--dx": `${e.dx}px`,
          }}
        />
      ))}
    </div>
  );
};

/* Loader „copacul crește din rădăcini": rădăcinile se desenează, trunchiul urcă,
   apoi coroana de brad apare strat cu strat — în buclă cât se încarcă pagina.
   Poartă propriul <style> ca să poată fi folosit înaintea CSS-ului principal. */
const TL_CSS = `
.treeload{min-height:100vh;display:grid;place-items:center;background:#FBF7EF;font-family:'Manrope',system-ui,sans-serif}
.treeload.inline{min-height:46vh;background:none}
.treeload .tl-box{text-align:center}
.treeload svg{overflow:visible}
.treeload .tl-roots path{stroke-dasharray:34;stroke-dashoffset:34;animation:tlRoots 2.6s ease-out infinite}
.treeload .tl-trunk{transform-origin:60px 118px;transform:scaleY(0);animation:tlTrunk 2.6s ease-out infinite}
.treeload .tl-l1,.treeload .tl-l2,.treeload .tl-l3{opacity:0;transform:translateY(8px) scale(.6)}
.treeload .tl-l1{transform-origin:60px 106px;animation:tlLayer1 2.6s ease-out infinite}
.treeload .tl-l2{transform-origin:60px 78px;animation:tlLayer2 2.6s ease-out infinite}
.treeload .tl-l3{transform-origin:60px 54px;animation:tlLayer3 2.6s ease-out infinite}
.treeload .tl-label{display:block;margin-top:16px;font-size:14px;font-weight:600;color:#7A8B80}
@keyframes tlRoots{0%{stroke-dashoffset:34}22%{stroke-dashoffset:0}88%{stroke-dashoffset:0;opacity:1}100%{stroke-dashoffset:0;opacity:0}}
@keyframes tlTrunk{0%,14%{transform:scaleY(0)}38%{transform:scaleY(1)}88%{transform:scaleY(1);opacity:1}100%{transform:scaleY(1);opacity:0}}
/* secvențierea straturilor e în procente (nu animation-delay) — cu delay, buclele
   se decalează și vârful bradului rămâne „plutind" fără trunchi la reluare */
@keyframes tlLayer1{0%,34%{opacity:0;transform:translateY(8px) scale(.6)}50%{opacity:1;transform:none}88%{opacity:1;transform:none}100%{opacity:0;transform:none}}
@keyframes tlLayer2{0%,42%{opacity:0;transform:translateY(8px) scale(.6)}58%{opacity:1;transform:none}88%{opacity:1;transform:none}100%{opacity:0;transform:none}}
@keyframes tlLayer3{0%,50%{opacity:0;transform:translateY(8px) scale(.6)}66%{opacity:1;transform:none}88%{opacity:1;transform:none}100%{opacity:0;transform:none}}
@media(prefers-reduced-motion:reduce){.treeload *{animation:none!important;opacity:1!important;transform:none!important;stroke-dashoffset:0!important}}
`;
export function TreeLoader({ label = "Se încarcă…", inline = false }) {
  return (
    <div className={`treeload${inline ? " inline" : ""}`} role="status" aria-label={label}>
      <style>{TL_CSS}</style>
      <div className="tl-box">
        <svg viewBox="0 0 120 140" width="96" height="112" aria-hidden="true">
          <g className="tl-roots" stroke="#8A5A3C" strokeWidth="3" fill="none" strokeLinecap="round">
            <path d="M60 118 C56 126 46 128 38 132" />
            <path d="M60 118 C64 126 74 128 82 132" />
            <path d="M60 118 C60 125 60 129 60 134" />
          </g>
          <rect className="tl-trunk" x="56" y="88" width="8" height="30" rx="3" fill="#8A5A3C" />
          <path className="tl-l1" d="M60 62 L34 106 H86 Z" fill="#1E5C43" />
          <path className="tl-l2" d="M60 40 L38 78 H82 Z" fill="#247052" />
          <path className="tl-l3" d="M60 20 L42 54 H78 Z" fill="#2E8562" />
        </svg>
        <span className="tl-label">{label}</span>
      </div>
    </div>
  );
}

/* ============================ PUBLIC SITE ============================ */
// Logo partajat: imagine dacă e setată în Admin (brand.logo), altfel textul „R ROOTS".
// În mod editare zona e clickabilă (data-edit-img) ca să încarci/schimbi logo-ul.
export function Brand({ logo }) {
  if (logo)
    return <img className="logo-img" src={logo} alt="ROOTS" data-edit-img={EDIT_MODE ? "brand.logo" : undefined} />;
  return (
    <span className="logo-txt" data-edit-img={EDIT_MODE ? "brand.logo" : undefined}>
      <span className="logo-ring">R</span>ROOTS
    </span>
  );
}

export function Header({ content }) {
  const scrolled = useScrolled();
  const [menu, setMenu] = useState(false);
  return (
    <header className={`hdr ${scrolled ? "solid" : ""}`}>
      <div className="wrap">
        <a href="#top" className="logo">
          <Brand logo={content?.brand?.logo} />
        </a>
        <nav className="nav">
          <a href="#vile">{t("nav_villas")}</a>
          <a href="#spatii">{t("nav_common")}</a>
          <a href="#reguli">{t("nav_rules")}</a>
          <a href="#faq">{t("nav_faq")}</a>
          <a href="#locatie">{t("nav_location")}</a>
          <Link to="/blog">{t("nav_blog")}</Link>
          <LangSwitcher />
          <Link to="/rezervare" className="cta">{t("book_now")}</Link>
          <button className="burger" onClick={() => setMenu(true)} aria-label="Meniu">☰</button>
        </nav>
      </div>
      {menu && (
        <div className="mnav" onClick={() => setMenu(false)}>
          <button className="close" aria-label="Închide meniul">×</button>
          <a href="#vile">{t("nav_villas")}</a>
          <a href="#spatii">{t("nav_common")}</a>
          <a href="#reguli">{t("nav_rules")}</a>
          <a href="#faq">{t("nav_faq")}</a>
          <a href="#locatie">{t("nav_location")}</a>
          <Link to="/blog">{t("nav_blog")}</Link>
          <Link to="/rezervare" className="cta">{t("book_now")}</Link>
        </div>
      )}
    </header>
  );
}

/* Overlay-ul pozei din hero — administrabil din Hub (secțiunea Logo & Brand):
   heroOverlayFrom (jos/sus/colturi/plin), heroOverlayHeight (0–100 = cât se întinde),
   heroOverlayOpacity (0–100), heroOverlayColor (hex). */
function overlayStyle(b) {
  const m = /^#?([0-9a-fA-F]{6})$/.exec((b && b.heroOverlayColor) || "");
  const n = m ? parseInt(m[1], 16) : 0x0c1f19;
  const rgb = `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`;
  const op = Math.max(0, Math.min(100, Number(b && b.heroOverlayOpacity) || 0)) / 100;
  const h = Math.max(0, Math.min(100, Number(b && b.heroOverlayHeight) || 0));
  const from = (b && b.heroOverlayFrom) || "jos";
  if (!op || !h) return { background: "none" };
  const solid = `rgba(${rgb},${op})`;
  const clear = `rgba(${rgb},0)`;
  if (from === "sus") return { background: `linear-gradient(180deg, ${solid} 0%, ${clear} ${h}%)` };
  if (from === "colturi") return { background: `radial-gradient(ellipse at center, ${clear} ${100 - h}%, ${solid} 100%)` };
  if (from === "plin") return { background: solid };
  return { background: `linear-gradient(0deg, ${solid} 0%, ${clear} ${h}%)` }; // jos (implicit)
}

function Hero({ hero, brand }) {
  return (
    <section className="hero" id="top">
      {hero.image && <div className="hero-photo pic-desk" style={{ backgroundImage: `url(${hero.image})` }} />}
      {(hero.imageMobile || hero.image) && <div className="hero-photo pic-mob" style={{ backgroundImage: `url(${hero.imageMobile || hero.image})` }} />}
      <div className="hero-veil" style={overlayStyle(brand)} />
      <div className="hero-inner wrap">
        <h1 style={{ fontSize: { s: "clamp(30px,4.8vw,52px)", m: "clamp(36px,6vw,68px)", l: "clamp(42px,7.2vw,84px)", xl: "clamp(46px,8.4vw,104px)" }[hero.titleSize] || "clamp(36px,6vw,68px)" }}>
          <span className="h1-line"><span data-edit="hero.titleA">{hero.titleA}</span></span>
          <span className="h1-line"><span className="warm" data-edit="hero.titleB">{hero.titleB}</span></span>
        </h1>
        <p className="hero-sub fade-up" data-edit="hero.subtitle">{hero.subtitle}</p>
        <div className="hero-ctas fade-up d2">
          <Link to="/rezervare" className="btn btn-ember"><span data-edit="hero.ctaPrimary">{hero.ctaPrimary}</span> {ICONS.arrow}</Link>
        </div>
      </div>
      {EDIT_MODE && (
        <>
          <button type="button" className="hub-imgbtn" data-edit-img="hero.image">📷 Imagine desktop</button>
          <button type="button" className="hub-imgbtn mob" data-edit-img="hero.imageMobile">📱 Imagine mobil</button>
        </>
      )}
    </section>
  );
}

function About({ about }) {
  return (
    <section className="sec">
      <div className="wrap about-grid">
        <div className="rv">
          <div className="eyebrow">{t("about_eyebrow")}</div>
          <h2 data-edit="about.title">{about.title}</h2>
        </div>
        <div className="rv rv-d1">
          <p className="lede" style={{ marginTop: 0 }} data-edit="about.p1">{about.text1}</p>
          <p className="lede" data-edit="about.p2">{about.text2}</p>
          <div className="stat-row">
            <div className="stat"><b>2</b><span>{t("stat_villas")}</span></div>
            <div className="stat"><b>8–10</b><span>{t("stat_persons")}</span></div>
            <div className="stat"><b>4</b><span>{t("stat_rooms")}</span></div>
            <div className="stat"><b>10'</b><span>{t("stat_center")}</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* Slider pe cardul vilei: cover + galeria (villas.items.N.gallery) — swipe cu
   scroll-snap, săgeți și puncte; în editor fiecare slide se schimbă din picker. */
function VCardSlider({ slides }) {
  const ref = useRef(null);
  const [cur, setCur] = useState(0);
  // RTL-safe: scrollIntoView în loc de scrollTo(left) și Math.abs pe scrollLeft
  const go = (e, n) => {
    e.preventDefault(); e.stopPropagation();
    const el = ref.current;
    if (!el) return;
    const i = Math.max(0, Math.min(slides.length - 1, n));
    if (el.children[i]) el.children[i].scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  };
  const onScroll = () => {
    const el = ref.current;
    if (el) setCur(Math.round(Math.abs(el.scrollLeft) / Math.max(1, el.clientWidth)));
  };
  return (
    <>
      <div className="vslides" ref={ref} onScroll={onScroll}>
        {slides.map((s, i) => (
          <div className="vslide" key={i} data-edit-img={EDIT_MODE ? s.path : undefined}>
            <div className="vslide-bg pic-desk" style={{ backgroundImage: `url(${s.url})` }} />
            <div className="vslide-bg pic-mob" style={{ backgroundImage: `url(${s.mob || s.url})` }} />
          </div>
        ))}
      </div>
      {slides.length > 1 && (
        <>
          <button type="button" className="vs-arr left" onClick={(e) => go(e, cur - 1)} aria-label="Înapoi">‹</button>
          <button type="button" className="vs-arr right" onClick={(e) => go(e, cur + 1)} aria-label="Înainte">›</button>
          <div className="vs-dots" aria-hidden="true">{slides.map((_, i) => <span key={i} className={i === cur ? "on" : ""} />)}</div>
        </>
      )}
      {EDIT_MODE && slides[cur] && (
        <button type="button" className="pic-mob-btn" data-edit-img={slides[cur].mobPath}>📱 mobil · slide {cur + 1}</button>
      )}
    </>
  );
}

function VillaCard({ villa, delay, contact, idx }) {
  // slide-urile păstrează CALEA originală din draft (cover / gallery.N cu N brut),
  // ca „Fără imagine" pe un slide să nu decaleze editarea celorlalte
  const slides = [
    { url: villa.image, mob: villa.imageMobile, path: `villas.items.${idx}.cover`, mobPath: `villas.items.${idx}.coverMobile` },
    ...(villa.gallery || []).map((g, gi) => ({
      url: g,
      mob: (villa.galleryMobile || [])[gi] || "",
      path: `villas.items.${idx}.gallery.${gi}`,
      mobPath: `villas.items.${idx}.galleryMobile.${gi}`,
    })),
  ].filter((s) => s.url);
  return (
    <article className={`vcard rv ${delay}`}>
      <div className="vcard-media" data-edit-img={!slides.length && EDIT_MODE ? `villas.items.${idx}.cover` : undefined} title={!slides.length && EDIT_MODE ? "Click pentru a alege imaginea" : undefined}>
        {slides.length ? (
          <VCardSlider slides={slides} />
        ) : (
          <>
            <div style={{ position: "absolute", inset: "auto 0 0 0" }}>
              <Ridge fill="rgba(233,184,114,.14)" height={110} />
            </div>
            <div className="glow" />
          </>
        )}
        <span className="vcard-tag">{t("villa_tag", { n: villa.id === "redwood" ? "01" : "02" })}</span>
        {EDIT_MODE && slides.length > 0 && (
          <>
            <button type="button" className="vs-add" data-edit-img={`villas.items.${idx}.gallery.${(villa.gallery || []).length}`}>＋ foto</button>
            <button type="button" className="vs-add multi" data-edit-imgs={`villas.items.${idx}.gallery`}>⬆ mai multe poze</button>
          </>
        )}
      </div>
      <div className="vcard-body">
        <h3 data-edit={`villas.items.${idx}.name`}>{villa.name}</h3>
        <div className="tagline" data-edit={`villas.items.${idx}.tagline`}>{villa.tagline}</div>
        <p className="desc" data-edit={`villas.items.${idx}.description`}>{villa.description}</p>
        <div className="feat-list" data-edit-list={`villas.items.${idx}.features`}>
          {villa.features.map((f, i) => (
            <div className="feat" key={i} data-edit-idx={i}>
              {ICONS[FEATURE_ICON_ORDER[i % FEATURE_ICON_ORDER.length]]}
              <span data-edit={`villas.items.${idx}.features.${i}`}>{f}</span>
            </div>
          ))}
        </div>
        <div className="vcard-ctas">
          <Link to={`/rezervare?vila=${villa.id}`} className="btn btn-ember">{t("book_now")}</Link>
          <Link to={`/vila-${villa.id}`} className="btn btn-outline-ivory">{t("see_details")}</Link>
        </div>
      </div>
    </article>
  );
}

function Villas({ villas, contact }) {
  return (
    <section id="vile">
      <div className="villas-band">
        <div className="wrap">
          <div className="rv">
            <div className="eyebrow">{t("villas_eyebrow")}</div>
            <h2>{t("villas_title")}</h2>
            <p className="lede">{t("villas_lede")}</p>
          </div>
          <div className="villa-grid">
            {villas.map((v, i) => (
              <VillaCard key={v.id} villa={v} contact={contact} idx={i} delay={i === 1 ? "rv-d1" : ""} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Editorial({ editorial }) {
  return (
    <section className="sec">
      <div className="wrap edit-grid" data-edit-list="editorial.blocks">
        {editorial.map((b, i) => (
          <div className={`edit-block rv ${i === 1 ? "rv-d1" : ""}`} key={i} data-edit-idx={i}>
            <h3 data-edit={`editorial.blocks.${i}.title`}>{b.title}</h3>
            <div data-edit-list={`editorial.blocks.${i}.paragraphs`}>
              {b.paragraphs.map((p, j) => <p key={j} data-edit={`editorial.blocks.${i}.paragraphs.${j}`} data-edit-idx={j}>{p}</p>)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Common({ common }) {
  return (
    <section id="spatii">
      <div className="common">
        <div className="wrap common-grid">
          <div className="rv">
            <div className="eyebrow">{t("common_eyebrow")}</div>
            <h2 data-edit="common.title">{common.title}</h2>
            <p className="lede" data-edit="common.text">{common.text}</p>
            <div className="pill-list" data-edit-list="common.features">
              {common.features.map((f, i) => (
                <div className="pill" key={i} data-edit-idx={i}>{ICONS[COMMON_ICON_ORDER[i % COMMON_ICON_ORDER.length]]}<span data-edit={`common.features.${i}`}>{f}</span></div>
              ))}
            </div>
          </div>
          <div className="common-art rv rv-d1" data-edit-img="common.image" title="Click pentru a alege imaginea (desktop)">
            {common.image ? (
              <>
                <div className="ph pic-desk" style={{ backgroundImage: `url(${common.image})` }} />
                <div className="ph pic-mob" style={{ backgroundImage: `url(${common.imageMobile || common.image})` }} />
              </>
            ) : (
              <>
                <div className="sun" />
                <div style={{ position: "absolute", inset: "auto 0 0 0" }}><Ridge fill="#0C1F19" height={150} /></div>
                <div style={{ position: "absolute", inset: "auto 0 60px 0", opacity: .45 }}><Ridge fill="#1B4033" height={130} /></div>
              </>
            )}
            {EDIT_MODE && common.image && (
              <button type="button" className="pic-mob-btn" data-edit-img="common.imageMobile" onClick={(e) => e.stopPropagation()}>📱 mobil</button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function Rules({ rules }) {
  return (
    <section className="sec" id="reguli">
      <div className="wrap">
        <div className="rv" style={{ textAlign: "center", maxWidth: 640, margin: "0 auto" }}>
          <div className="eyebrow" style={{ justifyContent: "center" }}>{t("rules_eyebrow")}</div>
          <h2 data-edit="rules.title">{rules.title}</h2>
          <p className="lede" style={{ margin: "20px auto 0" }} data-edit="rules.intro">{rules.intro}</p>
        </div>
        <div className="rules-grid" data-edit-list="rules.items">
          {rules.items.map((r, i) => (
            <div className={`rule rv ${i % 3 === 1 ? "rv-d1" : i % 3 === 2 ? "rv-d2" : ""}`} key={i} data-edit-idx={i}>
              <div className="icon">{ICONS[r.icon] || ICONS.people}</div>
              <p data-edit={`rules.items.${i}.text`}>{r.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// „G"-ul Google multicolor (SVG oficial, inline — fără imagini externe)
const GLogo = ({ size = 18, className }) => (
  <svg className={className} width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.5 6.1 29.5 4 24 4 13 4 4 13 4 24s9 20 20 20 20-9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 18.9 12 24 12c3.1 0 5.9 1.2 8 3l5.7-5.7C34.5 6.1 29.5 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.7l6.2 5.2C36.9 39.2 44 34 44 24c0-1.3-.1-2.3-.4-3.5z"/>
  </svg>
);

// numărul mare din score card: count-up 0 → rating la primul reveal (o singură dată;
// cu prefers-reduced-motion sare direct la valoarea finală)
function CountUpNum({ value }) {
  const target = parseFloat(String(value).replace(",", ".")) || 0;
  const ref = useRef(null);
  const started = useRef(false);
  const [shown, setShown] = useState("0.0");
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // rating-ul s-a schimbat după ce animația a rulat (ex. a sosit cel live) → sari direct
    if (reduce || started.current) {
      setShown(target.toFixed(1));
      return;
    }
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (!e.isIntersecting || started.current) return;
        started.current = true;
        const t0 = performance.now();
        const tick = (now) => {
          const p = Math.min(1, (now - t0) / 900);
          const eased = 1 - Math.pow(1 - p, 3);
          setShown((target * eased).toFixed(1));
          if (p < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
        io.disconnect();
      }),
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => { io.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, [target]);
  return <span ref={ref}>{shown}</span>;
}

// prima placă a zidului: scorul, stelele care se aprind, chip-ul Google și CTA-ul
function ScoreCard({ rating, g }) {
  const num = parseFloat(String(rating).replace(",", ".")) || 0;
  const pct = Math.max(0, Math.min(100, (num / 5) * 100));
  return (
    <div className="score-card rv">
      <b className="num">
        {EDIT_MODE ? <span data-edit="testimonials.rating">{rating}</span> : <CountUpNum value={rating} />}
        <small>/5</small>
      </b>
      <div className="stars-fill" style={{ "--pct": pct + "%" }} role="img" aria-label={`${rating}/5`}>
        {[0, 1, 2, 3, 4].map((i) => <span key={i} className="st" style={{ "--i": i }}>{ICONS.star}</span>)}
        <span className="fill" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => <span key={i} className="st" style={{ "--i": i }}>{ICONS.star}</span>)}
        </span>
      </div>
      <div className="verdict">{num >= 4.8 ? t("testi_verdict_exc") : t("testi_verdict_sup")}</div>
      {g && g.total ? (
        <div><span className="g-chip"><GLogo size={16} />{t("reviews_verified", { n: g.total })}</span></div>
      ) : null}
      {g && g.url ? (
        <div><a className="score-cta" href={g.url} target="_blank" rel="noreferrer">{g.total ? t("all_reviews_g", { n: g.total }) : t("more_reviews")}</a></div>
      ) : null}
      <div className="score-note">{t("free_cancel_note")}</div>
    </div>
  );
}

// textul recenziei cu trunchiere reală: butonul „Citește tot" apare doar dacă
// clamp-ul chiar taie ceva (măsurat pe scrollHeight, nu ghicit după caractere)
function ClampText({ text, dataEdit }) {
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [over, setOver] = useState(false);
  useEffect(() => {
    if (open) return;
    const el = ref.current;
    if (!el) return;
    const check = () => setOver(el.scrollHeight > el.clientHeight + 2);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, [text, open]);
  if (EDIT_MODE) return <p data-edit={dataEdit}>{text}</p>;
  return (
    <>
      <p ref={ref} className={open ? "" : "clamp"} dir="auto">{text}</p>
      {over && !open ? (
        <button type="button" className="t-more" onClick={() => setOpen(true)}>{t("read_more")}</button>
      ) : null}
    </>
  );
}

/* Filtrul pe ORIGINEA clientului: Google nu expune naționalitatea, așa că folosim
   limba ORIGINALĂ a recenziei ca indicator (ebraică→Israel, spaniolă→Spania etc.);
   setul Google se re-cere în limba țării (recenziile din acea limbă urcă în top),
   iar recenziile manuale (din Hub) au câmpul `country` setat explicit de admin. */
const COUNTRY_CHIPS = [
  { key: "ro", flag: "🇷🇴", label: "România", glang: "ro", base: true },
  { key: "il", flag: "🇮🇱", label: "Israel", glang: "he", base: true },
  { key: "es", flag: "🇪🇸", label: "Spania", glang: "es", base: true },
  { key: "it", flag: "🇮🇹", label: "Italia", glang: "it", base: true },
  { key: "us", flag: "🇺🇸", label: "SUA & UK", glang: "en", base: true },
  { key: "fr", flag: "🇫🇷", label: "Franța", glang: "fr" },
  { key: "de", flag: "🇩🇪", label: "Germania", glang: "de" },
];
const hasHebrew = (s) => /[֐-׿]/.test(s || "");
const matchesCountry = (rv, c) => {
  const l = (rv.lang || "").toLowerCase();
  if (c === "il") return l === "iw" || l === "he" || hasHebrew(rv.text);
  if (c === "ro") return l === "ro" || (!l && !hasHebrew(rv.text));
  if (c === "us") return l === "en";
  return l === c;
};

function Testimonials({ t: T, cfg, extra }) {
  const [gsets, setGsets] = useState({}); // per limbă: undefined = necerut, null = se încarcă, false = eșec, obiect = date
  const [flt, setFlt] = useState("all");
  const requested = useRef(new Set()); // limbile deja cerute — updater-ul de state rămâne pur
  // re-scanează .rv la fiecare render local: cardurile montate DUPĂ sosirea
  // recenziilor Google trebuie și ele observate, altfel rămân la opacity:0
  useReveal();
  const fetchSet = useCallback((lang) => {
    if (requested.current.has(lang)) return;
    requested.current.add(lang);
    setGsets((s) => ({ ...s, [lang]: null }));
    fetch(HUB_URL + "/api/v1/google-reviews?lang=" + lang)
      .then((r) => r.json())
      .then((j) => setGsets((s2) => ({ ...s2, [lang]: j && j.reviews && j.reviews.length ? j : false })))
      .catch(() => setGsets((s2) => ({ ...s2, [lang]: false })));
  }, []);
  useEffect(() => { fetchSet(LANG); }, [fetchSet]);

  const C = cfg || {};
  const g = gsets[LANG] || null; // setul principal — dă ratingul, totalul și linkul
  const live = !EDIT_MODE && g;
  const manualAll = !EDIT_MODE
    ? (extra || []).filter((it) => it && it.name && (it.text || "").trim())
    : [];

  // chips: „Toate" + țările de bază (când avem recenzii live) + țările din recenziile manuale
  const manualCountries = [...new Set(manualAll.map((m) => (m.country || "").toLowerCase()).filter(Boolean))];
  const chips = COUNTRY_CHIPS.filter((c) => (live && c.base) || manualCountries.includes(c.key));
  const showChips = !EDIT_MODE && chips.length > 0;
  const activeChip = COUNTRY_CHIPS.find((c) => c.key === flt) || null;
  const setForFilter = flt === "all" ? g : activeChip ? gsets[activeChip.glang] || null : null;
  const setLoading = flt !== "all" && activeChip && gsets[activeChip.glang] === null;
  const pickFilter = (key) => {
    setFlt(key);
    const chip = COUNTRY_CHIPS.find((c) => c.key === key);
    if (chip && gsets[chip.glang] === undefined) fetchSet(chip.glang);
  };

  // în modul editare arătăm testimonialele CMS (ca să rămână editabile);
  // altfel: recenziile Google (max ~5 de la API) + cele adăugate manual în Hub
  const googleItems = !EDIT_MODE && setForFilter && setForFilter.reviews
    ? setForFilter.reviews
        .filter((rv) => (rv.rating || 0) >= (C.minRating ?? 4))
        .filter((rv) => !(C.hidden || []).includes(rv.name))
        .filter((rv) => (flt === "all" ? true : matchesCountry(rv, flt)))
        .sort((a, b) => (C.photosFirst !== false ? (b.photo ? 1 : 0) - (a.photo ? 1 : 0) : 0))
        .map((rv) => ({ name: rv.name, text: rv.text, photo: rv.photo, rating: Math.round(rv.rating || 5), time: rv.time || "", src: "google" }))
    : [];
  const manualItems = manualAll
    .filter((m) => (flt === "all" ? true : (m.country || "").toLowerCase() === flt))
    .map((m) => ({ name: m.name, text: m.text, photo: m.photo || "", rating: Math.round(Number(m.rating) || 5), time: m.time || "", src: "manual" }));
  const wallItems = googleItems.concat(manualItems);
  const useCms = EDIT_MODE || (!live && wallItems.length === 0 && flt === "all");
  const items = useCms ? T.items.map((it) => ({ ...it, src: "cms" })) : wallItems;

  const rating = live && g.rating ? String(g.rating) : T.rating;
  // stiva de avatare respectă aceleași filtre din admin ca zidul (minRating, hidden)
  const stack = live
    ? (g.reviews || [])
        .filter((rv) => (rv.rating || 0) >= (C.minRating ?? 4))
        .filter((rv) => !(C.hidden || []).includes(rv.name))
        .filter((rv) => rv.photo)
        .slice(0, 5)
    : [];
  return (
    <section>
      <div className="testi-band">
        <div className="wrap">
          <div className="testi-head rv">
            <div>
              <div className="eyebrow">{t("testi_eyebrow")}</div>
              <h2 data-edit="testimonials.title">{T.title}</h2>
              <p className="lede" data-edit="testimonials.intro">{T.intro}</p>
            </div>
            <div className="ava-stack rv rv-d1">
              <div className="ava-row">
                {(live ? stack : T.items.slice(0, 3)).map((it, i) =>
                  it.photo ? (
                    <img key={i} src={it.photo} alt="" referrerPolicy="no-referrer" loading="lazy" />
                  ) : (
                    <span key={i} className="plus">{(it.name || "?").trim()[0]}</span>
                  )
                )}
                {live && g.total > stack.length ? <span className="plus">+{g.total - stack.length}</span> : null}
              </div>
              <small><b>{rating}</b> · {live ? t("reviews_count", { n: g.total || items.length }) : t("testi_rating")}</small>
            </div>
          </div>
          {showChips && (
            <div className="testi-filter rv">
              <button type="button" className={flt === "all" ? "on" : ""} onClick={() => pickFilter("all")}>{t("reviews_all")}</button>
              {chips.map((c) => (
                <button type="button" key={c.key} className={flt === c.key ? "on" : ""} onClick={() => pickFilter(c.key)}>
                  {c.flag} {c.label}
                </button>
              ))}
            </div>
          )}
          <div className="testi-wall" data-edit-list={EDIT_MODE ? "testimonials.items" : undefined}>
            <ScoreCard rating={rating} g={live ? g : null} />
            {items.map((item, i) => (
              <div className={`tcard rv rv-d${Math.min(i + 1, 3)}`} key={`${flt}:${item.src}${i}`} data-edit-idx={EDIT_MODE ? i : undefined}>
                <span className="q-mark" aria-hidden="true">„</span>
                <div className="t-id">
                  {item.photo ? (
                    <img className="t-ava" src={item.photo} alt="" referrerPolicy="no-referrer" loading="lazy" />
                  ) : (
                    <span className="t-ava-ph">{(item.name || "?").trim()[0]}</span>
                  )}
                  <div>
                    <b data-edit={`testimonials.items.${i}.name`}>{item.name}</b>
                    {item.src === "cms" ? (
                      <span className="t-meta" data-edit={`testimonials.items.${i}.stay`}>{item.stay}</span>
                    ) : (
                      <span className="t-meta"><span className="t-stars">{"★".repeat(item.rating || 5)}</span>{item.time ? ` · ${item.time}` : ""}</span>
                    )}
                  </div>
                  {item.src === "google" ? <GLogo className="g-mini" size={20} /> : null}
                </div>
                <ClampText text={item.text} dataEdit={`testimonials.items.${i}.text`} />
              </div>
            ))}
          </div>
          {setLoading && <p className="testi-note rv">{t("loading")}</p>}
          {!setLoading && !useCms && items.length === 0 && <p className="testi-note rv">{t("reviews_none")}</p>}
          {!EDIT_MODE && g && g.url && (
            <div className="testi-more rv">
              <a href={g.url} target="_blank" rel="noreferrer">{g.total ? t("all_reviews_g", { n: g.total }) : t("more_reviews")}</a>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

// Extrage ID-ul unui clip din diverse forme de link YouTube (watch, youtu.be, embed, shorts).
// Întoarce "" pentru link-uri de canal (ex: youtube.com/@rootsvillas) — acelea nu se pot încorpora.
export function ytId(url) {
  if (!url) return "";
  const m = String(url).match(/(?:youtu\.be\/|[?&]v=|\/embed\/|\/shorts\/|\/live\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : "";
}

function Video({ video }) {
  const [play, setPlay] = useState(false);
  const id = ytId(video.youtubeUrl);
  const poster = video.image || (id ? `https://i.ytimg.com/vi/${id}/maxresdefault.jpg` : "");
  const posterMob = video.imageMobile || poster;
  return (
    <section className="sec">
      <div className="wrap">
        <div className="rv">
          <div className="eyebrow">{t("video_eyebrow")}</div>
          <h2 data-edit="video.title">{video.title}</h2>
          <p className="lede" data-edit="video.text">{video.text}</p>
          {EDIT_MODE && (
            <div className="video-url-edit" title="Linkul clipului YouTube (youtu.be/... sau watch?v=...) — click și editează">
              🔗 <span data-edit="video.youtubeUrl">{video.youtubeUrl}</span>
            </div>
          )}
        </div>
        <div className="video-card rv rv-d1">
          {play && id && !EDIT_MODE ? (
            <iframe
              className="video-frame"
              src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`}
              title={video.title}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          ) : (
            <button
              type="button"
              className="video-poster"
              onClick={() => { if (EDIT_MODE) return; if (id) setPlay(true); else window.open(video.youtubeUrl, "_blank", "noopener"); }}
              aria-label={id ? "Redă videoclipul Roots" : "Deschide videoclipul Roots pe YouTube"}
            >
              {poster ? (
                <>
                  <img className="video-thumb pic-desk" src={poster} alt="" loading="lazy" referrerPolicy="no-referrer" />
                  <img className="video-thumb pic-mob" src={posterMob} alt="" loading="lazy" referrerPolicy="no-referrer" />
                </>
              ) : (
                <div className="ridgebg" style={{ position: "absolute", inset: "auto 0 0 0" }}><Ridge fill="#0C1F19" height={130} /></div>
              )}
              <div className="vlabel"><span className="dot" />{video.label}</div>
              <div className="playbtn">
                <svg width="30" height="30" viewBox="0 0 24 24" fill="#fff"><path d="M8 5.5v13l11-6.5-11-6.5Z" /></svg>
              </div>
            </button>
          )}
          {EDIT_MODE && (
            <>
              <button type="button" className="vs-add" data-edit-img="video.image">📷 Copertă desktop</button>
              <button type="button" className="pic-mob-btn" data-edit-img="video.imageMobile">📱 Copertă mobil</button>
            </>
          )}
        </div>
      </div>
    </section>
  );
}

function FAQ({ faq }) {
  const [open, setOpen] = useState(null);
  const cats = [...new Set(faq.map((f) => f.cat))];
  return (
    <section className="sec" id="faq" style={{ paddingTop: 60 }}>
      <div className="wrap">
        <div className="rv" style={{ textAlign: "center" }}>
          <div className="eyebrow" style={{ justifyContent: "center" }}>{t("faq_eyebrow")}</div>
          <h2>{t("faq_title")}</h2>
        </div>
        <div className="faq-wrap rv rv-d1" data-edit-list="faq.items">
          {cats.map((cat) => (
            <div key={cat}>
              <div className="faq-cat">{cat}</div>
              {faq.map((f, i) =>
                f.cat !== cat ? null : (
                  <div className={`faq-item ${open === i ? "open" : ""}`} key={i} data-edit-idx={i}>
                    <button className="faq-q" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                      <span data-edit={`faq.items.${i}.q`}>{f.q}</span>
                      {ICONS.chev}
                    </button>
                    <div className="faq-a" style={{ maxHeight: open === i ? 220 : 0 }}>
                      <p data-edit={`faq.items.${i}.a`}>{f.a}</p>
                    </div>
                  </div>
                )
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function LocationSec({ location }) {
  return (
    <section className="sec" id="locatie">
      <div className="wrap loc-grid">
        <div className="rv">
          <div className="eyebrow">Stupini · Brașov</div>
          <h2 data-edit="location.title">{location.title}</h2>
          <p className="lede" data-edit="location.text">{location.text}</p>
          <div className="loc-points" data-edit-list="location.points">
            {location.points.map((p, i) => (
              <div className="loc-point" key={i} data-edit-idx={i}><span data-edit={`location.points.${i}.label`}>{p.label}</span><b data-edit={`location.points.${i}.value`}>{p.value}</b></div>
            ))}
          </div>
        </div>
        <div className="loc-map-col rv rv-d1">
          <div className="loc-map">
            <iframe src={VILLA_MAP_EMBED} title="Hartă ROOTS Villas · Stupini, Brașov" loading="lazy" allowFullScreen referrerPolicy="no-referrer-when-downgrade" />
          </div>
          <a className="loc-map-link" href={location.mapsUrl} target="_blank" rel="noreferrer">{ICONS.pin} {t("open_maps")}</a>
        </div>
      </div>
    </section>
  );
}

function FinalCta({ contact }) {
  return (
    <section id="final" className="final">
      <div className="wrap">
        <div className="eyebrow rv" style={{ justifyContent: "center" }}>{t("final_eyebrow")}</div>
        <h2 className="rv">
          <span className="final-l1">{t("final_title")}</span>
          <span className="final-l2">{t("final_title2")}</span>
        </h2>
        <p className="lede rv rv-d1">{t("final_lede")}</p>
        <div className="hero-ctas rv rv-d2">
          <a href={`https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" className="btn btn-ember">{ICONS.wa} {t("write_wa")}</a>
          <Link to="/rezervare" className="btn btn-ghost">{t("book_on_site")} {ICONS.arrow}</Link>
        </div>
      </div>
    </section>
  );
}

export function Footer({ contact, logo }) {
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot-grid">
          <div>
            <Link to="/" className="logo"><Brand logo={logo} /></Link>
            <p style={{ maxWidth: "30ch" }}>{t("foot_tagline")}</p>
          </div>
          <div>
            <h5>{t("foot_contact")}</h5>
            <a href={`tel:${contact.phone.replace(/\s/g, "")}`}>{ICONS.phone} {contact.phone}</a>
            <a href={`mailto:${contact.email}`}>{ICONS.mail} {contact.email}</a>
          </div>
          <div>
            <h5>{t("foot_social")}</h5>
            <a href={contact.instagram} target="_blank" rel="noreferrer">{ICONS.ig} Instagram</a>
            <a href={contact.tiktok} target="_blank" rel="noreferrer">{ICONS.play} TikTok</a>
          </div>
          <div>
            <h5>{t("foot_policies")}</h5>
            <Link to="/despre-noi">{t("foot_about")}</Link>
            <Link to="/politica-de-confidentialitate">{t("foot_privacy")}</Link>
            <Link to="/politica-cookies">{t("foot_cookies")}</Link>
            <Link to="/termeni-si-conditii">{t("foot_terms")}</Link>
            <a href="https://anpc.ro" target="_blank" rel="noreferrer">{t("foot_anpc")}</a>
            <a href="https://anpc.ro/ce-este-sal/" target="_blank" rel="noreferrer">{t("foot_sal")}</a>
          </div>
        </div>
        <div className="foot-bottom">
          <span>© {new Date().getFullYear()} ROOTS Villas Brașov. {t("foot_rights")}</span>
          <span>
            Stupini · Brașov · România ·{" "}
            <Link to="/cont" style={{ display: "inline", margin: 0 }}>{t("acc_title")}</Link> ·{" "}
            <a href="https://roots-hub-dun.vercel.app/login" style={{ display: "inline", margin: 0 }}>Administrare</a>
          </span>
        </div>
      </div>
    </footer>
  );
}

export function Fabs({ contact }) {
  return (
    <div className="fabs">
      <a className="fab fab-wa" href={`https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" aria-label="WhatsApp" onClick={() => track("contact", { label: "fab_whatsapp" })}>{ICONS.wa}</a>
      <a className="fab fab-call" href={`tel:${contact.phone.replace(/\s/g, "")}`} aria-label="Sună-ne" onClick={() => track("contact", { label: "fab_call" })}>{ICONS.phone}</a>
    </div>
  );
}

/* ============================ ADMIN ============================ */
const ADMIN_SECTIONS = [
  { id: "seo", label: "SEO", icon: "seo" },
  { id: "hero", label: "Hero", icon: "fire" },
  { id: "about", label: "Despre", icon: "edit" },
  { id: "villas", label: "Vilele", icon: "bed" },
  { id: "editorial", label: "Secțiuni editoriale", icon: "edit" },
  { id: "common", label: "Spații comune", icon: "sport" },
  { id: "rules", label: "Regulile casei", icon: "in" },
  { id: "testimonials", label: "Testimoniale", icon: "star" },
  { id: "video", label: "Video", icon: "play" },
  { id: "faq", label: "Întrebări (FAQ)", icon: "quiet" },
  { id: "location", label: "Locație", icon: "pin" },
  { id: "contact", label: "Contact & Social", icon: "phone" },
];

const Fld = ({ label, value, onChange, area, rows = 3, max }) => (
  <div className="fld">
    <label>{label}</label>
    {area ? (
      <textarea rows={rows} value={value} onChange={(e) => onChange(e.target.value)} />
    ) : (
      <input value={value} onChange={(e) => onChange(e.target.value)} />
    )}
    {max && (
      <div className={`chars ${value.length > max ? "warn" : ""}`}>
        {value.length} / {max} caractere recomandate
      </div>
    )}
  </div>
);

const ListEd = ({ items, onChange, area, placeholder = "Text nou", addLabel = "Adaugă element" }) => (
  <div>
    {items.map((it, i) => (
      <div className="list-item" key={i}>
        {area ? (
          <textarea rows={2} value={it} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} />
        ) : (
          <input value={it} onChange={(e) => onChange(items.map((x, j) => (j === i ? e.target.value : x)))} />
        )}
        <button className="icon-btn" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Șterge">{ICONS.trash}</button>
      </div>
    ))}
    <button className="add-btn" onClick={() => onChange([...items, placeholder])}>{ICONS.plus} {addLabel}</button>
  </div>
);

function AdminEditor({ section, content, set }) {
  const c = content;
  switch (section) {
    case "seo":
      return (
        <>
          <div className="hint">Aceste câmpuri controlează cum apare site-ul în Google și pe rețelele sociale. Recomandat: titlu sub 60 de caractere, descriere sub 160.</div>
          <div className="seo-preview">
            <div className="spl">Previzualizare Google</div>
            <div className="st">{c.seo.title || "Titlul paginii"}</div>
            <div className="su">rootsvillas.ro</div>
            <div className="sd">{c.seo.description || "Meta descrierea paginii"}</div>
          </div>
          <Fld label="Meta title" value={c.seo.title} onChange={(v) => set("seo.title", v)} max={60} />
          <Fld label="Meta description" value={c.seo.description} onChange={(v) => set("seo.description", v)} area max={160} />
          <Fld label="Cuvinte cheie (separate prin virgulă)" value={c.seo.keywords} onChange={(v) => set("seo.keywords", v)} area rows={2} />
          <Fld label="Imagine Open Graph (URL)" value={c.seo.ogImage} onChange={(v) => set("seo.ogImage", v)} />
        </>
      );
    case "hero":
      return (
        <>
          <div className="hint">Prima impresie a site-ului. Dacă adaugi un URL de imagine, aceasta va înlocui scena ilustrată de apus.</div>
          <Fld label="Eyebrow (text mic de sus)" value={c.hero.eyebrow} onChange={(v) => set("hero.eyebrow", v)} />
          <div className="row2">
            <Fld label="Titlu — linia 1" value={c.hero.titleA} onChange={(v) => set("hero.titleA", v)} />
            <Fld label="Titlu — linia 2 (aurie)" value={c.hero.titleB} onChange={(v) => set("hero.titleB", v)} />
          </div>
          <Fld label="Subtitlu" value={c.hero.subtitle} onChange={(v) => set("hero.subtitle", v)} area />
          <div className="row2">
            <Fld label="Buton principal" value={c.hero.ctaPrimary} onChange={(v) => set("hero.ctaPrimary", v)} />
            <Fld label="Buton secundar" value={c.hero.ctaSecondary} onChange={(v) => set("hero.ctaSecondary", v)} />
          </div>
          <Fld label="Imagine de fundal (URL — opțional)" value={c.hero.image} onChange={(v) => set("hero.image", v)} />
        </>
      );
    case "about":
      return (
        <>
          <Fld label="Titlu secțiune" value={c.about.title} onChange={(v) => set("about.title", v)} />
          <Fld label="Paragraf 1" value={c.about.text1} onChange={(v) => set("about.text1", v)} area rows={5} />
          <Fld label="Paragraf 2" value={c.about.text2} onChange={(v) => set("about.text2", v)} area rows={5} />
        </>
      );
    case "villas":
      return (
        <>
          {c.villas.map((v, i) => (
            <div className="card-ed" key={v.id}>
              <div className="ce-head"><b>{v.name}</b></div>
              <div className="row2">
                <Fld label="Nume" value={v.name} onChange={(val) => set(`villas.${i}.name`, val)} />
                <Fld label="Tagline" value={v.tagline} onChange={(val) => set(`villas.${i}.tagline`, val)} />
              </div>
              <Fld label="Descriere" value={v.description} onChange={(val) => set(`villas.${i}.description`, val)} area rows={4} />
              <Fld label="Imagine card (URL — opțional)" value={v.image} onChange={(val) => set(`villas.${i}.image`, val)} />
              <div className="fld"><label>Facilități (pe cardul din pagina principală)</label>
                <ListEd items={v.features} onChange={(val) => set(`villas.${i}.features`, val)} addLabel="Adaugă facilitate" />
              </div>
              <div className="hint" style={{ marginBottom: 14 }}>Setări pentru pagina dedicată <b>/vila-{v.id}</b> (hero + calendar Smoobu).</div>
              <Fld label="ID apartament Smoobu (alimentează calendarul)" value={(c.pages && c.pages[v.id] && c.pages[v.id].smoobuId) || ""} onChange={(val) => set(`pages.${v.id}.smoobuId`, val)} />
              <Fld label="Imagine hero pagină vilă (URL)" value={(c.pages && c.pages[v.id] && c.pages[v.id].heroImage) || ""} onChange={(val) => set(`pages.${v.id}.heroImage`, val)} />
              <Fld label="Subtitlu hero pagină vilă" value={(c.pages && c.pages[v.id] && c.pages[v.id].heroSubtitle) || ""} onChange={(val) => set(`pages.${v.id}.heroSubtitle`, val)} area rows={2} />
            </div>
          ))}
        </>
      );
    case "editorial":
      return (
        <>
          <div className="hint">Blocurile de tip „Pentru cine este potrivit" și „Ce diferențe sunt între vile". Poți adăuga oricâte.</div>
          {c.editorial.map((b, i) => (
            <div className="card-ed" key={i}>
              <div className="ce-head">
                <b>Bloc {i + 1}</b>
                <button className="icon-btn" onClick={() => set("editorial", c.editorial.filter((_, j) => j !== i))}>{ICONS.trash}</button>
              </div>
              <Fld label="Titlu" value={b.title} onChange={(v) => set(`editorial.${i}.title`, v)} />
              <div className="fld"><label>Paragrafe</label>
                <ListEd area items={b.paragraphs} onChange={(v) => set(`editorial.${i}.paragraphs`, v)} addLabel="Adaugă paragraf" />
              </div>
            </div>
          ))}
          <button className="add-btn" onClick={() => set("editorial", [...c.editorial, { title: "Titlu nou", paragraphs: ["Paragraf nou"] }])}>{ICONS.plus} Adaugă bloc editorial</button>
        </>
      );
    case "common":
      return (
        <>
          <Fld label="Titlu" value={c.common.title} onChange={(v) => set("common.title", v)} />
          <Fld label="Descriere" value={c.common.text} onChange={(v) => set("common.text", v)} area rows={4} />
          <Fld label="Imagine (URL — opțional)" value={c.common.image || ""} onChange={(v) => set("common.image", v)} />
          <div className="fld"><label>Facilități comune</label>
            <ListEd items={c.common.features} onChange={(v) => set("common.features", v)} addLabel="Adaugă facilitate" />
          </div>
        </>
      );
    case "rules":
      return (
        <>
          <Fld label="Titlu" value={c.rules.title} onChange={(v) => set("rules.title", v)} />
          <Fld label="Introducere" value={c.rules.intro} onChange={(v) => set("rules.intro", v)} area />
          <div className="fld"><label>Reguli</label>
            {c.rules.items.map((r, i) => (
              <div className="list-item" key={i}>
                <select value={r.icon} onChange={(e) => set(`rules.items.${i}.icon`, e.target.value)} style={{ width: 120, border: "1.5px solid var(--line)", borderRadius: 11, padding: "0 8px", fontFamily: "inherit", fontSize: 13 }}>
                  {["in", "out", "quiet", "people", "party", "pet", "fire", "tub"].map((k) => <option key={k} value={k}>{k}</option>)}
                </select>
                <input value={r.text} onChange={(e) => set(`rules.items.${i}.text`, e.target.value)} />
                <button className="icon-btn" onClick={() => set("rules.items", c.rules.items.filter((_, j) => j !== i))}>{ICONS.trash}</button>
              </div>
            ))}
            <button className="add-btn" onClick={() => set("rules.items", [...c.rules.items, { icon: "people", text: "Regulă nouă" }])}>{ICONS.plus} Adaugă regulă</button>
          </div>
        </>
      );
    case "testimonials":
      return (
        <>
          <Fld label="Titlu" value={c.testimonials.title} onChange={(v) => set("testimonials.title", v)} />
          <Fld label="Introducere" value={c.testimonials.intro} onChange={(v) => set("testimonials.intro", v)} area rows={2} />
          <Fld label="Rating afișat (ex: 4.9)" value={c.testimonials.rating} onChange={(v) => set("testimonials.rating", v)} />
          {c.testimonials.items.map((t, i) => (
            <div className="card-ed" key={i}>
              <div className="ce-head">
                <b>Testimonial {i + 1}</b>
                <button className="icon-btn" onClick={() => set("testimonials.items", c.testimonials.items.filter((_, j) => j !== i))}>{ICONS.trash}</button>
              </div>
              <div className="row2">
                <Fld label="Nume" value={t.name} onChange={(v) => set(`testimonials.items.${i}.name`, v)} />
                <Fld label="Context sejur" value={t.stay} onChange={(v) => set(`testimonials.items.${i}.stay`, v)} />
              </div>
              <Fld label="Text" value={t.text} onChange={(v) => set(`testimonials.items.${i}.text`, v)} area rows={3} />
            </div>
          ))}
          <button className="add-btn" onClick={() => set("testimonials.items", [...c.testimonials.items, { name: "Nume", stay: "Sejur", text: "Recenzie nouă" }])}>{ICONS.plus} Adaugă testimonial</button>
        </>
      );
    case "video":
      return (
        <>
          <Fld label="Titlu" value={c.video.title} onChange={(v) => set("video.title", v)} />
          <Fld label="Descriere" value={c.video.text} onChange={(v) => set("video.text", v)} area rows={2} />
          <Fld label="Etichetă pe card" value={c.video.label} onChange={(v) => set("video.label", v)} />
          <div className="hint">Pune linkul unui <b>clip</b> (ex: https://www.youtube.com/watch?v=... sau https://youtu.be/...) ca să se redea direct în pagină. Un link de canal (youtube.com/@rootsvillas) deschide YouTube într-un tab nou.</div>
          <Fld label="Link YouTube" value={c.video.youtubeUrl} onChange={(v) => set("video.youtubeUrl", v)} />
          <Fld label="Imagine poster (URL, opțional)" value={c.video.image || ""} onChange={(v) => set("video.image", v)} />
        </>
      );
    case "faq":
      return (
        <>
          <div className="hint">Întrebările sunt grupate automat pe categorii, în ordinea în care apar. Categoriile existente: Rezervare, Facilități, Plata, Politica de anulare, General.</div>
          {c.faq.map((f, i) => (
            <div className="card-ed" key={i}>
              <div className="ce-head">
                <b>#{i + 1}</b>
                <button className="icon-btn" onClick={() => set("faq", c.faq.filter((_, j) => j !== i))}>{ICONS.trash}</button>
              </div>
              <div className="row2">
                <Fld label="Categorie" value={f.cat} onChange={(v) => set(`faq.${i}.cat`, v)} />
                <Fld label="Întrebare" value={f.q} onChange={(v) => set(`faq.${i}.q`, v)} />
              </div>
              <Fld label="Răspuns" value={f.a} onChange={(v) => set(`faq.${i}.a`, v)} area rows={3} />
            </div>
          ))}
          <button className="add-btn" onClick={() => set("faq", [...c.faq, { cat: "General", q: "Întrebare nouă?", a: "Răspuns." }])}>{ICONS.plus} Adaugă întrebare</button>
        </>
      );
    case "location":
      return (
        <>
          <Fld label="Titlu" value={c.location.title} onChange={(v) => set("location.title", v)} />
          <Fld label="Descriere" value={c.location.text} onChange={(v) => set("location.text", v)} area rows={5} />
          <Fld label="Link Google Maps" value={c.location.mapsUrl} onChange={(v) => set("location.mapsUrl", v)} />
          <div className="fld"><label>Distanțe afișate</label>
            {c.location.points.map((p, i) => (
              <div className="list-item" key={i}>
                <input value={p.label} onChange={(e) => set(`location.points.${i}.label`, e.target.value)} />
                <input value={p.value} style={{ maxWidth: 130 }} onChange={(e) => set(`location.points.${i}.value`, e.target.value)} />
                <button className="icon-btn" onClick={() => set("location.points", c.location.points.filter((_, j) => j !== i))}>{ICONS.trash}</button>
              </div>
            ))}
            <button className="add-btn" onClick={() => set("location.points", [...c.location.points, { label: "Reper nou", value: "0 min" }])}>{ICONS.plus} Adaugă reper</button>
          </div>
        </>
      );
    case "contact":
      return (
        <>
          <div className="row2">
            <Fld label="Telefon" value={c.contact.phone} onChange={(v) => set("contact.phone", v)} />
            <Fld label="WhatsApp (număr)" value={c.contact.whatsapp} onChange={(v) => set("contact.whatsapp", v)} />
          </div>
          <Fld label="Email" value={c.contact.email} onChange={(v) => set("contact.email", v)} />
          <Fld label="Instagram (URL)" value={c.contact.instagram} onChange={(v) => set("contact.instagram", v)} />
          <Fld label="TikTok (URL)" value={c.contact.tiktok} onChange={(v) => set("contact.tiktok", v)} />
        </>
      );
    default:
      return null;
  }
}

function Admin({ content, setContent, onClose, onSave, onReset, saved }) {
  const [section, setSection] = useState("seo");
  const set = useCallback(
    (path, value) => {
      setContent((prev) => {
        const next = JSON.parse(JSON.stringify(prev));
        const keys = path.split(".");
        let obj = next;
        for (let i = 0; i < keys.length - 1; i++) obj = obj[keys[i]];
        obj[keys[keys.length - 1]] = value;
        return next;
      });
    },
    [setContent]
  );
  const current = ADMIN_SECTIONS.find((s) => s.id === section);
  return (
    <div className="adm" role="dialog" aria-label="Panou de administrare">
      <div className="adm-scrim" onClick={onClose} />
      <div className="adm-panel">
        <nav className="adm-nav">
          <span className="adm-logo">ROOTS · Admin</span>
          {ADMIN_SECTIONS.map((s) => (
            <button key={s.id} className={section === s.id ? "act" : ""} onClick={() => setSection(s.id)}>
              {ICONS[s.icon]} {s.label}
            </button>
          ))}
        </nav>
        <div className="adm-main">
          <div className="adm-head">
            <h3>{current.label}</h3>
            <div className="acts">
              <button className={`adm-save ${saved ? "saved" : ""}`} onClick={onSave}>
                {ICONS.save} {saved ? "Salvat ✓" : "Salvează modificările"}
              </button>
              <button className="adm-close" onClick={onClose} aria-label="Închide">{ICONS.x}</button>
            </div>
          </div>
          <div className="adm-body">
            <AdminEditor section={section} content={content} set={set} />
            <div>
              <button className="reset-link" onClick={onReset}>Resetează tot conținutul la varianta inițială</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================ APP ============================ */
export default function RootsVillas() {
  const [hubRaw, setHubRaw] = useState(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setHubRaw(await loadHubRaw());
      } catch (e) {
        /* nu există conținut salvat încă — folosim varianta implicită */
      }
      setLoaded(true);
    })();
  }, []);

  const content = useMemo(() => ({ ...DEFAULT_CONTENT, ...hubToSite(hubRaw || {}) }), [hubRaw]);

  useEffect(() => {
    if (content.seo && content.seo.title) document.title = content.seo.title;
  }, [content.seo]);

  useReveal();

  if (!loaded) {
    return <TreeLoader label={t("loading")} />;
  }

  return (
    <div className="roots">
      <style>{CSS}</style>
      <ThemeStyle content={content} />
      <Header content={content} />
      <Hero hero={content.hero} brand={content.brand} />
      <About about={content.about} />
      <Villas villas={content.villas} contact={content.contact} />
      <RootDivider />
      <Editorial editorial={content.editorial} />
      <Common common={content.common} />
      <Rules rules={content.rules} />
      <Testimonials t={content.testimonials} cfg={content.reviews} extra={content.extraReviews} />
      <Video video={content.video} />
      <FAQ faq={content.faq} />
      <LocationSec location={content.location} />
      <FinalCta contact={content.contact} />
      <Footer contact={content.contact} logo={content.brand?.logo} />
      <Fabs contact={content.contact} />
      {EDIT_MODE && hubRaw && <HubEditor hubRaw={hubRaw} setHubRaw={setHubRaw} />}
    </div>
  );
}
