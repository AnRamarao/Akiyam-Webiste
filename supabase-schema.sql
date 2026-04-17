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
-- 9. OPTIONAL: pg_cron scheduled jobs (run after enabling pg_cron extension)
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
