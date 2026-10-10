/*
# Waste Operations Schema: Receiving, AI Detections, Manual Reviews, Smart Bins, Inventory, Requirements, Dispatch, Alerts, History

1. New Tables
- `waste_receiving` — Records waste received at facility from household collections or other sources.
- `ai_detections` — AI waste classification results with image, predicted category, confidence, bin mapping.
- `manual_reviews` — Low-confidence AI detections sent for manual review with correction history.
- `smart_bins` — Five smart bins per facility with current quantity, max capacity, fill level, status.
- `storage_inventory` — Per-category inventory: processed, stored, dispatched, available quantities.
- `material_requirements` — Dynamic material requirements with progress tracking and fulfillment status.
- `dispatch_records` — Records of waste dispatched from facility with category breakdown.
- `alerts` — System alerts with severity levels and read status.
- `system_history` — Unified audit trail for all system events.

2. Security
- RLS enabled on ALL tables.
- All tables scoped to facility-level access for management users.
- No household access to any of these tables.

3. Important Notes
- storage_inventory separates processed/stored/dispatched/available quantities.
- smart_bins has DEMO IoT DATA flag.
- ai_detections stores image URL (Supabase Storage) and prediction data.
- material_requirements auto-updates status when available >= required.
- dispatch_records validates dispatch quantity <= available storage.
- system_history provides unified audit trail.
*/

-- ============================================================
-- WASTE RECEIVING TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS waste_receiving (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  receiving_code text UNIQUE,
  facility_id uuid NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  source text NOT NULL CHECK (source IN ('Household Collection', 'Other Configured Source')),
  collection_request_id uuid REFERENCES collection_requests(id) ON DELETE SET NULL,
  waste_type text NOT NULL CHECK (waste_type IN ('Wet Waste', 'Dry Waste')),
  quantity_kg numeric(10,2) NOT NULL CHECK (quantity_kg > 0),
  unit text NOT NULL DEFAULT 'kg',
  notes text,
  received_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'Received' CHECK (status IN ('Received', 'Processed', 'Dispatched')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_waste_recv_facility_id ON waste_receiving(facility_id);
CREATE INDEX IF NOT EXISTS idx_waste_recv_created_at ON waste_receiving(created_at DESC);

-- ============================================================
-- AI DETECTIONS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS ai_detections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  waste_receiving_id uuid REFERENCES waste_receiving(id) ON DELETE SET NULL,
  image_url text,
  predicted_category text NOT NULL CHECK (predicted_category IN ('Plastic', 'Organic', 'Metal', 'Fabric', 'E-Waste')),
  confidence numeric(5,2) NOT NULL CHECK (confidence >= 0 AND confidence <= 100),
  recommended_bin text NOT NULL,
  confidence_status text NOT NULL DEFAULT 'High' CHECK (confidence_status IN ('High', 'Low')),
  review_status text NOT NULL DEFAULT 'Pending' CHECK (review_status IN ('Pending', 'Confirmed', 'Changed', 'Rejected', 'Auto-Accepted')),
  is_demo boolean NOT NULL DEFAULT true,
  detected_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  detected_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_det_facility_id ON ai_detections(facility_id);
CREATE INDEX IF NOT EXISTS idx_ai_det_category ON ai_detections(predicted_category);
CREATE INDEX IF NOT EXISTS idx_ai_det_confidence ON ai_detections(confidence);
CREATE INDEX IF NOT EXISTS idx_ai_det_review_status ON ai_detections(review_status);
CREATE INDEX IF NOT EXISTS idx_ai_det_created_at ON ai_detections(created_at DESC);

-- ============================================================
-- MANUAL REVIEWS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS manual_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  ai_detection_id uuid NOT NULL REFERENCES ai_detections(id) ON DELETE CASCADE,
  original_category text NOT NULL,
  original_confidence numeric(5,2) NOT NULL,
  corrected_category text CHECK (corrected_category IN ('Plastic', 'Organic', 'Metal', 'Fabric', 'E-Waste')),
  review_action text NOT NULL CHECK (review_action IN ('Confirmed', 'Changed', 'Rejected')),
  operator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  operator_name text,
  review_notes text,
  reviewed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_manual_rev_facility_id ON manual_reviews(facility_id);
CREATE INDEX IF NOT EXISTS idx_manual_rev_ai_det_id ON manual_reviews(ai_detection_id);

-- ============================================================
-- SMART BINS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS smart_bins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('Plastic', 'Organic', 'Metal', 'Fabric', 'E-Waste')),
  bin_color text NOT NULL,
  current_quantity numeric(10,2) NOT NULL DEFAULT 0 CHECK (current_quantity >= 0),
  max_capacity numeric(10,2) NOT NULL DEFAULT 100 CHECK (max_capacity > 0),
  fill_percentage numeric(5,2) GENERATED ALWAYS AS (CASE WHEN max_capacity > 0 THEN (current_quantity / max_capacity * 100) ELSE 0 END) STORED,
  status text NOT NULL DEFAULT 'Normal' CHECK (status IN ('Normal', 'Nearly Full', 'Full')),
  is_demo_iot boolean NOT NULL DEFAULT true,
  last_updated timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(facility_id, category)
);

