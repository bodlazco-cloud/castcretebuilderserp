export const dynamic = "force-dynamic";
import Link from "next/link";
import { db } from "@/db";
import {
  planningVarianceRequests, projects, materials,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { VarianceActions } from "./VarianceActions";
import { VarianceSubmitAction } from "./VarianceSubmitAction";

function safe<T>(p: Promise<T>, fallback: T, ms = 6000): Promise<T> {
  return Promise.race([
    p.catch(() => fallback),
    new Promise<T>((r) => setTimeout(() => r(fallback), ms)),
  ]);
}

const TYPE_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  BOM_CHANGE:           { bg: "#f5f3ff", color: "#5b21b6", label: "BOM Change" },
  PROCUREMENT_VARIANCE: { bg: "#eff6ff", color: "#1e40af", label: "Procurement Variance" },
};

const STATUS_BADGE: Record<string, { bg: string; color: string; label: string }> = {
  DRAFT:          { bg: "#f3f4f6", color: "#6b7280",  label: "Draft" },
  PENDING_REVIEW: { bg: "#fef9c3", color: "#713f12",  label: "Pending Review" },
  APPROVED:       { bg: "#dcfce7", color: "#166534",  label: "Approved" },
  REJECTED:       { bg: "#fef2f2", color: "#b91c1c",  label: "Rejected" },
};

