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
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS discount_code TEXT;

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
