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
};

export function t(key, vars) {
  const e = D[key];
  let s = (e && (e[LANG] || e.ro)) || key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replace("{" + k + "}", v);
  return s;
}