export default async function VarianceRequestsPage(props: {
  searchParams?: Promise<{ type?: string }>;
}) {
  const params = props.searchParams ? await props.searchParams : {};
  const filterType = params.type ?? "ALL";

  const rows = await safe(
    db.select({
      id:                  planningVarianceRequests.id,
      requestType:         planningVarianceRequests.requestType,
      status:              planningVarianceRequests.status,
      isMinOrderQtyIssue:  planningVarianceRequests.isMinOrderQtyIssue,
      reason:              planningVarianceRequests.reason,
      bomChangeType:       planningVarianceRequests.bomChangeType,
      oldQuantity:         planningVarianceRequests.oldQuantity,
      newQuantity:         planningVarianceRequests.newQuantity,
      submittedAt:         planningVarianceRequests.submittedAt,
      createdAt:           planningVarianceRequests.createdAt,
      projectName:         projects.name,
      newMaterialName:     materials.name,
    })
      .from(planningVarianceRequests)
      .leftJoin(projects,   eq(planningVarianceRequests.projectId,     projects.id))
      .leftJoin(materials,  eq(planningVarianceRequests.newMaterialId, materials.id))
      .orderBy(desc(planningVarianceRequests.createdAt)),
    [] as {
      id: string; requestType: string; status: string; isMinOrderQtyIssue: boolean;
      reason: string; bomChangeType: string | null; oldQuantity: string | null; newQuantity: string | null;
      submittedAt: Date | null; createdAt: Date; projectName: string | null; newMaterialName: string | null;
    }[],
  );

  const filtered     = filterType === "ALL" ? rows : rows.filter((r) => r.requestType === filterType);
  const pendingCount = rows.filter((r) => r.status === "PENDING_REVIEW").length;
  const bodRequired  = rows.filter((r) => r.isMinOrderQtyIssue).length;
  const approvedCount = rows.filter((r) => r.status === "APPROVED").length;

  const card: React.CSSProperties = {
    background: "#fff", borderRadius: "10px", padding: "1.25rem 1.5rem",
    boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
  };

  return (
    <main style={{ background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif", padding: "2rem" }}>
      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>

        {/* Header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
          <div>
            <p style={{ marginBottom: "0.25rem" }}>
              <a href="/planning" style={{ fontSize: "0.8rem", color: "#1a56db", textDecoration: "none" }}>
                ← Planning &amp; Engineering
              </a>
            </p>
            <h1 style={{ fontSize: "1.5rem", fontWeight: 700, color: "#111827", margin: 0 }}>Variance Requests</h1>
            <p style={{ fontSize: "0.875rem", color: "#6b7280", marginTop: "0.25rem", marginBottom: 0 }}>BOM changes and procurement overages requiring approval</p>
          </div>
          <Link
            href="/planning/variance-requests/new"
            style={{ padding: "0.55rem 1.1rem", borderRadius: "6px", background: "#1a56db", color: "#fff", fontSize: "0.875rem", fontWeight: 600, textDecoration: "none" }}>
            + New Request
          </Link>
        </div>

        {/* KPI Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: "1rem", marginBottom: "1.5rem" }}>
          {[
            { label: "Total Requests",  value: rows.length,    accent: "#1a56db" },
            { label: "Pending Review",  value: pendingCount,   accent: "#e3a008" },
            { label: "BOD Required",    value: bodRequired,    accent: "#dc2626" },
            { label: "Approved",        value: approvedCount,  accent: "#057a55" },
          ].map((kpi) => (
            <div key={kpi.label} style={{ ...card, borderTop: `3px solid ${kpi.accent}` }}>
              <div style={{ fontSize: "2rem", fontWeight: 700, color: "#111827", lineHeight: 1 }}>
                {kpi.value.toLocaleString()}
              </div>
              <div style={{ fontSize: "0.82rem", fontWeight: 600, color: "#111827", marginTop: "0.3rem" }}>{kpi.label}</div>
            </div>
          ))}
        </div>

        {/* Filter chips */}
        <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1rem" }}>
          {[
            { key: "ALL",                  label: "All" },
            { key: "BOM_CHANGE",           label: "BOM Changes" },
            { key: "PROCUREMENT_VARIANCE", label: "Procurement Variances" },
          ].map(({ key, label }) => {
            const active = filterType === key;
            return (
              <Link
                key={key}
                href={key === "ALL" ? "/planning/variance-requests" : `/planning/variance-requests?type=${key}`}
                style={{
                  padding: "0.3rem 0.75rem", borderRadius: "999px", fontSize: "0.78rem", fontWeight: 600,
                  textDecoration: "none",
                  background: active ? "#1a56db" : "#fff",
                  color: active ? "#fff" : "#374151",
                  border: active ? "1px solid #1a56db" : "1px solid #d1d5db",
                }}>
                {label}
              </Link>
            );
          })}
        </div>

        {/* Table */}
        <div style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "3rem", textAlign: "center" }}>
              <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "0.5rem" }}>No variance requests found.</p>
              <Link href="/planning/variance-requests/new" style={{ color: "#1a56db", textDecoration: "none", fontWeight: 600 }}>
                Create one →
              </Link>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr>
                    {["Type", "Project", "Summary", "Status", "BOD Required", "Submitted", "Actions"].map((h) => (
                      <th key={h} style={{
                        background: "#f9fafb", borderBottom: "1px solid #e5e7eb",
                        fontSize: "0.75rem", fontWeight: 600, color: "#6b7280",
                        textTransform: "uppercase", letterSpacing: "0.05em",
                        padding: "0.75rem 1rem", textAlign: "left", whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const typeBadge   = TYPE_BADGE[row.requestType]   ?? { bg: "#f3f4f6", color: "#6b7280", label: row.requestType };
                    const statusBadge = STATUS_BADGE[row.status]      ?? { bg: "#f3f4f6", color: "#6b7280", label: row.status };
                    const summary = row.bomChangeType
                      ? `${row.bomChangeType}: ${row.oldQuantity ?? "—"} → ${row.newQuantity ?? "—"}`
                      : row.reason.slice(0, 60) + (row.reason.length > 60 ? "…" : "");

                    return (
                      <tr key={row.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: typeBadge.bg, color: typeBadge.color }}>
                            {typeBadge.label}
                          </span>
                        </td>
                        <td style={{ padding: "0.65rem 1rem", color: "#374151", whiteSpace: "nowrap" }}>{row.projectName ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280", maxWidth: "280px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={row.reason}>{summary}</td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: statusBadge.bg, color: statusBadge.color }}>
                            {statusBadge.label}
                          </span>
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          {row.isMinOrderQtyIssue ? (
                            <span style={{ display: "inline-block", padding: "0.2rem 0.55rem", borderRadius: "999px", fontSize: "0.72rem", fontWeight: 600, background: "#fef2f2", color: "#b91c1c" }}>
                              BOD Only
                            </span>
                          ) : (
                            <span style={{ color: "#d1d5db", fontSize: "0.82rem" }}>—</span>
                          )}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", color: "#9ca3af", fontSize: "0.75rem", whiteSpace: "nowrap" }}>
                          {row.submittedAt
                            ? new Date(row.submittedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
                            : "Draft"}
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          {row.status === "PENDING_REVIEW" && <VarianceActions id={row.id} />}
                          {row.status === "DRAFT" && <VarianceSubmitAction id={row.id} />}
                        </td>
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
