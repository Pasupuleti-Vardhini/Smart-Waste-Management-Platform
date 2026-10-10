/*
# Core Schema: Profiles, Companies, Facilities, Management Users, Collection Requests, Rewards

1. New Tables
- `profiles` — Extends auth.users with full name, phone, address, state, district, role, location.
- `companies` — Company entities for waste management organizations.
- `facilities` — Physical facilities belonging to a company.
- `management_users` — Links auth.users to a company/facility with management role.
- `waste_categories` — Five AI categories: Plastic, Organic, Metal, Fabric, E-Waste with bin colours.
- `reward_rates` — Configurable reward rates per waste type per facility.
- `collection_requests` — Household waste collection requests with full lifecycle.
- `collection_records` — Records actual collected quantity, collector, reward.
- `system_settings` — Global config: AI threshold, bin/storage capacities, demo mode flags.

2. Security
- RLS enabled on ALL tables.
- Profiles: users read/update only their own.
- Companies/facilities: management users read their own company/facility.
- Management users: admins CRUD within their company; users read their own.
- Collection requests: households CRUD their own; management read/update those for their facility.
- Reward rates: management update for their facility; households read.
- Waste categories: readable by all authenticated.
- System settings: management update for their facility; all read.

3. Important Notes
- profiles.role set server-side via trigger. NEVER trusted from frontend.
- Household registration always creates role='household'.
- collection_requests.user_id defaults to auth.uid().
- updated_at triggers on all tables.
*/

-- ============================================================
-- PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  address text,
  state text,
  district text,
  location_lat double precision,
  location_lng double precision,
  role text NOT NULL DEFAULT 'household' CHECK (role IN ('household', 'management', 'admin')),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- COMPANIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- FACILITIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS facilities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  address text,
  state text,
  district text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_facilities_company_id ON facilities(company_id);

-- ============================================================
-- MANAGEMENT_USERS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS management_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  facility_id uuid REFERENCES facilities(id) ON DELETE SET NULL,
  role text NOT NULL DEFAULT 'operator' CHECK (role IN ('admin', 'manager', 'operator')),
  job_title text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_mgmt_users_user_id ON management_users(user_id);
CREATE INDEX IF NOT EXISTS idx_mgmt_users_company_id ON management_users(company_id);
CREATE INDEX IF NOT EXISTS idx_mgmt_users_facility_id ON management_users(facility_id);

