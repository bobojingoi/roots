// seed.js — cont owner inițial + conținutul real Roots în CMS (draft + publicat)
// Rulare: npm run seed  (idempotent — nu suprascrie secțiuni deja editate)
require('dotenv').config();
const { pool, initDb } = require('./db');
const { hashPassword } = require('./auth'); // același format ca la verificare

// Conținutul real Roots (din seed-content.md — sursa canonică a textelor)
const CONTENT = {
  brand: {
    // logo-ul site-ului: gol = textul „R ROOTS"; pune un URL de imagine (din Galerie media) ca să-l înlocuiești
    logo: '',
  },
  seo: {
    title: 'ROOTS Villas Brașov — Două vile private cu ciubăr și saună',
    description:
      'Două vile private în Stupini, Brașov, pentru grupuri de 8–10 persoane. 4 dormitoare cu baie proprie, ciubăr încălzit pe gaz, saună, firepit și spațiu exterior privat.',
    keywords:
      'vile Brașov, cazare grup Brașov, vilă cu ciubăr, vilă cu saună, Stupini, Poiana Brașov, vacanță cu prietenii',
    ogImage: null,
  },
  hero: {
    eyebrow: 'Stupini · Brașov · la 10 minute de centru',
    titleA: 'Tot ce îți poți imagina.',
    titleB: 'Într-un singur loc.',
    subtitle:
      'Două vile private pentru grupuri de 8–10 persoane — ciubăr sub cerul liber, saună, firepit și liniștea unei seri la munte.',
    ctaPrimary: 'Rezervă acum',
    ctaSecondary: 'Descoperă vilele',
    image: null,
  },
  about: {
    title: 'Cele două vile ROOTS',
    p1: 'ROOTS Villas reunește două vile private în Brașov, Vila Redwood și Vila Sequoia, fiecare potrivită pentru grupuri de 8–10 persoane. Fiecare vilă are 4 dormitoare duble cu baie proprie, living, bucătărie echipată, ciubăr încălzit pe gaz, saună, firepit, grătar cu lemne și spațiu exterior privat.',
    p2: 'Vilele sunt potrivite pentru weekenduri cu prietenii, vacanțe în familie, aniversări restrânse și escapade la munte. ROOTS Villas este situat în Stupini, Brașov, la aproximativ 10–12 minute de centrul orașului și cu acces rapid spre Poiana Brașov.',
    stats: [
      { label: 'vile private', value: '2' },
      { label: 'persoane / vilă', value: '8–10' },
      { label: 'dormitoare cu baie', value: '4' },
      { label: 'de centrul Brașovului', value: "10'" },
    ],
  },
  villas: {
    items: [
      {
        slug: 'redwood',
        name: 'Vila Redwood',
        tagline: 'Seri de film văzute din ciubăr',
        description:
          'Vilă privată pentru 8–10 persoane, cu 4 dormitoare duble cu baie proprie, ciubăr încălzit pe gaz, saună, firepit, masă de ping-pong și videoproiector vizibil din ciubăr.',
        features: [
          '8–10 persoane',
          'Închiriere integrală — toată vila',
          '4 dormitoare cu baie proprie',
          'Ciubăr încălzit pe gaz',
          'Zonă de foc cu grătar și lemne',
          'Ping-pong & videoproiector',
        ],
        gallery: [],
        cover: null,
      },
      {
        slug: 'sequoia',
        name: 'Vila Sequoia',
        tagline: 'Biliard, cramă și povești lungi',
        description:
          'Vilă privată pentru 8–10 persoane, cu 4 dormitoare duble cu baie proprie, ciubăr încălzit pe gaz, saună, firepit, biliard și cramă.',
        features: [
          '8–10 persoane',
          'Închiriere integrală — toată vila',
          '4 dormitoare cu baie proprie',
          'Ciubăr încălzit pe gaz',
          'Zonă de foc cu grătar și lemne',
          'Biliard & cramă',
        ],
        gallery: [],
        cover: null,
      },
    ],
  },
  editorial: {
    blocks: [
      {
        title: 'Pentru cine este potrivit ROOTS Villas?',
        paragraphs: [
          'ROOTS Villas este potrivit pentru grupuri de prieteni, familii cu copii, aniversări restrânse și escapade de weekend în Brașov. Fiecare vilă se închiriază integral, astfel încât oaspeții au intimitate, ciubăr și saună private, plus spațiu suficient pentru socializare.',
          'Locația este mai puțin potrivită pentru evenimente mari, deoarece se respectă orele de liniște și capacitatea maximă a fiecărei vile.',
        ],
      },
      {
        title: 'Ce diferențe sunt între Vila Redwood și Vila Sequoia?',
        paragraphs: [
          'Vila Redwood și Vila Sequoia au aceeași capacitate și aceleași facilități principale: 4 dormitoare duble cu baie proprie, ciubăr încălzit pe gaz, saună, firepit, grătar cu lemne, PlayStation 5, terasă și spațiu exterior privat.',
          'Vila Redwood are masă de ping-pong și videoproiector vizibil direct din ciubăr. Vila Sequoia are biliard și cramă. Alegerea depinde în principal de tipul de activități pe care grupul le preferă.',
          'În spatele celor două vile se află spațiile comune ale locației, cu teren de sport și loc de joacă pentru copii, accesibile oaspeților cazați la Roots Villas.',
        ],
      },
    ],
  },
  common: {
    title: 'Spații comune pentru ambele vile',
    text: 'În spatele celor două vile am creat o zonă pentru grupurile care vor să petreacă timp împreună: loc de joacă pentru copii și teren de sport. Accesul se face pe o alee comună, iar fiecare vilă are parcare privată.',
    features: ['Loc de joacă pentru copii', 'Teren de sport', 'Parcare privată pe alee și în curte'],
    image: null,
  },
  rules: {
    title: 'Regulile casei',
    intro:
      'Pentru ca fiecare sejur să fie confortabil și bine organizat, te rugăm să consulți principalele reguli ale casei înainte de sosire.',
    items: [
      { icon: 'in', text: 'Check-in între 16:00 și 22:00' },
      { icon: 'out', text: 'Check-out înainte de 12:00' },
      { icon: 'quiet', text: 'Ore de liniște între 22:00 și 10:00' },
      { icon: 'people', text: 'Numărul maxim de persoane: 8–10' },
      { icon: 'party', text: 'Evenimentele sau petrecerile trebuie anunțate și aprobate în prealabil' },
      { icon: 'pet', text: 'Animalele de companie sunt acceptate doar cu acord în prealabil' },
    ],
  },
  testimonials: {
    rating: '4.9',
    title: 'Ce spun alți clienți',
    intro: 'Înainte să alegi, e normal să vrei să știi cum s-au simțit cei care au stat deja la ROOTS.',
    items: [
      {
        name: 'Andreea M.',
        stay: 'Weekend cu prietenii · Vila Redwood',
        text: 'Ciubărul cald, focul de tabără și liniștea din Stupini — exact ce ne trebuia după un an lung. Ne întoarcem sigur.',
      },
      {
        name: 'Radu & familia',
        stay: 'Vacanță în familie · Vila Sequoia',
        text: 'Copiii nu au mai vrut să plece de la locul de joacă. Vila impecabilă, gazde extrem de atente la detalii.',
      },
      {
        name: 'Ioana P.',
        stay: 'Aniversare · Vila Sequoia',
        text: 'Am sărbătorit 30 de ani aici. Saună, biliard, cramă și un apus superb peste Brașov. Recomand din tot sufletul.',
      },
    ],
  },
  video: {
    title: 'Video Roots',
    text: 'Vezi câteva momente de liniște surprinse la Roots, în Brașov și în Poiana Brașov.',
    label: 'Roots Teaser | 2022',
    youtubeUrl: 'https://www.youtube.com/@rootsvillas',
  },
  faq: {
    items: [
      { cat: 'Rezervare', q: 'Pot rezerva ambele vile împreună?', a: 'Da, cele două vile pot fi rezervate împreună pentru grupuri mai mari. Scrie-ne pe WhatsApp pentru disponibilitate.' },
      { cat: 'Rezervare', q: 'Trebuie achitat un avans?', a: 'Da, rezervarea se confirmă cu un avans, iar diferența se achită la check-in.' },
      { cat: 'Rezervare', q: 'Acceptați și 10 persoane?', a: 'Da, fiecare vilă găzduiește confortabil 8–10 persoane, în 4 dormitoare duble cu baie proprie.' },
      { cat: 'Facilități', q: 'Este inclus ciubărul în preț?', a: 'Da, ciubărul încălzit pe gaz este inclus în prețul de închiriere al vilei.' },
      { cat: 'Facilități', q: 'Ciubărul are program de funcționare?', a: 'Poate fi folosit pe toată durata sejurului, cu respectarea orelor de liniște (22:00–10:00).' },
      { cat: 'Facilități', q: 'Avem lemne de foc?', a: 'Da, punem la dispoziție lemne de foc pentru firepit și grătar.' },
      { cat: 'Facilități', q: 'Ce diferențe sunt între cele 2 vile ca și facilități?', a: 'Redwood: ping-pong și videoproiector vizibil din ciubăr; Sequoia: biliard și cramă. Restul identic.' },
      { cat: 'Plata', q: 'Care sunt metodele de plată?', a: 'Transfer bancar, card și numerar la check-in.' },
      { cat: 'Plata', q: 'Se poate achita cu tichete de vacanță?', a: 'Da, acceptăm tichete de vacanță.' },
      { cat: 'Politica de anulare', q: 'Până când pot anula gratuit?', a: 'Gratuit până la termenul comunicat la rezervare; după, avansul nu se returnează, cu excepția condițiilor excepționale.' },
      { cat: 'Politica de anulare', q: 'Ce înseamnă condiții excepționale de anulare?', a: 'Situații de forță majoră, analizate individual.' },
      { cat: 'General', q: 'Vilele sunt private sau se împart cu alți oaspeți?', a: 'Fiecare vilă se închiriază integral.' },
      { cat: 'General', q: 'Sunt acceptate animalele de companie?', a: 'Da, doar cu acord în prealabil.' },
      { cat: 'General', q: 'Este permis fumatul în vile?', a: 'Doar în exterior, pe terasă și în curte.' },
      { cat: 'General', q: 'Oferiți reduceri pentru sejururi mai lungi?', a: 'Da, tarife preferențiale pentru sejururi mai lungi.' },
    ],
  },
  location: {
    title: 'Unde ne aflăm',
    text: 'ROOTS Villas este situat în cartierul Stupini, Brașov, la aproximativ 10–12 minute cu mașina de centrul orașului. Locația oferă acces rapid spre Poiana Brașov, Piața Sfatului și principalele atracții din Brașov, păstrând în același timp intimitatea unei zone rezidențiale.',
    mapsUrl: 'https://maps.google.com/?q=Roots+Villas+Stupini+Brasov',
    points: [
      { label: 'Centrul Brașovului', value: '10–12 min' },
      { label: 'Poiana Brașov', value: '25 min' },
      { label: 'Piața Sfatului', value: '12 min' },
    ],
  },
  contact: {
    phone: '+40 731 700 191',
    whatsapp: '+40731700191',
    email: 'office@panocube.ro',
    instagram: 'https://instagram.com/rootsvillas',
    tiktok: 'https://tiktok.com/@rootsvillas',
  },
};

