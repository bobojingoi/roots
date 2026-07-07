// seed-i18n.js — creează variantele EN / HE / FR ale secțiunilor home
// pornind de la conținutul RO publicat (păstrează imagini/URL-uri) și
// suprapunând traducerile. Idempotent: nu suprascrie chei existente.
require('dotenv').config();
const { pool, initDb } = require('./db');

// T[section][lang] = transformare aplicată pe clona secțiunii RO
const T = {
  seo: {
    en: (s) => ({ ...s, title: 'ROOTS Villas Brașov — Two private villas with hot tub & sauna', description: 'Two private villas in Stupini, Brașov, for groups of 8–10. Four en-suite bedrooms, gas-heated hot tub, sauna, firepit and a private yard.', keywords: 'Brașov villas, group accommodation Brașov, villa with hot tub, villa with sauna, Stupini, Poiana Brașov' }),
    he: (s) => ({ ...s, title: 'ROOTS Villas ברשוב — שתי וילות פרטיות עם ג׳קוזי וסאונה', description: 'שתי וילות פרטיות בסטופיני, ברשוב, לקבוצות של 8–10. ארבעה חדרי שינה עם חדר רחצה, ג׳קוזי מחומם בגז, סאונה, מדורה וחצר פרטית.', keywords: 'וילות ברשוב, אירוח קבוצות, וילה עם ג׳קוזי, וילה עם סאונה' }),
    fr: (s) => ({ ...s, title: 'ROOTS Villas Brașov — Deux villas privées avec bain nordique et sauna', description: 'Deux villas privées à Stupini, Brașov, pour des groupes de 8 à 10 personnes. Quatre chambres avec salle de bain, bain nordique chauffé au gaz, sauna, feu de camp et jardin privé.', keywords: 'villas Brașov, hébergement groupe Brașov, villa avec jacuzzi, villa avec sauna, Stupini' }),
  },
  hero: {
    en: (s) => ({ ...s, eyebrow: 'Stupini · Brașov · 10 minutes from the center', titleA: 'Everything you can imagine.', titleB: 'In one place.', subtitle: 'Two private villas for groups of 8–10 — open-air hot tub, sauna, firepit and the quiet of a mountain evening.', ctaPrimary: 'Book now', ctaSecondary: 'Discover the villas' }),
    he: (s) => ({ ...s, eyebrow: 'סטופיני · ברשוב · 10 דקות מהמרכז', titleA: 'כל מה שאפשר לדמיין.', titleB: 'במקום אחד.', subtitle: 'שתי וילות פרטיות לקבוצות של 8–10 — ג׳קוזי תחת כיפת השמיים, סאונה, מדורה ושקט של ערב בהרים.', ctaPrimary: 'הזמינו עכשיו', ctaSecondary: 'גלו את הווילות' }),
    fr: (s) => ({ ...s, eyebrow: 'Stupini · Brașov · à 10 minutes du centre', titleA: 'Tout ce que vous pouvez imaginer.', titleB: 'En un seul lieu.', subtitle: 'Deux villas privées pour des groupes de 8 à 10 — bain nordique à ciel ouvert, sauna, feu de camp et le calme d’un soir de montagne.', ctaPrimary: 'Réserver', ctaSecondary: 'Découvrir les villas' }),
  },
  about: {
    en: (s) => ({ ...s, title: 'The two ROOTS villas', p1: 'ROOTS Villas brings together two private villas in Brașov — Vila Redwood and Vila Sequoia — each suited for groups of 8–10. Every villa has 4 en-suite double bedrooms, a living room, an equipped kitchen, a gas-heated hot tub, sauna, firepit, wood-fired grill and a private outdoor space.', p2: 'The villas are perfect for weekends with friends, family holidays, intimate celebrations and mountain getaways. ROOTS Villas is located in Stupini, Brașov, about 10–12 minutes from the city center, with quick access to Poiana Brașov.' }),
    he: (s) => ({ ...s, title: 'שתי הווילות של ROOTS', p1: 'ROOTS Villas מאגדת שתי וילות פרטיות בברשוב — וילה Redwood ווילה Sequoia — כל אחת מתאימה לקבוצות של 8–10. בכל וילה 4 חדרי שינה זוגיים עם חדר רחצה, סלון, מטבח מאובזר, ג׳קוזי מחומם בגז, סאונה, מדורה, גריל עצים וחצר פרטית.', p2: 'הווילות מושלמות לסופי שבוע עם חברים, חופשות משפחתיות, חגיגות אינטימיות ובריחות אל ההרים. ROOTS Villas נמצאת בסטופיני, ברשוב, כ-10–12 דקות ממרכז העיר, עם גישה מהירה לפויאנה ברשוב.' }),
    fr: (s) => ({ ...s, title: 'Les deux villas ROOTS', p1: 'ROOTS Villas réunit deux villas privées à Brașov — Vila Redwood et Vila Sequoia — chacune adaptée aux groupes de 8 à 10 personnes. Chaque villa dispose de 4 chambres doubles avec salle de bain, d’un salon, d’une cuisine équipée, d’un bain nordique chauffé au gaz, d’un sauna, d’un feu de camp, d’un barbecue au bois et d’un espace extérieur privé.', p2: 'Les villas sont idéales pour des week-ends entre amis, des vacances en famille, des anniversaires intimes et des escapades à la montagne. ROOTS Villas se trouve à Stupini, Brașov, à 10–12 minutes du centre-ville, avec un accès rapide à Poiana Brașov.' }),
  },
  villas: {
    en: (s) => villaTx(s, [
      { tagline: 'Movie nights, watched from the hot tub', description: 'Private villa for 8–10 guests, with 4 en-suite double bedrooms, gas-heated hot tub, sauna, firepit, ping-pong table and a projector you can watch from the hot tub.', features: ['8–10 guests', 'Entire villa rental', '4 en-suite bedrooms', 'Gas-heated hot tub', 'Firepit & wood grill', 'Ping-pong & projector'] },
      { tagline: 'Billiards, wine cellar and long stories', description: 'Private villa for 8–10 guests, with 4 en-suite double bedrooms, gas-heated hot tub, sauna, firepit, billiards and a wine cellar.', features: ['8–10 guests', 'Entire villa rental', '4 en-suite bedrooms', 'Gas-heated hot tub', 'Firepit & wood grill', 'Billiards & wine cellar'] },
    ]),
    he: (s) => villaTx(s, [
      { tagline: 'ערבי סרטים מתוך הג׳קוזי', description: 'וילה פרטית ל-8–10 אורחים, עם 4 חדרי שינה עם חדר רחצה, ג׳קוזי מחומם בגז, סאונה, מדורה, שולחן פינג-פונג ומקרן שנראה מהג׳קוזי.', features: ['8–10 אורחים', 'השכרת הווילה כולה', '4 חדרי שינה עם חדר רחצה', 'ג׳קוזי מחומם בגז', 'מדורה וגריל עצים', 'פינג-פונג ומקרן'] },
      { tagline: 'ביליארד, מרתף יין וסיפורים ארוכים', description: 'וילה פרטית ל-8–10 אורחים, עם 4 חדרי שינה עם חדר רחצה, ג׳קוזי מחומם בגז, סאונה, מדורה, ביליארד ומרתף יין.', features: ['8–10 אורחים', 'השכרת הווילה כולה', '4 חדרי שינה עם חדר רחצה', 'ג׳קוזי מחומם בגז', 'מדורה וגריל עצים', 'ביליארד ומרתף יין'] },
    ]),
    fr: (s) => villaTx(s, [
      { tagline: 'Soirées cinéma, vues du bain nordique', description: 'Villa privée pour 8 à 10 personnes, avec 4 chambres doubles avec salle de bain, bain nordique chauffé au gaz, sauna, feu de camp, ping-pong et vidéoprojecteur visible depuis le bain.', features: ['8–10 personnes', 'Location de la villa entière', '4 chambres avec salle de bain', 'Bain nordique chauffé au gaz', 'Feu de camp et barbecue au bois', 'Ping-pong et vidéoprojecteur'] },
      { tagline: 'Billard, cave à vin et longues histoires', description: 'Villa privée pour 8 à 10 personnes, avec 4 chambres doubles avec salle de bain, bain nordique chauffé au gaz, sauna, feu de camp, billard et cave à vin.', features: ['8–10 personnes', 'Location de la villa entière', '4 chambres avec salle de bain', 'Bain nordique chauffé au gaz', 'Feu de camp et barbecue au bois', 'Billard et cave à vin'] },
    ]),
  },
  editorial: {
    en: (s) => edTx(s, [
      { title: 'Who is ROOTS Villas for?', paragraphs: ['ROOTS Villas suits groups of friends, families with children, intimate celebrations and weekend escapes in Brașov. Each villa is rented in full, so guests enjoy privacy, a private hot tub and sauna, plus plenty of room to socialise.', 'The location is less suitable for large events, as quiet hours and each villa’s maximum capacity are respected.'] },
      { title: 'What’s the difference between Redwood and Sequoia?', paragraphs: ['Vila Redwood and Vila Sequoia share the same capacity and core amenities: 4 en-suite double bedrooms, gas-heated hot tub, sauna, firepit, wood grill, PlayStation 5, terrace and private outdoor space.', 'Redwood has a ping-pong table and a projector visible straight from the hot tub. Sequoia has billiards and a wine cellar. The choice mostly depends on how your group likes to spend the evenings.', 'Behind the two villas you’ll find the shared areas — a sports field and a children’s playground, available to all ROOTS guests.'] },
    ]),
    he: (s) => edTx(s, [
      { title: 'למי מתאימה ROOTS Villas?', paragraphs: ['ROOTS Villas מתאימה לקבוצות חברים, משפחות עם ילדים, חגיגות אינטימיות וסופי שבוע בברשוב. כל וילה מושכרת בשלמותה — פרטיות מלאה, ג׳קוזי וסאונה פרטיים והרבה מקום לבילוי משותף.', 'המקום פחות מתאים לאירועים גדולים, מתוך כבוד לשעות השקט ולתפוסה המרבית של כל וילה.'] },
      { title: 'מה ההבדל בין Redwood ל-Sequoia?', paragraphs: ['לשתי הווילות אותה קיבולת ואותם מתקנים עיקריים: 4 חדרי שינה עם חדר רחצה, ג׳קוזי מחומם בגז, סאונה, מדורה, גריל עצים, PlayStation 5, מרפסת וחצר פרטית.', 'ב-Redwood יש שולחן פינג-פונג ומקרן שנצפה ישירות מהג׳קוזי. ב-Sequoia יש ביליארד ומרתף יין. הבחירה תלויה בעיקר באופי הערבים של הקבוצה שלכם.', 'מאחורי הווילות נמצאים השטחים המשותפים — מגרש ספורט וגן שעשועים, זמינים לכל אורחי ROOTS.'] },
    ]),
    fr: (s) => edTx(s, [
      { title: 'À qui s’adresse ROOTS Villas ?', paragraphs: ['ROOTS Villas convient aux groupes d’amis, aux familles avec enfants, aux fêtes intimes et aux escapades de week-end à Brașov. Chaque villa se loue en entier : intimité totale, bain nordique et sauna privés, et beaucoup d’espace pour se retrouver.', 'Le lieu convient moins aux grands événements, car les heures de calme et la capacité maximale de chaque villa sont respectées.'] },
      { title: 'Quelles différences entre Redwood et Sequoia ?', paragraphs: ['Les deux villas partagent la même capacité et les mêmes équipements principaux : 4 chambres doubles avec salle de bain, bain nordique chauffé au gaz, sauna, feu de camp, barbecue au bois, PlayStation 5, terrasse et espace extérieur privé.', 'Redwood dispose d’un ping-pong et d’un vidéoprojecteur visible depuis le bain nordique. Sequoia offre un billard et une cave à vin. Le choix dépend surtout de vos soirées idéales.', 'Derrière les deux villas se trouvent les espaces communs — terrain de sport et aire de jeux, accessibles à tous les hôtes ROOTS.'] },
    ]),
  },
  common: {
    en: (s) => ({ ...s, title: 'Shared spaces for both villas', text: 'Behind the two villas we created an area for groups who want to spend time together: a children’s playground and a sports field. Access is via a shared alley, and each villa has private parking.', features: strList(s.features, ['Children’s playground', 'Sports field', 'Private parking on the alley and in the yard']) }),
    he: (s) => ({ ...s, title: 'מרחבים משותפים לשתי הווילות', text: 'מאחורי שתי הווילות יצרנו אזור לקבוצות שרוצות לבלות יחד: גן שעשועים ומגרש ספורט. הגישה בשביל משותף, ולכל וילה חניה פרטית.', features: strList(s.features, ['גן שעשועים לילדים', 'מגרש ספורט', 'חניה פרטית בשביל ובחצר']) }),
    fr: (s) => ({ ...s, title: 'Espaces communs aux deux villas', text: 'Derrière les deux villas, nous avons créé un espace pour les groupes qui aiment se retrouver : aire de jeux pour enfants et terrain de sport. L’accès se fait par une allée commune et chaque villa a son parking privé.', features: strList(s.features, ['Aire de jeux pour enfants', 'Terrain de sport', 'Parking privé dans l’allée et la cour']) }),
  },
  rules: {
    en: (s) => rulesTx(s, 'House rules', 'To keep every stay comfortable and well organised, please read the main house rules before arrival.', ['Check-in between 4 PM and 10 PM', 'Check-out before noon', 'Quiet hours between 10 PM and 10 AM', 'Maximum number of guests: 8–10', 'Events or parties must be announced and approved in advance', 'Pets are welcome only with prior agreement']),
    he: (s) => rulesTx(s, 'כללי הבית', 'כדי שכל שהות תהיה נוחה ומאורגנת, אנא קראו את כללי הבית לפני ההגעה.', ['צ׳ק-אין בין 16:00 ל-22:00', 'צ׳ק-אאוט עד 12:00', 'שעות שקט בין 22:00 ל-10:00', 'מספר אורחים מרבי: 8–10', 'אירועים או מסיבות — רק בתיאום ואישור מראש', 'חיות מחמד — רק בהסכמה מראש']),
    fr: (s) => rulesTx(s, 'Règles de la maison', 'Pour que chaque séjour soit confortable et bien organisé, merci de consulter les principales règles de la maison avant votre arrivée.', ['Arrivée entre 16h et 22h', 'Départ avant 12h', 'Heures de calme entre 22h et 10h', 'Nombre maximum de personnes : 8–10', 'Les événements ou fêtes doivent être annoncés et approuvés à l’avance', 'Animaux acceptés uniquement avec accord préalable']),
  },
  testimonials: {
    en: (s) => ({ ...s, title: 'What our guests say', intro: 'Before you choose, it’s natural to want to know how previous guests felt at ROOTS.' }),
    he: (s) => ({ ...s, title: 'מה אומרים האורחים שלנו', intro: 'לפני שבוחרים, טבעי לרצות לדעת איך הרגישו אורחים קודמים ב-ROOTS.' }),
    fr: (s) => ({ ...s, title: 'Ce que disent nos hôtes', intro: 'Avant de choisir, il est naturel de vouloir savoir comment se sont sentis ceux qui ont déjà séjourné à ROOTS.' }),
  },
  video: {
    en: (s) => ({ ...s, title: 'Roots video', text: 'A few quiet moments captured at Roots, in Brașov and Poiana Brașov.' }),
    he: (s) => ({ ...s, title: 'וידאו Roots', text: 'כמה רגעים שקטים שצולמו ב-Roots, בברשוב ובפויאנה ברשוב.' }),
    fr: (s) => ({ ...s, title: 'Vidéo Roots', text: 'Quelques instants paisibles capturés à Roots, à Brașov et Poiana Brașov.' }),
  },
  faq: {
    en: (s) => faqTx(s, [
      ['Booking', 'Can I book both villas together?', 'Yes — the two villas can be booked together for larger groups. Message us on WhatsApp for availability.'],
      ['Booking', 'Is a deposit required?', 'Yes, the booking is confirmed with a deposit; the balance is paid at check-in.'],
      ['Booking', 'Do you accept 10 guests?', 'Yes — each villa comfortably hosts 8–10 guests in 4 en-suite double bedrooms.'],
      ['Amenities', 'Is the hot tub included in the price?', 'Yes, the gas-heated hot tub is included in the villa rental price.'],
      ['Amenities', 'Does the hot tub have a schedule?', 'It can be used throughout your stay, respecting quiet hours (10 PM – 10 AM).'],
      ['Amenities', 'Is firewood provided?', 'Yes, we provide firewood for the firepit and grill.'],
      ['Amenities', 'What are the differences between the two villas?', 'Redwood: ping-pong and a projector visible from the hot tub; Sequoia: billiards and a wine cellar. Everything else is identical.'],
      ['Payment', 'What payment methods do you accept?', 'Bank transfer, card, and cash at check-in.'],
      ['Payment', 'Can I pay with holiday vouchers?', 'Yes, we accept Romanian holiday vouchers.'],
      ['Cancellation policy', 'Until when can I cancel for free?', 'Free cancellation until the deadline communicated at booking; after that the deposit is non-refundable, except in exceptional circumstances.'],
      ['Cancellation policy', 'What counts as exceptional circumstances?', 'Force-majeure situations, assessed individually.'],
      ['General', 'Are the villas private or shared?', 'Each villa is rented in full — you never share the space with other guests.'],
      ['General', 'Are pets allowed?', 'Yes, but only with prior agreement. Please let us know when booking.'],
      ['General', 'Is smoking allowed inside?', 'Smoking is allowed only outdoors, on the terrace and in the yard.'],
      ['General', 'Do you offer discounts for longer stays?', 'Yes — preferential rates for longer stays. Message us for an offer.'],
    ]),
    he: (s) => faqTx(s, [
      ['הזמנה', 'אפשר להזמין את שתי הווילות יחד?', 'כן — אפשר להזמין את שתיהן יחד לקבוצות גדולות. כתבו לנו בוואטסאפ לבדיקת זמינות.'],
      ['הזמנה', 'נדרשת מקדמה?', 'כן, ההזמנה מאושרת עם מקדמה; היתרה משולמת בצ׳ק-אין.'],
      ['הזמנה', 'אתם מקבלים 10 אורחים?', 'כן — כל וילה מארחת בנוחות 8–10 אורחים ב-4 חדרי שינה עם חדר רחצה.'],
      ['מתקנים', 'הג׳קוזי כלול במחיר?', 'כן, הג׳קוזי המחומם בגז כלול במחיר השכרת הווילה.'],
      ['מתקנים', 'יש שעות פעילות לג׳קוזי?', 'אפשר להשתמש בו לאורך כל השהות, בכפוף לשעות השקט (22:00–10:00).'],
      ['מתקנים', 'יש עצי הסקה?', 'כן, אנחנו מספקים עצים למדורה ולגריל.'],
      ['מתקנים', 'מה ההבדלים בין שתי הווילות?', 'Redwood: פינג-פונג ומקרן שנראה מהג׳קוזי; Sequoia: ביליארד ומרתף יין. כל השאר זהה.'],
      ['תשלום', 'אילו אמצעי תשלום מתקבלים?', 'העברה בנקאית, כרטיס ומזומן בצ׳ק-אין.'],
      ['תשלום', 'אפשר לשלם בשוברי חופשה?', 'כן, אנחנו מקבלים שוברי חופשה רומניים.'],
      ['מדיניות ביטול', 'עד מתי אפשר לבטל בחינם?', 'ביטול חינם עד המועד שנמסר בהזמנה; לאחריו המקדמה אינה מוחזרת, למעט נסיבות חריגות.'],
      ['מדיניות ביטול', 'מה נחשב נסיבות חריגות?', 'מצבי כוח עליון, שנבחנים פרטנית.'],
      ['כללי', 'הווילות פרטיות או משותפות?', 'כל וילה מושכרת בשלמותה — לעולם לא תחלקו את המקום עם אורחים אחרים.'],
      ['כללי', 'חיות מחמד מותרות?', 'כן, אך רק בתיאום מראש. אנא ציינו זאת בהזמנה.'],
      ['כללי', 'מותר לעשן בפנים?', 'העישון מותר רק בחוץ — במרפסת ובחצר.'],
      ['כללי', 'יש הנחות לשהיות ארוכות?', 'כן — תעריפים מועדפים לשהיות ארוכות. כתבו לנו להצעה.'],
    ]),
    fr: (s) => faqTx(s, [
      ['Réservation', 'Puis-je réserver les deux villas ensemble ?', 'Oui — les deux villas peuvent être réservées ensemble pour les grands groupes. Écrivez-nous sur WhatsApp pour la disponibilité.'],
      ['Réservation', 'Un acompte est-il requis ?', 'Oui, la réservation est confirmée par un acompte ; le solde se règle à l’arrivée.'],
      ['Réservation', 'Acceptez-vous 10 personnes ?', 'Oui — chaque villa accueille confortablement 8 à 10 personnes dans 4 chambres avec salle de bain.'],
      ['Équipements', 'Le bain nordique est-il inclus ?', 'Oui, le bain nordique chauffé au gaz est inclus dans le prix de location.'],
      ['Équipements', 'Le bain a-t-il des horaires ?', 'Il peut être utilisé pendant tout le séjour, en respectant les heures de calme (22h–10h).'],
      ['Équipements', 'Le bois est-il fourni ?', 'Oui, nous fournissons du bois pour le feu de camp et le barbecue.'],
      ['Équipements', 'Quelles différences entre les deux villas ?', 'Redwood : ping-pong et vidéoprojecteur visible du bain nordique ; Sequoia : billard et cave à vin. Le reste est identique.'],
      ['Paiement', 'Quels moyens de paiement acceptez-vous ?', 'Virement bancaire, carte et espèces à l’arrivée.'],
      ['Paiement', 'Peut-on payer avec des chèques-vacances ?', 'Oui, nous acceptons les chèques-vacances roumains.'],
      ['Politique d’annulation', 'Jusqu’à quand puis-je annuler gratuitement ?', 'Annulation gratuite jusqu’à la date communiquée à la réservation ; ensuite l’acompte n’est pas remboursé, sauf circonstances exceptionnelles.'],
      ['Politique d’annulation', 'Qu’est-ce qu’une circonstance exceptionnelle ?', 'Les cas de force majeure, évalués individuellement.'],
      ['Général', 'Les villas sont-elles privées ou partagées ?', 'Chaque villa se loue en entier — vous ne partagez jamais l’espace.'],
      ['Général', 'Les animaux sont-ils acceptés ?', 'Oui, mais uniquement avec accord préalable. Merci de nous prévenir à la réservation.'],
      ['Général', 'Peut-on fumer à l’intérieur ?', 'Non — uniquement à l’extérieur, sur la terrasse et dans la cour.'],
      ['Général', 'Des réductions pour les longs séjours ?', 'Oui — tarifs préférentiels pour les séjours prolongés. Écrivez-nous pour une offre.'],
    ]),
  },
  location: {
    en: (s) => locTx(s, 'Where we are', 'ROOTS Villas is located in the Stupini district of Brașov, about 10–12 minutes by car from the city center. The location offers quick access to Poiana Brașov, the Council Square and Brașov’s main attractions, while keeping the privacy of a residential area.', ['Brașov center', 'Poiana Brașov', 'Council Square']),
    he: (s) => locTx(s, 'איפה אנחנו', 'ROOTS Villas נמצאת בשכונת סטופיני בברשוב, כ-10–12 דקות נסיעה ממרכז העיר. גישה מהירה לפויאנה ברשוב, לכיכר המועצה ולאטרקציות של ברשוב — עם פרטיות של אזור מגורים שקט.', ['מרכז ברשוב', 'פויאנה ברשוב', 'כיכר המועצה']),
    fr: (s) => locTx(s, 'Où nous trouver', 'ROOTS Villas se situe dans le quartier Stupini de Brașov, à 10–12 minutes en voiture du centre-ville. Accès rapide à Poiana Brașov, à la place du Conseil et aux principales attractions, tout en gardant l’intimité d’un quartier résidentiel.', ['Centre de Brașov', 'Poiana Brașov', 'Place du Conseil']),
  },
};

