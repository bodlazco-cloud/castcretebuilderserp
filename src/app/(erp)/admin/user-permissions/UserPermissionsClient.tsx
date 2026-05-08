"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateUser } from "@/actions/admin";

type UserRow = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  deptCode: string | null;
  isActive: boolean;
};

const ROLES = [
  "ADMIN", "BOD", "FINANCE", "CONSTRUCTION", "PLANNING",
  "PROCUREMENT", "AUDIT", "HR", "BATCHING", "MOTORPOOL", "VIEWER",
] as const;

// What each role can access (read / edit) per module
const ROLE_ACCESS: Record<string, Record<string, "edit" | "view" | "—">> = {
  ADMIN:        { "Master List": "edit", "Projects": "edit", "Finance": "edit", "HR/Payroll": "edit", "Construction": "edit", "Procurement": "edit", "Audit": "edit", "Batching": "edit", "Admin": "edit" },
  BOD:          { "Master List": "view", "Projects": "view", "Finance": "view", "HR/Payroll": "view", "Construction": "view", "Procurement": "view", "Audit": "view", "Batching": "view", "Admin": "—" },
  FINANCE:      { "Master List": "view", "Projects": "view", "Finance": "edit", "HR/Payroll": "view", "Construction": "view", "Procurement": "view", "Audit": "view", "Batching": "—", "Admin": "—" },
  CONSTRUCTION: { "Master List": "view", "Projects": "view", "Finance": "—",    "HR/Payroll": "—",    "Construction": "edit", "Procurement": "view", "Audit": "view", "Batching": "view", "Admin": "—" },
  PLANNING:     { "Master List": "edit", "Projects": "edit", "Finance": "view", "HR/Payroll": "—",    "Construction": "view", "Procurement": "view", "Audit": "—",    "Batching": "—",    "Admin": "—" },
  PROCUREMENT:  { "Master List": "view", "Projects": "view", "Finance": "view", "HR/Payroll": "—",    "Construction": "—",    "Procurement": "edit", "Audit": "—",    "Batching": "—",    "Admin": "—" },
  AUDIT:        { "Master List": "view", "Projects": "view", "Finance": "view", "HR/Payroll": "—",    "Construction": "view", "Procurement": "view", "Audit": "edit", "Batching": "—",    "Admin": "—" },
  HR:           { "Master List": "view", "Projects": "—",    "Finance": "—",    "HR/Payroll": "edit", "Construction": "—",    "Procurement": "—",    "Audit": "—",    "Batching": "—",    "Admin": "—" },
  BATCHING:     { "Master List": "view", "Projects": "—",    "Finance": "—",    "HR/Payroll": "—",    "Construction": "view", "Procurement": "—",    "Audit": "—",    "Batching": "edit", "Admin": "—" },
  MOTORPOOL:    { "Master List": "view", "Projects": "—",    "Finance": "—",    "HR/Payroll": "—",    "Construction": "—",    "Procurement": "—",    "Audit": "—",    "Batching": "—",    "Admin": "—" },
  VIEWER:       { "Master List": "view", "Projects": "view", "Finance": "view", "HR/Payroll": "—",    "Construction": "view", "Procurement": "—",    "Audit": "—",    "Batching": "—",    "Admin": "—" },
};

const MODULES = ["Master List", "Projects", "Finance", "HR/Payroll", "Construction", "Procurement", "Audit", "Batching", "Admin"];

const ACCESS_STYLE: Record<string, { bg: string; color: string }> = {
  edit: { bg: "#dcfce7", color: "#166534" },
  view: { bg: "#eff6ff", color: "#1e40af" },
  "—":  { bg: "#f3f4f6", color: "#9ca3af" },
};

function RoleCell({ access }: { access: "edit" | "view" | "—" }) {
  const s = ACCESS_STYLE[access];
  return (
    <span style={{ display: "inline-block", padding: "0.15rem 0.5rem", borderRadius: "4px", fontSize: "0.7rem", fontWeight: 600, background: s.bg, color: s.color }}>
      {access}
    </span>
  );
}

