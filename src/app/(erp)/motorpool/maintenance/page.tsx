export const dynamic = "force-dynamic";

import { getAuthUser } from "@/lib/supabase-server";
import { db } from "@/db";
import { maintenanceRecords, equipment } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import Link from "next/link";
import { AddMaintenanceForm } from "./AddMaintenanceForm";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await Promise.race([
      fn(),
      new Promise<T>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 6000)
      ),
    ]);
  } catch {
    return fallback;
  }
}

function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function statusBadge(status: string | null) {
  const s = status ?? "";
  let bg = "#f3f4f6";
  let color = "#6b7280";
  if (s === "PENDING") { bg = "#fef9c3"; color = "#713f12"; }
  else if (s === "IN_PROGRESS") { bg = "#dbeafe"; color = "#1e40af"; }
  else if (s === "COMPLETED") { bg = "#dcfce7"; color = "#166534"; }
  else if (s === "CANCELLED") { bg = "#f3f4f6"; color = "#9ca3af"; }
  return (
    <span style={{ background: bg, color, padding: "2px 8px", borderRadius: 9999, fontSize: 12, fontWeight: 500, whiteSpace: "nowrap" }}>
      {s || "—"}
    </span>
  );
}

function typeBadge(type: string | null) {
  const t = type ?? "";
  let bg = "#f3f4f6";
  let color = "#6b7280";
  if (t === "PREVENTIVE") { bg = "#eff6ff"; color = "#1e40af"; }
  else if (t === "CORRECTIVE") { bg = "#fef2f2"; color = "#b91c1c"; }
  else if (t === "EMERGENCY") { bg = "#fff1f2"; color = "#881337"; }
  return (
    <span style={{ background: bg, color, padding: "2px 8px", borderRadius: 9999, fontSize: 12, fontWeight: 500, whiteSpace: "nowrap" }}>
      {t || "—"}
    </span>
  );
}

function formatCost(val: string | number | null | undefined, bold = false) {
  const n = Number(val ?? 0);
  const str = "₱" + n.toLocaleString("en-PH", { minimumFractionDigits: 2 });
  return (
    <span style={{ fontWeight: bold ? 700 : 400 }}>{str}</span>
  );
}

function downtimeDisplay(days: number | string | null | undefined) {
  const n = Number(days ?? 0);
  if (!n || n === 0) return <span style={{ color: "#9ca3af" }}>—</span>;
  const color = n > 3 ? "#dc2626" : "#d97706";
  return <span style={{ color, fontWeight: 500 }}>{n}d</span>;
}

