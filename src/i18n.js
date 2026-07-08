/* ============================================================
   i18n — limbă activă, selector, RTL și dicționar UI.
   Conținutul CMS e tradus în Hub prin secțiuni sufixate
   (hero@en, hero@he, hero@fr); fără sufix = română.
   Aici trăiesc doar șirurile de interfață hardcodate.
   ============================================================ */

const qs = new URLSearchParams(window.location.search);
const stored = localStorage.getItem("roots_lang");
const fromUrl = qs.get("lang");

export const LANGS = [
  { code: "ro", label: "RO", name: "Română" },
  { code: "en", label: "EN", name: "English" },
  { code: "he", label: "HE", name: "עברית", rtl: true },
  { code: "fr", label: "FR", name: "Français" },
];

export const LANG = LANGS.some((l) => l.code === fromUrl)
  ? fromUrl
  : LANGS.some((l) => l.code === stored)
  ? stored
  : "ro";

export const IS_RTL = LANG === "he";

export function setLang(code) {
  localStorage.setItem("roots_lang", code);
  const url = new URL(window.location.href);
  url.searchParams.delete("lang");
  window.location.href = url.toString();
}

/* aplică direcția și atributul lang pe document */
export function applyLangDir() {
  document.documentElement.lang = LANG;
  document.documentElement.dir = IS_RTL ? "rtl" : "ltr";
}

