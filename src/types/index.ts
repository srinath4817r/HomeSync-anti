export type ViewMode =
  | "Dashboard"
  | "Calendar"
  | "Tasks"
  | "Groceries"
  | "Care"
  | "Map"
  | "Finance"
  | "Inventory"
  | "Documents"
  | "Requests"
  | "Family";

export type Role =
  | "admin_primary"
  | "admin"
  | "parent"
  | "spouse"
  | "senior"
  | "child"
  | "caregiver"
  | "member";

export interface User {
  id: number;
  email: string;
  name: string;
  avatar_url: string | null;
  google_id?: string | null;
}

export interface Family {
  id: number;
  name: string;
  description: string | null;
  photo_url: string | null;
  capacity: number;
  home_address: string | null;
  home_latitude: number | null;
  home_longitude: number | null;
  role?: Role;
  member_count?: number;
}

export interface FamilyMember {
  membership_id: number;
  user_id: number;
  email: string;
  name: string;
  avatar_url: string | null;
  role: Role;
  status: "active" | "pending_approval" | "suspended";
  joined_at: string;
  requested_role?: string | null;
}

export interface Invitation {
  id: number;
  token: string;
  role: Role;
  max_uses: number;
  used_count: number;
  expires_at: string;
  revoked_at: string | null;
  created_at: string;
  creator_name?: string;
  invite_url?: string;
}

export interface CalendarEvent {
  id: number | string;
  family_id: number;
  owner_user_id: number;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string | null;
  timezone: string;
  location_name: string | null;
  priority: "low" | "normal" | "high" | "urgent";
  status: string;
  recurrence_rule: string;
  assigned_to_user_id: number | null;
  visibility: "family" | "private";
  owner_name?: string;
  assignee_name?: string;
  is_occurrence?: boolean;
}

export interface Task {
  id: number;
  family_id: number;
  creator_user_id: number;
  assigned_to_user_id: number | null;
  title: string;
  description: string | null;
  priority: "low" | "medium" | "high" | "urgent";
  status: "pending" | "in_progress" | "completed" | "cancelled";
  due_date: string | null;
  category: string;
  completed_at: string | null;
  creator_name?: string;
  assignee_name?: string;
  completed_by_name?: string;
}

export interface GroceryItem {
  id: number;
  list_id: number;
  family_id: number;
  creator_user_id: number;
  name: string;
  quantity: number;
  unit: string;
  category: string;
  checked: number;
  checked_by_user_id: number | null;
  checked_at: string | null;
  estimated_cost: number | null;
  creator_name?: string;
  checked_by_name?: string;
}

export interface CarePlan {
  id: number;
  family_id: number;
  subject_user_id: number;
  creator_user_id: number;
  medicine_name: string;
  dosage_info: string;
  prescribed_instructions: string | null;
  scheduled_times: string; // JSON string
  days_of_week: string;
  timezone: string;
  starts_on: string;
  ends_on: string | null;
  repeat_after_minutes: number;
  escalation_after_minutes: number;
  escalation_interval_minutes: number;
  active: number;
  subject_name?: string;
  subject_avatar?: string | null;
}

export interface MedicineOccurrence {
  id: number;
  schedule_id: number;
  subject_user_id: number;
  scheduled_for: string;
  status: "scheduled" | "delivered" | "acknowledged" | "taken" | "snoozed" | "escalated" | "skipped";
  reminder_delivered_at: string | null;
  alert_acknowledged_at: string | null;
  alert_acknowledged_by: number | null;
  outcome: string | null;
  outcome_note: string | null;
  outcome_recorded_at: string | null;
  medicine_name?: string;
  dosage_info?: string;
  subject_name?: string;
}

export interface LocationSnapshot {
  user_id: number;
  name: string;
  avatar_url: string | null;
  latitude: number;
  longitude: number;
  accuracy_m: number | null;
  recorded_at: string;
  precision: "approximate" | "precise";
}

export interface LocationSharingSettings {
  id: number;
  family_id: number;
  user_id: number;
  enabled: number;
  precision: "approximate" | "precise";
  retention_days: number;
  expires_at: string | null;
}

export interface NearbyPlace {
  id: string | number;
  name: string;
  category: string;
  latitude: number;
  longitude: number;
  address: string | null;
  distance_meters: number | null;
  phone?: string | null;
  website?: string | null;
  opening_hours?: string | null;
}

export interface SavedLocation {
  id: number;
  family_id: number;
  owner_user_id: number;
  name: string;
  category: string;
  address: string | null;
  latitude: number;
  longitude: number;
  notes: string | null;
}

export interface Bill {
  id: number;
  family_id: number;
  owner_user_id: number;
  responsible_user_id: number | null;
  title: string;
  category: string;
  amount: number;
  currency: string;
  due_date: string | null;
  recurrence: string;
  status: "unpaid" | "paid" | "overdue";
  paid_at: string | null;
  marked_paid_by: number | null;
  payment_verified: number;
  owner_name?: string;
  responsible_name?: string;
  marked_paid_by_name?: string;
}

export interface InventoryItem {
  id: number;
  family_id: number;
  owner_user_id: number;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  reorder_threshold: number | null;
  storage_location: string | null;
  warranty_expires_on: string | null;
  owner_name?: string;
}

export interface HouseholdDocument {
  id: number;
  family_id: number;
  owner_user_id: number;
  title: string;
  document_type: string;
  file_path: string;
  original_name: string;
  content_type: string;
  size_bytes: number;
  expires_on: string | null;
  created_at: string;
  owner_name?: string;
}

export interface ServiceRequest {
  id: number;
  family_id: number;
  creator_user_id: number;
  title: string;
  category: string;
  description: string;
  status: "Draft" | "Submitted" | "Accepted" | "In progress" | "Completed" | "Declined" | "Cancelled";
  priority: "low" | "normal" | "high" | "urgent";
  assigned_to_user_id: number | null;
  accepted_at: string | null;
  completed_at: string | null;
  notes: string | null;
  created_at: string;
  creator_name?: string;
  assignee_name?: string;
}

export interface NotificationItem {
  id: number;
  user_id: number;
  family_id: number | null;
  title: string;
  body: string;
  type: string;
  link_url: string | null;
  read_at: string | null;
  created_at: string;
}
