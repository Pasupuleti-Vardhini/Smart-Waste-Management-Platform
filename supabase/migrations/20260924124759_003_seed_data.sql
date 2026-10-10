/*
# Seed Data: Company, Facility, Waste Categories, Smart Bins, Storage Inventory, Reward Rates, System Settings

1. Seed Data
- Company: "GreenCycle Waste Management" (demo company)
- Facility: "GreenCycle Processing Facility" 
- Waste Categories: Plastic (Blue), Organic (Green), Metal (Black/Grey), Fabric (Yellow), E-Waste (Orange)
- Smart Bins: 5 bins, one per category, default 100kg capacity
- Storage Inventory: 5 inventory records, one per category, default 1000kg capacity
- Reward Rates: Wet Waste 2.00/kg, Dry Waste 5.00/kg
- System Settings: AI threshold 70%, bin/storage capacities, demo mode ON

2. Important Notes
- This seeds the initial demo company and facility.
- The Company Admin user is provisioned via the create-management-user edge function.
- All seed data is clearly demo data.
*/

-- ============================================================
-- SEED: COMPANY
-- ============================================================
INSERT INTO companies (id, name, description, is_active)
SELECT 'a0000000-0000-0000-0000-000000000001', 'GreenCycle Waste Management', 'Demo waste management company for the Smart Waste Management system.', true
WHERE NOT EXISTS (SELECT 1 FROM companies WHERE id = 'a0000000-0000-0000-0000-000000000001');

-- ============================================================
-- SEED: FACILITY
-- ============================================================
INSERT INTO facilities (id, company_id, name, address, state, district, is_active)
SELECT 'b0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'GreenCycle Processing Facility', '123 Industrial Zone, Green Valley', 'Maharashtra', 'Pune', true
WHERE NOT EXISTS (SELECT 1 FROM facilities WHERE id = 'b0000000-0000-0000-0000-000000000001');

-- ============================================================
-- SEED: WASTE CATEGORIES
-- ============================================================
INSERT INTO waste_categories (name, bin_color, description)
SELECT 'Plastic', 'Blue', 'Plastic waste including bottles, containers, packaging'
WHERE NOT EXISTS (SELECT 1 FROM waste_categories WHERE name = 'Plastic');

INSERT INTO waste_categories (name, bin_color, description)
SELECT 'Organic', 'Green', 'Organic/biodegradable waste including food scraps, garden waste'
WHERE NOT EXISTS (SELECT 1 FROM waste_categories WHERE name = 'Organic');

INSERT INTO waste_categories (name, bin_color, description)
SELECT 'Metal', 'Black/Grey', 'Metal waste including cans, foil, scrap metal'
WHERE NOT EXISTS (SELECT 1 FROM waste_categories WHERE name = 'Metal');

INSERT INTO waste_categories (name, bin_color, description)
SELECT 'Fabric', 'Yellow', 'Fabric/textile waste including clothing, cloth, upholstery'
WHERE NOT EXISTS (SELECT 1 FROM waste_categories WHERE name = 'Fabric');

INSERT INTO waste_categories (name, bin_color, description)
SELECT 'E-Waste', 'Orange', 'Electronic waste including devices, batteries, circuit boards'
WHERE NOT EXISTS (SELECT 1 FROM waste_categories WHERE name = 'E-Waste');

-- ============================================================
-- SEED: SMART BINS (5 bins for the facility)
-- ============================================================
INSERT INTO smart_bins (facility_id, category, bin_color, current_quantity, max_capacity, status, is_demo_iot)
SELECT 'b0000000-0000-0000-0000-000000000001', 'Plastic', 'Blue', 0, 100, 'Normal', true
WHERE NOT EXISTS (SELECT 1 FROM smart_bins WHERE facility_id = 'b0000000-0000-0000-0000-000000000001' AND category = 'Plastic');

INSERT INTO smart_bins (facility_id, category, bin_color, current_quantity, max_capacity, status, is_demo_iot)
SELECT 'b0000000-0000-0000-0000-000000000001', 'Organic', 'Green', 0, 100, 'Normal', true
WHERE NOT EXISTS (SELECT 1 FROM smart_bins WHERE facility_id = 'b0000000-0000-0000-0000-000000000001' AND category = 'Organic');

INSERT INTO smart_bins (facility_id, category, bin_color, current_quantity, max_capacity, status, is_demo_iot)
SELECT 'b0000000-0000-0000-0000-000000000001', 'Metal', 'Black/Grey', 0, 100, 'Normal', true
WHERE NOT EXISTS (SELECT 1 FROM smart_bins WHERE facility_id = 'b0000000-0000-0000-0000-000000000001' AND category = 'Metal');