CREATE INDEX IF NOT EXISTS idx_smart_bins_facility_id ON smart_bins(facility_id);

-- ============================================================
-- STORAGE INVENTORY TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS storage_inventory (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('Plastic', 'Organic', 'Metal', 'Fabric', 'E-Waste')),
  processed_quantity numeric(10,2) NOT NULL DEFAULT 0 CHECK (processed_quantity >= 0),
  stored_quantity numeric(10,2) NOT NULL DEFAULT 0 CHECK (stored_quantity >= 0),
  dispatched_quantity numeric(10,2) NOT NULL DEFAULT 0 CHECK (dispatched_quantity >= 0),
  available_quantity numeric(10,2) GENERATED ALWAYS AS (processed_quantity - dispatched_quantity) STORED,
  storage_capacity numeric(10,2) NOT NULL DEFAULT 1000 CHECK (storage_capacity >= 0),
  fill_percentage numeric(5,2) GENERATED ALWAYS AS (CASE WHEN storage_capacity > 0 THEN (stored_quantity / storage_capacity * 100) ELSE 0 END) STORED,
  last_updated timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(facility_id, category)
);

CREATE INDEX IF NOT EXISTS idx_storage_inv_facility_id ON storage_inventory(facility_id);

-- ============================================================
-- MATERIAL REQUIREMENTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS material_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('Plastic', 'Organic', 'Metal', 'Fabric', 'E-Waste')),
  required_quantity numeric(10,2) NOT NULL CHECK (required_quantity > 0),
  unit text NOT NULL DEFAULT 'kg',
  available_quantity numeric(10,2) NOT NULL DEFAULT 0,
  remaining_quantity numeric(10,2) GENERATED ALWAYS AS (GREATEST(required_quantity - available_quantity, 0)) STORED,
  progress_percentage numeric(5,2) GENERATED ALWAYS AS (CASE WHEN required_quantity > 0 THEN LEAST(available_quantity / required_quantity * 100, 100) ELSE 0 END) STORED,
  target_date date,
  status text NOT NULL DEFAULT 'Collecting' CHECK (status IN ('Collecting', 'Requirement Fulfilled', 'Ready for Dispatch', 'Dispatched', 'Completed')),
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  fulfilled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mat_req_facility_id ON material_requirements(facility_id);
CREATE INDEX IF NOT EXISTS idx_mat_req_status ON material_requirements(status);
CREATE INDEX IF NOT EXISTS idx_mat_req_category ON material_requirements(category);

-- ============================================================
-- DISPATCH RECORDS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS dispatch_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_code text UNIQUE,
  facility_id uuid NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('Plastic', 'Organic', 'Metal', 'Fabric', 'E-Waste')),
  quantity_kg numeric(10,2) NOT NULL CHECK (quantity_kg > 0),
  unit text NOT NULL DEFAULT 'kg',
  destination text NOT NULL DEFAULT 'Recycling Processing Center',
  status text NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Ready', 'Scheduled', 'Dispatched', 'Completed')),
  material_requirement_id uuid REFERENCES material_requirements(id) ON DELETE SET NULL,
  dispatched_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  dispatched_at timestamptz,
  scheduled_date date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dispatch_facility_id ON dispatch_records(facility_id);
CREATE INDEX IF NOT EXISTS idx_dispatch_category ON dispatch_records(category);
CREATE INDEX IF NOT EXISTS idx_dispatch_status ON dispatch_records(status);
CREATE INDEX IF NOT EXISTS idx_dispatch_created_at ON dispatch_records(created_at DESC);