/* helpers care păstrează structura RO (imagini, url-uri, valori) */
const strList = (orig, texts) => (orig || []).map((x, i) => (typeof x === 'string' ? (texts[i] || x) : { ...x, text: texts[i] || x.text }));
function villaTx(s, tx) {
  return { ...s, items: (s.items || []).map((v, i) => (tx[i] ? { ...v, tagline: tx[i].tagline, description: tx[i].description, features: strList(v.features, tx[i].features) } : v)) };
}
function edTx(s, tx) {
  return { ...s, blocks: (s.blocks || []).map((b, i) => (tx[i] ? { ...b, title: tx[i].title, paragraphs: strList(b.paragraphs, tx[i].paragraphs) } : b)) };
}
function rulesTx(s, title, intro, texts) {
  return { ...s, title, intro, items: (s.items || []).map((r, i) => ({ ...r, text: texts[i] || r.text })) };
}
function faqTx(s, rows) {
  return { ...s, items: (s.items || []).map((f, i) => (rows[i] ? { ...f, cat: rows[i][0], q: rows[i][1], a: rows[i][2] } : f)) };
}
function locTx(s, title, text, labels) {
  return { ...s, title, text, points: (s.points || []).map((p, i) => ({ ...p, label: labels[i] || p.label })) };
}

(async () => {
  await initDb();
  let made = 0;
  for (const [section, byLang] of Object.entries(T)) {
    const base = await pool.query('SELECT published FROM site_content WHERE section_key = $1', [section]);
    if (!base.rows.length || !base.rows[0].published) { console.log('[i18n] fără bază RO, sar:', section); continue; }
    for (const [lang, fn] of Object.entries(byLang)) {
      const key = `${section}@${lang}`;
      const exists = await pool.query('SELECT 1 FROM site_content WHERE section_key = $1', [key]);
      if (exists.rows.length) { console.log('[i18n] există, sar:', key); continue; }
      const translated = fn(JSON.parse(JSON.stringify(base.rows[0].published)));
      await pool.query(
        'INSERT INTO site_content (section_key, draft, published, published_at) VALUES ($1, $2, $2, now())',
        [key, JSON.stringify(translated)]
      );
      made++;
      console.log('[i18n] publicat:', key);
    }
  }
  console.log('[i18n] gata:', made, 'secțiuni traduse.');
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
