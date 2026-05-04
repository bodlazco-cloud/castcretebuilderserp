"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import type React from "react";
import { createChangeOrder } from "@/actions/planning";
import { uploadFile, BUCKETS } from "@/actions/storage";

type Project  = { id: string; name: string };
type Activity = { id: string; activityCode: string; activityName: string; scopeName: string };
type Material = { id: string; code: string; name: string; unit: string };

const ACCENT = "#1a56db";
const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.9rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem",
};

export function NewCoForm({
  projects, activities, materials,
}: {
  projects:   Project[];
  activities: Activity[];
  materials:  Material[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [selectedProject, setSelectedProject] = useState("");
  const [changeType, setChangeType] = useState<"ADD" | "MODIFY" | "REMOVE">("MODIFY");
  const [attachmentUrls, setAttachmentUrls] = useState<string[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (attachmentUrls.length >= 5) {
      setUploadError("Maximum 5 photos per change order.");
      return;
    }
    setUploadError(null);
    setIsUploading(true);
    const fd = new FormData();
    fd.append("file", file);
    const result = await uploadFile(fd, {
      bucket:   BUCKETS.ECO_PHOTOS,
      folder:   "change-orders",
      fileName: file.name,
    });
    setIsUploading(false);
    if (result.success) {
      setAttachmentUrls((prev) => [...prev, result.publicUrl]);
    } else {
      setUploadError(result.error);
    }
    // Reset input so the same file can be re-selected if needed
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);

    const oldQ = fd.get("oldQuantity") as string;
    const newQ = fd.get("newQuantity") as string;

    startTransition(async () => {
      const result = await createChangeOrder({
        projectId:        fd.get("projectId") as string,
        activityDefId:    (fd.get("activityDefId") as string) || undefined,
        unitModel:        (fd.get("unitModel") as string) || undefined,
        unitType:         ((fd.get("unitType") as string) || undefined) as "BEG" | "REG" | "END" | undefined,
        materialId:       (fd.get("materialId") as string) || undefined,
        changeType:       changeType,
        oldQuantity:      oldQ ? Number(oldQ) : undefined,
        newQuantity:      newQ ? Number(newQ) : undefined,
        reason:           fd.get("reason") as string,
        attachmentUrls:   attachmentUrls.length > 0 ? attachmentUrls : undefined,
      });
      if (result.success) {
        router.push(`/planning/change-orders/${result.id}`);
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {error && (
        <div style={{ padding: "0.85rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem" }}>
          {error}
        </div>
      )}

      {/* Project */}
      <label>
        <span style={labelStyle}>Project <span style={{ color: "#e02424" }}>*</span></span>
        <select name="projectId" required style={inputStyle}
          value={selectedProject} onChange={(e) => setSelectedProject(e.target.value)}>
          <option value="">Select project…</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </label>

      {/* Change Type */}
      <label>
        <span style={labelStyle}>Change Type <span style={{ color: "#e02424" }}>*</span></span>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          {(["ADD", "MODIFY", "REMOVE"] as const).map((ct) => (
            <button
              key={ct} type="button"
              onClick={() => setChangeType(ct)}
              style={{
                flex: 1, padding: "0.5rem", borderRadius: "6px", border: "2px solid",
                borderColor: changeType === ct ? ACCENT : "#d1d5db",
                background: changeType === ct ? "#eff6ff" : "#fff",
                color: changeType === ct ? ACCENT : "#374151",
                fontWeight: 600, fontSize: "0.875rem", cursor: "pointer",
              }}>
              {ct}
            </button>
          ))}
        </div>
      </label>

      {/* Activity + Material (optional context) */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Activity (optional)</span>
          <select name="activityDefId" style={inputStyle}>
            <option value="">Any / not specific…</option>
            {activities.map((a) => (
              <option key={a.id} value={a.id}>[{a.activityCode}] {a.activityName}</option>
            ))}
          </select>
        </label>
        <label>
          <span style={labelStyle}>Material (optional)</span>
          <select name="materialId" style={inputStyle}>
            <option value="">Any / not specific…</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>{m.code} — {m.name} ({m.unit})</option>
            ))}
          </select>
        </label>
      </div>

      {/* Unit Model + Type */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Unit Model (optional)</span>
          <input name="unitModel" type="text" placeholder="e.g. Type A, Studio…" style={inputStyle} />
        </label>
        <label>
          <span style={labelStyle}>Unit Type (optional)</span>
          <select name="unitType" style={inputStyle}>
            <option value="">Not specific</option>
            <option value="BEG">BEG — Beginning</option>
            <option value="REG">REG — Regular</option>
            <option value="END">END — End</option>
          </select>
        </label>
      </div>

      {/* Quantities (only if MODIFY) */}
      {changeType !== "ADD" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <label>
            <span style={labelStyle}>Old Quantity</span>
            <input name="oldQuantity" type="number" min="0" step="0.0001" placeholder="0.0000" style={inputStyle} />
          </label>
          {changeType === "MODIFY" && (
            <label>
              <span style={labelStyle}>New Quantity</span>
              <input name="newQuantity" type="number" min="0.0001" step="0.0001" placeholder="0.0000" style={inputStyle} />
            </label>
          )}
        </div>
      )}
      {changeType === "ADD" && (
        <label>
          <span style={labelStyle}>New Quantity</span>
          <input name="newQuantity" type="number" min="0.0001" step="0.0001" placeholder="0.0000" style={inputStyle} />
        </label>
      )}

      {/* Reason */}
      <label>
        <span style={labelStyle}>Reason / Justification <span style={{ color: "#e02424" }}>*</span></span>
        <textarea
          name="reason" required rows={4} placeholder="Explain why this change is needed…"
          style={{ ...inputStyle, resize: "vertical" }}
        />
      </label>

      {/* Site Photo Evidence — required for audit trail */}
      <div>
        <span style={labelStyle}>
          Site Photo Evidence
          <span style={{ marginLeft: "0.4rem", fontSize: "0.75rem", fontWeight: 400, color: "#6b7280" }}>
            (max 5 photos · JPEG, PNG, PDF · 20 MB each)
          </span>
        </span>

        <label
          htmlFor="eco-photo-input"
          style={{
            display: "flex", flexDirection: "column", alignItems: "center",
            padding: "1.25rem", border: "2px dashed #d1d5db", borderRadius: "8px",
            cursor: isUploading || attachmentUrls.length >= 5 ? "not-allowed" : "pointer",
            background: "#f9fafb", color: "#6b7280", fontSize: "0.875rem", textAlign: "center",
            opacity: isUploading || attachmentUrls.length >= 5 ? 0.6 : 1,
          }}
        >
          {isUploading ? "Uploading…" : "Click to attach a photo or PDF"}
        </label>
        <input
          id="eco-photo-input"
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          style={{ display: "none" }}
          disabled={isUploading || attachmentUrls.length >= 5}
          onChange={handleFileSelect}
        />

        {uploadError && (
          <p style={{ marginTop: "0.4rem", fontSize: "0.8rem", color: "#b91c1c" }}>{uploadError}</p>
        )}

        {attachmentUrls.length > 0 && (
          <ul style={{ marginTop: "0.6rem", listStyle: "none", padding: 0, display: "flex", flexDirection: "column", gap: "0.35rem" }}>
            {attachmentUrls.map((url, i) => (
              <li key={url} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: "0.8rem", color: "#374151", background: "#eff6ff", borderRadius: "5px", padding: "0.35rem 0.6rem" }}>
                <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: "#1d4ed8", textDecoration: "none", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "85%" }}>
                  Photo {i + 1}
                </a>
                <button
                  type="button"
                  onClick={() => setAttachmentUrls((prev) => prev.filter((_, j) => j !== i))}
                  style={{ background: "none", border: "none", color: "#6b7280", cursor: "pointer", fontSize: "0.85rem", padding: "0 0.25rem" }}
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
        <a href="/planning/change-orders" style={{
          padding: "0.65rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db",
          color: "#374151", fontSize: "0.9rem", textDecoration: "none", display: "inline-flex", alignItems: "center",
        }}>Cancel</a>
        <button type="submit" disabled={isPending} style={{
          padding: "0.65rem 1.5rem", borderRadius: "6px",
          background: isPending ? "#93c5fd" : ACCENT,
          color: "#fff", border: "none", fontSize: "0.9rem",
          fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer",
        }}>
          {isPending ? "Submitting…" : "Submit Change Order"}
        </button>
      </div>
    </form>
  );
}
