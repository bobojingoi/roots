-- Roots Hub — schema (Postgres / Supabase, schema dedicată "hub")
CREATE SCHEMA IF NOT EXISTS hub;
SET search_path TO hub;

-- utilizatori interni (owner / manager)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  name TEXT,
  role TEXT NOT NULL DEFAULT 'manager' CHECK (role IN ('owner','manager')),
  reset_token TEXT,
  reset_expires TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- CMS: o secțiune = un rând; draft separat de publicat
CREATE TABLE IF NOT EXISTS site_content (
  section_key TEXT PRIMARY KEY,
  draft JSONB NOT NULL DEFAULT '{}'::jsonb,
  published JSONB,
  published_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID REFERENCES users(id)
);

-- istoricul ultimelor versiuni publicate (păstrăm 10 per secțiune, curățat aplicativ)
CREATE TABLE IF NOT EXISTS site_content_versions (
  id BIGSERIAL PRIMARY KEY,
  section_key TEXT NOT NULL REFERENCES site_content(section_key) ON DELETE CASCADE,
  content JSONB NOT NULL,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_by UUID REFERENCES users(id)
);
CREATE INDEX IF NOT EXISTS idx_scv_section ON site_content_versions(section_key, published_at DESC);

-- bibliotecă media centrală (fișierele stau în Supabase Storage)
CREATE TABLE IF NOT EXISTS media (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  storage_key TEXT UNIQUE NOT NULL,
  url TEXT NOT NULL,
  thumb_url TEXT,
  alt TEXT,
  width INT,
  height INT,
  bytes INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES users(id)
);

-- oaspeți (integration-ready Travelscan + GDPR)
CREATE TABLE IF NOT EXISTS guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  travelscan_id TEXT,
  name TEXT,
  email TEXT,
  phone TEXT,
  marketing_consent BOOLEAN NOT NULL DEFAULT false,
  consent_source TEXT,
  consent_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_guests_travelscan ON guests(travelscan_id);
CREATE INDEX IF NOT EXISTS idx_guests_email ON guests(lower(email));
CREATE INDEX IF NOT EXISTS idx_guests_phone ON guests(phone);

-- rezervări (sync Smoobu în Faza 2; site-ul creează deja rezervări Smoobu)
CREATE TABLE IF NOT EXISTS bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  smoobu_id TEXT UNIQUE,
  villa TEXT NOT NULL,
  arrival DATE NOT NULL,
  departure DATE NOT NULL,
  guests_count INT,
  value NUMERIC(10,2),
  status TEXT NOT NULL DEFAULT 'confirmed',
  guest_id UUID REFERENCES guests(id),
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bookings_dates ON bookings(villa, arrival, departure);

-- plăți online (Stripe Checkout) — avansul rezervărilor directe de pe site;
-- ref = ID-urile Smoobu ale rezervării ("123" sau "123 + 456" la pachetul cu ambele vile)
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL DEFAULT 'stripe',
  session_id TEXT UNIQUE,
  ref TEXT,
  amount NUMERIC(10,2),
  currency TEXT DEFAULT 'ron',
  status TEXT NOT NULL DEFAULT 'paid',
  guest_email TEXT,
  raw JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_payments_ref ON payments(ref);
-- coloane adăugate pentru tabul Financiar (idempotent pe bazele existente):
-- comisionul Stripe vine separat (balance transaction), nu în webhook
ALTER TABLE payments ADD COLUMN IF NOT EXISTS payment_intent TEXT;
ALTER TABLE payments ADD COLUMN IF NOT EXISTS fee NUMERIC(10,2);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS net NUMERIC(10,2);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refund_amount NUMERIC(10,2);
ALTER TABLE payments ADD COLUMN IF NOT EXISTS refunded_at TIMESTAMPTZ;

-- rezervări în așteptarea plății (fluxul plată-întâi): site-ul validează și
-- calculează prețul, dar rezervarea Smoobu se creează ABIA după plata avansului
-- (webhook-ul Stripe). payload = tot ce trebuie pentru creare + email + consimțământ.
CREATE TABLE IF NOT EXISTS pending_bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status TEXT NOT NULL DEFAULT 'pending', -- pending | paid | created | conflict_refunded | failed | cancelled
  payload JSONB NOT NULL,
  email TEXT,
  total NUMERIC(10,2),
  deposit NUMERIC(10,2),
  marketing_consent BOOLEAN NOT NULL DEFAULT false,
  session_id TEXT,
  reservation_ref TEXT,
  error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_pending_bookings_status ON pending_bookings(status, created_at DESC);
