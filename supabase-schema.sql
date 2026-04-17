-- ============================================================
-- AIKYAM Supabase Schema  (idempotent — safe to re-run)
-- Run this in your Supabase SQL Editor (https://supabase.com/dashboard)
-- ============================================================

-- ============================================================
-- 1. ROLE TYPE
-- ============================================================
-- Role hierarchy (highest → lowest):
--   GlobalAdmin    — Full system access, manage all users and roles
--   OrgAdmin       — Org-level admin, manage team, events, content, users
--   ContentManager — Manage events, gallery, vendors content
--   ProgramManager — Manage events, registrations, programs
--   FinanceStaff   — Manage donations, financial reporting
--   Volunteer      — Event coordination, member-area access
--   Donor          — Donation history, donor-specific content
--   Support        — View/manage contact and support submissions
--   Member         — Default role, basic authenticated access

DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM (
    'GlobalAdmin',
    'OrgAdmin',
    'ContentManager',
    'ProgramManager',
    'FinanceStaff',
    'Volunteer',
    'Donor',
    'Support',
    'Member'
  );
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'type app_role already exists — skipping';
END $$;

-- ============================================================
-- 2. PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  email TEXT NOT NULL,
  full_name TEXT DEFAULT '',
  role public.app_role NOT NULL DEFAULT 'Member',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Drop stale CHECK constraint from earlier schema versions (if any)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- 3. HELPER FUNCTION: check if current user has a given role
-- ============================================================
CREATE OR REPLACE FUNCTION public.user_has_role(required_role public.app_role)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role::text = required_role::text
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check if current user is any admin level
CREATE OR REPLACE FUNCTION public.user_is_admin()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role::text IN ('GlobalAdmin', 'OrgAdmin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Helper: check if current user is staff (admin or any manager/staff role)
CREATE OR REPLACE FUNCTION public.user_is_staff()
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
      AND role::text IN ('GlobalAdmin', 'OrgAdmin', 'ContentManager', 'ProgramManager', 'FinanceStaff', 'Support')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- 4. ROW LEVEL SECURITY POLICIES (profiles)
-- ============================================================

-- Drop existing policies so re-run doesn't error
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can read own profile"          ON public.profiles;
  DROP POLICY IF EXISTS "Admins can read all profiles"        ON public.profiles;
  DROP POLICY IF EXISTS "Staff can read all profiles"         ON public.profiles;
  DROP POLICY IF EXISTS "Users can update own profile"        ON public.profiles;
  DROP POLICY IF EXISTS "GlobalAdmin can update any profile"  ON public.profiles;
  DROP POLICY IF EXISTS "OrgAdmin can update non-global profiles" ON public.profiles;
  DROP POLICY IF EXISTS "GlobalAdmin can delete profiles"     ON public.profiles;
END $$;

-- SELECT: Users can always read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- SELECT: Admins can read all profiles
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.user_is_admin());

-- SELECT: Staff can read basic profile info (for member directories, event mgmt)
CREATE POLICY "Staff can read all profiles"
  ON public.profiles FOR SELECT
  USING (public.user_is_staff());

-- UPDATE: Users can update their own profile (name only — role stays the same)
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (
    auth.uid() = id
    AND role = (SELECT role FROM public.profiles WHERE id = auth.uid())
  );

-- UPDATE: GlobalAdmin can update any profile including role
CREATE POLICY "GlobalAdmin can update any profile"
  ON public.profiles FOR UPDATE
  USING (public.user_has_role('GlobalAdmin'));

-- UPDATE: OrgAdmin can update any profile, but cannot promote to GlobalAdmin
CREATE POLICY "OrgAdmin can update non-global profiles"
  ON public.profiles FOR UPDATE
  USING (public.user_has_role('OrgAdmin'))
  WITH CHECK (role::text != 'GlobalAdmin');

-- DELETE: Only GlobalAdmin can delete profiles
CREATE POLICY "GlobalAdmin can delete profiles"
  ON public.profiles FOR DELETE
  USING (public.user_has_role('GlobalAdmin'));

-- ============================================================
-- 5. TRIGGERS
-- ============================================================

-- Auto-create profile on signup (default role: Member)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'Member'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger first so re-run doesn't error
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 6. EVENTS TABLE
-- ============================================================

DO $$ BEGIN
  CREATE TYPE public.event_status AS ENUM (
    'draft',
    'published',
    'deactivated',
    'expired'
  );
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'type event_status already exists — skipping';
END $$;

CREATE TABLE IF NOT EXISTS public.events (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title       TEXT NOT NULL,
  description TEXT DEFAULT '',
  location    TEXT DEFAULT 'TBD',
  price       NUMERIC(10,2) DEFAULT 0,
  img         TEXT DEFAULT 'assets/branding/logo.png',
  tbd         BOOLEAN DEFAULT false,

  -- Temporal
  start_at    TIMESTAMPTZ,
  end_at      TIMESTAMPTZ,

  -- Lifecycle
  status      public.event_status NOT NULL DEFAULT 'draft',
  publish_at  TIMESTAMPTZ,
  expired_at  TIMESTAMPTZ,

  -- Backward compat with completedEvents.json
  summary     TEXT DEFAULT '',

  -- Audit
  created_by  UUID REFERENCES public.profiles(id),
  updated_by  UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now(),

  CONSTRAINT valid_dates CHECK (end_at IS NULL OR start_at IS NULL OR end_at >= start_at)
);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_events_status_start ON public.events (status, start_at DESC);
CREATE INDEX IF NOT EXISTS idx_events_publish_at ON public.events (publish_at) WHERE publish_at IS NOT NULL AND status = 'draft'::public.event_status;

DROP TRIGGER IF EXISTS events_updated_at ON public.events;
CREATE TRIGGER events_updated_at
  BEFORE UPDATE ON public.events
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- ============================================================
-- 7. EVENTS HELPER FUNCTIONS
-- ============================================================

-- Role hierarchy check for RLS
CREATE OR REPLACE FUNCTION public.user_has_min_role(required_role public.app_role)
RETURNS BOOLEAN AS $$
DECLARE
  role_order TEXT[] := ARRAY[
    'Member', 'Donor', 'Support', 'Volunteer',
    'FinanceStaff', 'ProgramManager', 'ContentManager',
    'OrgAdmin', 'GlobalAdmin'
  ];
  user_role public.app_role;
BEGIN
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  IF user_role IS NULL THEN RETURN false; END IF;
  RETURN array_position(role_order, user_role::text) >= array_position(role_order, required_role::text);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Auto-expire published events past their end date
CREATE OR REPLACE FUNCTION public.auto_expire_events()
RETURNS void AS $$
BEGIN
  UPDATE public.events
  SET status = 'expired'::public.event_status, expired_at = now(), updated_at = now()
  WHERE status::text = 'published' AND end_at IS NOT NULL AND end_at < now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Auto-publish draft events whose scheduled publish time has arrived
CREATE OR REPLACE FUNCTION public.auto_publish_events()
RETURNS void AS $$
BEGIN
  UPDATE public.events
  SET status = 'published'::public.event_status, publish_at = NULL, updated_at = now()
  WHERE status::text = 'draft' AND publish_at IS NOT NULL AND publish_at <= now();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- 8. EVENTS RLS POLICIES
-- ============================================================

-- Drop existing policies so re-run doesn't error
DO $$ BEGIN
  DROP POLICY IF EXISTS "Public can read published events"      ON public.events;
  DROP POLICY IF EXISTS "Public can read expired events"        ON public.events;
  DROP POLICY IF EXISTS "Managers can read all events"          ON public.events;
  DROP POLICY IF EXISTS "Managers can create events"            ON public.events;
  DROP POLICY IF EXISTS "ContentManagers can update any event"  ON public.events;
  DROP POLICY IF EXISTS "ProgramManagers can update own events" ON public.events;
  DROP POLICY IF EXISTS "Admins can delete events"              ON public.events;
END $$;

-- Anyone can read published events (public site)
CREATE POLICY "Public can read published events"
  ON public.events FOR SELECT
  USING (status::text = 'published');

-- Anyone can read expired events (past events display)
CREATE POLICY "Public can read expired events"
  ON public.events FOR SELECT
  USING (status::text = 'expired');

-- ProgramManager+ can read ALL events (admin page)
CREATE POLICY "Managers can read all events"
  ON public.events FOR SELECT
  USING (public.user_has_min_role('ProgramManager'));

-- ProgramManager+ can create events
CREATE POLICY "Managers can create events"
  ON public.events FOR INSERT
  WITH CHECK (public.user_has_min_role('ProgramManager'));

-- ContentManager+ can update any event
CREATE POLICY "ContentManagers can update any event"
  ON public.events FOR UPDATE
  USING (public.user_has_min_role('ContentManager'));

-- ProgramManager can update own events
CREATE POLICY "ProgramManagers can update own events"
  ON public.events FOR UPDATE
  USING (
    public.user_has_min_role('ProgramManager')
    AND created_by = auth.uid()
  );

-- Admins can delete events
CREATE POLICY "Admins can delete events"
  ON public.events FOR DELETE
  USING (public.user_is_admin());

-- ============================================================
-- 9. TEAM MEMBERS TABLE
-- ============================================================
-- Unified table for board members, executive committee (by year)

DO $$ BEGIN
  CREATE TYPE public.team_group AS ENUM (
    'board',
    'executive'
  );
EXCEPTION WHEN duplicate_object THEN
  RAISE NOTICE 'type team_group already exists — skipping';
END $$;

CREATE TABLE IF NOT EXISTS public.team_members (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name        TEXT NOT NULL,
  title       TEXT NOT NULL DEFAULT '',
  img         TEXT DEFAULT 'assets/branding/logo.png',
  team_group  public.team_group NOT NULL DEFAULT 'executive',
  year        INT,
  is_chairman BOOLEAN DEFAULT false,
  sort_order  INT DEFAULT 0,
  active      BOOLEAN DEFAULT true,
  created_at  TIMESTAMPTZ DEFAULT now(),
  updated_at  TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS team_members_updated_at ON public.team_members;
CREATE TRIGGER team_members_updated_at
  BEFORE UPDATE ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- RLS: public reads active members
DO $$ BEGIN
  DROP POLICY IF EXISTS "Public can read active team members"   ON public.team_members;
  DROP POLICY IF EXISTS "Managers can read all team members"     ON public.team_members;
  DROP POLICY IF EXISTS "ContentManagers can manage team members" ON public.team_members;
  DROP POLICY IF EXISTS "Admins can delete team members"         ON public.team_members;
END $$;

CREATE POLICY "Public can read active team members"
  ON public.team_members FOR SELECT
  USING (active = true);

CREATE POLICY "Managers can read all team members"
  ON public.team_members FOR SELECT
  USING (public.user_has_min_role('ProgramManager'));

CREATE POLICY "ContentManagers can manage team members"
  ON public.team_members FOR ALL
  USING (public.user_has_min_role('ContentManager'));

CREATE POLICY "Admins can delete team members"
  ON public.team_members FOR DELETE
  USING (public.user_is_admin());

-- ============================================================
-- 10. VENDORS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.vendors (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  category        TEXT NOT NULL,
  sub_category    TEXT DEFAULT '',
  vendor_name     TEXT NOT NULL,
  vendor_phone    TEXT DEFAULT '',
  referred_by     TEXT DEFAULT '',
  comment         TEXT DEFAULT '',
  active          BOOLEAN DEFAULT true,
  sort_order      INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS idx_vendors_category ON public.vendors (category);

DROP TRIGGER IF EXISTS vendors_updated_at ON public.vendors;
CREATE TRIGGER vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DO $$ BEGIN
  DROP POLICY IF EXISTS "Public can read active vendors"       ON public.vendors;
  DROP POLICY IF EXISTS "Managers can read all vendors"         ON public.vendors;
  DROP POLICY IF EXISTS "ContentManagers can manage vendors"    ON public.vendors;
  DROP POLICY IF EXISTS "Admins can delete vendors"             ON public.vendors;
END $$;

CREATE POLICY "Public can read active vendors"
  ON public.vendors FOR SELECT
  USING (active = true);

CREATE POLICY "Managers can read all vendors"
  ON public.vendors FOR SELECT
  USING (public.user_has_min_role('ProgramManager'));

CREATE POLICY "ContentManagers can manage vendors"
  ON public.vendors FOR ALL
  USING (public.user_has_min_role('ContentManager'));

CREATE POLICY "Admins can delete vendors"
  ON public.vendors FOR DELETE
  USING (public.user_is_admin());

-- ============================================================
-- 11. GALLERY IMAGES TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.gallery_images (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_base       TEXT NOT NULL,
  alt             TEXT DEFAULT '',
  caption         TEXT DEFAULT '',
  categories      TEXT[] DEFAULT '{}',
  width           INT,
  height          INT,
  srcset_webp     TEXT[] DEFAULT '{}',
  image_jpeg      TEXT DEFAULT '',
  active          BOOLEAN DEFAULT true,
  sort_order      INT DEFAULT 0,
  created_at      TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.gallery_images ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS gallery_images_updated_at ON public.gallery_images;
CREATE TRIGGER gallery_images_updated_at
  BEFORE UPDATE ON public.gallery_images
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

DO $$ BEGIN
  DROP POLICY IF EXISTS "Public can read active gallery images"      ON public.gallery_images;
  DROP POLICY IF EXISTS "Managers can read all gallery images"        ON public.gallery_images;
  DROP POLICY IF EXISTS "ContentManagers can manage gallery images"   ON public.gallery_images;
  DROP POLICY IF EXISTS "Admins can delete gallery images"            ON public.gallery_images;
END $$;

CREATE POLICY "Public can read active gallery images"
  ON public.gallery_images FOR SELECT
  USING (active = true);

CREATE POLICY "Managers can read all gallery images"
  ON public.gallery_images FOR SELECT
  USING (public.user_has_min_role('ProgramManager'));

CREATE POLICY "ContentManagers can manage gallery images"
  ON public.gallery_images FOR ALL
  USING (public.user_has_min_role('ContentManager'));

CREATE POLICY "Admins can delete gallery images"
  ON public.gallery_images FOR DELETE
  USING (public.user_is_admin());

-- ============================================================
-- 12. OPTIONAL: pg_cron scheduled jobs (run after enabling pg_cron extension)
-- ============================================================
-- Enable pg_cron in Supabase: Dashboard > Database > Extensions > pg_cron
-- Then run:
-- SELECT cron.schedule('auto-expire-events', '*/15 * * * *', 'SELECT public.auto_expire_events()');
-- SELECT cron.schedule('auto-publish-events', '*/15 * * * *', 'SELECT public.auto_publish_events()');

-- ============================================================
-- 10. INITIAL SETUP
-- ============================================================
-- Option A: Run supabase-seed.sql to create all test users at once.
--
-- Option B: Manual — sign up through the website, then promote:
--   UPDATE public.profiles SET role = 'GlobalAdmin' WHERE email = 'rjramarao@gmail.com';
-- ============================================================
