import { getAuthUser } from "@/lib/supabase-server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, count, notInArray, lt, or, sql } from "drizzle-orm";

const ACCENT = "#e3a008";

const PR_STATUS_COLORS: Record<string, string> = {
  DRAFT: "#6b7280",
  PENDING_REVIEW: "#e3a008",
  PENDING_AUDIT: "#e3a008",
  READY_FOR_APPROVAL: "#1a56db",
  APPROVED: "#057a55",
  REJECTED: "#e02424",
  CANCELLED: "#9ca3af",
};

const PO_STATUS_COLORS: Record<string, string> = {
  DRAFT: "#6b7280",
  AUDIT_REVIEW: "#e3a008",
  BOD_APPROVED: "#1a56db",
  PREPAID_REQUIRED: "#ff5a1f",
  AWAITING_DELIVERY: "#0694a2",
  PARTIALLY_DELIVERED: "#1a56db",
  DELIVERED: "#057a55",
  CANCELLED: "#9ca3af",
};

function StatusBadge({ status, colorMap }: { status: string; colorMap: Record<string, string> }) {
  const bg = colorMap[status] ?? "#6b7280";
  return (
    <span style={{
      display: "inline-block",
      padding: "0.2rem 0.55rem",
      borderRadius: "999px",
      fontSize: "0.72rem",
      fontWeight: 600,
      background: bg,
      color: "#fff",
      letterSpacing: "0.02em",
    }}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

export default async function ProcurementPage() {
  let user = null;
  try {
    user = await getAuthUser();
  } catch {}

  const deptCode: string = user?.user_metadata?.dept_code ?? "";
  const displayName: string = user?.user_metadata?.full_name ?? user?.email ?? "Guest";

  let openPrs = 0;
  let openPos = 0;
  let lowStockItems = 0;
  let pendingTransfers = 0;
  let prRows: {
    projectName: string;
    requestedBy: string;
    status: string;
    createdAt: Date | null;
  }[] = [];
  let poRows: {
    supplierName: string;
    totalAmount: string;
    status: string;
    createdAt: Date | null;
  }[] = [];

  try {
    const [prResult] = await db
      .select({ value: count() })
      .from(schema.purchaseRequisitions)
      .where(
        or(
          eq(schema.purchaseRequisitions.status, "PENDING_REVIEW"),
          eq(schema.purchaseRequisitions.status, "DRAFT"),
        ),
      );
    openPrs = Number(prResult?.value ?? 0);

    const [poResult] = await db
      .select({ value: count() })
      .from(schema.purchaseOrders)
      .where(notInArray(schema.purchaseOrders.status, ["DELIVERED", "CANCELLED"]));
    openPos = Number(poResult?.value ?? 0);

    const [stockResult] = await db
      .select({ value: count() })
      .from(schema.inventoryStock)
      .where(lt(sql`${schema.inventoryStock.quantityOnHand}::numeric`, sql`10`));
    lowStockItems = Number(stockResult?.value ?? 0);

    const [transferResult] = await db
      .select({ value: count() })
      .from(schema.materialTransfers)
      .where(eq(schema.materialTransfers.status, "PENDING"));
    pendingTransfers = Number(transferResult?.value ?? 0);

    const rawPrs = await db
      .select({
        projectName: schema.projects.name,
        requestedBy: schema.users.fullName,
        status: schema.purchaseRequisitions.status,
        createdAt: schema.purchaseRequisitions.createdAt,
      })
      .from(schema.purchaseRequisitions)
      .leftJoin(schema.projects, eq(schema.purchaseRequisitions.projectId, schema.projects.id))
      .leftJoin(schema.users, eq(schema.purchaseRequisitions.requestedBy, schema.users.id))
      .orderBy(schema.purchaseRequisitions.createdAt)
      .limit(10);

    prRows = rawPrs.map((r) => ({
      projectName: r.projectName ?? "—",
      requestedBy: r.requestedBy ?? "—",
      status: r.status ?? "—",
      createdAt: r.createdAt,
    }));

    const rawPos = await db
      .select({
        supplierName: schema.suppliers.name,
        totalAmount: schema.purchaseOrders.totalAmount,
        status: schema.purchaseOrders.status,
        createdAt: schema.purchaseOrders.createdAt,
      })
      .from(schema.purchaseOrders)
      .leftJoin(schema.suppliers, eq(schema.purchaseOrders.supplierId, schema.suppliers.id))
      .orderBy(schema.purchaseOrders.createdAt)
      .limit(10);

    poRows = rawPos.map((r) => ({
      supplierName: r.supplierName ?? "—",
      totalAmount: r.totalAmount ?? "0",
      status: r.status ?? "—",
      createdAt: r.createdAt,
    }));
  } catch {}

  const kpis = [
    { label: "Open PRs", value: openPrs },
    { label: "Open POs", value: openPos },
    { label: "Low Stock Items", value: lowStockItems },
    { label: "Pending Transfers", value: pendingTransfers },
  ];

  const thStyle: React.CSSProperties = {
    padding: "0.6rem 1rem",
    textAlign: "left",
    fontSize: "0.75rem",
    fontWeight: 600,
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    borderBottom: "1px solid #e5e7eb",
    whiteSpace: "nowrap",
  };

  const tdStyle: React.CSSProperties = {
    padding: "0.75rem 1rem",
    fontSize: "0.875rem",
    color: "#374151",
    borderBottom: "1px solid #f3f4f6",
    whiteSpace: "nowrap",
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
              <button
                type="submit"
                style={{
                  padding: "0.4rem 0.85rem", fontSize: "0.8rem",
                  background: "transparent", border: "1px solid #d1d5db",
                  borderRadius: "6px", cursor: "pointer", color: "#374151",
                }}
              >
                Sign out
              </button>
            </form>
          </div>
        )}
      </nav>

      <div style={{ padding: "2rem" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a
            href="/dashboard"
            style={{
              display: "inline-flex", alignItems: "center", gap: "0.4rem",
              fontSize: "0.875rem", color: "#6b7280", textDecoration: "none",
            }}
          >
            ← Back to Dashboard
          </a>
        </div>

        <header style={{ marginBottom: "1.5rem", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{
              margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700,
              borderLeft: `4px solid ${ACCENT}`, paddingLeft: "0.75rem",
            }}>
              Procurement &amp; Stock
            </h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem", paddingLeft: "1.25rem" }}>
              PRs · POs · Inventory · Transfers
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <a href="/procurement/price-change" style={{
              padding: "0.55rem 1rem", borderRadius: "6px",
              background: ACCENT, color: "#fff", fontSize: "0.82rem", fontWeight: 600, textDecoration: "none",
            }}>Request Price Change</a>
          </div>
        </header>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "1rem",
          marginBottom: "2rem",
        }}>
          {kpis.map((kpi) => (
            <div key={kpi.label} style={{
              background: "#fff",
              borderRadius: "8px",
              padding: "1.25rem 1.5rem",
              boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
              borderTop: `3px solid ${ACCENT}`,
            }}>
              <div style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: "0.5rem", fontWeight: 500 }}>
                {kpi.label}
              </div>
              <div style={{ fontSize: "1.875rem", fontWeight: 700, color: "#111" }}>
                {kpi.value.toLocaleString()}
              </div>
            </div>
          ))}
        </div>

        <div style={{
          background: "#fff",
          borderRadius: "8px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
          marginBottom: "2rem",
          overflow: "hidden",
        }}>
          <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e5e7eb" }}>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "#111" }}>
              Purchase Requisitions
              <span style={{ marginLeft: "0.5rem", fontSize: "0.8rem", color: "#6b7280", fontWeight: 400 }}>
                (10 most recent)
              </span>
            </h2>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  <th style={thStyle}>Project</th>
                  <th style={thStyle}>Requested By</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>Created At</th>
                </tr>
              </thead>
              <tbody>
                {prRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{
                      padding: "2.5rem 1rem",
                      textAlign: "center",
                      color: "#9ca3af",
                      fontSize: "0.875rem",
                    }}>
                      No records yet
                    </td>
                  </tr>
                ) : (
                  prRows.map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ ...tdStyle, fontWeight: 500 }}>{row.projectName}</td>
                      <td style={tdStyle}>{row.requestedBy}</td>
                      <td style={tdStyle}>
                        <StatusBadge status={row.status} colorMap={PR_STATUS_COLORS} />
                      </td>
                      <td style={{ ...tdStyle, color: "#6b7280" }}>
                        {row.createdAt
                          ? new Date(row.createdAt).toLocaleString("en-PH", {
                              year: "numeric", month: "short", day: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })
                          : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{
          background: "#fff",
          borderRadius: "8px",
          boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
          overflow: "hidden",
        }}>
          <div style={{ padding: "1.25rem 1.5rem", borderBottom: "1px solid #e5e7eb" }}>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "#111" }}>
              Purchase Orders
              <span style={{ marginLeft: "0.5rem", fontSize: "0.8rem", color: "#6b7280", fontWeight: 400 }}>
                (10 most recent)
              </span>
            </h2>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  <th style={thStyle}>Supplier</th>
                  <th style={{ ...thStyle, textAlign: "right" }}>Total Amount</th>
                  <th style={thStyle}>Status</th>
                  <th style={thStyle}>PO Date</th>
                </tr>
              </thead>
              <tbody>
                {poRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} style={{
                      padding: "2.5rem 1rem",
                      textAlign: "center",
                      color: "#9ca3af",
                      fontSize: "0.875rem",
                    }}>
                      No records yet
                    </td>
                  </tr>
                ) : (
                  poRows.map((row, i) => (
                    <tr key={i} style={{ background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ ...tdStyle, fontWeight: 500 }}>{row.supplierName}</td>
                      <td style={{ ...tdStyle, textAlign: "right", fontWeight: 500 }}>
                        PHP {Number(row.totalAmount).toLocaleString()}
                      </td>
                      <td style={tdStyle}>
                        <StatusBadge status={row.status} colorMap={PO_STATUS_COLORS} />
                      </td>
                      <td style={{ ...tdStyle, color: "#6b7280" }}>
                        {row.createdAt
                          ? new Date(row.createdAt).toLocaleString("en-PH", {
                              year: "numeric", month: "short", day: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })
                          : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
