"use client";

import { useState, useMemo } from "react";
import Link from "next/link";

type Employee = {
  id: string;
  employeeCode: string;
  fullName: string;
  position: string;
  employmentType: string;
  dailyRate: string;
  hireDate: string | null;
  isActive: boolean;
  phone: string | null;
  email: string | null;
  deptId: string;
  deptName: string | null;
  absences: number;
  vacation: number;
};

type Dept = { id: string; name: string };

type ColKey =
  | "employeeCode" | "fullName" | "deptName" | "position"
  | "employmentType" | "dailyRate" | "hireDate" | "phone"
  | "email" | "absences" | "vacation" | "status";

const ALL_COLS: { key: ColKey; label: string }[] = [
  { key: "employeeCode",   label: "Code" },
  { key: "fullName",       label: "Name" },
  { key: "deptName",       label: "Department" },
  { key: "position",       label: "Position" },
  { key: "employmentType", label: "Type" },
  { key: "dailyRate",      label: "Daily Rate" },
  { key: "hireDate",       label: "Hire Date" },
  { key: "phone",          label: "Contact No." },
  { key: "email",          label: "Email" },
  { key: "absences",       label: "Absences (days)" },
  { key: "vacation",       label: "Vacation Used (days)" },
  { key: "status",         label: "Status" },
];

const DEFAULT_VISIBLE: ColKey[] = [
  "employeeCode", "fullName", "deptName", "position",
  "employmentType", "dailyRate", "status",
];

const th: React.CSSProperties = {
  padding: "0.6rem 0.9rem", fontSize: "0.72rem", fontWeight: 700,
  color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em",
  textAlign: "left", borderBottom: "1px solid #f3f4f6", whiteSpace: "nowrap",
  background: "#f9fafb",
};
const td: React.CSSProperties = {
  padding: "0.65rem 0.9rem", fontSize: "0.85rem", color: "#374151",
  borderBottom: "1px solid #f9fafb", verticalAlign: "middle",
};

function typeTag(type: string) {
  const map: Record<string, { bg: string; color: string }> = {
    REGULAR:       { bg: "#d1fae5", color: "#065f46" },
    CONTRACTUAL:   { bg: "#fef9c3", color: "#854d0e" },
    PROJECT_BASED: { bg: "#e0e7ff", color: "#3730a3" },
  };
  const s = map[type] ?? { bg: "#f3f4f6", color: "#374151" };
  return <span style={{ ...s, padding: "0.15rem 0.45rem", borderRadius: "999px", fontSize: "0.68rem", fontWeight: 700 }}>{type.replace("_", " ")}</span>;
}

