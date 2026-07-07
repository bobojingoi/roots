// seed-pages.js — adaugă secțiunile paginilor de vilă + welcome (idempotent).
// Conținut identic cu site-ul live (src/RootsVillas.jsx DEFAULT_CONTENT).
require('dotenv').config();
const { pool, initDb } = require('./db');

const DORM = 'pat king-size pentru 2 persoane + baie proprie';
const facilities = (soc) => [
  { cat: 'Spații de dormit', items: [
    { t: 'Dormitor 1 · parter', s: DORM }, { t: 'Dormitor 2 · etaj', s: DORM },
    { t: 'Dormitor 3 · etaj', s: DORM }, { t: 'Dormitor 4 · etaj', s: DORM },
  ]},
  { cat: 'Relaxare și exterior', items: [
    { t: 'Ciubăr pe gaz – temperatură constantă' }, { t: 'Saună privată la interior' },
    { t: 'Terasă acoperită' }, { t: 'Vatră de foc + grătar cu lemne' },
    { t: 'Grătar pe gaz' }, { t: 'Curte și spațiu exterior privat' },
  ]},
  { cat: 'Socializare și distracție', items: soc.map((t) => ({ t })) },
  { cat: 'Confort și bucătărie', items: [
    { t: 'Bucătărie complet utilată' }, { t: 'Cafea' },
    { t: 'Mașină de spălat vase' }, { t: 'Mașină de spălat rufe' }, { t: 'Lemne de foc' },
  ]},
];
const POLICIES = [
  { title: 'Regulile casei', items: ['Check-in după 16:00', 'Checkout înainte de 12:00', 'Maxim 8–10 persoane', 'Ore de liniște între 22:00 și 08:00', 'Acceptăm animalele de companie'] },
  { title: 'Safety & Property', items: ['Camere video în exteriorul proprietății', 'Alarmă pentru monoxid de carbon', 'Alarmă de incendiu', 'Alarmă de efracție'] },
  { title: 'Politica de anulare', items: ['Anularea este gratuită până la 15 zile înainte de check-in', 'Mai multe detalii în secțiunea „Întrebări frecvente”'] },
  { title: 'Despre unitate', items: ['Tip proprietate: vilă privată, închiriere integrală', 'Capacitate: 8 persoane incluse, maximum 10 persoane', 'Dormitoare: 4 dormitoare duble', 'Băi: 4 băi private', 'Wellness: ciubăr privat încălzit pe gaz și saună', 'Localizare: Stupini, Brașov'] },
];
const MAP_EMBED = 'https://maps.google.com/maps?q=Stupini%2C%20Bra%C8%99ov&z=14&output=embed';

const wSections = (fun) => [
  { icon: 'in', title: 'Reguli & program', lines: ['Check-in: 16:00 – 22:00 · Check-out: până la 12:00', 'Ore de liniște: 22:00 – 10:00', 'Maxim 8–10 persoane', 'Evenimentele și petrecerile se anunță și se aprobă în prealabil', 'Animalele de companie – doar cu acord prealabil'] },
  { icon: 'parking', title: 'Parcare', lines: ['Parcare gratuită în curte sau pe aleea de acces', 'Pe alee, parchează pe partea dreaptă, ca să lași acces la vila vecină'] },
  { icon: 'tub', title: 'Ciubăr', lines: ['Program de funcționare: 20:00 – 23:00', 'Anunță-ne cu minim 4 ore înainte, ca să fie cald la timp', 'Cele 3 butoane controlează: jeturile, bulele și lumina'] },
  { icon: 'fire', title: 'Saună', lines: ['Setează temperatura dorită din meniu și apasă ON', 'Termometrul devine roșu când sauna funcționează', '⚠️ Nu lăsa sauna pornită nesupravegheată'] },
  { icon: 'fire', title: 'Vatră de foc & lumini exterioare', lines: ['Lemnele de foc sunt sub scările de la intrare', 'Luminile exterioare pornesc pe senzor de mișcare', 'Cele 4 întrerupătoare sunt în dulapul chiuvetei exterioare'] },
  { icon: 'key', title: 'Bucătărie', lines: ['Espressorul funcționează doar cu boabe', 'Tabletele pentru mașina de spălat vase sunt sub chiuvetă'] },
  { icon: 'play', title: 'Divertisment', lines: fun },
];
const wz = (q) => `https://ul.waze.com/ul?q=${encodeURIComponent(q + ', Brașov')}&navigate=yes`;
const rec = (names) => names.map((n) => ({ name: n, waze: wz(n) }));
const RECS = [
  { cat: 'Cumpărături', items: rec(['Dodo Market', 'La doi pași', 'Lidl']) },
  { cat: 'Tradițional', items: rec(['Ograda', 'Sergiana', 'La Ceaun', 'Gaura Dulce', 'Calul Bălan', 'Casa Tudor', 'Roata Norocului', 'Coliba Haiducilor – Poiana Brașov', 'Stâna Turistică – Poiana Brașov']) },
  { cat: 'Restaurante italienești', items: rec(["Dei Frati", "Bistro de l'Arte", 'Trattoria del Chianti', 'Don Antonio – Coresi', 'Pizza Hot']) },
  { cat: 'Fine dining', items: rec(['Casa Hirscher', 'Prato', 'Luther Brasserie', 'Sub Tâmpa', 'Ma Cocotte', 'Artegianale', 'Kasho Lounge', 'Aha Lounge', 'Millenium', 'Das Fort – Râșnov']) },
  { cat: 'Burgeri', items: rec(['Passage', 'Terroir Boutique du Vin', 'The Food Guys']) },
  { cat: 'Vinoteci', items: rec(['Somelier – Centrul Vechi', 'Terroir Boutique du Vin', 'Ma Cocotte', 'Artegianale']) },
  { cat: 'Cafenele', items: rec(['CH9 – Centrul Vechi', 'ZATZ', 'Cafeteca', 'NOLA – Centrul Vechi', 'Shake Coffee', 'Galeria Art and Coffee']) },
  { cat: 'Piscine', items: rec(['Paradisul Acvatic', 'Bielmann', 'K-Tribute', 'Hotel Belvedere', 'Hotel Aro Palace']) },
  { cat: 'Viața de noapte', items: rec(['Kayus Lounge', 'K Tribute', 'Times', 'Al Camin']) },
  { cat: 'Aventură', items: [{ name: 'ATV / Moto – Sorin Dumitru', tel: '0722840744' }, ...rec(['Kowa Park & Lounge', 'Aventura Park', 'MasterKart', 'Poiana Brașov'])] },
  { cat: 'Plimbări', items: rec(['Tâmpa', 'Canionul Șapte Scări', 'Masivul Postăvaru', 'Promenada Nouă']) },
];
const SHOP_DIRS = [
  { label: 'Dodo Market', waze: 'https://ul.waze.com/ul?q=Strada%20Fagurului%2032A%2C%20Stupini%2C%20Brasov%2C%20Romania&navigate=yes' },
  { label: 'Lidl', waze: 'https://ul.waze.com/ul?q=Bulevardul%20Grivitei%202E%2C%20500182%20Brasov%2C%20Romania&navigate=yes' },
];

