export const dynamic = "force-dynamic";

import { db } from "@/db";
import {
  purchaseRequisitions,
  purchaseOrders,
  projects,
  suppliers,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";

function safe<T>(p: Promise<T>, fallback: T, ms = 6000): Promise<T> {
  return Promise.race([
    p.catch(() => fallback),
    new Promise<T>((r) => setTimeout(() => r(fallback), ms)),
  ]);
}

const ACCENT = "#e3a008";

const PR_STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  DRAFT:               { bg: "#f3f4f6", color: "#6b7280" },
  PENDING_REVIEW:      { bg: "#fef9c3", color: "#713f12" },
  PENDING_AUDIT:       { bg: "#fef9c3", color: "#713f12" },
  READY_FOR_APPROVAL:  { bg: "#eff6ff", color: "#1e40af" },
  APPROVED:            { bg: "#dcfce7", color: "#166534" },
  REJECTED:            { bg: "#fef2f2", color: "#b91c1c" },
  CANCELLED:           { bg: "#f3f4f6", color: "#9ca3af" },
};

const PO_STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  DRAFT:               { bg: "#f3f4f6", color: "#6b7280" },
  AUDIT_REVIEW:        { bg: "#fef9c3", color: "#713f12" },
  BOD_APPROVED:        { bg: "#eff6ff", color: "#1e40af" },
  AWAITING_DELIVERY:   { bg: "#e0f2fe", color: "#0369a1" },
  PARTIALLY_DELIVERED: { bg: "#dbeafe", color: "#1e40af" },
  DELIVERED:           { bg: "#dcfce7", color: "#166534" },
  CANCELLED:           { bg: "#fef2f2", color: "#9ca3af" },
};

const OPEN_PR_STATUSES = new Set(["APPROVED", "REJECTED", "CANCELLED"]);
const OPEN_PO_STATUSES = new Set(["DELIVERED", "CANCELLED"]);