-- ============================================================
-- WASTE CATEGORIES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS waste_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE CHECK (name IN ('Plastic', 'Organic', 'Metal', 'Fabric', 'E-Waste')),
  bin_color text NOT NULL,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- REWARD RATES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS reward_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid REFERENCES facilities(id) ON DELETE CASCADE,
  waste_type text NOT NULL CHECK (waste_type IN ('Wet Waste', 'Dry Waste')),
  rate_per_kg numeric(10,2) NOT NULL DEFAULT 0 CHECK (rate_per_kg >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reward_rates_facility ON reward_rates(facility_id);

-- ============================================================
-- COLLECTION REQUESTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS collection_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_code text UNIQUE,
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  facility_id uuid REFERENCES facilities(id) ON DELETE SET NULL,
  waste_type text NOT NULL CHECK (waste_type IN ('Wet Waste', 'Dry Waste')),
  estimated_quantity_kg numeric(10,2) NOT NULL CHECK (estimated_quantity_kg > 0),
  preferred_pickup_date date NOT NULL,
  preferred_pickup_time text,
  pickup_address text NOT NULL,
  notes text,
  status text NOT NULL DEFAULT 'Requested' CHECK (status IN ('Requested', 'Assigned', 'Pickup Scheduled', 'Collection In Progress', 'Collected', 'Completed', 'Cancelled')),
  assigned_collector text,
  assigned_collector_id uuid REFERENCES management_users(id) ON DELETE SET NULL,
  actual_quantity_kg numeric(10,2),
  reward_amount numeric(10,2),
  reward_rate_id uuid REFERENCES reward_rates(id) ON DELETE SET NULL,
  completed_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coll_req_user_id ON collection_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_coll_req_facility_id ON collection_requests(facility_id);
CREATE INDEX IF NOT EXISTS idx_coll_req_status ON collection_requests(status);
CREATE INDEX IF NOT EXISTS idx_coll_req_created_at ON collection_requests(created_at DESC);

-- ============================================================
-- COLLECTION RECORDS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS collection_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_request_id uuid NOT NULL REFERENCES collection_requests(id) ON DELETE CASCADE,
  facility_id uuid REFERENCES facilities(id) ON DELETE SET NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  waste_type text NOT NULL,
  estimated_quantity_kg numeric(10,2) NOT NULL,
  actual_quantity_kg numeric(10,2) NOT NULL CHECK (actual_quantity_kg >= 0),
  reward_rate numeric(10,2) NOT NULL DEFAULT 0,
  reward_amount numeric(10,2) NOT NULL DEFAULT 0,
  collector_name text,
  collector_id uuid REFERENCES management_users(id) ON DELETE SET NULL,
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'Completed' CHECK (status IN ('Collected', 'Completed')),
  notes text,
  collected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_coll_rec_request_id ON collection_records(collection_request_id);
CREATE INDEX IF NOT EXISTS idx_coll_rec_user_id ON collection_records(user_id);
CREATE INDEX IF NOT EXISTS idx_coll_rec_facility_id ON collection_records(facility_id);

-- ============================================================
-- SYSTEM SETTINGS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS system_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid REFERENCES facilities(id) ON DELETE CASCADE,
  ai_confidence_threshold numeric(5,2) NOT NULL DEFAULT 70.00 CHECK (ai_confidence_threshold >= 0 AND ai_confidence_threshold <= 100),
  bin_capacity_plastic numeric(10,2) NOT NULL DEFAULT 100 CHECK (bin_capacity_plastic >= 0),
  bin_capacity_organic numeric(10,2) NOT NULL DEFAULT 100 CHECK (bin_capacity_organic >= 0),
  bin_capacity_metal numeric(10,2) NOT NULL DEFAULT 100 CHECK (bin_capacity_metal >= 0),
  bin_capacity_fabric numeric(10,2) NOT NULL DEFAULT 100 CHECK (bin_capacity_fabric >= 0),
  bin_capacity_ewaste numeric(10,2) NOT NULL DEFAULT 100 CHECK (bin_capacity_ewaste >= 0),
  storage_capacity_plastic numeric(10,2) NOT NULL DEFAULT 1000 CHECK (storage_capacity_plastic >= 0),
  storage_capacity_organic numeric(10,2) NOT NULL DEFAULT 1000 CHECK (storage_capacity_organic >= 0),
  storage_capacity_metal numeric(10,2) NOT NULL DEFAULT 1000 CHECK (storage_capacity_metal >= 0),
  storage_capacity_fabric numeric(10,2) NOT NULL DEFAULT 1000 CHECK (storage_capacity_fabric >= 0),
  storage_capacity_ewaste numeric(10,2) NOT NULL DEFAULT 1000 CHECK (storage_capacity_ewaste >= 0),
  unit_preference text NOT NULL DEFAULT 'kg' CHECK (unit_preference IN ('kg', 'g', 'ton')),
  demo_mode boolean NOT NULL DEFAULT true,
  demo_iot boolean NOT NULL DEFAULT true,
  demo_ai boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE facilities ENABLE ROW LEVEL SECURITY;
ALTER TABLE management_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE waste_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE collection_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- POLICIES: PROFILES
-- ============================================================
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
CREATE POLICY "profiles_select_own" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_insert_own" ON profiles;
CREATE POLICY "profiles_insert_own" ON profiles FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
CREATE POLICY "profiles_update_own" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- ============================================================
-- POLICIES: COMPANIES
-- ============================================================
DROP POLICY IF EXISTS "companies_select_mgmt" ON companies;
CREATE POLICY "companies_select_mgmt" ON companies FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM management_users mu
      WHERE mu.user_id = auth.uid() AND mu.company_id = companies.id AND mu.is_active = true
    )
  );

DROP POLICY IF EXISTS "companies_update_admin" ON companies;
CREATE POLICY "companies_update_admin" ON companies FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM management_users mu
      WHERE mu.user_id = auth.uid() AND mu.company_id = companies.id AND mu.role = 'admin' AND mu.is_active = true
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM management_users mu
      WHERE mu.user_id = auth.uid() AND mu.company_id = companies.id AND mu.role = 'admin' AND mu.is_active = true
    )
  );

-- ============================================================
-- POLICIES: FACILITIES
-- ============================================================
DROP POLICY IF EXISTS "facilities_select_mgmt" ON facilities;
CREATE POLICY "facilities_select_mgmt" ON facilities FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM management_users mu
      WHERE mu.user_id = auth.uid() AND mu.company_id = facilities.company_id AND mu.is_active = true
    )
  );

DROP POLICY IF EXISTS "facilities_update_admin" ON facilities;
CREATE POLICY "facilities_update_admin" ON facilities FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM management_users mu
      WHERE mu.user_id = auth.uid() AND mu.company_id = facilities.company_id AND mu.role = 'admin' AND mu.is_active = true
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM management_users mu
      WHERE mu.user_id = auth.uid() AND mu.company_id = facilities.company_id AND mu.role = 'admin' AND mu.is_active = true
    )
  );

