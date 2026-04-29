export const dynamic = "force-dynamic";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { LogDtrForm } from "./LogDtrForm";

export default async function LogDtrPage() {
  const [employees, costCenters, units] = await Promise.all([
    db.select({ id: schema.employees.id, employeeCode: schema.employees.employeeCode, fullName: schema.employees.fullName })
      .from(schema.employees).where(eq(schema.employees.isActive, true)).orderBy(schema.employees.fullName),
    db.select({ id: schema.costCenters.id, code: schema.costCenters.code, name: schema.costCenters.name })
      .from(schema.costCenters).where(eq(schema.costCenters.isActive, true)).orderBy(schema.costCenters.code),
    db.select({ id: schema.projectUnits.id, unitCode: schema.projectUnits.unitCode })
      .from(schema.projectUnits).orderBy(schema.projectUnits.unitCode).limit(200),
  ]);

  return (
    <main style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "system-ui, sans-serif" }}>
      <nav style={{
        display: "flex", alignItems: "center", padding: "0 2rem", height: "56px",
        background: "#fff", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, zIndex: 10,
      }}>
        <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>Castcrete 360</span>
      </nav>
      <div style={{ padding: "2rem", maxWidth: "720px", margin: "0 auto" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/hr" style={{ fontSize: "0.85rem", color: "#374151", textDecoration: "none" }}>← Back to HR</a>
        </div>
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e5e7eb", borderTop: "4px solid #374151" }}>
            <h1 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>Log Daily Time Record (DTR)</h1>
          </div>
          <div style={{ padding: "1.5rem" }}>
            <LogDtrForm employees={employees} costCenters={costCenters} units={units} />
          </div>
        </div>
      </div>
    </main>
  );
}
