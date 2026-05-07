import { db } from "@/db";
import { employees, departments } from "@/db/schema";
import { eq, ilike, asc, and } from "drizzle-orm";
import Link from "next/link";

const S = {
  page:    { padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" } as React.CSSProperties,
  card:    { background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" } as React.CSSProperties,
  th:      { padding: "0.65rem 1rem", fontSize: "0.75rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase" as const, letterSpacing: "0.05em", textAlign: "left" as const, borderBottom: "1px solid #f3f4f6", whiteSpace: "nowrap" as const },
  td:      { padding: "0.75rem 1rem", fontSize: "0.875rem", color: "#374151", borderBottom: "1px solid #f9fafb", verticalAlign: "middle" as const },
};

function badge(type: string) {
  const map: Record<string, { bg: string; color: string }> = {
    REGULAR:       { bg: "#d1fae5", color: "#065f46" },
    CONTRACTUAL:   { bg: "#fef9c3", color: "#854d0e" },
    PROJECT_BASED: { bg: "#e0e7ff", color: "#3730a3" },
  };
  const s = map[type] ?? { bg: "#f3f4f6", color: "#374151" };
  return (
    <span style={{ ...s, padding: "0.15rem 0.5rem", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 700 }}>
      {type.replace("_", " ")}
    </span>
  );
}

function activeDot(active: boolean) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
      <span style={{ width: 7, height: 7, borderRadius: "50%", background: active ? "#22c55e" : "#d1d5db", display: "inline-block" }} />
      <span style={{ fontSize: "0.8rem", color: active ? "#15803d" : "#9ca3af" }}>{active ? "Active" : "Inactive"}</span>
    </span>
  );
}

export default async function EmployeeRegistryPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; dept?: string; status?: string }>;
}) {
  const { q, dept, status } = await searchParams;

  const depts = await db.select({ id: departments.id, code: departments.code, name: departments.name })
    .from(departments)
    .orderBy(asc(departments.name));

  const rows = await db
    .select({
      id:             employees.id,
      employeeCode:   employees.employeeCode,
      fullName:       employees.fullName,
      position:       employees.position,
      employmentType: employees.employmentType,
      hireDate:       employees.hireDate,
      isActive:       employees.isActive,
      deptId:         employees.deptId,
      deptName:       departments.name,
    })
    .from(employees)
    .leftJoin(departments, eq(employees.deptId, departments.id))
    .orderBy(asc(employees.fullName));

  const filtered = rows.filter((r) => {
    if (q && !r.fullName.toLowerCase().includes(q.toLowerCase()) && !r.employeeCode.toLowerCase().includes(q.toLowerCase())) return false;
    if (dept && r.deptId !== dept) return false;
    if (status === "active" && !r.isActive) return false;
    if (status === "inactive" && r.isActive) return false;
    return true;
  });

  return (
    <main style={S.page}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <Link href="/hr" style={{ fontSize: "0.8rem", color: "#6b7280", textDecoration: "none" }}>← HR &amp; Payroll</Link>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Employee Registry</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem" }}>{filtered.length} employee{filtered.length !== 1 ? "s" : ""} found</p>
          </div>
          <Link href="/hr/add-employee" style={{
            padding: "0.55rem 1.1rem", borderRadius: "6px", background: "#1d4ed8",
            color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none",
          }}>
            + Add Employee
          </Link>
        </div>

        {/* Filters */}
        <form method="GET" style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.25rem" }}>
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Search name or code…"
            style={{ flex: "1 1 220px", padding: "0.55rem 0.85rem", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem" }}
          />
          <select name="dept" defaultValue={dept ?? ""} style={{ padding: "0.55rem 0.85rem", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem" }}>
            <option value="">All Departments</option>
            {depts.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
          <select name="status" defaultValue={status ?? ""} style={{ padding: "0.55rem 0.85rem", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "0.875rem" }}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
          <button type="submit" style={{ padding: "0.55rem 1.1rem", background: "#374151", color: "#fff", border: "none", borderRadius: "6px", fontSize: "0.875rem", fontWeight: 600, cursor: "pointer" }}>
            Filter
          </button>
          {(q || dept || status) && (
            <Link href="/hr/registry" style={{ padding: "0.55rem 0.85rem", color: "#6b7280", fontSize: "0.875rem", textDecoration: "none", alignSelf: "center" }}>
              Clear
            </Link>
          )}
        </form>

        <div style={S.card}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "#f9fafb" }}>
                <th style={S.th}>Code</th>
                <th style={S.th}>Name</th>
                <th style={S.th}>Department</th>
                <th style={S.th}>Position</th>
                <th style={S.th}>Type</th>
                <th style={S.th}>Hire Date</th>
                <th style={S.th}>Status</th>
                <th style={S.th}></th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ ...S.td, textAlign: "center", color: "#9ca3af", padding: "3rem" }}>
                    No employees found.
                  </td>
                </tr>
              ) : (
                filtered.map((emp) => (
                  <tr key={emp.id} style={{ transition: "background 0.1s" }}
                    onMouseEnter={() => {}} onMouseLeave={() => {}}>
                    <td style={{ ...S.td, fontFamily: "monospace", fontSize: "0.8rem", color: "#6b7280" }}>{emp.employeeCode}</td>
                    <td style={{ ...S.td, fontWeight: 600 }}>{emp.fullName}</td>
                    <td style={S.td}>{emp.deptName ?? "—"}</td>
                    <td style={S.td}>{emp.position}</td>
                    <td style={S.td}>{badge(emp.employmentType)}</td>
                    <td style={{ ...S.td, whiteSpace: "nowrap" }}>{emp.hireDate}</td>
                    <td style={S.td}>{activeDot(emp.isActive)}</td>
                    <td style={{ ...S.td, textAlign: "right" }}>
                      <Link href={`/hr/registry/${emp.id}`} style={{
                        padding: "0.3rem 0.75rem", borderRadius: "5px",
                        background: "#f3f4f6", color: "#374151",
                        fontSize: "0.8rem", fontWeight: 600, textDecoration: "none",
                      }}>
                        View →
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