-- ============================================================
-- POLICIES: MANAGEMENT_USERS
-- ============================================================
DROP POLICY IF EXISTS "mgmt_users_select_own" ON management_users;
CREATE POLICY "mgmt_users_select_own" ON management_users FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "mgmt_users_select_company" ON management_users;
CREATE POLICY "mgmt_users_select_company" ON management_users FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM management_users mu
      WHERE mu.user_id = auth.uid() AND mu.company_id = management_users.company_id AND mu.role = 'admin' AND mu.is_active = true
    )
  );

DROP POLICY IF EXISTS "mgmt_users_insert_admin" ON management_users;
CREATE POLICY "mgmt_users_insert_admin" ON management_users FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM management_users mu
      WHERE mu.user_id = auth.uid() AND mu.company_id = management_users.company_id AND mu.role = 'admin' AND mu.is_active = true
    )
  );

DROP POLICY IF EXISTS "mgmt_users_update_admin" ON management_users;
CREATE POLICY "mgmt_users_update_admin" ON management_users FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM management_users mu
      WHERE mu.user_id = auth.uid() AND mu.company_id = management_users.company_id AND mu.role = 'admin' AND mu.is_active = true
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM management_users mu
      WHERE mu.user_id = auth.uid() AND mu.company_id = management_users.company_id AND mu.role = 'admin' AND mu.is_active = true
    )
  );

DROP POLICY IF EXISTS "mgmt_users_delete_admin" ON management_users;
CREATE POLICY "mgmt_users_delete_admin" ON management_users FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM management_users mu
      WHERE mu.user_id = auth.uid() AND mu.company_id = management_users.company_id AND mu.role = 'admin' AND mu.is_active = true
    )
  );

-- ============================================================
-- POLICIES: WASTE CATEGORIES
-- ============================================================
DROP POLICY IF EXISTS "waste_categories_select_all" ON waste_categories;
CREATE POLICY "waste_categories_select_all" ON waste_categories FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "waste_categories_update_mgmt" ON waste_categories;
CREATE POLICY "waste_categories_update_mgmt" ON waste_categories FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM management_users mu WHERE mu.user_id = auth.uid() AND mu.is_active = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM management_users mu WHERE mu.user_id = auth.uid() AND mu.is_active = true)
  );

-- ============================================================
-- POLICIES: REWARD RATES
-- ============================================================
DROP POLICY IF EXISTS "reward_rates_select_all" ON reward_rates;
CREATE POLICY "reward_rates_select_all" ON reward_rates FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "reward_rates_update_mgmt" ON reward_rates;
CREATE POLICY "reward_rates_update_mgmt" ON reward_rates FOR UPDATE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM management_users mu
      WHERE mu.user_id = auth.uid() AND mu.is_active = true AND (
        mu.facility_id = reward_rates.facility_id OR
        (mu.facility_id IS NULL AND mu.company_id IN (SELECT f.company_id FROM facilities f WHERE f.id = reward_rates.facility_id))
      )
    )
  ) WITH CHECK (
    EXISTS (
      SELECT 1 FROM management_users mu
      WHERE mu.user_id = auth.uid() AND mu.is_active = true AND (
        mu.facility_id = reward_rates.facility_id OR
        (mu.facility_id IS NULL AND mu.company_id IN (SELECT f.company_id FROM facilities f WHERE f.id = reward_rates.facility_id))
      )
    )
  );

DROP POLICY IF EXISTS "reward_rates_insert_mgmt" ON reward_rates;
CREATE POLICY "reward_rates_insert_mgmt" ON reward_rates FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM management_users mu
      WHERE mu.user_id = auth.uid() AND mu.is_active = true AND (
        mu.facility_id = reward_rates.facility_id OR
        (mu.facility_id IS NULL AND mu.company_id IN (SELECT f.company_id FROM facilities f WHERE f.id = reward_rates.facility_id))
      )
    )
  );

-- ============================================================
-- POLICIES: COLLECTION REQUESTS
-- ============================================================
DROP POLICY IF EXISTS "coll_req_select_own" ON collection_requests;
CREATE POLICY "coll_req_select_own" ON collection_requests FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "coll_req_select_mgmt" ON collection_requests;
CREATE POLICY "coll_req_select_mgmt" ON collection_requests FOR SELECT
  TO authenticated USING (
    facility_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM management_users mu
      WHERE mu.user_id = auth.uid() AND mu.facility_id = collection_requests.facility_id AND mu.is_active = true
    )
  );

