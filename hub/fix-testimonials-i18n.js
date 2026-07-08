/* One-off: traduce integral itemii din testimonials@en/@he/@fr (rămăseseră în RO). */
require('dotenv').config();
const { pool } = require('./db');

const ITEMS = {
  en: [
    { name: 'Andreea M.', stay: 'Weekend with friends · Redwood Villa', text: 'The warm hot tub, the campfire and the quiet of Stupini — exactly what we needed after a long year. We will definitely be back.' },
    { name: 'Radu & family', stay: 'Family holiday · Sequoia Villa', text: "The kids didn't want to leave the playground. Impeccable villa, hosts extremely attentive to every detail." },
    { name: 'Ioana P.', stay: 'Birthday · Sequoia Villa', text: 'We celebrated my 30th here. Sauna, billiards, a wine cellar and a stunning sunset over Brașov. I recommend it with all my heart.' },
  ],
  fr: [
    { name: 'Andreea M.', stay: 'Week-end entre amis · Villa Redwood', text: "Le bain chaud, le feu de camp et le calme de Stupini — exactement ce qu'il nous fallait après une longue année. Nous reviendrons, c'est sûr." },
    { name: 'Radu & famille', stay: 'Vacances en famille · Villa Sequoia', text: "Les enfants ne voulaient plus quitter l'aire de jeux. Villa impeccable, hôtes extrêmement attentifs aux détails." },
    { name: 'Ioana P.', stay: 'Anniversaire · Villa Sequoia', text: "Nous avons fêté mes 30 ans ici. Sauna, billard, cave à vin et un coucher de soleil superbe sur Brașov. Je recommande de tout cœur." },
  ],
  he: [
    { name: 'Andreea M.', stay: 'סופ"ש עם חברים · וילה Redwood', text: 'הג׳קוזי החם, המדורה והשקט של סטופיני — בדיוק מה שהיינו צריכים אחרי שנה ארוכה. בטוח נחזור.' },
    { name: 'Radu ומשפחתו', stay: 'חופשה משפחתית · וילה Sequoia', text: 'הילדים לא רצו לעזוב את מגרש המשחקים. וילה ללא רבב, מארחים קשובים לכל פרט.' },
    { name: 'Ioana P.', stay: 'יום הולדת · וילה Sequoia', text: 'חגגנו כאן 30. סאונה, ביליארד, מרתף יין ושקיעה מדהימה מעל ברשוב. ממליצה בכל הלב.' },
  ],
};

(async () => {
  for (const [lang, items] of Object.entries(ITEMS)) {
    const key = 'testimonials@' + lang;
    const r = await pool.query('SELECT draft, published FROM site_content WHERE section_key = $1', [key]);
    if (!r.rows.length) { console.log('lipsă:', key); continue; }
    const upd = (obj) => obj ? { ...obj, items } : obj;
    await pool.query(
      'UPDATE site_content SET draft = $2, published = $3, published_at = now() WHERE section_key = $1',
      [key, JSON.stringify(upd(r.rows[0].draft)), JSON.stringify(upd(r.rows[0].published))]
    );
    console.log('actualizat:', key);
  }
  await pool.end();
})();
