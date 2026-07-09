// seed-brasov-post.js — articol demo „Ghid de weekend la Brașov", construit din
// blocuri (text / poze / slider / comparație / checklist). Idempotent (după slug).
// Fotografiile orașului: Wikimedia Commons (licențe libere) prin Special:FilePath.
require('dotenv').config();
const { pool, initDb } = require('./db');

const IMG = (file, w) => `https://commons.wikimedia.org/wiki/Special:FilePath/${file}?width=${w || 1400}`;

const POST = {
  slug: 'ghid-de-weekend-la-brasov',
  title: 'Ghid de weekend la Brașov: ce vizitezi când stai la Roots',
  excerpt:
    'Piața Sfatului, Biserica Neagră, Tâmpa și Poiana Brașov — plus checklist-ul nostru de bagaj și cum alegi între Vila Redwood și Vila Sequoia.',
  cover: IMG('Brasov_200609_panorama.jpg', 1600),
  seo_title: 'Ghid de weekend la Brașov — obiective, trasee și sfaturi | Roots Villas',
  seo_description:
    'Ce vizitezi într-un weekend la Brașov: centrul vechi, Piața Sfatului, Biserica Neagră, Tâmpa și Poiana Brașov. Sfaturi de bagaj și cazare la Roots Villas, Stupini.',
  blocks: [
    {
      type: 'text',
      md:
        'Brașovul e unul dintre puținele orașe din România în care un weekend chiar pare prea scurt: un centru medieval viu, munte chiar deasupra acoperișurilor și, la 25 de minute, Poiana Brașov.\n\n' +
        'Vilele Roots sunt în **Stupini**, o zonă liniștită la 10–12 minute cu mașina de centru — suficient de aproape ca să prinzi apusul în Piața Sfatului, suficient de departe ca seara să auzi doar focul de tabără. Mai jos e traseul pe care îl recomandăm oaspeților noștri.',
    },
    { type: 'images', urls: [IMG('Brasov,_Piata_Sfatului.jpg'), IMG('BisericaNeagra.jpg')] },
    {
      type: 'text',
      md:
        '## Ziua 1 — centrul vechi\n\n' +
        'Începe din **Piața Sfatului**, inima orașului: terase, Casa Sfatului și cel mai fotogenic aliniament de fațade colorate din Transilvania. La doi pași, **Biserica Neagră** — cea mai mare biserică gotică din sud-estul Europei, cu turnul ei înnegrit de incendiul din 1689.\n\n' +
        '- **Strada Sforii** — una dintre cele mai înguste străzi din Europa (~1,3 m); intri cu umerii lipiți de ziduri.\n' +
        '- **Telecabina spre Tâmpa** — sus ai panorama întregului oraș, chiar lângă literele „Brașov" de pe munte.\n' +
        '- **Poarta Ecaterinei și Bastionul Țesătorilor** — pentru porția de ziduri medievale.\n\n' +
        'Seara, întoarce-te la vilă: ciubărul se încălzește în timp ce voi sunteți pe drum.',
    },
    {
      type: 'slider',
      urls: [IMG('Brasov_200609_panorama.jpg', 1600), IMG('Brasov_panorama.jpg', 1600), IMG('Overview_Brasov.JPG', 1600), IMG('Brasov_black_church_winter_2006-03-08.jpg', 1600)],
    },
    {
      type: 'text',
      md:
        '## Ziua 2 — muntele și împrejurimile\n\n' +
        'La **Poiana Brașov** ajungi în ~25 de minute: iarna schi, vara trasee lejere spre Postăvarul. Dacă vrei castele, **Bran** e la ~45 de minute, iar **Cetatea Râșnov** la ~30 — amândouă se combină ușor într-o singură zi cu copiii.\n\n' +
        'Întoarcerea la Roots e partea preferată a oaspeților: grătarul cu lemne, firepit-ul aprins și — dacă ați ales Redwood — un film proiectat pe perete, văzut direct din ciubăr.',
    },
    {
      type: 'checklist',
      title: 'Checklist de bagaj pentru weekendul la Roots',
      items: [
        'Costum de baie — ciubărul e cald indiferent de sezon',
        'Un rând de haine groase pentru serile la firepit',
        'Încălțări comode pentru centrul vechi și Tâmpa',
        'Bezele (marshmallows) pentru focul de tabără',
        'Halate/papuci pentru drumul saună → ciubăr',
        'Vârstele copiilor, dacă rezervați cu pătuț — pătuțul e gratuit',
      ],
    },
    {
      type: 'compare',
      title_a: 'Vila Redwood',
      title_b: 'Vila Sequoia',
      rows: [
        { a: 'Seri de film: videoproiector vizibil din ciubăr', b: 'Seri lungi: cramă boltită pentru degustări' },
        { a: 'Masă de ping-pong pe terasă', b: 'Masă de biliard în salon' },
        { a: 'Alege-o pentru vibe de cinema sub cerul liber', b: 'Alege-o pentru povești la un pahar de vin' },
        { a: '8 adulți + 4 copii incluși în preț', b: '8 adulți + 4 copii incluși în preț' },
      ],
    },
    {
      type: 'text',
      md:
        '## Unde dormi\n\n' +
        'Ambele vile au 4 dormitoare cu baie proprie, saună, ciubăr încălzit pe gaz și curte privată — iar pentru grupuri mari se pot rezerva **împreună**, cu calendarele suprapuse, direct de pe [pagina de rezervare](/rezervare).\n\n' +
        'Ne vedem la foc. 🔥\n\n' +
        '*Fotografiile orașului: Wikimedia Commons (licențe libere). Înlocuiește-le oricând cu pozele voastre din Galerie media.*',
    },
  ],
};

(async () => {
  await initDb();
  const r = await pool.query('SELECT 1 FROM posts WHERE slug = $1', [POST.slug]);
  if (r.rows.length) { console.log('[seed-brasov-post] există deja, sar:', POST.slug); process.exit(0); }
  await pool.query(
    `INSERT INTO posts (slug, title, excerpt, cover, body, blocks, seo_title, seo_description, published_at)
     VALUES ($1,$2,$3,$4,'',$5,$6,$7, now())`,
    [POST.slug, POST.title, POST.excerpt, POST.cover, JSON.stringify(POST.blocks), POST.seo_title, POST.seo_description]
  );
  console.log('[seed-brasov-post] publicat: /blog/' + POST.slug);
  process.exit(0);
})().catch((e) => { console.error('[seed-brasov-post] FAIL:', e.message); process.exit(1); });