export default function EmployeeListReport({
  data,
  departments,
}: {
  data: Employee[];
  departments: Dept[];
}) {
  const [visible, setVisible] = useState<Set<ColKey>>(new Set(DEFAULT_VISIBLE));
  const [showColMenu, setShowColMenu] = useState(false);
  const [search, setSearch] = useState("");
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const filtered = useMemo(() => {
    return data.filter((r) => {
      if (search && !r.fullName.toLowerCase().includes(search.toLowerCase()) &&
          !r.employeeCode.toLowerCase().includes(search.toLowerCase()) &&
          !r.position.toLowerCase().includes(search.toLowerCase())) return false;
      if (deptFilter && r.deptId !== deptFilter) return false;
      if (statusFilter === "active" && !r.isActive) return false;
      if (statusFilter === "inactive" && r.isActive) return false;
      if (typeFilter && r.employmentType !== typeFilter) return false;
      return true;
    });
  }, [data, search, deptFilter, statusFilter, typeFilter]);

  const cols = ALL_COLS.filter((c) => visible.has(c.key));

  function toggleCol(key: ColKey) {
    setVisible((prev) => {
      const next = new Set(prev);
      if (next.has(key)) { if (next.size > 1) next.delete(key); }
      else next.add(key);
      return next;
    });
  }

  function cellValue(emp: Employee, key: ColKey): React.ReactNode {
    switch (key) {
      case "employeeCode":   return <span style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "#6b7280" }}>{emp.employeeCode}</span>;
      case "fullName":       return <Link href={`/hr/registry/${emp.id}`} style={{ color: "#1d4ed8", fontWeight: 600, textDecoration: "none" }}>{emp.fullName}</Link>;
      case "deptName":       return emp.deptName ?? "—";
      case "position":       return emp.position;
      case "employmentType": return typeTag(emp.employmentType);
      case "dailyRate":      return `₱${Number(emp.dailyRate).toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
      case "hireDate":       return emp.hireDate ?? "—";
      case "phone":          return emp.phone ?? "—";
      case "email":          return emp.email ? <a href={`mailto:${emp.email}`} style={{ color: "#1d4ed8" }}>{emp.email}</a> : "—";
      case "absences":       return emp.absences > 0 ? <span style={{ color: "#b91c1c", fontWeight: 600 }}>{emp.absences}</span> : "0";
      case "vacation":       return emp.vacation > 0 ? <span style={{ color: "#0369a1", fontWeight: 600 }}>{emp.vacation}</span> : "0";
      case "status":         return (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: emp.isActive ? "#22c55e" : "#d1d5db", display: "inline-block" }} />
          <span style={{ fontSize: "0.78rem", color: emp.isActive ? "#15803d" : "#9ca3af" }}>{emp.isActive ? "Active" : "Inactive"}</span>
        </span>
      );
    }
  }

  function exportCsv() {
    const header = cols.map((c) => c.label).join(",");
    const rows = filtered.map((emp) =>
      cols.map((c) => {
        const raw = (() => {
          switch (c.key) {
            case "employeeCode":   return emp.employeeCode;
            case "fullName":       return emp.fullName;
            case "deptName":       return emp.deptName ?? "";
            case "position":       return emp.position;
            case "employmentType": return emp.employmentType;
            case "dailyRate":      return emp.dailyRate;
            case "hireDate":       return emp.hireDate ?? "";
            case "phone":          return emp.phone ?? "";
            case "email":          return emp.email ?? "";
            case "absences":       return String(emp.absences);
            case "vacation":       return String(emp.vacation);
            case "status":         return emp.isActive ? "Active" : "Inactive";
          }
        })();
        return `"${String(raw).replace(/"/g, '""')}"`;
      }).join(",")
    );
    const csv = [header, ...rows].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `employee-list-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1300px" }}>
        <div style={{ marginBottom: "1.25rem" }}>
          <Link href="/hr" style={{ fontSize: "0.8rem", color: "#6b7280", textDecoration: "none" }}>← HR &amp; Payroll</Link>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Employee List</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem" }}>{filtered.length} of {data.length} employees</p>
          </div>
          <div style={{ display: "flex", gap: "0.6rem" }}>
            <button onClick={exportCsv} style={{
              padding: "0.5rem 1rem", background: "#fff", border: "1px solid #d1d5db",
              borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600, cursor: "pointer", color: "#374151",
            }}>
              ↓ Export CSV
            </button>
            <Link href="/hr/add-employee" style={{
              padding: "0.5rem 1rem", background: "#1d4ed8", color: "#fff",
              borderRadius: "6px", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none",
            }}>
              + Add Employee
            </Link>
          </div>
        </div>

        {/* Filter bar */}
        <div style={{ display: "flex", gap: "0.65rem", flexWrap: "wrap", marginBottom: "1rem", alignItems: "center" }}>
          <input
            value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, code, position…"
            style={{ flex: "1 1 200px", padding: "0.5rem 0.8rem", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem" }}
          />
          <select value={deptFilter} onChange={(e) => setDeptFilter(e.target.value)}
            style={{ padding: "0.5rem 0.8rem", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem" }}>
            <option value="">All Departments</option>
            {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
            style={{ padding: "0.5rem 0.8rem", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem" }}>
            <option value="">All Types</option>
            <option value="REGULAR">Regular</option>
            <option value="CONTRACTUAL">Contractual</option>
            <option value="PROJECT_BASED">Project Based</option>
          </select>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            style={{ padding: "0.5rem 0.8rem", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem" }}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* Column picker */}
          <div style={{ position: "relative" }}>
            <button
              onClick={() => setShowColMenu((v) => !v)}
              style={{ padding: "0.5rem 0.9rem", background: "#fff", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.8rem", cursor: "pointer", color: "#374151", fontWeight: 600 }}
            >
              Columns ({visible.size}) ▾
            </button>
            {showColMenu && (
              <div style={{
                position: "absolute", top: "calc(100% + 6px)", right: 0, zIndex: 50,
                background: "#fff", border: "1px solid #e5e7eb", borderRadius: "8px",
                boxShadow: "0 4px 16px rgba(0,0,0,0.12)", padding: "0.5rem 0", minWidth: "190px",
              }}>
                <div style={{ padding: "0.3rem 0.9rem 0.5rem", fontSize: "0.7rem", fontWeight: 700, color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Show / hide columns
                </div>
                {ALL_COLS.map((c) => (
                  <label key={c.key} style={{
                    display: "flex", alignItems: "center", gap: "0.5rem",
                    padding: "0.35rem 0.9rem", cursor: "pointer", fontSize: "0.85rem",
                    color: "#374151",
                  }}>
                    <input
                      type="checkbox"
                      checked={visible.has(c.key)}
                      onChange={() => toggleCol(c.key)}
                      style={{ accentColor: "#1d4ed8" }}
                    />
                    {c.label}
                  </label>
                ))}
                <div style={{ borderTop: "1px solid #f3f4f6", marginTop: "0.4rem", padding: "0.4rem 0.9rem 0.25rem", display: "flex", gap: "0.75rem" }}>
                  <button onClick={() => setVisible(new Set(ALL_COLS.map((c) => c.key)))}
                    style={{ fontSize: "0.75rem", color: "#1d4ed8", background: "none", border: "none", cursor: "pointer", padding: 0 }}>All</button>
                  <button onClick={() => setVisible(new Set(DEFAULT_VISIBLE))}
                    style={{ fontSize: "0.75rem", color: "#6b7280", background: "none", border: "none", cursor: "pointer", padding: 0 }}>Reset</button>
                </div>
              </div>
            )}
          </div>

          {(search || deptFilter || statusFilter || typeFilter) && (
            <button onClick={() => { setSearch(""); setDeptFilter(""); setStatusFilter(""); setTypeFilter(""); }}
              style={{ padding: "0.5rem 0.8rem", background: "none", border: "none", fontSize: "0.8rem", color: "#6b7280", cursor: "pointer" }}>
              Clear filters
            </button>
          )}
        </div>

        {/* Table */}
        <div style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "600px" }}>
            <thead>
              <tr>
                {cols.map((c) => <th key={c.key} style={th}>{c.label}</th>)}
                <th style={{ ...th, textAlign: "right" }}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={cols.length + 1} style={{ ...td, textAlign: "center", color: "#9ca3af", padding: "3rem" }}>
                    No employees match the current filters.
                  </td>
                </tr>
              ) : (
                filtered.map((emp) => (
                  <tr key={emp.id}>
                    {cols.map((c) => <td key={c.key} style={td}>{cellValue(emp, c.key)}</td>)}
                    <td style={{ ...td, textAlign: "right" }}>
                      <Link href={`/hr/registry/${emp.id}`} style={{
                        padding: "0.28rem 0.65rem", borderRadius: "5px",
                        background: "#f3f4f6", color: "#374151",
                        fontSize: "0.75rem", fontWeight: 600, textDecoration: "none",
                      }}>View</Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Summary footer */}
        {filtered.length > 0 && visible.has("dailyRate") && (
          <div style={{ marginTop: "0.85rem", textAlign: "right", fontSize: "0.8rem", color: "#6b7280" }}>
            Total daily payroll:{" "}
            <strong style={{ color: "#111827" }}>
              ₱{filtered.reduce((s, r) => s + Number(r.dailyRate), 0).toLocaleString("en-PH", { minimumFractionDigits: 2 })}
            </strong>
          </div>
        )}
      </div>

      {/* Click-outside to close column menu */}
      {showColMenu && (
        <div style={{ position: "fixed", inset: 0, zIndex: 40 }} onClick={() => setShowColMenu(false)} />
      )}
    </main>
  );
}
