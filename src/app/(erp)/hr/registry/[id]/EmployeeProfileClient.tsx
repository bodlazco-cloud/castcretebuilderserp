"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { updateEmployeeProfile, addEmployeeDocument, deleteEmployeeDocument } from "@/actions/hr";
import { uploadFile, BUCKETS } from "@/actions/storage";

type Employee = {
  id: string;
  employeeCode: string;
  fullName: string;
  position: string;
  employmentType: string;
  hireDate: string | null;
  tinNumber: string | null;
  separationDate: string | null;
  isActive: boolean;
  dailyRate: string;
  sssContribution: string;
  philhealthContribution: string;
  pagibigContribution: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  birthday: string | null;
  civilStatus: string | null;
  gender: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  deptId: string;
  costCenterId: string;
  deptName: string | null;
  costCenterName: string | null;
};

type Doc = {
  id: string;
  employeeId: string;
  docType: string;
  title: string;
  fileUrl: string;
  createdAt: Date;
};

const TABS = ["Personal Info", "Salary & Benefits", "Documents"] as const;
type Tab = (typeof TABS)[number];

const input: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.55rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px",
  fontSize: "0.875rem", boxSizing: "border-box", background: "#fff",
};
const label: React.CSSProperties = {
  display: "block", fontSize: "0.8rem", fontWeight: 600,
  color: "#374151", marginBottom: "0.3rem",
};
const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" };
const grid3: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem" };

function Row({ label: l, value }: { label: string; value: string | null }) {
  return (
    <div>
      <div style={{ fontSize: "0.75rem", color: "#9ca3af", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: "0.2rem" }}>{l}</div>
      <div style={{ fontSize: "0.9rem", color: "#111827" }}>{value || <span style={{ color: "#d1d5db" }}>—</span>}</div>
    </div>
  );
}

const DOC_TYPE_LABELS: Record<string, string> = {
  MEMO: "Memo", APPRAISAL: "Appraisal", NOTICE: "Notice", OTHER: "Other",
};

const DOC_COLORS: Record<string, { bg: string; color: string }> = {
  MEMO:      { bg: "#ede9fe", color: "#5b21b6" },
  APPRAISAL: { bg: "#d1fae5", color: "#065f46" },
  NOTICE:    { bg: "#fee2e2", color: "#991b1b" },
  OTHER:     { bg: "#f3f4f6", color: "#374151" },
};