/* dicționar UI (navigație, butoane, etichete care nu vin din CMS) */
const D = {
  nav_villas:   { ro: "Vilele", en: "The villas", he: "הווילות", fr: "Les villas" },
  nav_common:   { ro: "Spații comune", en: "Shared spaces", he: "מרחבים משותפים", fr: "Espaces communs" },
  nav_rules:    { ro: "Regulile casei", en: "House rules", he: "כללי הבית", fr: "Règles de la maison" },
  nav_faq:      { ro: "Întrebări", en: "FAQ", he: "שאלות", fr: "FAQ" },
  nav_location: { ro: "Locație", en: "Location", he: "מיקום", fr: "Localisation" },
  nav_blog:     { ro: "Blog", en: "Blog", he: "בלוג", fr: "Blog" },
  nav_home:     { ro: "Acasă", en: "Home", he: "בית", fr: "Accueil" },
  book_now:     { ro: "Rezervă acum", en: "Book now", he: "הזמינו עכשיו", fr: "Réserver" },
  see_details:  { ro: "Vezi detalii", en: "See details", he: "פרטים", fr: "Voir détails" },
  foot_contact: { ro: "Contact", en: "Contact", he: "צור קשר", fr: "Contact" },
  foot_social:  { ro: "Social media", en: "Social media", he: "רשתות חברתיות", fr: "Réseaux sociaux" },
  foot_policies:{ ro: "Politici", en: "Policies", he: "מדיניות", fr: "Politiques" },
  foot_about:   { ro: "Despre noi", en: "About us", he: "עלינו", fr: "À propos" },
  foot_privacy: { ro: "Politica de confidențialitate", en: "Privacy policy", he: "מדיניות פרטיות", fr: "Politique de confidentialité" },
  foot_cookies: { ro: "Politica cookies", en: "Cookie policy", he: "מדיניות עוגיות", fr: "Politique de cookies" },
  foot_terms:   { ro: "Termeni și condiții", en: "Terms & conditions", he: "תנאים והגבלות", fr: "Conditions générales" },
  foot_rights:  { ro: "Toate drepturile rezervate.", en: "All rights reserved.", he: "כל הזכויות שמורות.", fr: "Tous droits réservés." },
  cal_title:    { ro: "Verifică disponibilitatea și rezervă", en: "Check availability & book", he: "בדקו זמינות והזמינו", fr: "Vérifier la disponibilité et réserver" },
  cal_free:     { ro: "Liber", en: "Available", he: "פנוי", fr: "Libre" },
  cal_busy:     { ro: "Ocupat", en: "Booked", he: "תפוס", fr: "Occupé" },
  cal_sel:      { ro: "Selectat", en: "Selected", he: "נבחר", fr: "Sélectionné" },
  pick_checkin: { ro: "Alege data de check-in.", en: "Pick your check-in date.", he: "בחרו תאריך צ'ק-אין.", fr: "Choisissez la date d'arrivée." },
  pick_checkout:{ ro: "Alege data de check-out.", en: "Pick your check-out date.", he: "בחרו תאריך צ'ק-אאוט.", fr: "Choisissez la date de départ." },
  nights_sel:   { ro: "nopți selectate.", en: "nights selected.", he: "לילות נבחרו.", fr: "nuits sélectionnées." },
  clear_sel:    { ro: "Golește selecția", en: "Clear selection", he: "נקו בחירה", fr: "Effacer" },
  adults:       { ro: "Adulți", en: "Adults", he: "מבוגרים", fr: "Adultes" },
  children:     { ro: "Copii", en: "Children", he: "ילדים", fr: "Enfants" },
  max_persons:  { ro: "Maxim {n} persoane", en: "Up to {n} guests", he: "עד {n} אורחים", fr: "Jusqu'à {n} personnes" },
  total_stay:   { ro: "Total sejur", en: "Stay total", he: "סה״כ שהות", fr: "Total du séjour" },
  deposit_now:  { ro: "Avans acum", en: "Deposit now", he: "מקדמה עכשיו", fr: "Acompte" },
  rest_checkin: { ro: "Rest la check-in", en: "Balance at check-in", he: "יתרה בצ'ק-אין", fr: "Solde à l'arrivée" },
  continue_book:{ ro: "Continuă spre rezervare", en: "Continue to booking", he: "המשיכו להזמנה", fr: "Continuer la réservation" },
  choose_period:{ ro: "Alege perioada pentru a rezerva", en: "Pick your dates to book", he: "בחרו תאריכים להזמנה", fr: "Choisissez vos dates" },
  send_booking: { ro: "Trimite rezervarea", en: "Send booking", he: "שלחו הזמנה", fr: "Envoyer la réservation" },
  back:         { ro: "← Înapoi", en: "← Back", he: "→ חזרה", fr: "← Retour" },
  first_name:   { ro: "Prenume", en: "First name", he: "שם פרטי", fr: "Prénom" },
  last_name:    { ro: "Nume", en: "Last name", he: "שם משפחה", fr: "Nom" },
  email:        { ro: "Email", en: "Email", he: "אימייל", fr: "E-mail" },
  phone:        { ro: "Telefon", en: "Phone", he: "טלפון", fr: "Téléphone" },
  night:        { ro: "noapte", en: "night", he: "לילה", fr: "nuit" },
  nights:       { ro: "nopți", en: "nights", he: "לילות", fr: "nuits" },
  guests_w:     { ro: "oaspeți", en: "guests", he: "אורחים", fr: "personnes" },
  villas_eyebrow:{ ro: "Alege-ți vila", en: "Pick your villa", he: "בחרו וילה", fr: "Choisissez votre villa" },
  villas_title: { ro: "Două vile, aceeași căldură", en: "Two villas, the same warmth", he: "שתי וילות, אותה חמימות", fr: "Deux villas, la même chaleur" },
  villas_lede:  { ro: "Capacitate și confort identice — diferă doar felul în care îți place să petreci serile.", en: "Same capacity and comfort — only the way you like to spend your evenings differs.", he: "אותה קיבולת ואותה נוחות — רק אופי הערבים שלכם שונה.", fr: "Même capacité, même confort — seule change votre façon de passer la soirée." },
  about_eyebrow:{ ro: "Despre Roots", en: "About Roots", he: "על Roots", fr: "À propos de Roots" },
  stat_villas:  { ro: "vile private", en: "private villas", he: "וילות פרטיות", fr: "villas privées" },
  stat_persons: { ro: "persoane / vilă", en: "guests / villa", he: "אורחים לווילה", fr: "personnes / villa" },
  stat_rooms:   { ro: "dormitoare cu baie", en: "en-suite bedrooms", he: "חדרי שינה עם חדר רחצה", fr: "chambres avec salle de bain" },
  stat_center:  { ro: "de centrul Brașovului", en: "from Brașov center", he: "ממרכז ברשוב", fr: "du centre de Brașov" },
  common_eyebrow:{ ro: "Între vile", en: "Between the villas", he: "בין הווילות", fr: "Entre les villas" },
  rules_eyebrow:{ ro: "Sejur fără griji", en: "A carefree stay", he: "שהות ללא דאגות", fr: "Un séjour sans souci" },
  testi_eyebrow:{ ro: "Oaspeții Roots", en: "Roots guests", he: "אורחי Roots", fr: "Les hôtes de Roots" },
  testi_rating: { ro: "rating mediu Google", en: "average Google rating", he: "דירוג גוגל ממוצע", fr: "note moyenne Google" },
  video_eyebrow:{ ro: "Atmosfera Roots", en: "The Roots vibe", he: "האווירה של Roots", fr: "L'ambiance Roots" },
  faq_eyebrow:  { ro: "Bine de știut", en: "Good to know", he: "טוב לדעת", fr: "Bon à savoir" },
  faq_title:    { ro: "Întrebări frecvente", en: "Frequently asked questions", he: "שאלות נפוצות", fr: "Questions fréquentes" },
  final_eyebrow:{ ro: "Următorul vostru weekend", en: "Your next weekend", he: "הסופ״ש הבא שלכם", fr: "Votre prochain week-end" },
  final_title:  { ro: "Locul e pregătit. Focul așteaptă.", en: "The place is ready. The fire is waiting.", he: "המקום מוכן. האש מחכה.", fr: "Le lieu est prêt. Le feu vous attend." },
  final_lede:   { ro: "Scrie-ne pe WhatsApp sau sună-ne — îți răspundem rapid cu disponibilitatea și toate detaliile.", en: "Message us on WhatsApp or call — we reply fast with availability and details.", he: "כתבו לנו בוואטסאפ או התקשרו — נחזור אליכם מהר עם זמינות ופרטים.", fr: "Écrivez-nous sur WhatsApp ou appelez — réponse rapide avec disponibilités et détails." },
  write_wa:     { ro: "Scrie-ne pe WhatsApp", en: "Message us on WhatsApp", he: "כתבו לנו בוואטסאפ", fr: "Écrivez-nous sur WhatsApp" },
  res_eyebrow:  { ro: "Rezervare directă", en: "Direct booking", he: "הזמנה ישירה", fr: "Réservation directe" },
  res_title:    { ro: "Rezervă la Roots", en: "Book your stay at Roots", he: "הזמינו שהות ב-Roots", fr: "Réservez chez Roots" },
  res_sub:      { ro: "Alege vila, perioada și numărul de oaspeți — vezi disponibilitatea live și trimite rezervarea.", en: "Pick your villa, dates and number of guests — see live availability and send your booking.", he: "בחרו וילה, תאריכים ומספר אורחים — בדקו זמינות בזמן אמת ושלחו הזמנה.", fr: "Choisissez la villa, les dates et le nombre de personnes — disponibilité en direct et réservation immédiate." },
  vp_details:   { ro: "Detalii vilă", en: "Villa details", he: "פרטי הווילה", fr: "Détails de la villa" },
  vp_facilities:{ ro: "Compartimentarea și echiparea vilei", en: "Rooms & amenities", he: "חדרים ומתקנים", fr: "Pièces et équipements" },
  vp_gal_ext:   { ro: "Cum arată exteriorul {v}", en: "The exterior of {v}", he: "כך נראה החוץ של {v}", fr: "L'extérieur de {v}" },
  vp_gal_int:   { ro: "Cum arată interiorul {v}", en: "Inside {v}", he: "כך נראה הפנים של {v}", fr: "L'intérieur de {v}" },
  vp_loc_title: { ro: "Localizată în Brașov, într-un cartier de case liniștit, la 10 minute de centru.", en: "Located in Brașov, in a quiet residential neighbourhood, 10 minutes from the center.", he: "ממוקמת בברשוב, בשכונת מגורים שקטה, 10 דקות מהמרכז.", fr: "Située à Brașov, dans un quartier résidentiel calme, à 10 minutes du centre." },
  vp_more_info: { ro: "Alte informații utile", en: "Other useful information", he: "מידע שימושי נוסף", fr: "Autres informations utiles" },
  vp_open_maps: { ro: "Deschide locația în Google Maps", en: "Open location in Google Maps", he: "פתחו את המיקום ב-Google Maps", fr: "Ouvrir dans Google Maps" },
  acc_title:    { ro: "Contul meu", en: "My account", he: "החשבון שלי", fr: "Mon compte" },
  acc_login:    { ro: "Autentificare", en: "Sign in", he: "התחברות", fr: "Connexion" },
  acc_email:    { ro: "Email", en: "Email", he: "אימייל", fr: "E-mail" },
  acc_pass:     { ro: "Parolă", en: "Password", he: "סיסמה", fr: "Mot de passe" },
  acc_hello:    { ro: "Bună, {n}!", en: "Hello, {n}!", he: "שלום, {n}!", fr: "Bonjour {n} !" },
  acc_bookings: { ro: "Sejururile tale", en: "Your stays", he: "השהיות שלך", fr: "Vos séjours" },
  acc_none:     { ro: "Nu am găsit sejururi pe acest email încă.", en: "No stays found for this email yet.", he: "לא נמצאו שהיות לאימייל זה עדיין.", fr: "Aucun séjour trouvé pour cet e-mail." },
  acc_logout:   { ro: "Deconectare", en: "Sign out", he: "התנתקות", fr: "Déconnexion" },
  acc_admin:    { ro: "Deschide panoul de administrare", en: "Open the admin panel", he: "פתח את פאנל הניהול", fr: "Ouvrir le panneau d'administration" },
  acc_help:     { ro: "Nu ai cont? Primești unul la prima rezervare — sau scrie-ne pe WhatsApp.", en: "No account? You get one with your first booking — or message us on WhatsApp.", he: "אין חשבון? תקבלו אחד בהזמנה הראשונה — או כתבו לנו בוואטסאפ.", fr: "Pas de compte ? Vous en recevez un à la première réservation — ou écrivez-nous sur WhatsApp." },
  villa_tag:    { ro: "Vila {n}", en: "Villa {n}", he: "וילה {n}", fr: "Villa {n}" },
  foot_tagline: { ro: "Două vile private în Stupini, Brașov — pentru serile care merită ținute minte.", en: "Two private villas in Stupini, Brașov — for the evenings worth remembering.", he: "שתי וילות פרטיות בסטופיני, ברשוב — לערבים שכדאי לזכור.", fr: "Deux villas privées à Stupini, Brașov — pour les soirées qui méritent d'être retenues." },
  foot_anpc:    { ro: "ANPC — protecția consumatorului", en: "ANPC — consumer protection (RO)", he: "ANPC — הגנת הצרכן (רומניה)", fr: "ANPC — protection des consommateurs (RO)" },
  foot_sal:     { ro: "SAL — soluționarea litigiilor", en: "SAL — dispute resolution (RO)", he: "SAL — יישוב סכסוכים (רומניה)", fr: "SAL — règlement des litiges (RO)" },
  open_maps:    { ro: "Deschide în Google Maps →", en: "Open in Google Maps →", he: "← פתחו ב-Google Maps", fr: "Ouvrir dans Google Maps →" },
  bk_nopay:     { ro: "Fără plată online acum — confirmăm rezervarea și detaliile avansului pe email/telefon.", en: "No online payment yet — we confirm the booking and deposit details by email/phone.", he: "אין תשלום מקוון כרגע — נאשר את ההזמנה ואת פרטי המקדמה באימייל/טלפון.", fr: "Pas de paiement en ligne pour l'instant — nous confirmons la réservation et l'acompte par e-mail/téléphone." },
  bk_sending:   { ro: "Se trimite rezervarea…", en: "Sending your booking…", he: "ההזמנה נשלחת…", fr: "Envoi de la réservation…" },
  bk_booked:    { ro: "Rezervare înregistrată", en: "Booking received", he: "ההזמנה נקלטה", fr: "Réservation enregistrée" },
  bk_villa:     { ro: "Vila", en: "Villa", he: "וילה", fr: "Villa" },
  bk_guest:     { ro: "Oaspete", en: "Guest", he: "אורח", fr: "Client" },
  bk_nights_g:  { ro: "Nopți · oaspeți", en: "Nights · guests", he: "לילות · אורחים", fr: "Nuits · personnes" },
  bk_total:     { ro: "Total sejur", en: "Stay total", he: 'סה"כ שהות', fr: "Total du séjour" },
  bk_deposit:   { ro: "Avans ({p}%)", en: "Deposit ({p}%)", he: "מקדמה ({p}%)", fr: "Acompte ({p}%)" },
  bk_ref:       { ro: "Referință", en: "Reference", he: "אסמכתא", fr: "Référence" },
  bk_emailed:   { ro: "Ți-am trimis detaliile pe email la {e}. ", en: "We emailed the details to {e}. ", he: "שלחנו את הפרטים לאימייל {e}. ", fr: "Les détails ont été envoyés à {e}. " },
  bk_soon:      { ro: "Te contactăm în scurt timp pentru confirmarea avansului. Mulțumim!", en: "We'll contact you shortly to confirm the deposit. Thank you!", he: "ניצור קשר בקרוב לאישור המקדמה. תודה!", fr: "Nous vous contactons rapidement pour confirmer l'acompte. Merci !" },
  bk_almost:    { ro: "Aproape gata", en: "Almost there", he: "כמעט מוכן", fr: "Presque terminé" },
  bk_dry:       { ro: "Rezervarea online se activează în curând. Trimite cererea pe WhatsApp și îți confirmăm imediat.", en: "Online booking goes live soon. Send your request on WhatsApp and we confirm right away.", he: "ההזמנה המקוונת תופעל בקרוב. שלחו את הבקשה בוואטסאפ ונאשר מיד.", fr: "La réservation en ligne arrive bientôt. Envoyez votre demande sur WhatsApp et nous confirmons aussitôt." },
  bk_send_wa:   { ro: "Trimite pe WhatsApp", en: "Send on WhatsApp", he: "שלחו בוואטסאפ", fr: "Envoyer sur WhatsApp" },
  bk_fail:      { ro: "Nu am putut finaliza rezervarea", en: "We couldn't complete the booking", he: "לא הצלחנו להשלים את ההזמנה", fr: "Impossible de finaliser la réservation" },
  bk_fail_p:    { ro: "Te rugăm încearcă din nou sau scrie-ne pe WhatsApp — răspundem rapid.", en: "Please try again or message us on WhatsApp — we reply fast.", he: "נסו שוב או כתבו לנו בוואטסאפ — נענה מהר.", fr: "Réessayez ou écrivez-nous sur WhatsApp — réponse rapide." },
  bk_other_dates:{ ro: "Alege alte date", en: "Pick other dates", he: "בחרו תאריכים אחרים", fr: "Choisir d'autres dates" },
  blog_eyebrow: { ro: "Jurnal Roots", en: "The Roots journal", he: "היומן של Roots", fr: "Le journal Roots" },
  blog_lede:    { ro: "Povești, idei de vacanță și noutăți de la Roots Villas Brașov.", en: "Stories, holiday ideas and news from Roots Villas Brașov.", he: "סיפורים, רעיונות לחופשה וחדשות מ-Roots Villas ברשוב.", fr: "Histoires, idées de vacances et nouvelles de Roots Villas Brașov." },
  loading:      { ro: "Se încarcă…", en: "Loading…", he: "טוען…", fr: "Chargement…" },
  blog_empty:   { ro: "În curând — primele articole sunt pe drum. 🌲", en: "Coming soon — the first stories are on their way. 🌲", he: "בקרוב — הכתבות הראשונות בדרך. 🌲", fr: "Bientôt — les premiers articles arrivent. 🌲" },
  blog_read:    { ro: "Citește articolul →", en: "Read the story →", he: "← לקריאת הכתבה", fr: "Lire l'article →" },
  blog_missing: { ro: "Articolul nu există.", en: "This story doesn't exist.", he: "הכתבה לא קיימת.", fr: "Cet article n'existe pas." },
  blog_back:    { ro: "Înapoi la blog", en: "Back to the blog", he: "חזרה לבלוג", fr: "Retour au blog" },
  blog_all:     { ro: "← Toate articolele", en: "← All stories", he: "כל הכתבות ←", fr: "← Tous les articles" },
  page_missing: { ro: "Pagina nu a fost găsită", en: "Page not found", he: "העמוד לא נמצא", fr: "Page introuvable" },
  back_home:    { ro: "Înapoi la pagina principală", en: "Back to the home page", he: "חזרה לעמוד הראשי", fr: "Retour à l'accueil" },
  wel_welcome:  { ro: "Bine ai venit", en: "Welcome", he: "ברוכים הבאים", fr: "Bienvenue" },
  wel_keybox:   { ro: "Cod cutie chei", en: "Key box code", he: "קוד תיבת מפתחות", fr: "Code boîte à clés" },
  wel_wifi:     { ro: "Rețea WiFi", en: "WiFi network", he: "רשת WiFi", fr: "Réseau WiFi" },
  wel_wifipass: { ro: "Parolă WiFi", en: "WiFi password", he: "סיסמת WiFi", fr: "Mot de passe WiFi" },
  wel_help:     { ro: "Ai nevoie de ajutor?", en: "Need help?", he: "צריכים עזרה?", fr: "Besoin d'aide ?" },
  wel_help_p:   { ro: "Suntem la un mesaj distanță — sună-ne sau scrie-ne pe WhatsApp și îți răspundem rapid.", en: "We're one message away — call us or write on WhatsApp and we reply fast.", he: "אנחנו במרחק הודעה — התקשרו או כתבו בוואטסאפ ונענה מהר.", fr: "Nous sommes à un message — appelez-nous ou écrivez sur WhatsApp, réponse rapide." },
  wel_recs:     { ro: "Recomandările noastre", en: "Our recommendations", he: "ההמלצות שלנו", fr: "Nos recommandations" },
  wel_recs_p:   { ro: "Locurile noastre preferate din Brașov și împrejurimi — apasă pentru navigare.", en: "Our favourite places in and around Brașov — tap to navigate.", he: "המקומות האהובים עלינו בברשוב ובסביבה — הקישו לניווט.", fr: "Nos endroits préférés à Brașov et alentours — touchez pour naviguer." },
  wel_foot:     { ro: "Sejur plăcut la ROOTS! · Stupini, Brașov", en: "Enjoy your stay at ROOTS! · Stupini, Brașov", he: "שהות נעימה ב-ROOTS! · סטופיני, ברשוב", fr: "Bon séjour chez ROOTS ! · Stupini, Brașov" },
};

export function t(key, vars) {
  const e = D[key];
  let s = (e && (e[LANG] || e.ro)) || key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace("{" + k + "}", v);
  return s;
}