export default async function Page() {
  const user = await getAuthUser();

  const [equipmentList, rows] = await Promise.all([
    db.select({ id: equipment.id, code: equipment.code, name: equipment.name })
      .from(equipment).orderBy(equipment.code),
    safe(() => db
        .select({
          id: maintenanceRecords.id,
          maintenanceType: maintenanceRecords.maintenanceType,
          description: maintenanceRecords.description,
          partsCost: maintenanceRecords.partsCost,
          laborCost: maintenanceRecords.laborCost,
          totalCost: maintenanceRecords.totalCost,
          downtimeDays: maintenanceRecords.downtimeDays,
          maintenanceDate: maintenanceRecords.maintenanceDate,
          completedDate: maintenanceRecords.completedDate,
          status: maintenanceRecords.status,
          equipCode: equipment.code,
          equipName: equipment.name,
          equipType: equipment.type,
        })
        .from(maintenanceRecords)
        .leftJoin(equipment, eq(maintenanceRecords.equipmentId, equipment.id))
        .orderBy(desc(maintenanceRecords.maintenanceDate))
        .limit(200), []),
  ]);

  const totalCostAll = rows.reduce((s, r) => s + Number(r.totalCost ?? 0), 0);
  const pendingCount = rows.filter((r) => r.status === "PENDING").length;
  const completedCount = rows.filter((r) => r.status === "COMPLETED").length;
  const totalDowntimeDays = rows.reduce((s, r) => s + Number(r.downtimeDays ?? 0), 0);

  const kpis = [
    { label: "Total Records", value: rows.length, accent: "#0694a2" },
    { label: "Pending", value: pendingCount, accent: "#e3a008" },
    { label: "Completed", value: completedCount, accent: "#057a55" },
    { label: "Total Downtime", value: `${totalDowntimeDays} days`, accent: "#dc2626" },
  ];

  return (
    <div style={{ fontFamily: "system-ui, sans-serif", padding: "24px 32px", maxWidth: 1400, margin: "0 auto" }}>
      <div style={{ marginBottom: 8 }}>
        <Link href="/motorpool" style={{ color: "#0694a2", textDecoration: "none", fontSize: 14 }}>
          ← Motorpool
        </Link>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
        <h1 style={{ fontSize: 26, fontWeight: 700, color: "#111827", margin: 0 }}>Maintenance Records</h1>
        <AddMaintenanceForm equipmentList={equipmentList} userId={user?.id ?? ""} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 16 }}>
        {kpis.map((k) => (
          <div
            key={k.label}
            style={{
              background: "#fff",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              padding: "18px 22px",
              borderLeft: `4px solid ${k.accent}`,
            }}
          >
            <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 6 }}>{k.label}</div>
            <div style={{ fontSize: 28, fontWeight: 700, color: k.accent }}>{k.value}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          padding: "18px 22px",
          marginBottom: 28,
          display: "inline-block",
          minWidth: 260,
        }}
      >
        <div style={{ fontSize: 13, color: "#6b7280", marginBottom: 4 }}>Total Maintenance Cost (all time)</div>
        <div style={{ fontSize: 24, fontWeight: 700, color: "#0694a2" }}>
          {"₱" + totalCostAll.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
        </div>
      </div>

      {rows.length === 0 ? (
        <div
          style={{
            background: "#fff",
            border: "1px solid #e5e7eb",
            borderRadius: 10,
            padding: "64px 32px",
            textAlign: "center",
            color: "#9ca3af",
            fontSize: 16,
          }}
        >
          No maintenance records found.
        </div>
      ) : (
        <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: 10, overflow: "hidden" }}>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
              <thead>
                <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                  {["Date", "Equipment", "Type", "Description", "Parts Cost", "Labor Cost", "Total Cost", "Downtime", "Status"].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 14px",
                        textAlign: "left",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#6b7280",
                        whiteSpace: "nowrap",
                        textTransform: "uppercase",
                        letterSpacing: "0.03em",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr
                    key={row.id}
                    style={{
                      borderBottom: i < rows.length - 1 ? "1px solid #f3f4f6" : undefined,
                      background: i % 2 === 0 ? "#fff" : "#fafafa",
                    }}
                  >
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap", color: "#374151" }}>
                      {formatDate(row.maintenanceDate)}
                    </td>
                    <td style={{ padding: "10px 14px", minWidth: 160 }}>
                      <div>
                        <span style={{ fontFamily: "monospace", fontWeight: 600, color: "#0694a2" }}>
                          {row.equipCode ?? "—"}
                        </span>
                        {row.equipName ? (
                          <span style={{ color: "#374151" }}> · {row.equipName}</span>
                        ) : null}
                      </div>
                      {row.equipType ? (
                        <div style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{row.equipType}</div>
                      ) : null}
                    </td>
                    <td style={{ padding: "10px 14px" }}>{typeBadge(row.maintenanceType)}</td>
                    <td
                      style={{ padding: "10px 14px", maxWidth: 220, color: "#374151" }}
                      title={row.description ?? ""}
                    >
                      {row.description
                        ? row.description.length > 60
                          ? row.description.slice(0, 60) + "…"
                          : row.description
                        : <span style={{ color: "#9ca3af" }}>—</span>}
                    </td>
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap", color: "#374151" }}>
                      {formatCost(row.partsCost)}
                    </td>
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap", color: "#374151" }}>
                      {formatCost(row.laborCost)}
                    </td>
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap", color: "#374151" }}>
                      {formatCost(row.totalCost, true)}
                    </td>
                    <td style={{ padding: "10px 14px", whiteSpace: "nowrap" }}>
                      {downtimeDisplay(row.downtimeDays)}
                    </td>
                    <td style={{ padding: "10px 14px" }}>{statusBadge(row.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
