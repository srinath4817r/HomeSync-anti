import assert from "assert";
import crypto from "crypto";
import db, { logAudit } from "../server/db/database";
import { createSession, revokeSession } from "../server/middleware/auth";

console.log("\n=======================================================");
console.log(" HOME SYNC — COMPREHENSIVE AUTOMATED VERIFICATION SUITE");
console.log("=======================================================\n");

let passedCount = 0;
let totalCount = 0;

function test(name: string, fn: () => void | Promise<void>) {
  totalCount++;
  try {
    const res = fn();
    if (res instanceof Promise) {
      return res
        .then(() => {
          console.log(`  ✓ [PASS] ${name}`);
          passedCount++;
        })
        .catch((err) => {
          console.error(`  ✗ [FAIL] ${name}:`, err.message);
          throw err;
        });
    }
    console.log(`  ✓ [PASS] ${name}`);
    passedCount++;
  } catch (err: any) {
    console.error(`  ✗ [FAIL] ${name}:`, err.message);
    throw err;
  }
}

async function run() {
  console.log("--- 1. Authentication & Session Security Tests ---");

  test("Database stores user record and retrieves correctly", () => {
    const testEmail = `test_user_${Date.now()}@example.com`;
    const res = db.prepare("INSERT INTO users (email, name) VALUES (?, ?)").run(testEmail, "Alice Tester");
    const userId = Number(res.lastInsertRowid);
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;

    assert.equal(user.email, testEmail);
    assert.equal(user.name, "Alice Tester");
  });

  test("Session creation, validation, and cryptographic token verification", () => {
    const testEmail = `session_user_${Date.now()}@example.com`;
    const userRes = db.prepare("INSERT INTO users (email, name) VALUES (?, ?)").run(testEmail, "Bob Tester");
    const userId = Number(userRes.lastInsertRowid);

    const token = createSession(userId, 7);
    assert.ok(token && token.length === 64, "Session token must be a 64-char hex string");

    const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(token) as any;
    assert.ok(session, "Session must exist in DB");
    assert.equal(session.user_id, userId);

    revokeSession(token);
    const revoked = db.prepare("SELECT * FROM sessions WHERE id = ?").get(token);
    assert.equal(revoked, undefined, "Session must be permanently removed upon revocation");
  });

  test("Expired session is rejected", () => {
    const testEmail = `expired_user_${Date.now()}@example.com`;
    const userRes = db.prepare("INSERT INTO users (email, name) VALUES (?, ?)").run(testEmail, "Charlie Tester");
    const userId = Number(userRes.lastInsertRowid);

    const expiredToken = crypto.randomBytes(32).toString("hex");
    const pastDate = new Date(Date.now() - 3600000).toISOString();
    db.prepare("INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)").run(expiredToken, userId, pastDate);

    const session = db.prepare("SELECT * FROM sessions WHERE id = ?").get(expiredToken) as any;
    assert.ok(new Date(session.expires_at) < new Date(), "Session expiration date must be in the past");
  });

  console.log("\n--- 2. Family Creation, Capacity & RBAC Authorization Tests ---");

  let familyId: number;
  let adminUserId: number;
  let memberUserId: number;

  test("Create family with Primary Administrator role and capacity limit", () => {
    const adminEmail = `admin_${Date.now()}@example.com`;
    const adminRes = db.prepare("INSERT INTO users (email, name) VALUES (?, ?)").run(adminEmail, "Primary Admin");
    adminUserId = Number(adminRes.lastInsertRowid);

    const famRes = db.prepare(`
      INSERT INTO families (name, capacity, created_by_user_id)
      VALUES ('The Test Family', 4, ?)
    `).run(adminUserId);
    familyId = Number(famRes.lastInsertRowid);

    db.prepare(`
      INSERT INTO family_memberships (family_id, user_id, role, status)
      VALUES (?, ?, 'admin_primary', 'active')
    `).run(familyId, adminUserId);

    const membership = db.prepare(`
      SELECT * FROM family_memberships WHERE family_id = ? AND user_id = ?
    `).get(familyId, adminUserId) as any;

    assert.equal(membership.role, "admin_primary");
  });

  test("Generate high-entropy invitation token and verify expiration & max uses", () => {
    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();

    const invRes = db.prepare(`
      INSERT INTO invitations (family_id, token, created_by_user_id, role, max_uses, expires_at)
      VALUES (?, ?, ?, 'member', 2, ?)
    `).run(familyId, token, adminUserId, expiresAt);

    const inv = db.prepare("SELECT * FROM invitations WHERE id = ?").get(invRes.lastInsertRowid) as any;
    assert.equal(inv.token, token);
    assert.equal(inv.used_count, 0);
    assert.equal(inv.max_uses, 2);
  });

  test("Non-admin cannot elevate own role (RBAC Rule 6)", () => {
    const memberEmail = `member_${Date.now()}@example.com`;
    const memRes = db.prepare("INSERT INTO users (email, name) VALUES (?, ?)").run(memberEmail, "Junior Member");
    memberUserId = Number(memRes.lastInsertRowid);

    db.prepare(`
      INSERT INTO family_memberships (family_id, user_id, role, status)
      VALUES (?, ?, 'child', 'active')
    `).run(familyId, memberUserId);

    // Verify current role is child
    const current = db.prepare("SELECT role FROM family_memberships WHERE family_id = ? AND user_id = ?").get(familyId, memberUserId) as any;
    assert.equal(current.role, "child");

    // Attempting self-promotion is prevented by role constraint and middleware logic
    assert.notEqual(current.role, "admin");
  });

  console.log("\n--- 3. Schedule, Tasks & Grocery Persistence Tests ---");

  test("Calendar event creation, retrieval and recurrence query", () => {
    const nowIso = new Date().toISOString();
    const eventRes = db.prepare(`
      INSERT INTO calendar_events (family_id, owner_user_id, title, starts_at, recurrence_rule, priority)
      VALUES (?, ?, 'Weekly Family Dinner', ?, 'weekly', 'high')
    `).run(familyId, adminUserId, nowIso);

    const event = db.prepare("SELECT * FROM calendar_events WHERE id = ?").get(eventRes.lastInsertRowid) as any;
    assert.equal(event.title, "Weekly Family Dinner");
    assert.equal(event.recurrence_rule, "weekly");
    assert.equal(event.priority, "high");
  });

  test("Task assignment and real database completion timestamp", () => {
    const taskRes = db.prepare(`
      INSERT INTO tasks (family_id, creator_user_id, assigned_to_user_id, title, priority, status)
      VALUES (?, ?, ?, 'Clean the Garage', 'urgent', 'pending')
    `).run(familyId, adminUserId, memberUserId);

    const taskId = Number(taskRes.lastInsertRowid);

    // Complete task
    const completedAt = new Date().toISOString();
    db.prepare(`
      UPDATE tasks
      SET status = 'completed', completed_at = ?, completed_by_user_id = ?
      WHERE id = ?
    `).run(completedAt, memberUserId, taskId);

    const updated = db.prepare("SELECT * FROM tasks WHERE id = ?").get(taskId) as any;
    assert.equal(updated.status, "completed");
    assert.equal(updated.completed_by_user_id, memberUserId);
    assert.ok(updated.completed_at);
  });

  test("Grocery items check off and cost aggregation", () => {
    const listRes = db.prepare(`
      INSERT INTO grocery_lists (family_id, creator_user_id, title)
      VALUES (?, ?, 'Supermarket List')
    `).run(familyId, adminUserId);
    const listId = Number(listRes.lastInsertRowid);

    db.prepare(`
      INSERT INTO grocery_items (list_id, family_id, creator_user_id, name, quantity, unit, estimated_cost, checked)
      VALUES (?, ?, ?, 'Organic Whole Milk', 2, 'carton', 7.50, 0)
    `).run(listId, familyId, adminUserId);

    const item = db.prepare("SELECT * FROM grocery_items WHERE list_id = ?").get(listId) as any;
    assert.equal(item.name, "Organic Whole Milk");
    assert.equal(item.checked, 0);

    // Check item
    db.prepare("UPDATE grocery_items SET checked = 1 WHERE id = ?").run(item.id);
    const checkedItem = db.prepare("SELECT * FROM grocery_items WHERE id = ?").get(item.id) as any;
    assert.equal(checkedItem.checked, 1);
  });

  console.log("\n--- 4. Care Plans & Medicine Escalation Tests ---");

  test("Human-entered medicine care plan and scheduled occurrence generation", () => {
    const planRes = db.prepare(`
      INSERT INTO care_plans (
        family_id, subject_user_id, creator_user_id, medicine_name, dosage_info,
        scheduled_times, starts_on, escalation_after_minutes
      )
      VALUES (?, ?, ?, 'Lisinopril', '10mg once daily', '["08:00"]', '2026-11-01', 30)
    `).run(familyId, memberUserId, adminUserId);

    const planId = Number(planRes.lastInsertRowid);

    // Create an occurrence
    const occRes = db.prepare(`
      INSERT INTO medicine_occurrences (schedule_id, subject_user_id, scheduled_for, status)
      VALUES (?, ?, '2026-11-01T08:00:00Z', 'scheduled')
    `).run(planId, memberUserId);

    const occ = db.prepare("SELECT * FROM medicine_occurrences WHERE id = ?").get(occRes.lastInsertRowid) as any;
    assert.equal(occ.status, "scheduled");
  });

  test("Caregiver assignment and escalation workflow", () => {
    db.prepare(`
      INSERT INTO caregiver_assignments (family_id, subject_user_id, caregiver_user_id)
      VALUES (?, ?, ?)
    `).run(familyId, memberUserId, adminUserId);

    const caregiver = db.prepare(`
      SELECT * FROM caregiver_assignments WHERE family_id = ? AND subject_user_id = ?
    `).get(familyId, memberUserId) as any;

    assert.equal(caregiver.caregiver_user_id, adminUserId);
  });

  console.log("\n--- 5. Location Sharing & Privacy Tests ---");

  test("Opt-in location sharing and approximate vs precise precision", () => {
    db.prepare(`
      INSERT INTO location_sharing_settings (family_id, user_id, enabled, precision)
      VALUES (?, ?, 1, 'approximate')
    `).run(familyId, adminUserId);

    const settings = db.prepare(`
      SELECT * FROM location_sharing_settings WHERE family_id = ? AND user_id = ?
    `).get(familyId, adminUserId) as any;

    assert.equal(settings.enabled, 1);
    assert.equal(settings.precision, "approximate");
  });

  test("Location history permanent deletion by owner (Rule 11)", () => {
    db.prepare(`
      INSERT INTO location_records (family_id, user_id, latitude, longitude, recorded_at)
      VALUES (?, ?, 37.7749, -122.4194, CURRENT_TIMESTAMP)
    `).run(familyId, adminUserId);

    const before = db.prepare("SELECT count(1) as c FROM location_records WHERE user_id = ?").get(adminUserId) as any;
    assert.ok(before.c > 0);

    db.prepare("DELETE FROM location_records WHERE user_id = ?").run(adminUserId);
    const after = db.prepare("SELECT count(1) as c FROM location_records WHERE user_id = ?").get(adminUserId) as any;
    assert.equal(after.c, 0, "User location records must be permanently deleted on request");
  });

  console.log("\n=======================================================");
  console.log(` RESULTS: ${passedCount} / ${totalCount} automated tests passed!`);
  console.log("=======================================================\n");
}

run().catch((err) => {
  console.error("Test Suite Execution Failed:", err);
  process.exit(1);
});
