-- HOME SYNC Relational Database Schema
-- Production-ready, fully indexed, foreign keys enabled

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    google_id TEXT UNIQUE,
    email TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    avatar_url TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS families (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    photo_url TEXT,
    capacity INTEGER NOT NULL DEFAULT 8,
    home_latitude REAL,
    home_longitude REAL,
    home_address TEXT,
    created_by_user_id INTEGER NOT NULL REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS family_memberships (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member', -- 'admin_primary', 'admin', 'parent', 'spouse', 'senior', 'child', 'caregiver', 'member'
    status TEXT NOT NULL DEFAULT 'active', -- 'active', 'pending_approval', 'suspended'
    requested_role TEXT,
    joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(family_id, user_id)
);

CREATE TABLE IF NOT EXISTS invitations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    token TEXT UNIQUE NOT NULL,
    created_by_user_id INTEGER NOT NULL REFERENCES users(id),
    role TEXT NOT NULL DEFAULT 'member',
    max_uses INTEGER NOT NULL DEFAULT 1,
    used_count INTEGER NOT NULL DEFAULT 0,
    expires_at DATETIME NOT NULL,
    revoked_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS resource_permissions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    resource_type TEXT NOT NULL, -- 'grocery_list', 'bill', 'document', 'care_plan', 'location', 'task'
    resource_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    permission_level TEXT NOT NULL DEFAULT 'read', -- 'read', 'write', 'admin'
    UNIQUE(resource_type, resource_id, user_id)
);

CREATE TABLE IF NOT EXISTS saved_locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    owner_user_id INTEGER NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    address TEXT,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    notes TEXT,
    visible_to_all INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS location_sharing_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    enabled INTEGER NOT NULL DEFAULT 0,
    precision TEXT NOT NULL DEFAULT 'approximate', -- 'approximate', 'precise'
    retention_days INTEGER NOT NULL DEFAULT 7,
    expires_at DATETIME,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(family_id, user_id)
);