function UserRoleRow({ user }: { user: UserRow }) {
  const router = useRouter();
  const [role, setRole] = useState(user.role);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave() {
    setSaved(false); setError(null);
    startTransition(async () => {
      const res = await updateUser(user.id, { role });
      if (res.success) { setSaved(true); router.refresh(); }
      else setError(res.error ?? "Error saving.");
    });
  }

  return (
    <tr style={{ borderBottom: "1px solid #f3f4f6", opacity: user.isActive ? 1 : 0.5 }}>
      <td style={{ padding: "0.65rem 1rem" }}>
        <div style={{ fontWeight: 600, color: "#111827", fontSize: "0.875rem" }}>{user.fullName}</div>
        <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{user.email}</div>
      </td>
      <td style={{ padding: "0.65rem 1rem" }}>
        <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "0.15rem 0.45rem", borderRadius: "4px", background: user.isActive ? "#f0fdf4" : "#f3f4f6", color: user.isActive ? "#057a55" : "#9ca3af" }}>
          {user.isActive ? "Active" : "Inactive"}
        </span>
      </td>
      <td style={{ padding: "0.65rem 1rem" }}>
        <span style={{ fontSize: "0.72rem", color: "#6b7280" }}>{user.deptCode ?? "—"}</span>
      </td>
      <td style={{ padding: "0.65rem 1rem" }}>
        <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
          <select
            value={role}
            onChange={(e) => { setRole(e.target.value); setSaved(false); }}
            style={{ padding: "0.35rem 0.6rem", border: "1px solid #d1d5db", borderRadius: "5px", fontSize: "0.82rem", background: "#fff" }}
          >
            {ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
          </select>
          {role !== user.role && (
            <button
              onClick={handleSave}
              disabled={isPending}
              style={{ padding: "0.3rem 0.7rem", borderRadius: "5px", background: isPending ? "#9ca3af" : "#374151", color: "#fff", border: "none", fontSize: "0.75rem", fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer" }}
            >
              {isPending ? "…" : "Save"}
            </button>
          )}
          {saved && <span style={{ fontSize: "0.72rem", color: "#057a55" }}>Saved</span>}
          {error && <span style={{ fontSize: "0.72rem", color: "#b91c1c" }}>{error}</span>}
        </div>
      </td>
    </tr>
  );
}

export default function UserPermissionsClient({ users }: { users: UserRow[] }) {
  const [showMatrix, setShowMatrix] = useState(false);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
      {/* User role assignment table */}
      <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                {["User", "Status", "Dept", "Role"].map((h) => (
                  <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr><td colSpan={4} style={{ padding: "2.5rem", textAlign: "center", color: "#9ca3af" }}>No users found. <a href="/admin/users/new" style={{ color: "#dc2626" }}>Add users →</a></td></tr>
              ) : (
                users.map((u) => <UserRoleRow key={u.id} user={u} />)
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Role permission matrix toggle */}
      <div>
        <button
          onClick={() => setShowMatrix((v) => !v)}
          style={{ padding: "0.45rem 1rem", borderRadius: "6px", border: "1px solid #d1d5db", background: "#f9fafb", color: "#374151", fontSize: "0.82rem", fontWeight: 600, cursor: "pointer" }}
        >
          {showMatrix ? "Hide" : "Show"} Role Permission Matrix
        </button>

        {showMatrix && (
          <div style={{ marginTop: "1rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ padding: "0.75rem 1rem", borderBottom: "1px solid #e5e7eb", background: "#f9fafb" }}>
              <span style={{ fontWeight: 700, fontSize: "0.85rem", color: "#374151" }}>Permission Matrix — Role Access by Module</span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.78rem" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    <th style={{ padding: "0.55rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>Role</th>
                    {MODULES.map((m) => (
                      <th key={m} style={{ padding: "0.55rem 0.75rem", textAlign: "center", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>{m}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {ROLES.map((role) => (
                    <tr key={role} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "0.5rem 1rem", fontWeight: 700, color: "#374151", fontFamily: "monospace", fontSize: "0.78rem" }}>{role}</td>
                      {MODULES.map((m) => (
                        <td key={m} style={{ padding: "0.5rem 0.75rem", textAlign: "center" }}>
                          <RoleCell access={(ROLE_ACCESS[role]?.[m] ?? "—") as "edit" | "view" | "—"} />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ padding: "0.65rem 1rem", borderTop: "1px solid #e5e7eb", fontSize: "0.75rem", color: "#6b7280" }}>
              Role assignments control UI access. Enforcement at the API layer is handled by the authentication middleware.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
