"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateUser, activateUser, deactivateUser } from "@/actions/admin";

const ACCENT = "#dc2626";
const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.9rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem",
};

type Dept = { id: string; code: string; name: string };

export function UserActions({
  id, fullName, role, deptId, isActive, departments, roles,
}: {
  id: string; fullName: string; role: string; deptId: string | null;
  isActive: boolean; departments: Dept[]; roles: string[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const [name, setName]     = useState(fullName);
  const [roleVal, setRole]  = useState(role);
  const [deptVal, setDept]  = useState(deptId ?? "");

  function run(fn: () => Promise<{ success: boolean; error?: string }>) {
    setError(null);
    setSuccess(false);
    startTransition(async () => {
      const res = await fn();
      if (res.success) { setSuccess(true); router.refresh(); }
      else setError(res.error ?? "Action failed.");
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      {error   && <div style={{ padding: "0.75rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem" }}>{error}</div>}
      {success && <div style={{ padding: "0.75rem 1rem", background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "6px", color: "#057a55", fontSize: "0.875rem" }}>Changes saved.</div>}

      <label>
        <span style={labelStyle}>Full Name</span>
        <input value={name} onChange={(e) => setName(e.target.value)} style={inputStyle} />
      </label>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
        <label>
          <span style={labelStyle}>Role</span>
          <select value={roleVal} onChange={(e) => setRole(e.target.value)} style={inputStyle}>
            {roles.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
        </label>
        <label>
          <span style={labelStyle}>Department</span>
          <select value={deptVal} onChange={(e) => setDept(e.target.value)} style={inputStyle}>
            <option value="">— none —</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.code} — {d.name}</option>
            ))}
          </select>
        </label>
      </div>

      <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
        <button
          onClick={() => run(() => updateUser(id, { fullName: name, role: roleVal, deptId: deptVal || null }))}
          disabled={isPending}
          style={{ padding: "0.6rem 1.25rem", borderRadius: "6px", background: isPending ? "#fca5a5" : ACCENT, color: "#fff", border: "none", fontWeight: 600, fontSize: "0.875rem", cursor: isPending ? "not-allowed" : "pointer" }}>
          {isPending ? "Saving…" : "Save Changes"}
        </button>

        {isActive ? (
          <button
            onClick={() => run(() => deactivateUser(id))}
            disabled={isPending}
            style={{ padding: "0.6rem 1.25rem", borderRadius: "6px", background: "#f3f4f6", color: "#374151", border: "1px solid #d1d5db", fontWeight: 600, fontSize: "0.875rem", cursor: isPending ? "not-allowed" : "pointer" }}>
            Deactivate User
          </button>
        ) : (
          <button
            onClick={() => run(() => activateUser(id))}
            disabled={isPending}
            style={{ padding: "0.6rem 1.25rem", borderRadius: "6px", background: "#f0fdf4", color: "#057a55", border: "1px solid #bbf7d0", fontWeight: 600, fontSize: "0.875rem", cursor: isPending ? "not-allowed" : "pointer" }}>
            Reactivate User
          </button>
        )}
      </div>
    </div>
  );
}