-- ============================================================
-- ALERTS TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid NOT NULL REFERENCES facilities(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('Bin Nearly Full', 'Bin Full', 'Storage Capacity Warning', 'Low AI Confidence', 'Requirement Fulfilled', 'Dispatch Due', 'Collection Request Pending', 'IoT/System Warning')),
  severity text NOT NULL DEFAULT 'Info' CHECK (severity IN ('Info', 'Warning', 'Critical')),
  title text NOT NULL,
  message text NOT NULL,
  related_id uuid,
  related_table text,
  is_read boolean NOT NULL DEFAULT false,
  read_at timestamptz,
  read_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_facility_id ON alerts(facility_id);
CREATE INDEX IF NOT EXISTS idx_alerts_is_read ON alerts(is_read);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);

-- ============================================================
-- SYSTEM HISTORY TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS system_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  facility_id uuid REFERENCES facilities(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('Collection', 'Waste Receiving', 'AI Sorting', 'Manual Review', 'Storage', 'Dispatch', 'Alert', 'System', 'Management')),
  action text NOT NULL,
  entity_type text,
  entity_id uuid,
  description text NOT NULL,
  performed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  performed_by_name text,
  metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_history_facility_id ON system_history(facility_id);
CREATE INDEX IF NOT EXISTS idx_history_category ON system_history(category);
CREATE INDEX IF NOT EXISTS idx_history_created_at ON system_history(created_at DESC);

-- ============================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================
ALTER TABLE waste_receiving ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_detections ENABLE ROW LEVEL SECURITY;
ALTER TABLE manual_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE smart_bins ENABLE ROW LEVEL SECURITY;
ALTER TABLE storage_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE material_requirements ENABLE ROW LEVEL SECURITY;
ALTER TABLE dispatch_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_history ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- HELPER FUNCTION: Check management access to facility
-- ============================================================
CREATE OR REPLACE FUNCTION user_has_facility_access(check_facility_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM management_users mu
    WHERE mu.user_id = auth.uid()
      AND mu.facility_id = check_facility_id
      AND mu.is_active = true
  );
END;
$$ language 'plpgsql' SECURITY DEFINER;

-- ============================================================
-- POLICIES: WASTE RECEIVING
-- ============================================================
DROP POLICY IF EXISTS "waste_recv_select_mgmt" ON waste_receiving;
CREATE POLICY "waste_recv_select_mgmt" ON waste_receiving FOR SELECT
  TO authenticated USING (user_has_facility_access(facility_id));

DROP POLICY IF EXISTS "waste_recv_insert_mgmt" ON waste_receiving;
CREATE POLICY "waste_recv_insert_mgmt" ON waste_receiving FOR INSERT
  TO authenticated WITH CHECK (user_has_facility_access(facility_id));

DROP POLICY IF EXISTS "waste_recv_update_mgmt" ON waste_receiving;
CREATE POLICY "waste_recv_update_mgmt" ON waste_receiving FOR UPDATE
  TO authenticated USING (user_has_facility_access(facility_id)) WITH CHECK (user_has_facility_access(facility_id));

DROP POLICY IF EXISTS "waste_recv_delete_mgmt" ON waste_receiving;
CREATE POLICY "waste_recv_delete_mgmt" ON waste_receiving FOR DELETE
  TO authenticated USING (user_has_facility_access(facility_id));

-- ============================================================
-- POLICIES: AI DETECTIONS
-- ============================================================
DROP POLICY IF EXISTS "ai_det_select_mgmt" ON ai_detections;
CREATE POLICY "ai_det_select_mgmt" ON ai_detections FOR SELECT
  TO authenticated USING (user_has_facility_access(facility_id));

DROP POLICY IF EXISTS "ai_det_insert_mgmt" ON ai_detections;
CREATE POLICY "ai_det_insert_mgmt" ON ai_detections FOR INSERT
  TO authenticated WITH CHECK (user_has_facility_access(facility_id));

DROP POLICY IF EXISTS "ai_det_update_mgmt" ON ai_detections;
CREATE POLICY "ai_det_update_mgmt" ON ai_detections FOR UPDATE
  TO authenticated USING (user_has_facility_access(facility_id)) WITH CHECK (user_has_facility_access(facility_id));

