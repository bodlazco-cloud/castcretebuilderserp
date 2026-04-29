import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq } from "drizzle-orm";
import { RecordLeaveForm } from "./RecordLeaveForm";

export default async function RecordLeavePage() {
  const employees = await db
    .select({ id: schema.employees.id, employeeCode: schema.employees.employeeCode, fullName: schema.employees.fullName })
    .from(schema.employees)
    .where(eq(schema.employees.isActive, true))
    .orderBy(schema.employees.fullName);

  return (
    <main style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "system-ui, sans-serif" }}>
      <nav style={{
        display: "flex", alignItems: "center", padding: "0 2rem", height: "56px",
        background: "#fff", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, zIndex: 10,
      }}>
        <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>Castcrete 360</span>
      </nav>
      <div style={{ padding: "2rem", maxWidth: "540px", margin: "0 auto" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/hr" style={{ fontSize: "0.85rem", color: "#374151", textDecoration: "none" }}>← Back to HR</a>
        </div>
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e5e7eb", borderTop: "4px solid #374151" }}>
            <h1 style={{ margin: 0, fontSize: "1.15rem", fontWeight: 700 }}>Record Leave Request</h1>
          </div>
          <div style={{ padding: "1.5rem" }}>
            <RecordLeaveForm employees={employees} />
          </div>
        </div>
      </div>
    </main>
  );
}