export default function EmployeeProfileClient({
  employee: emp,
  documents: initialDocs,
}: {
  employee: Employee;
  documents: Doc[];
}) {
  const [tab, setTab] = useState<Tab>("Personal Info");
  const [docs, setDocs] = useState(initialDocs);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();

  // ── Personal Info / Salary form ──────────────────────────────────────────
  function handleProfileSave(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMsg(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateEmployeeProfile({
        id:                    emp.id,
        fullName:              fd.get("fullName") as string,
        position:              fd.get("position") as string,
        employmentType:        fd.get("employmentType") as any,
        hireDate:              fd.get("hireDate") as string,
        tinNumber:             (fd.get("tinNumber") as string) || undefined,
        phone:                 (fd.get("phone") as string) || undefined,
        email:                 (fd.get("email") as string) || undefined,
        address:               (fd.get("address") as string) || undefined,
        birthday:              (fd.get("birthday") as string) || undefined,
        civilStatus:           (fd.get("civilStatus") as any) || undefined,
        gender:                (fd.get("gender") as any) || undefined,
        emergencyContactName:  (fd.get("emergencyContactName") as string) || undefined,
        emergencyContactPhone: (fd.get("emergencyContactPhone") as string) || undefined,
        dailyRate:             Number(fd.get("dailyRate")),
        sssContribution:       Number(fd.get("sssContribution") || 0),
        philhealthContribution:Number(fd.get("philhealthContribution") || 0),
        pagibigContribution:   Number(fd.get("pagibigContribution") || 0),
      });
      setMsg(result.success
        ? { ok: true, text: "Profile saved." }
        : { ok: false, text: result.error });
    });
  }

  // ── Document upload ──────────────────────────────────────────────────────
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState<{ ok: boolean; text: string } | null>(null);

  async function handleDocUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploadMsg(null);
    setUploading(true);
    const fd = new FormData(e.currentTarget);
    const file = fd.get("file") as File | null;
    const docType = fd.get("docType") as string;
    const title = fd.get("title") as string;

    if (!file || file.size === 0) {
      setUploadMsg({ ok: false, text: "Please select a file." });
      setUploading(false);
      return;
    }

    const uploadResult = await uploadFile(fd, {
      bucket:   BUCKETS.DOCUMENTS,
      folder:   `hr/${emp.id}`,
      fileName: title,
    });

    if (!uploadResult.success) {
      setUploadMsg({ ok: false, text: uploadResult.error });
      setUploading(false);
      return;
    }

    const saveResult = await addEmployeeDocument({
      employeeId: emp.id,
      docType:    docType as any,
      title,
      fileUrl:    uploadResult.publicUrl,
    });

    if (saveResult.success) {
      setDocs((prev) => [...prev, {
        id: saveResult.docId,
        employeeId: emp.id,
        docType,
        title,
        fileUrl: uploadResult.publicUrl,
        createdAt: new Date(),
      }]);
      (e.target as HTMLFormElement).reset();
      setUploadMsg({ ok: true, text: "Document uploaded." });
    } else {
      setUploadMsg({ ok: false, text: saveResult.error });
    }
    setUploading(false);
  }

  async function handleDeleteDoc(docId: string) {
    if (!confirm("Delete this document?")) return;
    await deleteEmployeeDocument(docId, emp.id);
    setDocs((prev) => prev.filter((d) => d.id !== docId));
  }

  const tabBtn = (t: Tab) => ({
    padding: "0.55rem 1.25rem",
    background: tab === t ? "#1d4ed8" : "transparent",
    color: tab === t ? "#fff" : "#6b7280",
    border: "none",
    borderBottom: tab === t ? "2px solid #1d4ed8" : "2px solid transparent",
    cursor: "pointer",
    fontSize: "0.875rem",
    fontWeight: tab === t ? 700 : 400,
    transition: "all 0.15s",
  } as React.CSSProperties);

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "860px" }}>
        {/* Breadcrumb */}
        <div style={{ marginBottom: "1.25rem" }}>
          <Link href="/hr/registry" style={{ fontSize: "0.8rem", color: "#6b7280", textDecoration: "none" }}>← Employee Registry</Link>
        </div>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          <div style={{
            width: 52, height: 52, borderRadius: "50%",
            background: "#1d4ed8", color: "#fff",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "1.25rem", fontWeight: 700, flexShrink: 0,
          }}>
            {emp.fullName.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700, color: "#111827" }}>{emp.fullName}</h1>
            <div style={{ display: "flex", gap: "0.5rem", marginTop: "0.25rem", flexWrap: "wrap", alignItems: "center" }}>
              <span style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "#6b7280" }}>{emp.employeeCode}</span>
              <span style={{ color: "#d1d5db" }}>·</span>
              <span style={{ fontSize: "0.8rem", color: "#374151" }}>{emp.position}</span>
              <span style={{ color: "#d1d5db" }}>·</span>
              <span style={{ fontSize: "0.75rem", color: emp.isActive ? "#15803d" : "#9ca3af", fontWeight: 600 }}>
                {emp.isActive ? "● Active" : "○ Inactive"}
              </span>
            </div>
          </div>
        </div>

        {/* Info pills */}
        <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
          {[
            { label: "Department", value: emp.deptName },
            { label: "Cost Center", value: emp.costCenterName },
            { label: "Hire Date", value: emp.hireDate },
          ].map((p) => (
            <div key={p.label} style={{ padding: "0.4rem 0.85rem", background: "#fff", border: "1px solid #e5e7eb", borderRadius: "6px" }}>
              <div style={{ fontSize: "0.65rem", color: "#9ca3af", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>{p.label}</div>
              <div style={{ fontSize: "0.85rem", fontWeight: 600, color: "#111827" }}>{p.value ?? "—"}</div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{ display: "flex", borderBottom: "1px solid #f3f4f6" }}>
            {TABS.map((t) => <button key={t} style={tabBtn(t)} onClick={() => setTab(t)}>{t}</button>)}
          </div>

          <div style={{ padding: "1.75rem" }}>
            {/* ── Personal Info ── */}
            {tab === "Personal Info" && (
              <form onSubmit={handleProfileSave} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {msg && (
                  <div style={{ padding: "0.75rem 1rem", borderRadius: "6px", background: msg.ok ? "#d1fae5" : "#fee2e2", color: msg.ok ? "#065f46" : "#991b1b", fontSize: "0.875rem" }}>
                    {msg.text}
                  </div>
                )}

                <div style={grid2}>
                  <label><span style={label}>Full Name *</span>
                    <input name="fullName" required defaultValue={emp.fullName} style={input} /></label>
                  <label><span style={label}>Employee Code</span>
                    <input value={emp.employeeCode} disabled style={{ ...input, background: "#f9fafb", color: "#9ca3af" }} /></label>
                </div>

                <div style={grid2}>
                  <label><span style={label}>Position *</span>
                    <input name="position" required defaultValue={emp.position} style={input} /></label>
                  <label><span style={label}>Employment Type *</span>
                    <select name="employmentType" required defaultValue={emp.employmentType} style={input}>
                      <option value="REGULAR">Regular</option>
                      <option value="CONTRACTUAL">Contractual</option>
                      <option value="PROJECT_BASED">Project Based</option>
                    </select></label>
                </div>

                <div style={grid3}>
                  <label><span style={label}>Phone</span>
                    <input name="phone" defaultValue={emp.phone ?? ""} style={input} placeholder="+63 9XX XXX XXXX" /></label>
                  <label><span style={label}>Email</span>
                    <input name="email" type="email" defaultValue={emp.email ?? ""} style={input} /></label>
                  <label><span style={label}>TIN Number</span>
                    <input name="tinNumber" defaultValue={emp.tinNumber ?? ""} style={input} /></label>
                </div>

                <label><span style={label}>Address</span>
                  <textarea name="address" defaultValue={emp.address ?? ""} rows={2}
                    style={{ ...input, resize: "vertical" }} /></label>

                <div style={grid3}>
                  <label><span style={label}>Birthday</span>
                    <input name="birthday" type="date" defaultValue={emp.birthday ?? ""} style={input} /></label>
                  <label><span style={label}>Civil Status</span>
                    <select name="civilStatus" defaultValue={emp.civilStatus ?? ""} style={input}>
                      <option value="">— Select —</option>
                      <option value="SINGLE">Single</option>
                      <option value="MARRIED">Married</option>
                      <option value="WIDOWED">Widowed</option>
                      <option value="SEPARATED">Separated</option>
                    </select></label>
                  <label><span style={label}>Gender</span>
                    <select name="gender" defaultValue={emp.gender ?? ""} style={input}>
                      <option value="">— Select —</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select></label>
                </div>

                <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: "1.25rem" }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#374151", marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Emergency Contact</div>
                  <div style={grid2}>
                    <label><span style={label}>Contact Name</span>
                      <input name="emergencyContactName" defaultValue={emp.emergencyContactName ?? ""} style={input} /></label>
                    <label><span style={label}>Contact Phone</span>
                      <input name="emergencyContactPhone" defaultValue={emp.emergencyContactPhone ?? ""} style={input} /></label>
                  </div>
                </div>

                <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: "1.25rem" }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#374151", marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Employment</div>
                  <div style={grid2}>
                    <label><span style={label}>Hire Date *</span>
                      <input name="hireDate" type="date" required defaultValue={emp.hireDate ?? ""} style={input} /></label>
                  </div>
                </div>

                {/* Hidden salary fields so form saves all in one action */}
                <input type="hidden" name="dailyRate" value={emp.dailyRate} />
                <input type="hidden" name="sssContribution" value={emp.sssContribution} />
                <input type="hidden" name="philhealthContribution" value={emp.philhealthContribution} />
                <input type="hidden" name="pagibigContribution" value={emp.pagibigContribution} />

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button type="submit" disabled={isPending} style={{
                    padding: "0.6rem 1.5rem", background: "#1d4ed8", color: "#fff",
                    border: "none", borderRadius: "6px", fontSize: "0.875rem",
                    fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? 0.7 : 1,
                  }}>
                    {isPending ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </form>
            )}

            {/* ── Salary & Benefits ── */}
            {tab === "Salary & Benefits" && (
              <form onSubmit={handleProfileSave} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                {msg && (
                  <div style={{ padding: "0.75rem 1rem", borderRadius: "6px", background: msg.ok ? "#d1fae5" : "#fee2e2", color: msg.ok ? "#065f46" : "#991b1b", fontSize: "0.875rem" }}>
                    {msg.text}
                  </div>
                )}

                <div style={grid2}>
                  <label><span style={label}>Daily Rate (₱) *</span>
                    <input name="dailyRate" type="number" step="0.01" required defaultValue={emp.dailyRate} style={input} /></label>
                  <div style={{ padding: "0.75rem 1rem", background: "#f9fafb", borderRadius: "6px", border: "1px solid #e5e7eb" }}>
                    <div style={{ fontSize: "0.75rem", color: "#9ca3af", fontWeight: 600 }}>Monthly Equivalent</div>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "#111827", marginTop: "0.2rem" }}>
                      ₱{(Number(emp.dailyRate) * 22).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                    </div>
                  </div>
                </div>

                <div style={{ borderTop: "1px solid #f3f4f6", paddingTop: "1.25rem" }}>
                  <div style={{ fontSize: "0.8rem", fontWeight: 700, color: "#374151", marginBottom: "1rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>Statutory Contributions (monthly)</div>
                  <div style={grid3}>
                    <label><span style={label}>SSS (₱)</span>
                      <input name="sssContribution" type="number" step="0.01" defaultValue={emp.sssContribution} style={input} /></label>
                    <label><span style={label}>PhilHealth (₱)</span>
                      <input name="philhealthContribution" type="number" step="0.01" defaultValue={emp.philhealthContribution} style={input} /></label>
                    <label><span style={label}>Pag-IBIG (₱)</span>
                      <input name="pagibigContribution" type="number" step="0.01" defaultValue={emp.pagibigContribution} style={input} /></label>
                  </div>
                </div>

                <div style={{ background: "#f9fafb", borderRadius: "8px", padding: "1rem 1.25rem", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
                  <Row label="Employment Type" value={emp.employmentType.replace("_", " ")} />
                  <Row label="Hire Date" value={emp.hireDate} />
                  <Row label="Separation Date" value={emp.separationDate} />
                  <Row label="TIN Number" value={emp.tinNumber} />
                </div>

                {/* Hidden personal info fields so form saves all in one action */}
                <input type="hidden" name="fullName" value={emp.fullName} />
                <input type="hidden" name="position" value={emp.position} />
                <input type="hidden" name="employmentType" value={emp.employmentType} />
                <input type="hidden" name="hireDate" value={emp.hireDate ?? ""} />

                <div style={{ display: "flex", justifyContent: "flex-end" }}>
                  <button type="submit" disabled={isPending} style={{
                    padding: "0.6rem 1.5rem", background: "#1d4ed8", color: "#fff",
                    border: "none", borderRadius: "6px", fontSize: "0.875rem",
                    fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer", opacity: isPending ? 0.7 : 1,
                  }}>
                    {isPending ? "Saving…" : "Save Changes"}
                  </button>
                </div>
              </form>
            )}

            {/* ── Documents ── */}
            {tab === "Documents" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
                {/* Upload form */}
                <div style={{ background: "#f9fafb", border: "1px dashed #d1d5db", borderRadius: "8px", padding: "1.25rem" }}>
                  <div style={{ fontSize: "0.85rem", fontWeight: 700, color: "#374151", marginBottom: "1rem" }}>Upload Document</div>
                  <form onSubmit={handleDocUpload} style={{ display: "flex", flexDirection: "column", gap: "0.85rem" }}>
                    <div style={grid3}>
                      <label><span style={label}>Document Type *</span>
                        <select name="docType" required style={input}>
                          <option value="MEMO">Memo</option>
                          <option value="APPRAISAL">Appraisal</option>
                          <option value="NOTICE">Notice</option>
                          <option value="OTHER">Other</option>
                        </select></label>
                      <label style={{ gridColumn: "span 2" }}><span style={label}>Title *</span>
                        <input name="title" required placeholder="e.g. Q1 2025 Performance Appraisal" style={input} /></label>
                    </div>
                    <label><span style={label}>File * (PDF, JPG, PNG — max 20 MB)</span>
                      <input name="file" type="file" required accept=".pdf,.jpg,.jpeg,.png,.webp" style={{ ...input, padding: "0.4rem 0.6rem" }} /></label>
                    {uploadMsg && (
                      <div style={{ padding: "0.6rem 0.85rem", borderRadius: "6px", background: uploadMsg.ok ? "#d1fae5" : "#fee2e2", color: uploadMsg.ok ? "#065f46" : "#991b1b", fontSize: "0.8rem" }}>
                        {uploadMsg.text}
                      </div>
                    )}
                    <div>
                      <button type="submit" disabled={uploading} style={{
                        padding: "0.55rem 1.25rem", background: "#374151", color: "#fff",
                        border: "none", borderRadius: "6px", fontSize: "0.875rem",
                        fontWeight: 600, cursor: uploading ? "not-allowed" : "pointer", opacity: uploading ? 0.7 : 1,
                      }}>
                        {uploading ? "Uploading…" : "Upload"}
                      </button>
                    </div>
                  </form>
                </div>

                {/* Document list */}
                {docs.length === 0 ? (
                  <div style={{ textAlign: "center", color: "#9ca3af", padding: "2rem", fontSize: "0.875rem" }}>
                    No documents uploaded yet.
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                    {docs.map((doc) => {
                      const color = DOC_COLORS[doc.docType] ?? DOC_COLORS.OTHER;
                      return (
                        <div key={doc.id} style={{
                          display: "flex", alignItems: "center", gap: "0.85rem",
                          padding: "0.75rem 1rem", background: "#fff",
                          border: "1px solid #f3f4f6", borderRadius: "8px",
                        }}>
                          <span style={{ ...color, padding: "0.2rem 0.55rem", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 700, flexShrink: 0 }}>
                            {DOC_TYPE_LABELS[doc.docType] ?? doc.docType}
                          </span>
                          <span style={{ flex: 1, fontSize: "0.875rem", color: "#111827", fontWeight: 500 }}>{doc.title}</span>
                          <span style={{ fontSize: "0.75rem", color: "#9ca3af", whiteSpace: "nowrap" }}>
                            {new Date(doc.createdAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}
                          </span>
                          <a href={doc.fileUrl} target="_blank" rel="noreferrer" style={{
                            padding: "0.3rem 0.65rem", background: "#eff6ff", color: "#1d4ed8",
                            borderRadius: "5px", fontSize: "0.75rem", fontWeight: 600, textDecoration: "none",
                          }}>
                            Open
                          </a>
                          <button onClick={() => handleDeleteDoc(doc.id)} style={{
                            padding: "0.3rem 0.65rem", background: "#fee2e2", color: "#991b1b",
                            border: "none", borderRadius: "5px", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer",
                          }}>
                            Delete
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
