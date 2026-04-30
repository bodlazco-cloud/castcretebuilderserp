"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createUser } from "@/actions/admin";

const ACCENT = "#dc2626";
const inputStyle: React.CSSProperties = {
  display: "block", width: "100%", padding: "0.6rem 0.8rem",
  border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.9rem", boxSizing: "border-box",
};
const labelStyle: React.CSSProperties = {
  display: "block", fontSize: "0.82rem", fontWeight: 600, color: "#374151", marginBottom: "0.35rem",
};

type Dept = { id: string; code: string; name: string };

export function NewUserForm({ departments, roles }: { departments: Dept[]; roles: string[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createUser({
        email:    fd.get("email") as string,
        fullName: fd.get("fullName") as string,
        role:     fd.get("role") as string,
        deptId:   (fd.get("deptId") as string) || undefined,
      });
      if (result.success) router.push(`/admin/users/${result.id}`);
      else setError(result.error ?? "Failed to create user.");
    });
  }

  return (
    <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.75rem" }}>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
        {error && (
          <div style={{ padding: "0.85rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "6px", color: "#b91c1c", fontSize: "0.875rem" }}>{error}</div>
        )}

        <label>
          <span style={labelStyle}>Full Name <span style={{ color: "#e02424" }}>*</span></span>
          <input name="fullName" type="text" required placeholder="e.g. Juan dela Cruz" style={inputStyle} />
        </label>

        <label>
          <span style={labelStyle}>Email Address <span style={{ color: "#e02424" }}>*</span></span>
          <input name="email" type="email" required placeholder="user@castcrete.ph" style={inputStyle} />
        </label>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}>
          <label>
            <span style={labelStyle}>Role <span style={{ color: "#e02424" }}>*</span></span>
            <select name="role" required style={inputStyle}>
              {roles.map((r) => <option key={r} value={r}>{r}</option>)}
            </select>
          </label>
          <label>
            <span style={labelStyle}>Department</span>
            <select name="deptId" style={inputStyle}>
              <option value="">— none —</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.code} — {d.name}</option>
              ))}
            </select>
          </label>
        </div>

        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end" }}>
          <a href="/admin/users" style={{ padding: "0.65rem 1.25rem", borderRadius: "6px", border: "1px solid #d1d5db", color: "#374151", fontSize: "0.9rem", textDecoration: "none", display: "inline-flex", alignItems: "center" }}>Cancel</a>
          <button type="submit" disabled={isPending} style={{
            padding: "0.65rem 1.5rem", borderRadius: "6px",
            background: isPending ? "#fca5a5" : ACCENT,
            color: "#fff", border: "none", fontSize: "0.9rem", fontWeight: 600,
            cursor: isPending ? "not-allowed" : "pointer",
          }}>
            {isPending ? "Creating…" : "Create User"}
          </button>
        </div>
      </form>
    </div>
  );
}
