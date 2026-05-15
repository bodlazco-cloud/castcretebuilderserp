export const dynamic = "force-dynamic";
import Link from "next/link";
import { db } from "@/db";
import {
  planningVarianceRequests, projects, materials,
} from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { VarianceActions } from "./VarianceActions";

function safe<T>(p: Promise<T>, fallback: T, ms = 6000): Promise<T> {
  return Promise.race([
    p.catch(() => fallback),
    new Promise<T>((r) => setTimeout(() => r(fallback), ms)),
  ]);
}

const TYPE_CFG: Record<string, { label: string; cls: string }> = {
  BOM_CHANGE:            { label: "BOM Change",            cls: "bg-purple-900/50 text-purple-300" },
  PROCUREMENT_VARIANCE:  { label: "Procurement Variance",  cls: "bg-blue-900/50 text-blue-300" },
};

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  DRAFT:          { label: "Draft",           cls: "bg-zinc-700 text-zinc-200" },
  PENDING_REVIEW: { label: "Pending Review",  cls: "bg-yellow-900/50 text-yellow-300" },
  APPROVED:       { label: "Approved",        cls: "bg-green-900/50 text-green-300" },
  REJECTED:       { label: "Rejected",        cls: "bg-red-900/50 text-red-300" },
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

  const filtered = filterType === "ALL" ? rows : rows.filter((r) => r.requestType === filterType);
  const pendingCount = rows.filter((r) => r.status === "PENDING_REVIEW").length;
  const bodRequired = rows.filter((r) => r.isMinOrderQtyIssue).length;

  return (
    <div className="p-6 space-y-6 bg-zinc-950 min-h-screen text-white">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Variance Requests</h1>
          <p className="text-sm text-zinc-400 mt-0.5">BOM changes and procurement overages requiring approval</p>
        </div>
        <Link
          href="/planning/variance-requests/new"
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold transition-colors"
        >
          + New Request
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">Total Requests</div>
          <div className="text-3xl font-bold text-white mt-1">{rows.length}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">Pending Review</div>
          <div className="text-3xl font-bold text-yellow-400 mt-1">{pendingCount}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">BOD Required</div>
          <div className="text-3xl font-bold text-red-400 mt-1">{bodRequired}</div>
        </div>
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
          <div className="text-xs text-zinc-400 uppercase tracking-wide">Approved</div>
          <div className="text-3xl font-bold text-green-400 mt-1">{rows.filter((r) => r.status === "APPROVED").length}</div>
        </div>
      </div>

      {/* Filter chips */}
      <div className="flex gap-2 flex-wrap">
        {[
          { key: "ALL",                   label: "All" },
          { key: "BOM_CHANGE",            label: "BOM Changes" },
          { key: "PROCUREMENT_VARIANCE",  label: "Procurement Variances" },
        ].map(({ key, label }) => (
          <Link
            key={key}
            href={key === "ALL" ? "/planning/variance-requests" : `/planning/variance-requests?type=${key}`}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filterType === key
                ? "bg-blue-600 text-white"
                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            {label}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-zinc-500 text-sm">
            No variance requests found.{" "}
            <Link href="/planning/variance-requests/new" className="text-blue-400 hover:underline">
              Create one →
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800">
                  {["Type", "Project", "Summary", "Status", "BOD Required", "Submitted", "Actions"].map((h) => (
                    <th key={h} className="text-left py-3 px-4 text-xs text-zinc-400 font-medium whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => {
                  const typeBadge = TYPE_CFG[row.requestType] ?? { label: row.requestType, cls: "bg-zinc-700 text-zinc-200" };
                  const statusBadge = STATUS_CFG[row.status] ?? { label: row.status, cls: "bg-zinc-700 text-zinc-200" };
                  const summary = row.bomChangeType
                    ? `${row.bomChangeType}: ${row.oldQuantity ?? "—"} → ${row.newQuantity ?? "—"}`
                    : row.reason.slice(0, 60) + (row.reason.length > 60 ? "…" : "");

                  return (
                    <tr key={row.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/30">
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${typeBadge.cls}`}>
                          {typeBadge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-zinc-300 whitespace-nowrap">{row.projectName ?? "—"}</td>
                      <td className="py-3 px-4 text-zinc-400 max-w-xs truncate" title={row.reason}>{summary}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${statusBadge.cls}`}>
                          {statusBadge.label}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {row.isMinOrderQtyIssue ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-900/50 text-red-300">
                            BOD Only
                          </span>
                        ) : (
                          <span className="text-zinc-600 text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-zinc-500 text-xs whitespace-nowrap">
                        {row.submittedAt
                          ? new Date(row.submittedAt).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })
                          : "Draft"}
                      </td>
                      <td className="py-3 px-4">
                        {row.status === "PENDING_REVIEW" && (
                          <VarianceActions id={row.id} />
                        )}
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
  );
}
