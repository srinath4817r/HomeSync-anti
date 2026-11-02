import React, { useEffect, useState } from "react";
import { FileText, Plus, Trash2, Download, Clock } from "lucide-react";
import { api } from "../api/client";
import { Family, HouseholdDocument } from "../types";

export const DocumentsView: React.FC<{ family: Family }> = ({ family }) => {
  const [documents, setDocuments] = useState<HouseholdDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  const [title, setTitle] = useState("");
  const [documentType, setDocumentType] = useState("Insurance");
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchDocs = async () => {
    try {
      setLoading(true);
      const res = await api.getDocuments(family.id);
      setDocuments(res.documents || []);
    } catch (err: any) {
      alert(err.message || "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocs();
  }, [family.id]);

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      alert("Please choose a file to upload");
      return;
    }

    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("title", title.trim() || file.name);
      formData.append("documentType", documentType);

      const res = await api.uploadDocument(family.id, formData);
      setDocuments([res.document, ...documents]);
      setShowModal(false);
      setTitle("");
      setFile(null);
    } catch (err: any) {
      alert(err.message || "Upload failed");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (docId: number) => {
    if (!confirm("Are you sure you want to delete this document?")) return;
    try {
      await api.deleteDocument(family.id, docId);
      setDocuments(documents.filter((d) => d.id !== docId));
    } catch (err: any) {
      alert(err.message || "Failed to delete document");
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="glass-card" style={{ padding: "16px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.2rem", fontWeight: 700 }}>
              Household Document Vault
            </h2>
            <p style={{ fontSize: "0.82rem", color: "var(--text-muted)" }}>
              Secure server-side storage for warranties, medical records, leases, and receipts.
            </p>
          </div>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            <Plus size={16} />
            <span>Upload Document</span>
          </button>
        </div>
      </div>

      <div className="glass-card">
        {loading ? (
          <div className="empty-state">
            <Clock className="empty-icon" />
            <div className="empty-title">Loading document vault...</div>
          </div>
        ) : documents.length === 0 ? (
          <div className="empty-state">
            <FileText className="empty-icon" />
            <div className="empty-title">No documents uploaded yet</div>
            <div className="empty-subtitle">Upload family health insurance cards, apartment leases, or appliance receipts.</div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {documents.map((doc) => (
              <div
                key={doc.id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "14px 18px",
                  borderRadius: "var(--radius-md)",
                  background: "var(--bg-surface)",
                  border: "var(--glass-border)",
                }}
              >
                <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
                  <div className="brand-icon" style={{ background: "rgba(124,77,255,0.12)", color: "var(--accent-primary)", boxShadow: "none" }}>
                    <FileText size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: "0.98rem" }}>{doc.title}</div>
                    <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 2 }}>
                      {doc.document_type} • {(doc.size_bytes / 1024).toFixed(1)} KB • Uploaded by {doc.owner_name}
                    </div>
                  </div>
                </div>

                <div style={{ display: "flex", gap: 8 }}>
                  <a
                    href={`/api/families/${family.id}/documents/${doc.id}/download`}
                    className="icon-btn"
                    download
                    title="Download document"
                  >
                    <Download size={16} />
                  </a>
                  <button className="icon-btn" onClick={() => handleDelete(doc.id)} title="Delete document">
                    <Trash2 size={16} color="var(--accent-rose)" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 style={{ fontFamily: "var(--font-display)", fontSize: "1.25rem", fontWeight: 700, marginBottom: 16 }}>
              Upload to Secure Vault
            </h2>

            <form onSubmit={handleUpload}>
              <div className="form-group">
                <label className="form-label">Document Title</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g., Home Insurance Policy 2026"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Category</label>
                <select className="form-select" value={documentType} onChange={(e) => setDocumentType(e.target.value)}>
                  <option value="Insurance">Insurance</option>
                  <option value="Medical">Medical / Health Records</option>
                  <option value="Property">Property / Lease / Deed</option>
                  <option value="Receipts">Receipts & Warranties</option>
                  <option value="Identity">Identity / Passports</option>
                  <option value="General">General</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">File *</label>
                <input
                  type="file"
                  className="form-input"
                  required
                  onChange={(e) => setFile(e.target.files?.[0] || null)}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Uploading..." : "Upload File"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