export default async function PRPOPage() {
  type PRRow = { id: string; status: string; createdAt: Date; projectName: string | null };
  type PORow = { id: string; prId: string; status: string; totalAmount: string; createdAt: Date; isPrepaid: boolean; projectName: string | null; supplierName: string | null };

  const [prs, pos] = await Promise.all([
    safe(
      db
        .select({
          id:          purchaseRequisitions.id,
          status:      purchaseRequisitions.status,
          createdAt:   purchaseRequisitions.createdAt,
          projectName: projects.name,
        })
        .from(purchaseRequisitions)
        .leftJoin(projects, eq(purchaseRequisitions.projectId, projects.id))
        .orderBy(desc(purchaseRequisitions.createdAt))
        .limit(100),
      [] as PRRow[]
    ),
    safe(
      db
        .select({
          id:           purchaseOrders.id,
          prId:         purchaseOrders.prId,
          status:       purchaseOrders.status,
          totalAmount:  purchaseOrders.totalAmount,
          createdAt:    purchaseOrders.createdAt,
          isPrepaid:    purchaseOrders.isPrepaid,
          projectName:  projects.name,
          supplierName: suppliers.name,
        })
        .from(purchaseOrders)
        .leftJoin(projects,   eq(purchaseOrders.projectId,  projects.id))
        .leftJoin(suppliers,  eq(purchaseOrders.supplierId, suppliers.id))
        .orderBy(desc(purchaseOrders.createdAt))
        .limit(100),
      [] as PORow[]
    ),
  ]);

  const poByPrId = new Map<string, PORow[]>();
  for (const po of pos) {
    const arr = poByPrId.get(po.prId) ?? [];
    arr.push(po);
    poByPrId.set(po.prId, arr);
  }

  const openPRs      = prs.filter((r) => !OPEN_PR_STATUSES.has(r.status)).length;
  const approvedPRs  = prs.filter((r) => r.status === "APPROVED").length;
  const openPOs      = pos.filter((p) => !OPEN_PO_STATUSES.has(p.status)).length;
  const deliveredPOs = pos.filter((p) => p.status === "DELIVERED").length;

  const kpis = [
    { label: "Open PRs",      value: openPRs,      accent: ACCENT },
    { label: "Approved PRs",  value: approvedPRs,  accent: "#057a55" },
    { label: "Open POs",      value: openPOs,      accent: "#1a56db" },
    { label: "Delivered POs", value: deliveredPOs, accent: "#057a55" },
  ];

  const fmt = (n: string | number | null) => {
    const num = Number(n ?? 0);
    return `₱${num.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;
  };

  const shortId = (id: string) => `#${id.slice(0, 8)}`;

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1200px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/procurement" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>
            ← Procurement &amp; Stock
          </a>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>
            PR / PO Management
          </h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
            Purchase Requisitions and their linked Purchase Orders
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "2rem" }}>
          {kpis.map((k) => (
            <div key={k.label} style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.25rem 1.5rem", borderTop: `3px solid ${k.accent}` }}>
              <div style={{ fontSize: "0.8rem", color: "#6b7280", marginBottom: "0.4rem", fontWeight: 500 }}>{k.label}</div>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: k.accent }}>{k.value}</div>
            </div>
          ))}
        </div>

        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", marginBottom: "2rem", overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #e5e7eb" }}>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "#111827" }}>Purchase Requisitions</h2>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {["PR #", "Project", "Created", "Status", "Linked PO"].map((h) => (
                    <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {prs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>No purchase requisitions found.</td>
                  </tr>
                ) : prs.map((pr) => {
                  const st = PR_STATUS_STYLE[pr.status] ?? PR_STATUS_STYLE.DRAFT;
                  const linked = poByPrId.get(pr.id) ?? [];
                  const firstPO = linked[0];
                  return (
                    <tr key={pr.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", fontSize: "0.8rem", color: "#374151", fontWeight: 600 }}>
                        {shortId(pr.id)}
                      </td>
                      <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>{pr.projectName ?? "—"}</td>
                      <td style={{ padding: "0.65rem 1rem", color: "#6b7280", whiteSpace: "nowrap" }}>
                        {new Date(pr.createdAt).toLocaleDateString("en-PH")}
                      </td>
                      <td style={{ padding: "0.65rem 1rem" }}>
                        <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: st.bg, color: st.color, whiteSpace: "nowrap" }}>
                          {pr.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td style={{ padding: "0.65rem 1rem" }}>
                        {firstPO ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                            <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: (PO_STATUS_STYLE[firstPO.status] ?? PO_STATUS_STYLE.DRAFT).bg, color: (PO_STATUS_STYLE[firstPO.status] ?? PO_STATUS_STYLE.DRAFT).color, whiteSpace: "nowrap" }}>
                              {firstPO.status.replace(/_/g, " ")}
                            </span>
                            <span style={{ fontSize: "0.8rem", color: "#374151", fontWeight: 500 }}>{fmt(firstPO.totalAmount)}</span>
                            {linked.length > 1 && (
                              <span style={{ fontSize: "0.72rem", color: "#9ca3af" }}>+{linked.length - 1} more</span>
                            )}
                          </div>
                        ) : (
                          <span style={{ color: "#9ca3af", fontSize: "0.8rem" }}>No PO</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          <div style={{ padding: "1rem 1.25rem", borderBottom: "1px solid #e5e7eb" }}>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600, color: "#111827" }}>Purchase Orders</h2>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {["PO #", "Project", "Supplier", "Amount", "Status", "Prepaid", "Created"].map((h) => (
                    <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pos.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "2rem", textAlign: "center", color: "#9ca3af" }}>No purchase orders found.</td>
                  </tr>
                ) : pos.map((po) => {
                  const st = PO_STATUS_STYLE[po.status] ?? PO_STATUS_STYLE.DRAFT;
                  return (
                    <tr key={po.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", fontSize: "0.8rem", color: "#374151", fontWeight: 600 }}>
                        {shortId(po.id)}
                      </td>
                      <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>{po.projectName ?? "—"}</td>
                      <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>{po.supplierName ?? "—"}</td>
                      <td style={{ padding: "0.65rem 1rem", color: "#374151", fontWeight: 500, whiteSpace: "nowrap" }}>
                        {fmt(po.totalAmount)}
                      </td>
                      <td style={{ padding: "0.65rem 1rem" }}>
                        <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: st.bg, color: st.color, whiteSpace: "nowrap" }}>
                          {po.status.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td style={{ padding: "0.65rem 1rem" }}>
                        {po.isPrepaid ? (
                          <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: "#fef9c3", color: "#713f12" }}>
                            Prepaid
                          </span>
                        ) : (
                          <span style={{ color: "#9ca3af" }}>—</span>
                        )}
                      </td>
                      <td style={{ padding: "0.65rem 1rem", color: "#6b7280", whiteSpace: "nowrap" }}>
                        {new Date(po.createdAt).toLocaleDateString("en-PH")}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </main>
  );
}