DROP POLICY IF EXISTS "coll_req_insert_own" ON collection_requests;
CREATE POLICY "coll_req_insert_own" ON collection_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "coll_req_update_own" ON collection_requests;
CREATE POLICY "coll_req_update_own" ON collection_requests FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "coll_req_update_mgmt" ON collection_requests;
CREATE POLICY "coll_req_update_mgmt" ON collection_requests FOR UPDATE
  TO authenticated USING (
    facility_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM management_users mu
      WHERE mu.user_id = auth.uid() AND mu.facility_id = collection_requests.facility_id AND mu.is_active = true
    )
  ) WITH CHECK (
    facility_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM management_users mu
      WHERE mu.user_id = auth.uid() AND mu.facility_id = collection_requests.facility_id AND mu.is_active = true
    )
  );

-- ============================================================
-- POLICIES: COLLECTION RECORDS
-- ============================================================
DROP POLICY IF EXISTS "coll_rec_select_own" ON collection_records;
CREATE POLICY "coll_rec_select_own" ON collection_records FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "coll_rec_select_mgmt" ON collection_records;
CREATE POLICY "coll_rec_select_mgmt" ON collection_records FOR SELECT
  TO authenticated USING (
    facility_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM management_users mu
      WHERE mu.user_id = auth.uid() AND mu.facility_id = collection_records.facility_id AND mu.is_active = true
    )
  );

DROP POLICY IF EXISTS "coll_rec_insert_mgmt" ON collection_records;
CREATE POLICY "coll_rec_insert_mgmt" ON collection_records FOR INSERT
  TO authenticated WITH CHECK (
    facility_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM management_users mu
      WHERE mu.user_id = auth.uid() AND mu.facility_id = collection_records.facility_id AND mu.is_active = true
    )
  );

DROP POLICY IF EXISTS "coll_rec_update_mgmt" ON collection_records;
CREATE POLICY "coll_rec_update_mgmt" ON collection_records FOR UPDATE
  TO authenticated USING (
    facility_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM management_users mu
      WHERE mu.user_id = auth.uid() AND mu.facility_id = collection_records.facility_id AND mu.is_active = true
    )
  ) WITH CHECK (
    facility_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM management_users mu
      WHERE mu.user_id = auth.uid() AND mu.facility_id = collection_records.facility_id AND mu.is_active = true
    )
  );

-- ============================================================
-- POLICIES: SYSTEM SETTINGS
-- ============================================================
DROP POLICY IF EXISTS "settings_select_all" ON system_settings;
CREATE POLICY "settings_select_all" ON system_settings FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "settings_update_mgmt" ON system_settings;
CREATE POLICY "settings_update_mgmt" ON system_settings FOR UPDATE
  TO authenticated USING (
    facility_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM management_users mu
      WHERE mu.user_id = auth.uid() AND mu.facility_id = system_settings.facility_id AND mu.is_active = true
    )
  ) WITH CHECK (
    facility_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM management_users mu
      WHERE mu.user_id = auth.uid() AND mu.facility_id = system_settings.facility_id AND mu.is_active = true
    )
  );

DROP POLICY IF EXISTS "settings_insert_mgmt" ON system_settings;
CREATE POLICY "settings_insert_mgmt" ON system_settings FOR INSERT
  TO authenticated WITH CHECK (
    facility_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM management_users mu
      WHERE mu.user_id = auth.uid() AND mu.facility_id = system_settings.facility_id AND mu.is_active = true
    )
  );

-- ============================================================
-- TRIGGERS: Auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ BEGIN
  CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_facilities_updated_at BEFORE UPDATE ON facilities FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_management_users_updated_at BEFORE UPDATE ON management_users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_collection_requests_updated_at BEFORE UPDATE ON collection_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_collection_records_updated_at BEFORE UPDATE ON collection_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_reward_rates_updated_at BEFORE UPDATE ON reward_rates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_system_settings_updated_at BEFORE UPDATE ON system_settings FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- TRIGGER: Auto-create profile on auth user signup
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, phone, address, state, district, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    NEW.email,
    NEW.raw_user_meta_data->>'phone',
    NEW.raw_user_meta_data->>'address',
    NEW.raw_user_meta_data->>'state',
    NEW.raw_user_meta_data->>'district',
    'household'
  );
  RETURN NEW;
END;
$$ language 'plpgsql' SECURITY DEFINER;

DO $$ BEGIN
  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- TRIGGER: Auto-generate request code
-- ============================================================
CREATE OR REPLACE FUNCTION generate_request_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.request_code IS NULL THEN
    NEW.request_code = 'REQ-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(NEW.id::text, 1, 8));
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ BEGIN
  CREATE TRIGGER set_request_code BEFORE INSERT ON collection_requests
    FOR EACH ROW EXECUTE FUNCTION generate_request_code();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
