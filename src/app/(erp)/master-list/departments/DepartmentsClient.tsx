"use client";

import { useState, useTransition } from "react";
import { seedDepartments, createCostCenterForDept, toggleCostCenterActiveForDept } from "@/actions/master-list";
import { useRouter } from "next/navigation";

type Dept = { id: string; code: string; name: string };
type CC = { id: string; code: string; name: string; deptId: string; type: string; isActive: boolean };

const ACCENT = "#1d4ed8";
const CC_TYPES = ["PROJECT", "BATCHING", "FLEET", "HQ"] as const;

const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.55rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem",
};

export default function DepartmentsClient({
  departments, costCenters,
}: {
  departments: Dept[];
  costCenters: CC[];
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [seeding, setSeeding] = useState(false);
  const [seedMsg, setSeedMsg] = useState<string | null>(null);
  const [addingToDept, setAddingToDept] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const ccByDept = (deptId: string) => costCenters.filter((c) => c.deptId === deptId);

  function handleSeed() {
    setSeeding(true);
    setSeedMsg(null);
    startTransition(async () => {
      const result = await seedDepartments();
      setSeedMsg(`Done — ${result.seeded} department(s) seeded.`);
      setSeeding(false);
      router.refresh();
    });
  }

  function handleAddCC(e: React.FormEvent<HTMLFormElement>, deptId: string) {
    e.preventDefault();
    setFormError(null);
    setIsPending(true);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createCostCenterForDept({
        code:   fd.get("code") as string,
        name:   fd.get("name") as string,
        deptId,
        type:   fd.get("type") as any,
      });
      if (result.success) {
        setAddingToDept(null);
        router.refresh();
      } else {
        setFormError(result.error ?? "Error.");
      }
      setIsPending(false);
    });
  }

  function handleToggleCC(id: string, isActive: boolean) {
    startTransition(async () => {
      await toggleCostCenterActiveForDept(id, isActive);
      router.refresh();
    });
  }

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "860px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/master-list" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Master List</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.75rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Departments & Cost Centers</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>{departments.length} departments, {costCenters.length} cost centers</p>
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "0.4rem" }}>
            <button onClick={handleSeed} disabled={seeding} style={{
              padding: "0.5rem 1.1rem", borderRadius: "6px", background: seeding ? "#93c5fd" : ACCENT,
              color: "#fff", border: "none", fontSize: "0.8rem", fontWeight: 600, cursor: seeding ? "not-allowed" : "pointer",
            }}>
              {seeding ? "Seeding…" : "Seed All Departments"}
            </button>
            {seedMsg && <div style={{ fontSize: "0.75rem", color: "#16a34a" }}>{seedMsg}</div>}
          </div>
        </div>

        {departments.length === 0 ? (
          <div style={{ padding: "2.5rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No departments found. Click <strong>Seed All Departments</strong> to initialize all 10 departments.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
            {departments.map((dept) => {
              const ccs = ccByDept(dept.id);
              return (
                <div key={dept.id} style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
                  <div style={{ padding: "0.9rem 1.25rem", background: "#f9fafb", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <div>
                      <span style={{ fontFamily: "monospace", fontSize: "0.78rem", color: "#6b7280", marginRight: "0.75rem" }}>{dept.code}</span>
                      <span style={{ fontWeight: 700, color: "#111827" }}>{dept.name}</span>
                    </div>
                    <button
                      onClick={() => { setAddingToDept(addingToDept === dept.id ? null : dept.id); setFormError(null); }}
                      style={{
                        padding: "0.3rem 0.8rem", borderRadius: "5px", background: "#e0e7ff",
                        color: "#3730a3", border: "none", fontSize: "0.75rem", fontWeight: 600, cursor: "pointer",
                      }}
                    >
                      + Add Cost Center
                    </button>
                  </div>

                  {addingToDept === dept.id && (
                    <form onSubmit={(e) => handleAddCC(e, dept.id)} style={{ padding: "1rem 1.25rem", background: "#f0f9ff", borderBottom: "1px solid #e0f2fe" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr 1fr", gap: "0.75rem", marginBottom: "0.75rem" }}>
                        <label>
                          <span style={labelStyle}>Code *</span>
                          <input name="code" required placeholder="CC-001" style={inputStyle} />
                        </label>
                        <label>
                          <span style={labelStyle}>Name *</span>
                          <input name="name" required placeholder="e.g. South Palms Site" style={inputStyle} />
                        </label>
                        <label>
                          <span style={labelStyle}>Type *</span>
                          <select name="type" required style={inputStyle}>
                            {CC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                          </select>
                        </label>
                      </div>
                      {formError && <div style={{ fontSize: "0.78rem", color: "#b91c1c", marginBottom: "0.5rem" }}>{formError}</div>}
                      <button type="submit" disabled={isPending} style={{
                        padding: "0.4rem 1rem", borderRadius: "5px", background: isPending ? "#93c5fd" : ACCENT,
                        color: "#fff", border: "none", fontSize: "0.8rem", fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer",
                      }}>
                        {isPending ? "Saving…" : "Save"}
                      </button>
                    </form>
                  )}

                  {ccs.length === 0 ? (
                    <div style={{ padding: "1rem 1.25rem", color: "#9ca3af", fontSize: "0.8rem" }}>No cost centers yet.</div>
                  ) : (
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                      <thead>
                        <tr style={{ background: "#fafafa" }}>
                          {["Code", "Name", "Type", "Status", ""].map((h, i) => (
                            <th key={i} style={{ padding: "0.55rem 1rem", textAlign: "left", fontWeight: 600, color: "#6b7280", borderBottom: "1px solid #f3f4f6" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {ccs.map((cc) => (
                          <tr key={cc.id} style={{ borderBottom: "1px solid #f9fafb", opacity: cc.isActive ? 1 : 0.55 }}>
                            <td style={{ padding: "0.55rem 1rem", fontFamily: "monospace", color: "#374151" }}>{cc.code}</td>
                            <td style={{ padding: "0.55rem 1rem", fontWeight: 500, color: "#111827" }}>{cc.name}</td>
                            <td style={{ padding: "0.55rem 1rem", color: "#6b7280" }}>{cc.type}</td>
                            <td style={{ padding: "0.55rem 1rem" }}>
                              <span style={{ display: "inline-block", padding: "0.15rem 0.5rem", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 600, background: cc.isActive ? "#dcfce7" : "#f3f4f6", color: cc.isActive ? "#166534" : "#6b7280" }}>
                                {cc.isActive ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td style={{ padding: "0.55rem 1rem", textAlign: "right" }}>
                              <button onClick={() => handleToggleCC(cc.id, !cc.isActive)} style={{
                                padding: "0.25rem 0.65rem", borderRadius: "4px", border: "none", fontSize: "0.72rem", fontWeight: 600,
                                background: cc.isActive ? "#fee2e2" : "#dcfce7", color: cc.isActive ? "#991b1b" : "#166534", cursor: "pointer",
                              }}>
                                {cc.isActive ? "Deactivate" : "Activate"}
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