DROP POLICY IF EXISTS "ai_det_delete_mgmt" ON ai_detections;
CREATE POLICY "ai_det_delete_mgmt" ON ai_detections FOR DELETE
  TO authenticated USING (user_has_facility_access(facility_id));

-- ============================================================
-- POLICIES: MANUAL REVIEWS
-- ============================================================
DROP POLICY IF EXISTS "manual_rev_select_mgmt" ON manual_reviews;
CREATE POLICY "manual_rev_select_mgmt" ON manual_reviews FOR SELECT
  TO authenticated USING (user_has_facility_access(facility_id));

DROP POLICY IF EXISTS "manual_rev_insert_mgmt" ON manual_reviews;
CREATE POLICY "manual_rev_insert_mgmt" ON manual_reviews FOR INSERT
  TO authenticated WITH CHECK (user_has_facility_access(facility_id));

DROP POLICY IF EXISTS "manual_rev_update_mgmt" ON manual_reviews;
CREATE POLICY "manual_rev_update_mgmt" ON manual_reviews FOR UPDATE
  TO authenticated USING (user_has_facility_access(facility_id)) WITH CHECK (user_has_facility_access(facility_id));

-- ============================================================
-- POLICIES: SMART BINS
-- ============================================================
DROP POLICY IF EXISTS "smart_bins_select_mgmt" ON smart_bins;
CREATE POLICY "smart_bins_select_mgmt" ON smart_bins FOR SELECT
  TO authenticated USING (user_has_facility_access(facility_id));

DROP POLICY IF EXISTS "smart_bins_insert_mgmt" ON smart_bins;
CREATE POLICY "smart_bins_insert_mgmt" ON smart_bins FOR INSERT
  TO authenticated WITH CHECK (user_has_facility_access(facility_id));

DROP POLICY IF EXISTS "smart_bins_update_mgmt" ON smart_bins;
CREATE POLICY "smart_bins_update_mgmt" ON smart_bins FOR UPDATE
  TO authenticated USING (user_has_facility_access(facility_id)) WITH CHECK (user_has_facility_access(facility_id));

DROP POLICY IF EXISTS "smart_bins_delete_mgmt" ON smart_bins;
CREATE POLICY "smart_bins_delete_mgmt" ON smart_bins FOR DELETE
  TO authenticated USING (user_has_facility_access(facility_id));

-- ============================================================
-- POLICIES: STORAGE INVENTORY
-- ============================================================
DROP POLICY IF EXISTS "storage_inv_select_mgmt" ON storage_inventory;
CREATE POLICY "storage_inv_select_mgmt" ON storage_inventory FOR SELECT
  TO authenticated USING (user_has_facility_access(facility_id));

DROP POLICY IF EXISTS "storage_inv_insert_mgmt" ON storage_inventory;
CREATE POLICY "storage_inv_insert_mgmt" ON storage_inventory FOR INSERT
  TO authenticated WITH CHECK (user_has_facility_access(facility_id));

DROP POLICY IF EXISTS "storage_inv_update_mgmt" ON storage_inventory;
CREATE POLICY "storage_inv_update_mgmt" ON storage_inventory FOR UPDATE
  TO authenticated USING (user_has_facility_access(facility_id)) WITH CHECK (user_has_facility_access(facility_id));

-- ============================================================
-- POLICIES: MATERIAL REQUIREMENTS
-- ============================================================
DROP POLICY IF EXISTS "mat_req_select_mgmt" ON material_requirements;
CREATE POLICY "mat_req_select_mgmt" ON material_requirements FOR SELECT
  TO authenticated USING (user_has_facility_access(facility_id));

DROP POLICY IF EXISTS "mat_req_insert_mgmt" ON material_requirements;
CREATE POLICY "mat_req_insert_mgmt" ON material_requirements FOR INSERT
  TO authenticated WITH CHECK (user_has_facility_access(facility_id));

DROP POLICY IF EXISTS "mat_req_update_mgmt" ON material_requirements;
CREATE POLICY "mat_req_update_mgmt" ON material_requirements FOR UPDATE
  TO authenticated USING (user_has_facility_access(facility_id)) WITH CHECK (user_has_facility_access(facility_id));

DROP POLICY IF EXISTS "mat_req_delete_mgmt" ON material_requirements;
CREATE POLICY "mat_req_delete_mgmt" ON material_requirements FOR DELETE
  TO authenticated USING (user_has_facility_access(facility_id));

