import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const dbPath = process.env.DB_FILE_PATH || "./data/homesync.db";
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

export const db = new Database(dbPath);

// Enable WAL mode for high performance concurrency
db.pragma("journal_mode = WAL");
db.pragma("foreign_keys = ON");

// Run schema initialization
const schemaPath = path.resolve(__dirname, "schema.sql");
if (fs.existsSync(schemaPath)) {
  const schema = fs.readFileSync(schemaPath, "utf-8");
  db.exec(schema);
}

export function logAudit(
  familyId: number | null,
  actorUserId: number | null,
  action: string,
  resourceType: string,
  resourceId: number | null,
  details: Record<string, any> | null,
  ipAddress: string | null = null
) {
  const stmt = db.prepare(`
    INSERT INTO audit_events (family_id, actor_user_id, action, resource_type, resource_id, details, ip_address)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  stmt.run(
    familyId,
    actorUserId,
    action,
    resourceType,
    resourceId,
    details ? JSON.stringify(details) : null,
    ipAddress
  );
}

export default db;
