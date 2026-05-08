"use client";

import { useState, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { batchLogDtr } from "@/actions/hr";

const ACCENT = "#6b7280";

const CSV_TEMPLATE = "employeeCode,workDate,costCenterCode,hoursWorked,overtimeHours\nEMP-001,2026-05-01,CC-001,8,0\nEMP-002,2026-05-01,CC-001,8,2";

function parseCsv(text: string) {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/\s+/g, ""));
  return lines.slice(1).map((line) => {
    const vals = line.split(",").map((v) => v.trim());
    const row: Record<string, string> = {};
    header.forEach((h, i) => { row[h] = vals[i] ?? ""; });
    return {
      employeeCode:   row["employeecode"] ?? "",
      workDate:       row["workdate"] ?? "",
      costCenterCode: row["costcentercode"] ?? "",
      hoursWorked:    row["hoursworked"] ? Number(row["hoursworked"]) : undefined,
      overtimeHours:  row["overtimehours"] ? Number(row["overtimehours"]) : undefined,
    };
  }).filter((r) => r.employeeCode && r.workDate && r.costCenterCode);
}

export function UploadDtrForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ inserted: number; skipped: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<ReturnType<typeof parseCsv>>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    setResult(null);
    setError(null);
    const file = e.target.files?.[0];
    if (!file) { setPreview([]); return; }
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      setPreview(parseCsv(text));
    };
    reader.readAsText(file);
  }

  function handleUpload() {
    if (preview.length === 0) { setError("No valid rows found in the CSV."); return; }
    setError(null);
    startTransition(async () => {
      const res = await batchLogDtr(preview);
      if (res.success) {
        setResult({ inserted: res.inserted, skipped: res.skipped });
        setPreview([]);
        if (fileRef.current) fileRef.current.value = "";
        router.refresh();
      } else {
        setError(res.error);
      }
    });
  }

  function downloadTemplate() {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "dtr-upload-template.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <button
        onClick={() => { setOpen((v) => !v); setResult(null); setError(null); setPreview([]); }}
        style={{
          padding: "0.5rem 1rem", borderRadius: "6px",
          background: open ? "#f3f4f6" : "#374151",
          color: open ? "#374151" : "#fff",
          border: open ? "1px solid #d1d5db" : "none",
          fontSize: "0.8rem", fontWeight: 600, cursor: "pointer",
        }}
      >
        {open ? "Close DTR Upload" : "Upload DTR"}
      </button>

      {open && (
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem", marginTop: "1.25rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <div>
              <h3 style={{ margin: "0 0 0.2rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Batch Upload DTR Summary</h3>
              <p style={{ margin: 0, fontSize: "0.8rem", color: "#6b7280" }}>Upload a CSV with employee codes, work dates, and cost center codes.</p>
            </div>
            <button onClick={downloadTemplate} style={{ padding: "0.35rem 0.8rem", borderRadius: "5px", border: "1px solid #d1d5db", background: "#f9fafb", color: "#374151", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}>
              Download Template
            </button>
          </div>

          <div style={{ marginBottom: "0.75rem", padding: "0.65rem 0.9rem", background: "#f9fafb", borderRadius: "6px", fontSize: "0.78rem", color: "#6b7280", fontFamily: "monospace" }}>
            employeeCode, workDate (YYYY-MM-DD), costCenterCode, hoursWorked, overtimeHours
          </div>

          <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFileChange}
            style={{ display: "block", marginBottom: "0.75rem", fontSize: "0.85rem" }} />

          {preview.length > 0 && (
            <div style={{ marginBottom: "0.75rem" }}>
              <div style={{ fontSize: "0.8rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem" }}>
                Preview: {preview.length} row(s) ready to import
              </div>
              <div style={{ maxHeight: "180px", overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: "6px", fontSize: "0.78rem" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ background: "#f9fafb" }}>
                      {["Employee", "Date", "Cost Center", "Hours", "OT Hrs"].map((h) => (
                        <th key={h} style={{ padding: "0.4rem 0.7rem", textAlign: "left", fontWeight: 600, color: "#6b7280", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.slice(0, 20).map((r, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.35rem 0.7rem", fontFamily: "monospace" }}>{r.employeeCode}</td>
                        <td style={{ padding: "0.35rem 0.7rem" }}>{r.workDate}</td>
                        <td style={{ padding: "0.35rem 0.7rem", fontFamily: "monospace" }}>{r.costCenterCode}</td>
                        <td style={{ padding: "0.35rem 0.7rem", textAlign: "right" }}>{r.hoursWorked ?? "—"}</td>
                        <td style={{ padding: "0.35rem 0.7rem", textAlign: "right" }}>{r.overtimeHours ?? 0}</td>
                      </tr>
                    ))}
                    {preview.length > 20 && (
                      <tr><td colSpan={5} style={{ padding: "0.35rem 0.7rem", color: "#9ca3af", fontStyle: "italic" }}>…and {preview.length - 20} more rows</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {error && (
            <div style={{ padding: "0.65rem 0.9rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.82rem", marginBottom: "0.75rem" }}>
              {error}
            </div>
          )}
          {result && (
            <div style={{ padding: "0.65rem 0.9rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px", color: "#057a55", fontSize: "0.82rem", marginBottom: "0.75rem" }}>
              Imported {result.inserted} record(s).{result.skipped > 0 ? ` Skipped ${result.skipped} (unknown employee/cost center code).` : ""}
            </div>
          )}

          <button
            onClick={handleUpload}
            disabled={isPending || preview.length === 0}
            style={{
              padding: "0.5rem 1.25rem", borderRadius: "6px",
              background: isPending || preview.length === 0 ? "#9ca3af" : "#374151",
              color: "#fff", border: "none", fontSize: "0.85rem", fontWeight: 600,
              cursor: isPending || preview.length === 0 ? "not-allowed" : "pointer",
            }}
          >
            {isPending ? "Uploading…" : `Import ${preview.length} Record(s)`}
          </button>
        </div>
      )}
    </>
  );
}
