import React, { useState, useEffect, useRef, useCallback } from "react";
import { Link } from "react-router-dom";

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
  { title: "Regulile casei", items: ["Check-in după 16:00", "Checkout înainte de 12:00", "Maxim 8–10 persoane", "Ore de liniște între 22:00 și 08:00", "Acceptăm animalele de companie"] },
  { title: "Safety & Property", items: ["Camere video în exteriorul proprietății", "Alarmă pentru monoxid de carbon", "Alarmă de incendiu", "Alarmă de efracție"] },
  { title: "Politica de anulare", items: ["Anularea este gratuită până la 15 zile înainte de check-in", "Mai multe detalii în secțiunea „Întrebări frecvente”"] },
  { title: "Despre unitate", items: ["Tip proprietate: vilă privată, închiriere integrală", "Capacitate: 8 persoane incluse, maximum 10 persoane", "Dormitoare: 4 dormitoare duble", "Băi: 4 băi private", "Wellness: ciubăr privat încălzit pe gaz și saună", "Localizare: Stupini, Brașov"] },
];
const VILLA_MAP_EMBED = "https://maps.google.com/maps?q=Stupini%2C%20Bra%C8%99ov&z=14&output=embed";

export const DEFAULT_CONTENT = {
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
    mapsUrl: "https://maps.google.com/?q=Roots+Villas+Stupini+Brasov",
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
};

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
.nav{display:flex;gap:26px;align-items:center}
.nav a{color:rgba(255,255,255,.85);text-decoration:none;font-size:14.5px;font-weight:600;transition:color .3s}
.hdr.solid .nav a{color:var(--ink-soft)}
.nav a:hover{color:var(--ember-2)}
.nav .cta{color:#fff;background:var(--ember);padding:10px 20px;border-radius:100px;box-shadow:0 6px 18px rgba(232,114,44,.35)}
.nav .cta:hover{color:#fff;background:var(--ember-2);transform:translateY(-1px)}
@media(max-width:760px){.nav a:not(.cta){display:none}}

/* ---- hero: scena de seară ---- */
.hero{min-height:100svh;display:flex;align-items:flex-end;color:#fff;overflow:hidden;
  background:linear-gradient(180deg,#0B1626 0%,#152B3D 30%,#3D4A56 52%,#8A5A46 68%,#C4713C 80%,#E88940 92%)}
.hero-photo{position:absolute;inset:0;background-size:cover;background-position:center;opacity:.55;mix-blend-mode:luminosity}
.hero-veil{position:absolute;inset:0;background:linear-gradient(180deg,rgba(11,22,38,.25),rgba(11,22,38,.05) 45%,rgba(12,31,25,.82) 100%)}
.ridge{position:absolute;left:0;right:0;pointer-events:none}
.ridge svg{display:block;width:100%;height:auto}
.ridge-far{bottom:120px;opacity:.5}
.ridge-near{bottom:0}
.hero-inner{position:relative;z-index:3;width:100%;padding:0 0 96px}
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
.scroll-hint{position:absolute;bottom:26px;left:50%;transform:translateX(-50%);z-index:4;width:24px;height:38px;border:1.5px solid rgba(255,255,255,.5);border-radius:14px}
.scroll-hint::after{content:"";position:absolute;top:7px;left:50%;width:3px;height:7px;margin-left:-1.5px;border-radius:3px;background:var(--gold);animation:drip 1.8s infinite}
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
.sec{padding:110px 0}
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
.stat:first-child{border-left:none;padding-left:0}
.stat b{display:block;font-family:'Fraunces',serif;font-weight:500;font-size:34px;color:var(--pine)}
.stat span{font-size:13px;font-weight:600;color:var(--ink-soft);letter-spacing:.04em}

/* villa cards */
.villas-band{background:var(--pine);color:var(--ivory);border-radius:44px;margin:0 14px;padding:110px 0}
.villas-band .eyebrow{color:var(--gold)}.villas-band .eyebrow::before{background:var(--gold)}
.villas-band h2{color:var(--ivory)}
.villas-band .lede{color:rgba(251,247,239,.72)}
.villa-grid{display:grid;grid-template-columns:1fr 1fr;gap:26px;margin-top:56px}
@media(max-width:860px){.villa-grid{grid-template-columns:1fr}}
.vcard{background:rgba(251,247,239,.05);border:1px solid rgba(251,247,239,.12);border-radius:var(--r);overflow:hidden;transition:transform .45s cubic-bezier(.2,.7,.2,1),box-shadow .45s,border-color .45s}
.vcard:hover{transform:translateY(-8px);border-color:rgba(233,184,114,.4);box-shadow:0 30px 60px rgba(0,0,0,.35)}
.vcard-media{height:250px;position:relative;overflow:hidden;background:linear-gradient(160deg,#1B4033,#0C1F19)}
.vcard-media .ph{position:absolute;inset:0;background-size:cover;background-position:center;transition:transform 1.2s cubic-bezier(.2,.7,.2,1)}
.vcard:hover .vcard-media .ph{transform:scale(1.06)}
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
.common{background:var(--sand);border-radius:44px;margin:0 14px;padding:96px 0}
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

/* testimonials */
.testi-band{background:var(--night);color:#fff;border-radius:44px;margin:0 14px;padding:100px 0;overflow:hidden;position:relative}
.testi-band .eyebrow{color:var(--gold)}.testi-band .eyebrow::before{background:var(--gold)}
.testi-band h2{color:#fff}
.testi-band .lede{color:rgba(255,255,255,.65)}
.testi-head{display:flex;justify-content:space-between;align-items:flex-end;gap:30px;flex-wrap:wrap}
.rating-badge{display:flex;align-items:center;gap:14px}
.rating-badge b{font-family:'Fraunces',serif;font-size:56px;font-weight:500;color:var(--gold)}
.stars{display:flex;gap:2px;color:var(--gold)}
.rating-badge span{display:block;font-size:12.5px;color:rgba(255,255,255,.55);font-weight:600}
.testi-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin-top:52px}
@media(max-width:900px){.testi-grid{grid-template-columns:1fr}}
.tcard{background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:20px;padding:30px 28px;display:flex;flex-direction:column;gap:18px;transition:transform .35s,border-color .35s}
.tcard:hover{transform:translateY(-6px);border-color:rgba(233,184,114,.4)}
.tcard .q{font-family:'Fraunces',serif;font-size:40px;line-height:0;color:var(--gold);height:14px}
.tcard p{font-size:15px;line-height:1.7;color:rgba(255,255,255,.85);flex:1}
.tcard .who b{display:block;font-size:14.5px}
.tcard .who span{font-size:12.5px;color:rgba(255,255,255,.5);font-weight:600}

/* video */
.video-card{margin-top:48px;border-radius:var(--r);overflow:hidden;position:relative;aspect-ratio:16/8.2;background:linear-gradient(160deg,#152B3D,#0C1F19);display:grid;place-items:center;cursor:pointer;text-decoration:none}
.video-card .ridgebg{position:absolute;inset:auto 0 0 0;opacity:.6}
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
.map-card{border-radius:var(--r);overflow:hidden;aspect-ratio:4/4;position:relative;background:linear-gradient(150deg,#E8EFE4,#D7E4D2);display:grid;place-items:center;text-decoration:none}
.map-card .roads{position:absolute;inset:0;opacity:.5}
.map-pin{position:relative;z-index:2;display:flex;flex-direction:column;align-items:center;gap:10px;color:var(--pine)}
.map-pin .pindrop{width:58px;height:58px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:var(--ember);display:grid;place-items:center;box-shadow:0 14px 30px rgba(232,114,44,.4);animation:bob 2.6s ease-in-out infinite}
.map-pin .pindrop span{transform:rotate(45deg);color:#fff;font-weight:800;font-size:13px;letter-spacing:.06em}
@keyframes bob{0%,100%{transform:rotate(-45deg) translate(0,0)}50%{transform:rotate(-45deg) translate(-5px,-5px)}}
.map-pin b{font-weight:800;font-size:15px}
.map-pin small{font-size:12.5px;font-weight:600;color:var(--ink-soft)}

/* final CTA */
.final{background:linear-gradient(180deg,var(--pine) 0%,var(--pine-3) 100%);color:var(--ivory);border-radius:44px;margin:0 14px;padding:120px 0;text-align:center;position:relative;overflow:hidden}
.final h2{color:var(--ivory);max-width:18ch;margin:0 auto}
.final .lede{margin-left:auto;margin-right:auto;color:rgba(251,247,239,.7)}
.final .hero-ctas{justify-content:center}

/* footer */
.foot{background:var(--night);color:#fff;padding:80px 0 40px;margin-top:-46px;padding-top:126px}
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

/* Încarcă conținutul CMS (read-only) — folosit de paginile de vilă */
export function useSiteContent() {
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [loaded, setLoaded] = useState(false);
  useEffect(() => {
    (async () => {
      try {
        if (window.storage) {
          const res = await window.storage.get(STORAGE_KEY);
          if (res && res.value) setContent({ ...DEFAULT_CONTENT, ...JSON.parse(res.value) });
        }
      } catch (e) {
        /* fără conținut salvat — folosim varianta implicită */
      }
      setLoaded(true);
    })();
  }, []);
  return { content, loaded };
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

/* ============================ PUBLIC SITE ============================ */
export function Header({ content }) {
  const scrolled = useScrolled();
  return (
    <header className={`hdr ${scrolled ? "solid" : ""}`}>
      <div className="wrap">
        <a href="#top" className="logo">
          <span className="logo-ring">R</span>ROOTS
        </a>
        <nav className="nav">
          <a href="#vile">Vilele</a>
          <a href="#spatii">Spații comune</a>
          <a href="#reguli">Regulile casei</a>
          <a href="#faq">Întrebări</a>
          <a href="#locatie">Locație</a>
          <a href={`https://wa.me/${content.contact.whatsapp.replace(/[^0-9]/g, "")}`} className="cta" target="_blank" rel="noreferrer">
            Rezervă acum
          </a>
        </nav>
      </div>
    </header>
  );
}

function Hero({ hero }) {
  return (
    <section className="hero" id="top">
      {hero.image && <div className="hero-photo" style={{ backgroundImage: `url(${hero.image})` }} />}
      <div className="hero-veil" />
      <div className="fireglow" />
      <Embers />
      <div className="ridge ridge-far"><Ridge fill="#16342A" height={120} /></div>
      <div className="ridge ridge-near"><Ridge fill="#0C1F19" height={170} /></div>
      <div className="hero-inner wrap">
        <div className="hero-eyebrow fade-up" style={{ animationDelay: ".3s" }}>{hero.eyebrow}</div>
        <h1>
          <span className="h1-line"><span>{hero.titleA}</span></span>
          <span className="h1-line"><span className="warm">{hero.titleB}</span></span>
        </h1>
        <p className="hero-sub fade-up">{hero.subtitle}</p>
        <div className="hero-ctas fade-up d2">
          <a href="#final" className="btn btn-ember">{hero.ctaPrimary} {ICONS.arrow}</a>
          <a href="#vile" className="btn btn-ghost">{hero.ctaSecondary}</a>
        </div>
      </div>
      <div className="scroll-hint" aria-hidden="true" />
    </section>
  );
}

function About({ about }) {
  return (
    <section className="sec">
      <div className="wrap about-grid">
        <div className="rv">
          <div className="eyebrow">Despre Roots</div>
          <h2>{about.title}</h2>
        </div>
        <div className="rv rv-d1">
          <p className="lede" style={{ marginTop: 0 }}>{about.text1}</p>
          <p className="lede">{about.text2}</p>
          <div className="stat-row">
            <div className="stat"><b>2</b><span>vile private</span></div>
            <div className="stat"><b>8–10</b><span>persoane / vilă</span></div>
            <div className="stat"><b>4</b><span>dormitoare cu baie</span></div>
            <div className="stat"><b>10'</b><span>de centrul Brașovului</span></div>
          </div>
        </div>
      </div>
    </section>
  );
}

function VillaCard({ villa, delay, contact }) {
  return (
    <article className={`vcard rv ${delay}`}>
      <div className="vcard-media">
        {villa.image ? (
          <div className="ph" style={{ backgroundImage: `url(${villa.image})` }} />
        ) : (
          <>
            <div style={{ position: "absolute", inset: "auto 0 0 0" }}>
              <Ridge fill="rgba(233,184,114,.14)" height={110} />
            </div>
            <div className="glow" />
          </>
        )}
        <span className="vcard-tag">{villa.id === "redwood" ? "Vila 01" : "Vila 02"}</span>
      </div>
      <div className="vcard-body">
        <h3>{villa.name}</h3>
        <div className="tagline">{villa.tagline}</div>
        <p className="desc">{villa.description}</p>
        <div className="feat-list">
          {villa.features.map((f, i) => (
            <div className="feat" key={i}>
              {ICONS[FEATURE_ICON_ORDER[i % FEATURE_ICON_ORDER.length]]}
              <span>{f}</span>
            </div>
          ))}
        </div>
        <div className="vcard-ctas">
          <a href={`https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, "")}?text=${encodeURIComponent("Bună! Aș dori o rezervare la " + villa.name)}`} target="_blank" rel="noreferrer" className="btn btn-ember">Rezervă acum</a>
          <Link to={`/vila-${villa.id}`} className="btn btn-outline-ivory">Vezi detalii</Link>
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
            <div className="eyebrow">Alege-ți vila</div>
            <h2>Două vile, aceeași căldură</h2>
            <p className="lede">Capacitate și confort identice — diferă doar felul în care îți place să petreci serile.</p>
          </div>
          <div className="villa-grid">
            {villas.map((v, i) => (
              <VillaCard key={v.id} villa={v} contact={contact} delay={i === 1 ? "rv-d1" : ""} />
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
      <div className="wrap edit-grid">
        {editorial.map((b, i) => (
          <div className={`edit-block rv ${i === 1 ? "rv-d1" : ""}`} key={i}>
            <h3>{b.title}</h3>
            {b.paragraphs.map((p, j) => <p key={j}>{p}</p>)}
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
            <div className="eyebrow">Între vile</div>
            <h2>{common.title}</h2>
            <p className="lede">{common.text}</p>
            <div className="pill-list">
              {common.features.map((f, i) => (
                <div className="pill" key={i}>{ICONS[COMMON_ICON_ORDER[i % COMMON_ICON_ORDER.length]]}<span>{f}</span></div>
              ))}
            </div>
          </div>
          <div className="common-art rv rv-d1">
            {common.image ? <div className="ph" style={{ backgroundImage: `url(${common.image})` }} /> : (
              <>
                <div className="sun" />
                <div style={{ position: "absolute", inset: "auto 0 0 0" }}><Ridge fill="#0C1F19" height={150} /></div>
                <div style={{ position: "absolute", inset: "auto 0 60px 0", opacity: .45 }}><Ridge fill="#1B4033" height={130} /></div>
              </>
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
          <div className="eyebrow" style={{ justifyContent: "center" }}>Sejur fără griji</div>
          <h2>{rules.title}</h2>
          <p className="lede" style={{ margin: "20px auto 0" }}>{rules.intro}</p>
        </div>
        <div className="rules-grid">
          {rules.items.map((r, i) => (
            <div className={`rule rv ${i % 3 === 1 ? "rv-d1" : i % 3 === 2 ? "rv-d2" : ""}`} key={i}>
              <div className="icon">{ICONS[r.icon] || ICONS.people}</div>
              <p>{r.text}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Testimonials({ t }) {
  return (
    <section>
      <div className="testi-band">
        <div className="wrap">
          <div className="testi-head rv">
            <div>
              <div className="eyebrow">Oaspeții Roots</div>
              <h2>{t.title}</h2>
              <p className="lede">{t.intro}</p>
            </div>
            <div className="rating-badge">
              <b>{t.rating}</b>
              <div>
                <div className="stars">{[0,1,2,3,4].map((i) => <span key={i}>{ICONS.star}</span>)}</div>
                <span>rating mediu Google</span>
              </div>
            </div>
          </div>
          <div className="testi-grid">
            {t.items.map((item, i) => (
              <div className={`tcard rv ${i === 1 ? "rv-d1" : i === 2 ? "rv-d2" : ""}`} key={i}>
                <div className="q">"</div>
                <p>{item.text}</p>
                <div className="who"><b>{item.name}</b><span>{item.stay}</span></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Video({ video }) {
  return (
    <section className="sec">
      <div className="wrap">
        <div className="rv">
          <div className="eyebrow">Atmosfera Roots</div>
          <h2>{video.title}</h2>
          <p className="lede">{video.text}</p>
        </div>
        <a className="video-card rv rv-d1" href={video.youtubeUrl} target="_blank" rel="noreferrer" aria-label="Deschide videoclipul Roots pe YouTube">
          <div className="vlabel"><span className="dot" />{video.label}</div>
          <div className="ridgebg" style={{ position: "absolute", inset: "auto 0 0 0" }}><Ridge fill="#0C1F19" height={130} /></div>
          <div className="playbtn">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="#fff"><path d="M8 5.5v13l11-6.5-11-6.5Z" /></svg>
          </div>
        </a>
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
          <div className="eyebrow" style={{ justifyContent: "center" }}>Bine de știut</div>
          <h2>Întrebări frecvente</h2>
        </div>
        <div className="faq-wrap rv rv-d1">
          {cats.map((cat) => (
            <div key={cat}>
              <div className="faq-cat">{cat}</div>
              {faq.map((f, i) =>
                f.cat !== cat ? null : (
                  <div className={`faq-item ${open === i ? "open" : ""}`} key={i}>
                    <button className="faq-q" onClick={() => setOpen(open === i ? null : i)} aria-expanded={open === i}>
                      {f.q}
                      {ICONS.chev}
                    </button>
                    <div className="faq-a" style={{ maxHeight: open === i ? 220 : 0 }}>
                      <p>{f.a}</p>
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
          <h2>{location.title}</h2>
          <p className="lede">{location.text}</p>
          <div className="loc-points">
            {location.points.map((p, i) => (
              <div className="loc-point" key={i}><span>{p.label}</span><b>{p.value}</b></div>
            ))}
          </div>
        </div>
        <a className="map-card rv rv-d1" href={location.mapsUrl} target="_blank" rel="noreferrer">
          <svg className="roads" viewBox="0 0 400 400" preserveAspectRatio="none">
            <path d="M60,0 C80,120 40,240 90,400" stroke="#B9CDB3" strokeWidth="14" fill="none" />
            <path d="M0,150 C140,130 260,190 400,160" stroke="#C8D9C2" strokeWidth="9" fill="none" />
            <path d="M320,0 C300,140 340,260 310,400" stroke="#C8D9C2" strokeWidth="7" fill="none" />
            <path d="M0,300 C120,290 300,320 400,300" stroke="#D4E2CE" strokeWidth="6" fill="none" />
          </svg>
          <div className="map-pin">
            <div className="pindrop"><span>R</span></div>
            <b>ROOTS Villas · Stupini</b>
            <small>Deschide în Google Maps →</small>
          </div>
        </a>
      </div>
    </section>
  );
}

function FinalCta({ contact }) {
  return (
    <section id="final">
      <div className="final">
        <Embers />
        <div className="wrap" style={{ position: "relative", zIndex: 2 }}>
          <div className="eyebrow rv" style={{ justifyContent: "center" }}>Următorul vostru weekend</div>
          <h2 className="rv">Locul e pregătit. Focul așteaptă.</h2>
          <p className="lede rv rv-d1">Scrie-ne pe WhatsApp sau sună-ne — îți răspundem rapid cu disponibilitatea și toate detaliile.</p>
          <div className="hero-ctas rv rv-d2">
            <a href={`https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" className="btn btn-ember">{ICONS.wa} Scrie-ne pe WhatsApp</a>
            <a href={`tel:${contact.phone.replace(/\s/g, "")}`} className="btn btn-ghost">{ICONS.phone} {contact.phone}</a>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Footer({ contact }) {
  return (
    <footer className="foot">
      <div className="wrap">
        <div className="foot-grid">
          <div>
            <a href="#top" className="logo"><span className="logo-ring">R</span>ROOTS</a>
            <p style={{ maxWidth: "30ch" }}>Două vile private în Stupini, Brașov — pentru serile care merită ținute minte.</p>
          </div>
          <div>
            <h5>Contact</h5>
            <a href={`tel:${contact.phone.replace(/\s/g, "")}`}>{ICONS.phone} {contact.phone}</a>
            <a href={`mailto:${contact.email}`}>{ICONS.mail} {contact.email}</a>
          </div>
          <div>
            <h5>Social media</h5>
            <a href={contact.instagram} target="_blank" rel="noreferrer">{ICONS.ig} Instagram</a>
            <a href={contact.tiktok} target="_blank" rel="noreferrer">{ICONS.play} TikTok</a>
          </div>
          <div>
            <h5>Politici</h5>
            <a href="#top">Politica de confidențialitate</a>
            <a href="#top">Politica cookies</a>
            <a href="#top">Termeni și condiții</a>
            <a href="#top">ANPC — reclamații consumatori</a>
            <a href="#top">SAL — soluționarea litigiilor</a>
          </div>
        </div>
        <div className="foot-bottom">
          <span>© {new Date().getFullYear()} ROOTS Villas Brașov. Toate drepturile rezervate.</span>
          <span>Stupini · Brașov · România</span>
        </div>
      </div>
    </footer>
  );
}

export function Fabs({ contact }) {
  return (
    <div className="fabs">
      <a className="fab fab-wa" href={`https://wa.me/${contact.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer" aria-label="WhatsApp">{ICONS.wa}</a>
      <a className="fab fab-call" href={`tel:${contact.phone.replace(/\s/g, "")}`} aria-label="Sună-ne">{ICONS.phone}</a>
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
          <Fld label="Link YouTube" value={c.video.youtubeUrl} onChange={(v) => set("video.youtubeUrl", v)} />
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
  const [content, setContent] = useState(DEFAULT_CONTENT);
  const [loaded, setLoaded] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    (async () => {
      try {
        if (window.storage) {
          const res = await window.storage.get(STORAGE_KEY);
          if (res && res.value) {
            const parsed = JSON.parse(res.value);
            setContent({ ...DEFAULT_CONTENT, ...parsed });
          }
        }
      } catch (e) {
        /* nu există conținut salvat încă — folosim varianta implicită */
      }
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (content.seo && content.seo.title) document.title = content.seo.title;
  }, [content.seo]);

  useReveal();

  const save = async () => {
    try {
      if (window.storage) await window.storage.set(STORAGE_KEY, JSON.stringify(content));
      setSaved(true);
      setToast("Modificările au fost salvate — sunt vizibile imediat pe site.");
      setTimeout(() => setSaved(false), 2000);
      setTimeout(() => setToast(""), 3200);
    } catch (e) {
      setToast("Salvarea nu a reușit. Încearcă din nou.");
      setTimeout(() => setToast(""), 3200);
    }
  };

  const reset = async () => {
    setContent(DEFAULT_CONTENT);
    try {
      if (window.storage) await window.storage.delete(STORAGE_KEY);
    } catch (e) {}
    setToast("Conținutul a fost resetat la varianta inițială.");
    setTimeout(() => setToast(""), 3200);
  };

  if (!loaded) {
    return (
      <div style={{ minHeight: "100vh", display: "grid", placeItems: "center", background: "#FBF7EF", fontFamily: "sans-serif", color: "#122B22" }}>
        Se încarcă Roots Villas…
      </div>
    );
  }

  return (
    <div className="roots">
      <style>{CSS}</style>
      <Header content={content} />
      <Hero hero={content.hero} />
      <About about={content.about} />
      <Villas villas={content.villas} contact={content.contact} />
      <RootDivider />
      <Editorial editorial={content.editorial} />
      <Common common={content.common} />
      <Rules rules={content.rules} />
      <Testimonials t={content.testimonials} />
      <Video video={content.video} />
      <FAQ faq={content.faq} />
      <LocationSec location={content.location} />
      <FinalCta contact={content.contact} />
      <Footer contact={content.contact} />
      <Fabs contact={content.contact} />
      <button className="admin-fab" onClick={() => setAdminOpen(true)}>{ICONS.edit} Admin</button>
      {adminOpen && (
        <Admin
          content={content}
          setContent={setContent}
          onClose={() => setAdminOpen(false)}
          onSave={save}
          onReset={reset}
          saved={saved}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
