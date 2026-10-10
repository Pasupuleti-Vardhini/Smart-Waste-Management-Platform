export type UserRole = 'household' | 'management' | 'admin';
export type ManagementRole = 'admin' | 'manager' | 'operator';

export type CollectionStatus =
  | 'Requested'
  | 'Assigned'
  | 'Pickup Scheduled'
  | 'Collection In Progress'
  | 'Collected'
  | 'Completed'
  | 'Cancelled';

export type WasteType = 'Wet Waste' | 'Dry Waste';

export type WasteCategory = 'Plastic' | 'Organic' | 'Metal' | 'Fabric' | 'E-Waste';

export type BinStatus = 'Normal' | 'Nearly Full' | 'Full';

export type AIConfidenceStatus = 'High' | 'Low';

export type AIReviewStatus = 'Pending' | 'Confirmed' | 'Changed' | 'Rejected' | 'Auto-Accepted';

export type DispatchStatus = 'Pending' | 'Ready' | 'Scheduled' | 'Dispatched' | 'Completed';

export type RequirementStatus =
  | 'Collecting'
  | 'Requirement Fulfilled'
  | 'Ready for Dispatch'
  | 'Dispatched'
  | 'Completed';

export type AlertSeverity = 'Info' | 'Warning' | 'Critical';

export type AlertType =
  | 'Bin Nearly Full'
  | 'Bin Full'
  | 'Storage Capacity Warning'
  | 'Low AI Confidence'
  | 'Requirement Fulfilled'
  | 'Dispatch Due'
  | 'Collection Request Pending'
  | 'IoT/System Warning';

export type HistoryCategory =
  | 'Collection'
  | 'Waste Receiving'
  | 'AI Sorting'
  | 'Manual Review'
  | 'Storage'
  | 'Dispatch'
  | 'Alert'
  | 'System'
  | 'Management';

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  address: string | null;
  state: string | null;
  district: string | null;
  location_lat: number | null;
  location_lng: number | null;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Facility {
  id: string;
  company_id: string;
  name: string;
  address: string | null;
  state: string | null;
  district: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ManagementUser {
  id: string;
  user_id: string;
  company_id: string;
  facility_id: string | null;
  role: ManagementRole;
  job_title: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ManagementUserWithProfile extends ManagementUser {
  profiles?: { full_name: string; email: string; phone: string | null };
  facilities?: { name: string } | null;
}

export interface WasteCategoryRow {
  id: string;
  name: WasteCategory;
  bin_color: string;
  description: string | null;
  created_at: string;
}

export interface RewardRate {
  id: string;
  facility_id: string;
  waste_type: WasteType;
  rate_per_kg: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CollectionRequest {
  id: string;
  request_code: string;
  user_id: string;
  facility_id: string | null;
  waste_type: WasteType;
  estimated_quantity_kg: number;
  preferred_pickup_date: string;
  preferred_pickup_time: string | null;
  pickup_address: string;
  notes: string | null;
  status: CollectionStatus;
  assigned_collector: string | null;
  assigned_collector_id: string | null;
  actual_quantity_kg: number | null;
  reward_amount: number | null;
  reward_rate_id: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface CollectionRecord {
  id: string;
  collection_request_id: string;
  facility_id: string | null;
  user_id: string;
  waste_type: WasteType;
  estimated_quantity_kg: number;
  actual_quantity_kg: number;
  reward_rate: number;
  reward_amount: number;
  collector_name: string | null;
  collector_id: string | null;
  recorded_by: string | null;
  status: string;
  notes: string | null;
  collected_at: string;
  created_at: string;
  updated_at: string;
}

export interface WasteReceiving {
  id: string;
  receiving_code: string;
  facility_id: string;
  source: string;
  collection_request_id: string | null;
  waste_type: WasteType;
  quantity_kg: number;
  unit: string;
  notes: string | null;
  received_by: string | null;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface AIDetection {
  id: string;
  facility_id: string;
  waste_receiving_id: string | null;
  image_url: string | null;
  predicted_category: WasteCategory;
  confidence: number;
  recommended_bin: string;
  confidence_status: AIConfidenceStatus;
  review_status: AIReviewStatus;
  is_demo: boolean;
  detected_by: string | null;
  detected_at: string;
  created_at: string;
  updated_at: string;
}

export interface ManualReview {
  id: string;
  facility_id: string;
  ai_detection_id: string;
  original_category: string;
  original_confidence: number;
  corrected_category: WasteCategory | null;
  review_action: 'Confirmed' | 'Changed' | 'Rejected';
  operator_id: string | null;
  operator_name: string | null;
  review_notes: string | null;
  reviewed_at: string;
  created_at: string;
}

export interface SmartBin {
  id: string;
  facility_id: string;
  category: WasteCategory;
  bin_color: string;
  current_quantity: number;
  max_capacity: number;
  fill_percentage: number;
  status: BinStatus;
  is_demo_iot: boolean;
  last_updated: string;
  created_at: string;
  updated_at: string;
}

export interface StorageInventory {
  id: string;
  facility_id: string;
  category: WasteCategory;
  processed_quantity: number;
  stored_quantity: number;
  dispatched_quantity: number;
  available_quantity: number;
  storage_capacity: number;
  fill_percentage: number;
  last_updated: string;
  created_at: string;
  updated_at: string;
}

export interface MaterialRequirement {
  id: string;
  facility_id: string;
  category: WasteCategory;
  required_quantity: number;
  unit: string;
  available_quantity: number;
  remaining_quantity: number;
  progress_percentage: number;
  target_date: string | null;
  status: RequirementStatus;
  notes: string | null;
  created_by: string | null;
  fulfilled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DispatchRecord {
  id: string;
  dispatch_code: string;
  facility_id: string;
  category: WasteCategory;
  quantity_kg: number;
  unit: string;
  destination: string;
  status: DispatchStatus;
  material_requirement_id: string | null;
  dispatched_by: string | null;
  dispatched_at: string | null;
  scheduled_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: string;
  facility_id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  related_id: string | null;
  related_table: string | null;
  is_read: boolean;
  read_at: string | null;
  read_by: string | null;
  created_at: string;
}

export interface SystemHistory {
  id: string;
  facility_id: string | null;
  category: HistoryCategory;
  action: string;
  entity_type: string | null;
  entity_id: string | null;
  description: string;
  performed_by: string | null;
  performed_by_name: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface SystemSettings {
  id: string;
  facility_id: string;
  ai_confidence_threshold: number;
  bin_capacity_plastic: number;
  bin_capacity_organic: number;
  bin_capacity_metal: number;
  bin_capacity_fabric: number;
  bin_capacity_ewaste: number;
  storage_capacity_plastic: number;
  storage_capacity_organic: number;
  storage_capacity_metal: number;
  storage_capacity_fabric: number;
  storage_capacity_ewaste: number;
  unit_preference: string;
  demo_mode: boolean;
  demo_iot: boolean;
  demo_ai: boolean;
  created_at: string;
  updated_at: string;
}

export interface AuthContext {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  managementUser: ManagementUser | null;
  facility: Facility | null;
  company: Company | null;
  loading: boolean;
  isHousehold: boolean;
  isManagement: boolean;
  isAdmin: boolean;
}