INSERT INTO smart_bins (facility_id, category, bin_color, current_quantity, max_capacity, status, is_demo_iot)
SELECT 'b0000000-0000-0000-0000-000000000001', 'Fabric', 'Yellow', 0, 100, 'Normal', true
WHERE NOT EXISTS (SELECT 1 FROM smart_bins WHERE facility_id = 'b0000000-0000-0000-0000-000000000001' AND category = 'Fabric');

INSERT INTO smart_bins (facility_id, category, bin_color, current_quantity, max_capacity, status, is_demo_iot)
SELECT 'b0000000-0000-0000-0000-000000000001', 'E-Waste', 'Orange', 0, 100, 'Normal', true
WHERE NOT EXISTS (SELECT 1 FROM smart_bins WHERE facility_id = 'b0000000-0000-0000-0000-000000000001' AND category = 'E-Waste');

-- ============================================================
-- SEED: STORAGE INVENTORY (5 records for the facility)
-- ============================================================
INSERT INTO storage_inventory (facility_id, category, processed_quantity, stored_quantity, dispatched_quantity, storage_capacity)
SELECT 'b0000000-0000-0000-0000-000000000001', 'Plastic', 0, 0, 0, 1000
WHERE NOT EXISTS (SELECT 1 FROM storage_inventory WHERE facility_id = 'b0000000-0000-0000-0000-000000000001' AND category = 'Plastic');

INSERT INTO storage_inventory (facility_id, category, processed_quantity, stored_quantity, dispatched_quantity, storage_capacity)
SELECT 'b0000000-0000-0000-0000-000000000001', 'Organic', 0, 0, 0, 1000
WHERE NOT EXISTS (SELECT 1 FROM storage_inventory WHERE facility_id = 'b0000000-0000-0000-0000-000000000001' AND category = 'Organic');

INSERT INTO storage_inventory (facility_id, category, processed_quantity, stored_quantity, dispatched_quantity, storage_capacity)
SELECT 'b0000000-0000-0000-0000-000000000001', 'Metal', 0, 0, 0, 1000
WHERE NOT EXISTS (SELECT 1 FROM storage_inventory WHERE facility_id = 'b0000000-0000-0000-0000-000000000001' AND category = 'Metal');

INSERT INTO storage_inventory (facility_id, category, processed_quantity, stored_quantity, dispatched_quantity, storage_capacity)
SELECT 'b0000000-0000-0000-0000-000000000001', 'Fabric', 0, 0, 0, 1000
WHERE NOT EXISTS (SELECT 1 FROM storage_inventory WHERE facility_id = 'b0000000-0000-0000-0000-000000000001' AND category = 'Fabric');

INSERT INTO storage_inventory (facility_id, category, processed_quantity, stored_quantity, dispatched_quantity, storage_capacity)
SELECT 'b0000000-0000-0000-0000-000000000001', 'E-Waste', 0, 0, 0, 1000
WHERE NOT EXISTS (SELECT 1 FROM storage_inventory WHERE facility_id = 'b0000000-0000-0000-0000-000000000001' AND category = 'E-Waste');

-- ============================================================
-- SEED: REWARD RATES
-- ============================================================
INSERT INTO reward_rates (facility_id, waste_type, rate_per_kg, is_active)
SELECT 'b0000000-0000-0000-0000-000000000001', 'Wet Waste', 2.00, true
WHERE NOT EXISTS (SELECT 1 FROM reward_rates WHERE facility_id = 'b0000000-0000-0000-0000-000000000001' AND waste_type = 'Wet Waste');

INSERT INTO reward_rates (facility_id, waste_type, rate_per_kg, is_active)
SELECT 'b0000000-0000-0000-0000-000000000001', 'Dry Waste', 5.00, true
WHERE NOT EXISTS (SELECT 1 FROM reward_rates WHERE facility_id = 'b0000000-0000-0000-0000-000000000001' AND waste_type = 'Dry Waste');

-- ============================================================
-- SEED: SYSTEM SETTINGS
-- ============================================================
INSERT INTO system_settings (facility_id, ai_confidence_threshold, demo_mode, demo_iot, demo_ai)
SELECT 'b0000000-0000-0000-0000-000000000001', 70.00, true, true, true
WHERE NOT EXISTS (SELECT 1 FROM system_settings WHERE facility_id = 'b0000000-0000-0000-0000-000000000001');
