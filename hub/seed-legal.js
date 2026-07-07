// seed-legal.js — pagini text (Despre noi + legale), conținut furnizat de proprietar.
// Idempotent: nu suprascrie secțiuni existente.
require('dotenv').config();
const { pool, initDb } = require('./db');

const FIRME = `**PANOCUBE SRL** — CUI: 37334344 · Nr. Reg. Com.: J08/742/2017 · Sediu: Str. Zorelelor nr. 7A, Brașov, România

și/sau

**KRONPERFORMANCE SRL** — CUI: 41375849 · Nr. Reg. Com.: J08/2348/2019 · Sediu: Str. Zorelelor nr. 7A, Camera 4, Brașov, România`;

const PAGES = {
  about_page: {
    title: 'Despre Roots Villas',
    intro: 'ROOTS Villas a început în 2020, odată cu deschiderea primei vile, Redwood, din dorința de a crea un loc privat aproape de Brașov, unde grupurile să se poată bucura de liniște, confort și timp petrecut împreună. În 2022 am inaugurat Sequoia, păstrând aceeași idee: două vile gândite pentru weekenduri memorabile cu familia sau prietenii.',
    body: `## Poveste începută în 2020

ROOTS Villas a pornit cu Redwood, prima noastră vilă privată, creată pentru grupuri care vor mai mult decât o simplă cazare. Am vrut un loc liniștit, aproape de Brașov, unde confortul, intimitatea și timpul petrecut împreună să fie în centrul experienței.

## Sequoia, pasul următor

În 2022 am inaugurat Sequoia, a doua vilă ROOTS, păstrând aceeași direcție: spații generoase, 4 dormitoare duble cu baie proprie, living, bucătărie complet utilată și facilități care transformă un weekend obișnuit într-o experiență completă.

## Gândit pentru grupuri

Fiecare vilă este potrivită pentru până la 8 persoane și oferă ciubăr, saună, firepit, grătar cu lemne, terasă acoperită și zone de relaxare. În funcție de vilă, oaspeții se pot bucura și de biliard, cramă, ping-pong sau videoproiector vizibil din ciubăr.

## Aproape de Brașov, departe de agitație

ROOTS este pentru familii, prieteni, aniversări sau escapade la munte. Ești aproape de oraș, dar într-un loc suficient de liniștit încât să simți că ai luat o pauză reală.`,
  },

  legal_privacy: {
    title: 'Politica de confidențialitate',
    intro: '',
    body: `## 1. Cine suntem

Această Politică de confidențialitate explică modul în care sunt colectate, utilizate și protejate datele personale ale vizitatorilor website-ului ROOTS Villas.

Website-ul este administrat de:

${FIRME}

În această politică, termenii „noi", „ROOTS Villas" sau „operatorul" se referă la una sau ambele societăți de mai sus, în funcție de contextul rezervării, comunicării sau serviciului prestat.

## 2. Ce date putem colecta

Putem colecta date personale atunci când ne contactezi, faci o solicitare de rezervare, completezi un formular sau interacționezi cu website-ul nostru.

Datele pot include: nume și prenume, număr de telefon, adresă de e-mail, detalii despre rezervare, perioada dorită, numărul de persoane, preferințe transmise voluntar, mesajele trimise prin formular, WhatsApp, e-mail sau alte canale de comunicare.

De asemenea, website-ul poate colecta automat anumite informații tehnice, precum adresa IP, tipul dispozitivului, browserul folosit, paginile accesate și date privind interacțiunea cu site-ul.

## 3. De ce folosim aceste date

Folosim datele personale pentru: a răspunde solicitărilor primite, a verifica disponibilitatea vilelor, a gestiona rezervările, a comunica detalii despre cazare, plată, anulare sau check-in, a îmbunătăți experiența pe website și a respecta obligațiile legale aplicabile.

Nu vindem datele personale către terți.

## 4. Temeiul legal al prelucrării

Prelucrăm datele personale doar atunci când există un temei legal, cum ar fi: executarea unui contract sau a unei solicitări înainte de rezervare, consimțământul tău pentru anumite comunicări, obligații legale sau interesul nostru legitim de a răspunde mesajelor, de a administra website-ul și de a proteja activitatea ROOTS Villas.

## 5. Cui putem transmite datele

Datele pot fi transmise doar atunci când este necesar către furnizori implicați în funcționarea serviciilor noastre, precum servicii de hosting, instrumente de comunicare, procesatori de plăți, servicii de rezervare, contabilitate sau autorități publice, atunci când legea ne obligă.

Acești furnizori pot procesa datele doar în scopurile pentru care au fost implicați.

## 6. Cât timp păstrăm datele

Păstrăm datele personale doar atât timp cât este necesar pentru scopurile pentru care au fost colectate.

Datele legate de rezervări, facturare sau obligații contabile pot fi păstrate conform termenelor legale aplicabile. Datele transmise prin formulare de contact sau conversații pot fi păstrate pentru perioada necesară gestionării solicitării și relației cu clientul.

## 7. Drepturile tale

Conform legislației privind protecția datelor, ai dreptul să soliciți acces la datele tale, rectificarea datelor incorecte, ștergerea datelor, restricționarea prelucrării, portabilitatea datelor și opoziția față de anumite prelucrări. De asemenea, ai dreptul să îți retragi consimțământul atunci când prelucrarea se bazează pe consimțământ. Aceste drepturi sunt prevăzute în GDPR și explicate de autoritățile europene de protecție a datelor.

Pentru exercitarea drepturilor, ne poți contacta la:

E-mail: office@panocube.ro · Telefon: 0731 700 191`,
  },

  legal_cookies: {
    title: 'Politica de cookies',
    intro: '',
    body: `## 1. Ce sunt cookie-urile

Cookie-urile sunt fișiere de mici dimensiuni, formate din litere și cifre, care pot fi stocate pe dispozitivul tău atunci când vizitezi un website.

Acestea ajută website-ul să funcționeze corect, să rețină anumite preferințe și, în unele cazuri, să ne ajute să înțelegem cum este folosit site-ul.

## 2. Cine folosește cookie-uri pe acest website

Website-ul ROOTS Villas poate folosi cookie-uri proprii și cookie-uri plasate de servicii terțe, în funcție de instrumentele active pe site.

Website-ul este administrat de:

${FIRME}

## 3. Ce tipuri de cookie-uri folosim

### Cookie-uri strict necesare

Aceste cookie-uri sunt necesare pentru funcționarea corectă a website-ului. Ele pot fi folosite pentru încărcarea paginilor, securitate, afișarea corectă a conținutului sau salvarea preferințelor esențiale. Aceste cookie-uri nu pot fi dezactivate din sistemele noastre, deoarece site-ul nu ar funcționa corect fără ele.

### Cookie-uri de analiză

Aceste cookie-uri ne ajută să înțelegem cum este folosit website-ul: ce pagini sunt vizitate, cât timp petrec utilizatorii pe site și ce secțiuni pot fi îmbunătățite. Aceste cookie-uri sunt folosite doar dacă îți exprimi acordul. Exemple posibile: Google Analytics, Meta Pixel sau alte instrumente similare, dacă sunt active pe website.

### Cookie-uri de marketing

Aceste cookie-uri pot fi folosite pentru afișarea de reclame relevante, măsurarea campaniilor de promovare sau crearea unor audiențe pentru platforme precum Google, Facebook, Instagram sau alte servicii de publicitate. Aceste cookie-uri sunt folosite doar dacă îți exprimi acordul.

### Cookie-uri de funcționalitate

Aceste cookie-uri pot ajuta la afișarea unor funcții suplimentare, cum ar fi hărți, formulare, butoane de contact, integrare WhatsApp, calendar de disponibilitate sau alte servicii externe. Unele dintre aceste servicii pot seta cookie-uri proprii atunci când interacționezi cu ele.

## 4. Servicii terțe care pot folosi cookie-uri

Website-ul poate include sau trimite către servicii externe precum: Google Analytics, Google Maps, Google Tag Manager, Meta/Facebook Pixel, Instagram, TikTok, YouTube, WhatsApp, Smoobu sau alte instrumente de rezervare și comunicare.

Aceste servicii pot colecta date conform propriilor politici de confidențialitate și cookies.

## 5. Cum îți poți gestiona acordul

La prima accesare a website-ului, poți accepta, refuza sau personaliza cookie-urile care nu sunt strict necesare. Poți modifica oricând preferințele de cookies din bannerul sau panoul de setări disponibil pe website.

De asemenea, poți controla sau șterge cookie-urile direct din setările browserului tău. Refuzarea sau ștergerea anumitor cookie-uri poate afecta modul în care funcționează unele secțiuni ale website-ului.

## 6. Cât timp sunt păstrate cookie-urile

Durata de păstrare diferă în funcție de tipul cookie-ului. Unele cookie-uri sunt șterse automat la închiderea browserului, iar altele pot rămâne stocate pentru o perioadă mai lungă, în funcție de scopul pentru care sunt folosite și de setările serviciului care le plasează.

## 7. Date personale colectate prin cookie-uri

Anumite cookie-uri pot colecta informații precum adresa IP, tipul dispozitivului, browserul folosit, paginile vizitate, interacțiunile cu website-ul și alte date tehnice.

Pentru mai multe detalii despre modul în care prelucrăm datele personale, consultă [Politica de confidențialitate](https://rootsvillas.ro/politica-de-confidentialitate).

## 8. Modificări ale politicii de cookies

Putem actualiza această Politică de cookies atunci când apar modificări legislative, tehnice sau operaționale. Versiunea actualizată va fi publicată pe această pagină.

Ultima actualizare: 09.06.2026`,
  },

  legal_terms: {
    title: 'Termeni și condiții',
    intro: '',
    body: `## 1. Informații generale

Website-ul rootsvillas.ro este administrat de:

${FIRME}

În continuare, termenii „ROOTS Villas", „noi", „operatorul" sau „prestatorul" se referă la una sau ambele societăți de mai sus, în funcție de serviciul prestat, rezervarea efectuată sau documentele emise.

Prin accesarea website-ului și/sau prin transmiterea unei solicitări de rezervare, utilizatorul confirmă că a citit, a înțeles și acceptă acești Termeni și condiții.

## 2. Despre ROOTS Villas

ROOTS Villas oferă servicii de cazare în vile private situate în zona Brașov, destinate în special grupurilor de prieteni, familiilor, aniversărilor și escapadelor private.

Informațiile prezentate pe website, inclusiv descrierile, fotografiile, facilitățile, disponibilitatea și tarifele, sunt furnizate cu scop informativ și comercial. Depunem eforturi pentru ca informațiile afișate să fie corecte și actualizate, însă pot apărea modificări sau erori punctuale.

## 3. Utilizarea website-ului

Utilizatorii pot folosi website-ul pentru a consulta informații despre vile, facilități, disponibilitate, tarife, politici de rezervare și date de contact.

Este interzisă utilizarea website-ului în scopuri ilegale, frauduloase, abuzive sau care pot afecta funcționarea normală a site-ului.

Ne rezervăm dreptul de a modifica, actualiza sau restricționa accesul la anumite secțiuni ale website-ului, fără notificare prealabilă.

## 4. Solicitări de rezervare și disponibilitate

Rezervările pot fi solicitate prin website, telefon, e-mail, WhatsApp, platforme partenere sau alte canale de comunicare puse la dispoziție de ROOTS Villas.

Transmiterea unei solicitări nu garantează automat confirmarea rezervării. Rezervarea devine fermă doar după confirmarea explicită din partea noastră și, după caz, după achitarea avansului sau a sumei stabilite pentru confirmare.

Disponibilitatea afișată pe website poate fi orientativă și poate suferi modificări până la confirmarea finală a rezervării.

## 5. Tarife și plată

Tarifele afișate sau comunicate pot varia în funcție de perioadă, număr de nopți, sezon, zile de weekend, sărbători, evenimente speciale, număr de persoane și alte condiții comerciale.

Pentru confirmarea rezervării se poate solicita plata unui avans. Valoarea avansului, termenul de plată și restul de plată vor fi comunicate înainte de confirmarea rezervării.

Neachitarea avansului sau a sumelor stabilite în termenul comunicat poate duce la anularea rezervării, fără alte formalități.

Plata se poate face prin transfer bancar, numerar, card sau alte metode agreate și comunicate de ROOTS Villas.

## 6. Politica de anulare

Politica de anulare poate varia în funcție de perioada rezervată, durata sejurului, tipul ofertei și condițiile comunicate la momentul rezervării.

Dacă nu se comunică altfel în mod expres, anularea gratuită este posibilă cu minimum 15 zile înainte de data check-in-ului.

În cazul anulărilor făcute cu mai puțin de 15 zile înainte de check-in, avansul achitat poate fi reținut integral sau parțial, în funcție de condițiile rezervării.

În anumite situații, ROOTS Villas poate permite reprogramarea sejurului, în funcție de disponibilitate și de condițiile comerciale aplicabile. Reprogramarea nu este garantată automat și trebuie confirmată în scris.

Pentru ofertele speciale, promoțiile, perioadele de sărbători sau rezervările de grup, pot exista condiții diferite de anulare, comunicate înainte de confirmare.

## 7. Check-in și check-out

Ora de check-in și ora de check-out vor fi comunicate la momentul rezervării sau înainte de sosire.

Early check-in-ul și late check-out-ul pot fi disponibile doar la cerere, în funcție de disponibilitate și doar după confirmarea din partea ROOTS Villas.

Nerespectarea orei de check-out poate genera costuri suplimentare, mai ales dacă afectează pregătirea vilei pentru următorii oaspeți.

## 8. Capacitate și persoane suplimentare

Fiecare vilă este destinată în mod standard pentru până la 8 persoane.

Persoanele suplimentare pot fi acceptate doar cu acordul prealabil al ROOTS Villas și pot genera costuri suplimentare.

Numărul de persoane comunicat la rezervare trebuie respectat. Accesul unui număr mai mare de persoane decât cel declarat, fără acordul nostru, poate duce la perceperea unor taxe suplimentare sau la refuzul cazării.

## 9. Reguli de comportament și utilizare a proprietății

Oaspeții au obligația de a folosi vila, facilitățile, mobilierul, echipamentele și spațiile exterioare cu grijă și responsabilitate.

Este interzisă deteriorarea bunurilor, mutarea echipamentelor fără acord, folosirea necorespunzătoare a ciubărului, saunei, firepit-ului, grătarului sau a altor facilități.

Oaspeții trebuie să respecte liniștea publică, vecinii, regulile proprietății și legislația în vigoare.

Evenimentele, petrecerile sau activitățile cu muzică puternică pot fi permise doar în limitele stabilite de ROOTS Villas și cu respectarea regulilor comunicate.

## 10. Daune și responsabilitatea oaspeților

Oaspeții răspund pentru orice daună produsă proprietății, mobilierului, echipamentelor, facilităților sau spațiilor exterioare, dacă aceasta a fost cauzată prin utilizare necorespunzătoare, neglijență sau comportament abuziv.

ROOTS Villas își rezervă dreptul de a solicita plata daunelor constatate după sau în timpul sejurului.

În cazul unor daune semnificative, costurile pot include reparații, înlocuiri, manoperă, transport și eventuale pierderi generate de imposibilitatea folosirii proprietății.

## 11. Siguranță și utilizarea facilităților

Ciubărul, sauna, firepit-ul, grătarul, terenul de sport, locul de joacă și celelalte facilități trebuie utilizate responsabil și doar conform instrucțiunilor comunicate.

Copiii trebuie supravegheați permanent de adulți, în special în zonele exterioare, la locul de joacă, lângă foc, ciubăr, saună sau alte zone cu potențial risc.

ROOTS Villas nu răspunde pentru accidente, vătămări sau incidente cauzate de folosirea necorespunzătoare a facilităților sau de nerespectarea regulilor comunicate.

## 12. Fumat, animale de companie și alte reguli speciale

Fumatul în interiorul vilelor este interzis. Fumatul este permis doar în zonele exterioare indicate, cu folosirea scrumierelor sau a recipientelor dedicate.

Accesul cu animale de companie este permis doar dacă a fost confirmat în prealabil de ROOTS Villas.

Orice reguli speciale privind animalele de companie, garanțiile, curățenia suplimentară sau restricțiile vor fi comunicate înainte de confirmarea rezervării.

## 13. Fotografii, descrieri și informații de pe website

Fotografiile și descrierile de pe website au scop de prezentare. Pot exista diferențe minore între fotografii și realitatea de la momentul sejurului, ca urmare a îmbunătățirilor, modificărilor de amenajare, sezonalității sau intervențiilor de mentenanță.

Facilitățile pot fi temporar indisponibile din motive tehnice, meteo, de siguranță sau mentenanță. În astfel de situații, vom încerca să informăm oaspeții și să găsim soluții rezonabile, acolo unde este posibil.

## 14. Limitarea răspunderii

ROOTS Villas nu poate fi trasă la răspundere pentru întârzieri, anulări, întreruperi sau imposibilitatea prestării serviciilor cauzate de evenimente independente de voința noastră, cum ar fi condiții meteo extreme, pene de curent, defecțiuni tehnice externe, restricții impuse de autorități, calamități, accidente sau alte situații de forță majoră.

Nu răspundem pentru bunurile personale pierdute, uitate, deteriorate sau lăsate nesupravegheate de oaspeți.

## 15. Date personale

Datele personale transmise prin website, telefon, e-mail, WhatsApp sau alte canale sunt prelucrate conform Politicii de confidențialitate disponibile pe website.

Prin transmiterea unei solicitări, utilizatorul confirmă că datele furnizate sunt reale, corecte și îi aparțin sau are dreptul de a le transmite.

## 16. Cookie-uri

Website-ul poate folosi cookie-uri și tehnologii similare pentru funcționarea corectă a site-ului, analiză, personalizare și marketing, conform Politicii de cookies disponibile pe website.

## 17. Proprietate intelectuală

Conținutul website-ului rootsvillas.ro, inclusiv textele, fotografiile, grafica, logo-ul, structura paginilor și elementele de design, aparține ROOTS Villas sau partenerilor săi și este protejat de legislația privind proprietatea intelectuală.

Copierea, reproducerea, distribuirea sau folosirea conținutului fără acordul nostru scris este interzisă.

## 18. Reclamații și soluționarea disputelor

Pentru orice sesizare sau reclamație privind serviciile ROOTS Villas, ne poți contacta folosind datele de contact afișate pe website.

Vom încerca să răspundem într-un termen rezonabil și să găsim o soluție amiabilă.

Consumatorii pot apela și la mecanismele de soluționare alternativă a litigiilor puse la dispoziție prin ANPC/SAL, ca alternativă la soluționarea litigiilor în instanță.

## 19. Legea aplicabilă

Acești Termeni și condiții sunt guvernați de legislația din România.

Orice dispută care nu poate fi soluționată pe cale amiabilă va fi înaintată instanțelor competente din România, conform legislației aplicabile.

## 20. Modificarea termenilor

ROOTS Villas își rezervă dreptul de a modifica acești Termeni și condiții atunci când apar modificări legislative, comerciale, operaționale sau tehnice.

Versiunea actualizată va fi publicată pe această pagină.

Ultima actualizare: 09.06.2026`,
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
      console.log('[seed-legal] publicat:', key);
    } else console.log('[seed-legal] există, sar:', key);
  }
  process.exit(0);
})().catch((e) => { console.error('FAIL:', e.message); process.exit(1); });