async function main() {
  await initDb();

  // 1) cont owner inițial (parola se schimbă din admin după primul login)
  const email = process.env.SEED_OWNER_EMAIL || 'office@panocube.ro';
  const password = process.env.SEED_OWNER_PASSWORD || 'roots-schimba-ma';
  const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rows.length === 0) {
    await pool.query(
      "INSERT INTO users (email, password_hash, name, role) VALUES ($1, $2, 'Bogdan', 'owner')",
      [email, await hashPassword(password)]
    );
    console.log(`[seed] owner creat: ${email} (parola: ${password} — SCHIMB-O după login)`);
  } else {
    console.log('[seed] owner există deja — nu ating parola');
  }

  // 2) secțiunile CMS — idempotent: doar dacă secțiunea nu există deja
  for (const [key, value] of Object.entries(CONTENT)) {
    const r = await pool.query('SELECT section_key FROM site_content WHERE section_key = $1', [key]);
    if (r.rows.length === 0) {
      await pool.query(
        'INSERT INTO site_content (section_key, draft, published, published_at) VALUES ($1, $2, $2, now())',
        [key, JSON.stringify(value)]
      );
      console.log(`[seed] secțiune publicată: ${key}`);
    } else {
      console.log(`[seed] secțiune existentă, sar: ${key}`);
    }
  }

  console.log('[seed] gata.');
  process.exit(0);
}

main().catch((e) => {
  console.error('[seed] FAIL:', e.message);
  process.exit(1);
});
