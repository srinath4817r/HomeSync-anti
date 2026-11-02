import { Router, Response } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import db, { logAudit } from "../db/database";
import {
  authenticate,
  requireFamilyMember,
  AuthenticatedRequest,
} from "../middleware/auth";

const router = Router();
const uploadDir = process.env.UPLOAD_DIR || "./uploads";

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB limit
});

// List documents
router.get("/:familyId/documents", authenticate, requireFamilyMember, (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);
  const docs = db.prepare(`
    SELECT d.*, u.name as owner_name
    FROM household_documents d
    JOIN users u ON u.id = d.owner_user_id
    WHERE d.family_id = ?
    ORDER BY d.created_at DESC
  `).all(familyId);

  res.json({ documents: docs });
});

// Upload document
router.post(
  "/:familyId/documents",
  authenticate,
  requireFamilyMember,
  upload.single("file"),
  (req: AuthenticatedRequest, res: Response) => {
    const familyId = parseInt(req.params.familyId, 10);
    const { title, documentType = "General", expiresOn } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: "File upload is required." });
    }

    const docTitle = (title && typeof title === "string" ? title.trim() : "") || file.originalname;

    const insert = db.prepare(`
      INSERT INTO household_documents (
        family_id, owner_user_id, title, document_type, file_path, original_name, content_type, size_bytes, expires_on
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insert.run(
      familyId,
      req.user!.id,
      docTitle,
      documentType,
      file.filename,
      file.originalname,
      file.mimetype,
      file.size,
      expiresOn || null
    );

    const docId = Number(result.lastInsertRowid);
    logAudit(familyId, req.user!.id, "DOCUMENT_UPLOADED", "household_document", docId, {
      title: docTitle,
      fileName: file.originalname,
      sizeBytes: file.size,
    });

    const doc = db.prepare("SELECT * FROM household_documents WHERE id = ?").get(docId);
    res.status(201).json({ document: doc });
  }
);

// Secure Download Document
router.get("/:familyId/documents/:docId/download", authenticate, requireFamilyMember, (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);
  const docId = parseInt(req.params.docId, 10);

  const doc = db.prepare("SELECT * FROM household_documents WHERE id = ? AND family_id = ?").get(docId, familyId) as any;
  if (!doc) {
    return res.status(404).json({ error: "Document not found." });
  }

  const fullPath = path.resolve(uploadDir, doc.file_path);
  if (!fs.existsSync(fullPath)) {
    return res.status(404).json({ error: "File no longer exists on disk." });
  }

  res.setHeader("Content-Disposition", `attachment; filename="${encodeURIComponent(doc.original_name)}"`);
  res.setHeader("Content-Type", doc.content_type || "application/octet-stream");
  fs.createReadStream(fullPath).pipe(res);
});

// Delete document
router.delete("/:familyId/documents/:docId", authenticate, requireFamilyMember, (req: AuthenticatedRequest, res) => {
  const familyId = parseInt(req.params.familyId, 10);
  const docId = parseInt(req.params.docId, 10);

  const doc = db.prepare("SELECT * FROM household_documents WHERE id = ? AND family_id = ?").get(docId, familyId) as any;
  if (!doc) {
    return res.status(404).json({ error: "Document not found." });
  }

  // Delete from disk if exists
  const fullPath = path.resolve(uploadDir, doc.file_path);
  if (fs.existsSync(fullPath)) {
    try {
      fs.unlinkSync(fullPath);
    } catch (e) {
      // ignore
    }
  }

  db.prepare("DELETE FROM household_documents WHERE id = ?").run(docId);
  logAudit(familyId, req.user!.id, "DOCUMENT_DELETED", "household_document", docId, { title: doc.title });

  res.json({ message: "Document deleted." });
});

export default router;
