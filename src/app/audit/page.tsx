import { getAuthUser } from "@/lib/supabase-server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, inArray, count, desc } from "drizzle-orm";

export default async function AuditPage() {
  const user = await getAuthUser();
  const deptCode: string = user?.user_metadata?.dept_code ?? "";
  const displayName: string = user?.user_metadata?.full_name ?? user?.email ?? "Guest";

  const [warsPendingRows, posPendingRows, flaggedBatchRows, flaggedFuelRows] = await Promise.all([
    db
      .select({ value: count() })
      .from(schema.workAccomplishedReports)
      .where(eq(schema.workAccomplishedReports.status, "PENDING_AUDIT")),
    db
      .select({ value: count() })
      .from(schema.purchaseOrders)
      .where(eq(schema.purchaseOrders.status, "AUDIT_REVIEW")),
    db
      .select({ value: count() })
      .from(schema.batchingProductionLogs)
      .where(eq(schema.batchingProductionLogs.isProductionFlagged, true)),
    db
      .select({ value: count() })
      .from(schema.fuelLogs)
      .where(eq(schema.fuelLogs.isFlagged, true)),
  ]);

  const warsPending = warsPendingRows[0]?.value ?? 0;
  const posPending = posPendingRows[0]?.value ?? 0;
  const flaggedBatches = flaggedBatchRows[0]?.value ?? 0;
  const flaggedFuel = flaggedFuelRows[0]?.value ?? 0;

  const warRows = await db
    .select({
      projectName: schema.projects.name,
      unitCode: schema.projectUnits.unitCode,
      grossAccomplishment: schema.workAccomplishedReports.grossAccomplishment,
      status: schema.workAccomplishedReports.status,
      submittedAt: schema.workAccomplishedReports.submittedAt,
    })
    .from(schema.workAccomplishedReports)
    .leftJoin(schema.projectUnits, eq(schema.workAccomplishedReports.unitId, schema.projectUnits.id))
    .leftJoin(schema.projects, eq(schema.workAccomplishedReports.projectId, schema.projects.id))
    .orderBy(desc(schema.workAccomplishedReports.submittedAt))
    .limit(20);

  const poRows = await db
    .select({
      projectName: schema.projects.name,
      supplierName: schema.suppliers.name,
      totalAmount: schema.purchaseOrders.totalAmount,
      status: schema.purchaseOrders.status,
      createdAt: schema.purchaseOrders.createdAt,
    })
    .from(schema.purchaseOrders)
    .leftJoin(schema.suppliers, eq(schema.purchaseOrders.supplierId, schema.suppliers.id))
    .leftJoin(schema.projects, eq(schema.purchaseOrders.projectId, schema.projects.id))
    .where(inArray(schema.purchaseOrders.status, ["AUDIT_REVIEW", "BOD_APPROVED"]))
    .orderBy(desc(schema.purchaseOrders.createdAt))
    .limit(10);

  const ACCENT = "#7e3af2";

  const kpis = [
    { label: "WARs Pending Audit", value: String(warsPending) },
    { label: "POs Pending Audit Review", value: String(posPending) },
    { label: "Flagged Production Batches", value: String(flaggedBatches) },
    { label: "Flagged Fuel Logs", value: String(flaggedFuel) },
  ];

  const warStatusColors: Record<string, { bg: string; color: string }> = {
    PENDING_AUDIT: { bg: "#ede9fe", color: "#5b21b6" },
    DRAFT: { bg: "#f3f4f6", color: "#6b7280" },
    APPROVED: { bg: "#d1fae5", color: "#065f46" },
    REJECTED: { bg: "#fef2f2", color: "#dc2626" },
    SUBMITTED: { bg: "#dbeafe", color: "#1e40af" },
    BOD_APPROVED: { bg: "#d1fae5", color: "#065f46" },
  };

  const poStatusColors: Record<string, { bg: string; color: string }> = {
    AUDIT_REVIEW: { bg: "#ede9fe", color: "#5b21b6" },
    BOD_APPROVED: { bg: "#d1fae5", color: "#065f46" },
    DRAFT: { bg: "#f3f4f6", color: "#6b7280" },
  };

  return (
    <main style={{ minHeight: "100vh", background: "#f9fafb" }}>
      <nav style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 2rem", height: "56px",
        background: "#fff", borderBottom: "1px solid #e5e7eb",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>Castcrete 360</span>
        {user && (
          <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
            <span style={{ fontSize: "0.875rem", color: "#6b7280" }}>
              {displayName}
              {deptCode && (
                <span style={{
                  marginLeft: "0.5rem", padding: "0.15rem 0.5rem",
                  background: "#e0e7ff", color: "#3730a3",
                  borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600,
                }}>
                  {deptCode}
                </span>
              )}
            </span>
            <form method="POST" action="/auth/logout" style={{ margin: 0 }}>
              <button type="submit" style={{
                padding: "0.4rem 0.85rem", fontSize: "0.8rem",
                background: "transparent", border: "1px solid #d1d5db",
                borderRadius: "6px", cursor: "pointer", color: "#374151",
              }}>
                Sign out
              </button>
            </form>
          </div>
        )}
      </nav>

      <div style={{ padding: "2rem" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/dashboard" style={{ fontSize: "0.875rem", color: "#1a56db", textDecoration: "none" }}>
            ← Back to Dashboard
          </a>
        </div>

        <header style={{ marginBottom: "2rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, borderLeft: `4px solid ${ACCENT}`, paddingLeft: "0.75rem" }}>
            Audit &amp; Quality
          </h1>
          <p style={{ margin: "0 0 0 1rem", color: "#6b7280", fontSize: "0.9rem" }}>
            PO Compliance · Triple Match · Inspections
          </p>
        </header>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem", marginBottom: "2rem" }}>
          {kpis.map((k) => (
            <div key={k.label} style={{
              background: "#fff", borderRadius: "8px", padding: "1.25rem 1.5rem",
              boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderTop: `3px solid ${ACCENT}`,
            }}>
              <div style={{ fontSize: "1.75rem", fontWeight: 700, color: "#111" }}>{k.value}</div>
              <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.25rem" }}>{k.label}</div>
            </div>
          ))}
        </div>

        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", marginBottom: "2rem", overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e5e7eb" }}>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Work Accomplished Reports</h2>
          </div>
          {warRows.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>No records yet</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                    {["Project", "Unit", "Gross Amount", "Status", "Submitted At"].map((h) => (
                      <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {warRows.map((row, i) => {
                    const sc = warStatusColors[row.status] ?? { bg: "#f3f4f6", color: "#6b7280" };
                    const submittedAt = row.submittedAt ? new Date(row.submittedAt).toLocaleString() : "—";
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                        <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>{row.projectName ?? "—"}</td>
                        <td style={{ padding: "0.75rem 1rem", fontFamily: "monospace" }}>{row.unitCode ?? "—"}</td>
                        <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>
                          PHP {Number(row.grossAccomplishment).toLocaleString()}
                        </td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <span style={{
                            padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600,
                            background: sc.bg, color: sc.color,
                          }}>
                            {row.status}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>{submittedAt}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e5e7eb" }}>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Purchase Orders — Audit Review &amp; BOD Approved</h2>
          </div>
          {poRows.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>No records yet</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                    {["Project", "Supplier", "Total Amount", "Status", "Created At"].map((h) => (
                      <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {poRows.map((row, i) => {
                    const sc = poStatusColors[row.status] ?? { bg: "#f3f4f6", color: "#6b7280" };
                    const createdAt = row.createdAt ? new Date(row.createdAt).toLocaleString() : "—";
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                        <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>{row.projectName ?? "—"}</td>
                        <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>{row.supplierName ?? "—"}</td>
                        <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>
                          PHP {Number(row.totalAmount).toLocaleString()}
                        </td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <span style={{
                            padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600,
                            background: sc.bg, color: sc.color,
                          }}>
                            {row.status}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>{createdAt}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