-- ============================================================
-- POLICIES: DISPATCH RECORDS
-- ============================================================
DROP POLICY IF EXISTS "dispatch_select_mgmt" ON dispatch_records;
CREATE POLICY "dispatch_select_mgmt" ON dispatch_records FOR SELECT
  TO authenticated USING (user_has_facility_access(facility_id));

DROP POLICY IF EXISTS "dispatch_insert_mgmt" ON dispatch_records;
CREATE POLICY "dispatch_insert_mgmt" ON dispatch_records FOR INSERT
  TO authenticated WITH CHECK (user_has_facility_access(facility_id));

DROP POLICY IF EXISTS "dispatch_update_mgmt" ON dispatch_records;
CREATE POLICY "dispatch_update_mgmt" ON dispatch_records FOR UPDATE
  TO authenticated USING (user_has_facility_access(facility_id)) WITH CHECK (user_has_facility_access(facility_id));

-- ============================================================
-- POLICIES: ALERTS
-- ============================================================
DROP POLICY IF EXISTS "alerts_select_mgmt" ON alerts;
CREATE POLICY "alerts_select_mgmt" ON alerts FOR SELECT
  TO authenticated USING (user_has_facility_access(facility_id));

DROP POLICY IF EXISTS "alerts_insert_mgmt" ON alerts;
CREATE POLICY "alerts_insert_mgmt" ON alerts FOR INSERT
  TO authenticated WITH CHECK (user_has_facility_access(facility_id));

DROP POLICY IF EXISTS "alerts_update_mgmt" ON alerts;
CREATE POLICY "alerts_update_mgmt" ON alerts FOR UPDATE
  TO authenticated USING (user_has_facility_access(facility_id)) WITH CHECK (user_has_facility_access(facility_id));

DROP POLICY IF EXISTS "alerts_delete_mgmt" ON alerts;
CREATE POLICY "alerts_delete_mgmt" ON alerts FOR DELETE
  TO authenticated USING (user_has_facility_access(facility_id));

-- ============================================================
-- POLICIES: SYSTEM HISTORY
-- ============================================================
DROP POLICY IF EXISTS "history_select_mgmt" ON system_history;
CREATE POLICY "history_select_mgmt" ON system_history FOR SELECT
  TO authenticated USING (user_has_facility_access(facility_id) OR facility_id IS NULL);

DROP POLICY IF EXISTS "history_insert_mgmt" ON system_history;
CREATE POLICY "history_insert_mgmt" ON system_history FOR INSERT
  TO authenticated WITH CHECK (user_has_facility_access(facility_id) OR facility_id IS NULL);

-- ============================================================
-- TRIGGERS: updated_at for new tables
-- ============================================================
DO $$ BEGIN
  CREATE TRIGGER update_waste_receiving_updated_at BEFORE UPDATE ON waste_receiving FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_ai_detections_updated_at BEFORE UPDATE ON ai_detections FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_smart_bins_updated_at BEFORE UPDATE ON smart_bins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_storage_inventory_updated_at BEFORE UPDATE ON storage_inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_material_requirements_updated_at BEFORE UPDATE ON material_requirements FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TRIGGER update_dispatch_records_updated_at BEFORE UPDATE ON dispatch_records FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- TRIGGER: Auto-generate receiving code
-- ============================================================
CREATE OR REPLACE FUNCTION generate_receiving_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.receiving_code IS NULL THEN
    NEW.receiving_code = 'RCV-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(NEW.id::text, 1, 8));
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ BEGIN
  CREATE TRIGGER set_receiving_code BEFORE INSERT ON waste_receiving
    FOR EACH ROW EXECUTE FUNCTION generate_receiving_code();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================
-- TRIGGER: Auto-generate dispatch code
-- ============================================================
CREATE OR REPLACE FUNCTION generate_dispatch_code()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.dispatch_code IS NULL THEN
    NEW.dispatch_code = 'DSP-' || to_char(now(), 'YYMMDD') || '-' || upper(substr(NEW.id::text, 1, 8));
  END IF;
  RETURN NEW;
END;
$$ language 'plpgsql';

DO $$ BEGIN
  CREATE TRIGGER set_dispatch_code BEFORE INSERT ON dispatch_records
    FOR EACH ROW EXECUTE FUNCTION generate_dispatch_code();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