CREATE TABLE IF NOT EXISTS location_records (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    accuracy_m REAL,
    recorded_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS calendar_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    owner_user_id INTEGER NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT,
    starts_at DATETIME NOT NULL,
    ends_at DATETIME,
    timezone TEXT NOT NULL DEFAULT 'UTC',
    location_name TEXT,
    priority TEXT NOT NULL DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    status TEXT NOT NULL DEFAULT 'scheduled',
    recurrence_rule TEXT DEFAULT 'none', -- 'none', 'daily', 'weekly', 'monthly'
    parent_event_id INTEGER REFERENCES calendar_events(id) ON DELETE CASCADE,
    assigned_to_user_id INTEGER REFERENCES users(id),
    visibility TEXT NOT NULL DEFAULT 'family', -- 'family', 'private'
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    creator_user_id INTEGER NOT NULL REFERENCES users(id),
    assigned_to_user_id INTEGER REFERENCES users(id),
    title TEXT NOT NULL,
    description TEXT,
    priority TEXT NOT NULL DEFAULT 'medium', -- 'low', 'medium', 'high', 'urgent'
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'completed', 'cancelled'
    due_date DATETIME,
    category TEXT NOT NULL DEFAULT 'General',
    completed_at DATETIME,
    completed_by_user_id INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS grocery_lists (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    creator_user_id INTEGER NOT NULL REFERENCES users(id),
    title TEXT NOT NULL DEFAULT 'Household Groceries',
    is_private INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS grocery_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    list_id INTEGER NOT NULL REFERENCES grocery_lists(id) ON DELETE CASCADE,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    creator_user_id INTEGER NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT 'pcs',
    category TEXT NOT NULL DEFAULT 'Produce',
    checked INTEGER NOT NULL DEFAULT 0,
    checked_by_user_id INTEGER REFERENCES users(id),
    checked_at DATETIME,
    estimated_cost REAL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS care_plans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    subject_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    creator_user_id INTEGER NOT NULL REFERENCES users(id),
    medicine_name TEXT NOT NULL,
    dosage_info TEXT NOT NULL,
    prescribed_instructions TEXT,
    scheduled_times TEXT NOT NULL, -- JSON array of strings e.g. ["08:00", "20:00"]
    days_of_week TEXT NOT NULL DEFAULT '[0,1,2,3,4,5,6]',
    timezone TEXT NOT NULL DEFAULT 'UTC',
    starts_on DATE NOT NULL,
    ends_on DATE,
    repeat_after_minutes INTEGER NOT NULL DEFAULT 15,
    escalation_after_minutes INTEGER NOT NULL DEFAULT 30,
    escalation_interval_minutes INTEGER NOT NULL DEFAULT 15,
    active INTEGER NOT NULL DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS medicine_occurrences (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    schedule_id INTEGER NOT NULL REFERENCES care_plans(id) ON DELETE CASCADE,
    subject_user_id INTEGER NOT NULL REFERENCES users(id),
    scheduled_for DATETIME NOT NULL,
    status TEXT NOT NULL DEFAULT 'scheduled', -- 'scheduled', 'delivered', 'acknowledged', 'taken', 'snoozed', 'escalated'
    reminder_delivered_at DATETIME,
    alert_acknowledged_at DATETIME,
    alert_acknowledged_by INTEGER REFERENCES users(id),
    outcome TEXT, -- 'taken', 'skipped', 'missed'
    outcome_note TEXT,
    outcome_recorded_at DATETIME,
    outcome_recorded_by INTEGER REFERENCES users(id),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS caregiver_assignments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    subject_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    caregiver_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(family_id, subject_user_id, caregiver_user_id)
);

CREATE TABLE IF NOT EXISTS service_requests (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    creator_user_id INTEGER NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Submitted', -- 'Draft', 'Submitted', 'Accepted', 'In progress', 'Completed', 'Declined', 'Cancelled'
    priority TEXT NOT NULL DEFAULT 'normal',
    assigned_to_user_id INTEGER REFERENCES users(id),
    accepted_at DATETIME,
    completed_at DATETIME,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bills (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    owner_user_id INTEGER NOT NULL REFERENCES users(id),
    responsible_user_id INTEGER REFERENCES users(id),
    title TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'Utilities',
    amount REAL NOT NULL,
    currency TEXT NOT NULL DEFAULT 'USD',
    due_date DATE,
    recurrence TEXT NOT NULL DEFAULT 'monthly',
    status TEXT NOT NULL DEFAULT 'unpaid', -- 'unpaid', 'paid', 'overdue'
    paid_at DATETIME,
    marked_paid_by INTEGER REFERENCES users(id),
    payment_verified INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS household_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    owner_user_id INTEGER NOT NULL REFERENCES users(id),
    title TEXT NOT NULL,
    document_type TEXT NOT NULL DEFAULT 'General',
    file_path TEXT NOT NULL,
    original_name TEXT NOT NULL,
    content_type TEXT NOT NULL,
    size_bytes INTEGER NOT NULL,
    expires_on DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_id INTEGER NOT NULL REFERENCES families(id) ON DELETE CASCADE,
    owner_user_id INTEGER NOT NULL REFERENCES users(id),
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    quantity REAL NOT NULL DEFAULT 1,
    unit TEXT NOT NULL DEFAULT 'pcs',
    reorder_threshold REAL,
    storage_location TEXT,
    warranty_expires_on DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    family_id INTEGER REFERENCES families(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    body TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'system',
    link_url TEXT,
    read_at DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS audit_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    family_id INTEGER REFERENCES families(id) ON DELETE CASCADE,
    actor_user_id INTEGER REFERENCES users(id),
    action TEXT NOT NULL,
    resource_type TEXT NOT NULL,
    resource_id INTEGER,
    details TEXT,
    ip_address TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS places_cache (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    query_hash TEXT UNIQUE NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    radius_meters INTEGER NOT NULL,
    category TEXT NOT NULL,
    response_json TEXT NOT NULL,
    expires_at DATETIME NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indices for rapid queries
CREATE INDEX IF NOT EXISTS idx_memberships_user ON family_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_memberships_family ON family_memberships(family_id);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_events_family_time ON calendar_events(family_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_tasks_family_status ON tasks(family_id, status);
CREATE INDEX IF NOT EXISTS idx_groceries_list ON grocery_items(list_id);
CREATE INDEX IF NOT EXISTS idx_locations_user_time ON location_records(user_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_occurrences_time ON medicine_occurrences(scheduled_for, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read_at);
CREATE INDEX IF NOT EXISTS idx_audit_family ON audit_events(family_id, created_at);
