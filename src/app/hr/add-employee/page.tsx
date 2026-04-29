export const dynamic = "force-dynamic";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { AddEmployeeForm } from "./AddEmployeeForm";

export default async function AddEmployeePage() {
  const [departments, costCenters] = await Promise.all([
    db.select({ id: schema.departments.id, code: schema.departments.code, name: schema.departments.name })
      .from(schema.departments).orderBy(schema.departments.name),
    db.select({ id: schema.costCenters.id, code: schema.costCenters.code, name: schema.costCenters.name })
      .from(schema.costCenters).where(eq(schema.costCenters.isActive, true)).orderBy(schema.costCenters.code),
  ]);

  return (
    <main style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "system-ui, sans-serif" }}>
      <nav style={{
        display: "flex", alignItems: "center", padding: "0 2rem", height: "56px",
        background: "#fff", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, zIndex: 10,
      }}>
        <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>Castcrete 360</span>
      </nav>
      <div style={{ padding: "2rem", maxWidth: "860px", margin: "0 auto" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/hr" style={{ fontSize: "0.85rem", color: "#374151", textDecoration: "none" }}>← Back to HR</a>
        </div>
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e5e7eb", borderTop: "4px solid #374151" }}>
            <h1 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>Add New Employee</h1>
          </div>
          <div style={{ padding: "1.5rem" }}>
            <AddEmployeeForm departments={departments.map((d) => ({ ...d, code: d.code ?? "" }))} costCenters={costCenters} />
          </div>
        </div>
      </div>
    </main>
  );
}