-- progres incremental la crearea rezervărilor (idempotență la retry-ul webhook-ului):
-- fiecare rezervare Smoobu creată se persistă IMEDIAT, ca retry-ul să reia de unde a rămas
ALTER TABLE pending_bookings ADD COLUMN IF NOT EXISTS created_refs JSONB NOT NULL DEFAULT '[]'::jsonb;

-- jurnal de evenimente interne (fundația webhook-urilor Travelscan)
CREATE TABLE IF NOT EXISTS events_log (
  id BIGSERIAL PRIMARY KEY,
  event TEXT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_events_log ON events_log(event, created_at DESC);

-- blog
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  excerpt TEXT,
  cover TEXT,
  body TEXT,
  seo_title TEXT,
  seo_description TEXT,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_posts_pub ON posts(published_at DESC);
-- blocuri de conținut (text/poze/slider/comparație/checklist); NULL = doar body markdown
ALTER TABLE posts ADD COLUMN IF NOT EXISTS blocks JSONB;

-- roluri flexibile (admin/client/orice)
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
-- conturi create de pe site: telefon + „de unde știi de noi"
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS source TEXT;
-- sursa de achiziție (Roots Leads): {source,label,campaign,firstAt} la înregistrare
ALTER TABLE users ADD COLUMN IF NOT EXISTS acquisition JSONB;
-- pe guests: + touches[] (istoricul surselor, câte una per rezervare directă)
ALTER TABLE guests ADD COLUMN IF NOT EXISTS acquisition JSONB;
-- consimțământ SEPARAT pentru audiențe pe platformele de ads (EDPB: granular);
-- marketing_consent rămâne doar pentru email
ALTER TABLE pending_bookings ADD COLUMN IF NOT EXISTS ads_consent BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS ads_consent BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE guests ADD COLUMN IF NOT EXISTS ads_consent_at TIMESTAMPTZ;

-- setări generice (ex. role_permissions: ce zone din admin vede fiecare rol)
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- oferte: reduceri automate aplicate la rezervare + bonusuri informative
CREATE TABLE IF NOT EXISTS offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,              -- interval | lastminute | earlybird | longstay | combo | perk
  title TEXT NOT NULL,
  pct NUMERIC,                     -- % reducere (tipurile procentuale)
  amount_lei NUMERIC,              -- combo: lei/noapte reducere la ambele vile
  min_nights INT,                  -- longstay
  days_before INT,                 -- lastminute (max X zile până la sosire) / earlybird (min X zile)
  date_from DATE,
  date_to DATE,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- coduri de reducere (se introduc în contul de pe site)
CREATE TABLE IF NOT EXISTS discount_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  pct NUMERIC NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  expires DATE,
  amount_lei NUMERIC,
  single_use BOOLEAN NOT NULL DEFAULT false,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS discount_code TEXT;
-- bazele EXISTENTE primesc coloanele noi prin ALTER (cele noi le au din CREATE);
-- ordinea contează: ALTER-ele stau DUPĂ CREATE, altfel bootstrap-ul pe bază goală pică
ALTER TABLE discount_codes ADD COLUMN IF NOT EXISTS amount_lei NUMERIC;
ALTER TABLE discount_codes ADD COLUMN IF NOT EXISTS single_use BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE discount_codes ADD COLUMN IF NOT EXISTS used_at TIMESTAMPTZ;

-- ================= MEMBERSHIP & PUNCTE (Task 3.1) =================
-- cont de membru 1:1 cu user; tier-ul se DERIVĂ din lifetime_points la citire
CREATE TABLE IF NOT EXISTS membership_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  points_balance INT NOT NULL DEFAULT 0,
  lifetime_points INT NOT NULL DEFAULT 0,
  referral_code TEXT UNIQUE NOT NULL,
  referred_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- istoricul fiecărei mișcări de puncte
CREATE TABLE IF NOT EXISTS points_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES membership_accounts(id) ON DELETE CASCADE,
  amount INT NOT NULL,
  type TEXT NOT NULL, -- spend_reservation | referral_bonus_new | referral_bonus_inviter | photo_tag | review | redeem | admin_adjust
  source_ref TEXT,
  description TEXT,
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ptx_account ON points_transactions(account_id, created_at DESC);
-- idempotență pe TOATE tipurile cu sursă unică (v2 înlocuiește indexul inițial)
CREATE UNIQUE INDEX IF NOT EXISTS idx_ptx_unique_source_v2 ON points_transactions(type, source_ref)
  WHERE source_ref IS NOT NULL AND type IN ('spend_reservation','referral_bonus_new','referral_bonus_inviter','photo_tag','review','redeem_refund');
DROP INDEX IF EXISTS idx_ptx_unique_source;
-- plasă de siguranță: balanța nu poate deveni negativă (ne-fatal la bootstrap)
DO $$ BEGIN
  ALTER TABLE membership_accounts ADD CONSTRAINT chk_mb_balance_nonneg CHECK (points_balance >= 0);
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN check_violation THEN RAISE WARNING 'chk_mb_balance_nonneg omis: există balanțe negative — de corectat manual';
END $$;
-- catalog de recompense (cazare / cramă)
CREATE TABLE IF NOT EXISTS rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  photo TEXT,
  category TEXT NOT NULL, -- accommodation | cellar
  points_cost INT NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  stock INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- revendicări de recompense (voucher)
CREATE TABLE IF NOT EXISTS redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES membership_accounts(id) ON DELETE CASCADE,
  reward_id UUID NOT NULL REFERENCES rewards(id),
  points_spent INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | fulfilled | cancelled
  code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- cereri de puncte (poză #rootsvillas / review) validate manual de admin
CREATE TABLE IF NOT EXISTS points_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES membership_accounts(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- photo_tag | review
  url TEXT,
  note TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- pending | approved | rejected
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ================= SMART ROOTS (gateway Home Assistant) =================
-- o instanță HA per vilă; tokenul NU stă în DB, ci în env (token_env = numele variabilei)
CREATE TABLE IF NOT EXISTS ha_instances (
  villa TEXT PRIMARY KEY,               -- redwood | sequoia
  base_url TEXT,                        -- https://xxxx.ui.nabu.casa (fără / final)
  token_env TEXT,                       -- ex. HA_REDWOOD_TOKEN
  remote_method TEXT NOT NULL DEFAULT 'nabucasa',
  status TEXT NOT NULL DEFAULT 'mock',  -- mock | live
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- dispozitivele expuse prin hub (entity_id-urile HA, editabile din admin)
CREATE TABLE IF NOT EXISTS devices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  villa TEXT NOT NULL,
  ha_entity_id TEXT NOT NULL,
  type TEXT NOT NULL,                   -- light | hottub | climate | lock | gate | sensor
  label TEXT NOT NULL,
  capabilities JSONB NOT NULL DEFAULT '[]'::jsonb,  -- acțiunile suportate fizic
  safety_class TEXT NOT NULL DEFAULT 'comfort',     -- comfort | operational | restricted
  sort INT NOT NULL DEFAULT 0,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (villa, ha_entity_id)
);
-- acces oaspeți: magic-link legat de rezervare, valabil doar în fereastra șederii
CREATE TABLE IF NOT EXISTS access_grants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id TEXT,
  villa TEXT NOT NULL,
  guest_name TEXT,
  token TEXT UNIQUE NOT NULL,
  pin TEXT,
  valid_from TIMESTAMPTZ NOT NULL,
  valid_to TIMESTAMPTZ NOT NULL,
  revoked BOOLEAN NOT NULL DEFAULT false,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- codul universal de acces al personalului (fix per persoană, revocabil)
ALTER TABLE users ADD COLUMN IF NOT EXISTS access_code TEXT;

-- heatmap: click-uri anonime de pe site (fără date personale)
CREATE TABLE IF NOT EXISTS page_events (
  id BIGSERIAL PRIMARY KEY,
  path TEXT NOT NULL,
  device TEXT NOT NULL DEFAULT 'desktop',
  x REAL NOT NULL,          -- fracție 0..1 din lățimea viewportului
  y INT NOT NULL,           -- px absolut în document
  doc_h INT,                -- înălțimea documentului la momentul clickului
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_page_events ON page_events(path, device, created_at DESC);

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS channel TEXT;