const PAGES = {
  villa_redwood: {
    heroSubtitle: 'Vilă privată pentru weekenduri cu prietenii sau familia, la câteva minute de Brașov, cu ciubăr, saună și curte.',
    heroImage: '', phoneLabel: 'Bogdan Jingoi', smoobuId: '506559',
    galleryExterior: [
      { img: '', caption: 'Ciubăr privat pentru 8 persoane' },
      { img: '', caption: 'Videoproiector vizibil din ciubăr' },
      { img: '', caption: 'Vatră de foc și grătar cu lemne' },
      { img: '', caption: 'Terasă acoperită și curte privată' },
    ],
    galleryInterior: [
      { img: '', caption: 'Living-room cu canapea extensibilă' },
      { img: '', caption: 'Play-Station 5' },
      { img: '', caption: 'Masă de ping-pong' },
      { img: '', caption: 'Bucătărie complet utilată' },
    ],
    facilities: facilities(['Videoproiector vizibil din ciubăr', 'Masă de ping-pong', 'Play-Station 5', 'Living și zonă de dining']),
    policies: POLICIES, mapEmbed: MAP_EMBED,
  },
  villa_sequoia: {
    heroSubtitle: 'Vilă privată pentru grupuri de 8–10 persoane, cu ciubăr, saună, biliard și cramă, la câteva minute de Brașov.',
    heroImage: '', phoneLabel: 'Bogdan Jingoi', smoobuId: '867949',
    galleryExterior: [
      { img: '', caption: 'Ciubăr privat încălzit pe gaz' },
      { img: '', caption: 'Saună privată la interior' },
      { img: '', caption: 'Vatră de foc și grătar cu lemne' },
      { img: '', caption: 'Terasă acoperită și curte privată' },
    ],
    galleryInterior: [
      { img: '', caption: 'Living și zonă de dining' },
      { img: '', caption: 'Masă de biliard' },
      { img: '', caption: 'Cramă privată' },
      { img: '', caption: 'Play-Station 5' },
    ],
    facilities: facilities(['Biliard', 'Cramă privată', 'Play-Station 5', 'Living și zonă de dining']),
    policies: POLICIES, mapEmbed: MAP_EMBED,
  },
  welcome_redwood: {
    address: 'Strada Fântânii 46, Brașov 500482',
    mapsUrl: 'https://maps.google.com/?q=Strada%20F%C3%A2nt%C3%A2nii%2046%20Bra%C8%99ov',
    wifiName: '', wifiPassword: '', keybox: '1965', heroImage: '',
    sections: wSections(['Pe barul din bucătărie sunt 2 telecomenzi – cea din dreapta e pentru videoproiector', 'PlayStation 5 în living', 'Masă de ping-pong']),
    directions: [{ label: 'Navighează la vilă', waze: wz('Strada Fântânii 46') }, ...SHOP_DIRS],
    recommendations: RECS,
  },
  welcome_sequoia: {
    address: 'Stupini, Brașov',
    mapsUrl: 'https://maps.google.com/?q=Stupini%20Bra%C8%99ov',
    wifiName: '', wifiPassword: '', keybox: '', heroImage: '',
    sections: wSections(['Masă de biliard', 'Cramă', 'PlayStation 5 în living']),
    directions: [{ label: 'Navighează la vilă', waze: wz('Stupini') }, ...SHOP_DIRS],
    recommendations: RECS,
  },
};

(async () => {
  await initDb();
  for (const [key, value] of Object.entries(PAGES)) {
    const r = await pool.query('SELECT 1 FROM site_content WHERE section_key = $1', [key]);
    if (r.rows.length === 0) {
      await pool.query(
        'INSERT INTO site_content (section_key, draft, published, published_at) VALUES ($1, $2, $2, now())',
        [key, JSON.stringify(value)]
      );
      console.log('[seed-pages] publicat:', key);
    } else console.log('[seed-pages] există, sar:', key);
  }
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
