export const dynamic = "force-dynamic";
import { getAuthUser } from "@/lib/supabase-server";
import { db } from "@/db";
import * as schema from "@/db/schema";
import { eq, count, desc } from "drizzle-orm";

export default async function MotorpoolPage() {
  const user = await getAuthUser();
  const deptCode: string = user?.user_metadata?.dept_code ?? "";
  const displayName: string = user?.user_metadata?.full_name ?? user?.email ?? "Guest";

  const [availableRows, onSiteRows, flaggedFlipRows, lockedRows] = await Promise.all([
    db.select({ value: count() }).from(schema.equipment).where(eq(schema.equipment.status, "AVAILABLE")),
    db.select({ value: count() }).from(schema.equipment).where(eq(schema.equipment.status, "ON_SITE")),
    db.select({ value: count() }).from(schema.equipment).where(eq(schema.equipment.isFlaggedForFlip, true)),
    db.select({ value: count() }).from(schema.equipment).where(eq(schema.equipment.isLocked, true)),
  ]);

  const availableCount = availableRows[0]?.value ?? 0;
  const onSiteCount = onSiteRows[0]?.value ?? 0;
  const flaggedFlipCount = flaggedFlipRows[0]?.value ?? 0;
  const lockedCount = lockedRows[0]?.value ?? 0;

  const equipmentRows = await db
    .select({
      code: schema.equipment.code,
      name: schema.equipment.name,
      type: schema.equipment.type,
      status: schema.equipment.status,
      totalEngineHours: schema.equipment.totalEngineHours,
      dailyRentalRate: schema.equipment.dailyRentalRate,
      isFlaggedForFlip: schema.equipment.isFlaggedForFlip,
      isLocked: schema.equipment.isLocked,
    })
    .from(schema.equipment)
    .orderBy(schema.equipment.code);

  const maintenanceRows = await db
    .select({
      equipCode: schema.equipment.code,
      equipName: schema.equipment.name,
      maintenanceType: schema.maintenanceRecords.maintenanceType,
      description: schema.maintenanceRecords.description,
      partsCost: schema.maintenanceRecords.partsCost,
      laborCost: schema.maintenanceRecords.laborCost,
      totalCost: schema.maintenanceRecords.totalCost,
      status: schema.maintenanceRecords.status,
      maintenanceDate: schema.maintenanceRecords.maintenanceDate,
    })
    .from(schema.maintenanceRecords)
    .leftJoin(schema.equipment, eq(schema.maintenanceRecords.equipmentId, schema.equipment.id))
    .orderBy(desc(schema.maintenanceRecords.maintenanceDate))
    .limit(10);

  const ACCENT = "#0694a2";

  const statusColors: Record<string, { bg: string; color: string }> = {
    AVAILABLE: { bg: "#d1fae5", color: "#057a55" },
    ON_SITE: { bg: "#dbeafe", color: "#1a56db" },
    MAINTENANCE: { bg: "#fef3c7", color: "#e3a008" },
    SOLD: { bg: "#f3f4f6", color: "#6b7280" },
    RETIRED: { bg: "#f3f4f6", color: "#6b7280" },
  };

  const kpis = [
    { label: "Available Equipment", value: String(availableCount) },
    { label: "On Site", value: String(onSiteCount) },
    { label: "Flagged for Flip", value: String(flaggedFlipCount) },
    { label: "Locked Equipment", value: String(lockedCount) },
  ];

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

        <header style={{ marginBottom: "1.5rem", display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, borderLeft: `4px solid ${ACCENT}`, paddingLeft: "0.75rem" }}>
              Motorpool
            </h1>
            <p style={{ margin: "0 0 0 1rem", color: "#6b7280", fontSize: "0.9rem" }}>
              Equipment · Rentals · Fix-or-Flip
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
            <a href="/motorpool/add-equipment" style={{
              padding: "0.55rem 1rem", borderRadius: "6px",
              background: ACCENT, color: "#fff", fontSize: "0.82rem", fontWeight: 600, textDecoration: "none",
            }}>+ Add Equipment</a>
            <a href="/motorpool/assign" style={{
              padding: "0.55rem 1rem", borderRadius: "6px",
              background: "#fff", color: ACCENT, fontSize: "0.82rem", fontWeight: 600,
              textDecoration: "none", border: `1px solid ${ACCENT}`,
            }}>Assign Equipment</a>
            <a href="/motorpool/log-fuel" style={{
              padding: "0.55rem 1rem", borderRadius: "6px",
              background: "#fff", color: ACCENT, fontSize: "0.82rem", fontWeight: 600,
              textDecoration: "none", border: `1px solid ${ACCENT}`,
            }}>Log Fuel</a>
          </div>
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
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Equipment</h2>
          </div>
          {equipmentRows.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>No records yet</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                    {["Code", "Name", "Type", "Status", "Engine Hours", "Daily Rate", "Flagged for Flip", "Locked"].map((h) => (
                      <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {equipmentRows.map((row, i) => {
                    const sc = statusColors[row.status] ?? { bg: "#f3f4f6", color: "#6b7280" };
                    return (
                      <tr key={row.code} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                        <td style={{ padding: "0.75rem 1rem", fontFamily: "monospace", whiteSpace: "nowrap" }}>{row.code}</td>
                        <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>{row.name}</td>
                        <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>{row.type}</td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          <span style={{
                            padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600,
                            background: sc.bg, color: sc.color,
                          }}>
                            {row.status}
                          </span>
                        </td>
                        <td style={{ padding: "0.75rem 1rem" }}>{Number(row.totalEngineHours).toLocaleString()} hrs</td>
                        <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>PHP {Number(row.dailyRentalRate).toLocaleString()}</td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          {row.isFlaggedForFlip ? (
                            <span style={{
                              padding: "0.2rem 0.6rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 700,
                              background: "#fef2f2", color: "#dc2626",
                            }}>
                              FLIP
                            </span>
                          ) : null}
                        </td>
                        <td style={{ padding: "0.75rem 1rem" }}>
                          {row.isLocked ? (
                            <span style={{
                              padding: "0.2rem 0.6rem", borderRadius: "4px", fontSize: "0.75rem", fontWeight: 700,
                              background: "#fef2f2", color: "#dc2626",
                            }}>
                              LOCKED
                            </span>
                          ) : null}
                        </td>
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
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 600 }}>Recent Maintenance Records</h2>
          </div>
          {maintenanceRows.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#6b7280" }}>No records yet</div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                    {["Equipment", "Type", "Description", "Parts Cost", "Labor Cost", "Total Cost", "Status", "Date"].map((h) => (
                      <th key={h} style={{ padding: "0.75rem 1rem", textAlign: "left", fontWeight: 600, color: "#374151", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {maintenanceRows.map((row, i) => (
                    <tr key={i} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>
                        {row.equipCode ? `${row.equipCode} – ${row.equipName}` : "—"}
                      </td>
                      <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>{row.maintenanceType}</td>
                      <td style={{ padding: "0.75rem 1rem", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{row.description}</td>
                      <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>PHP {Number(row.partsCost).toLocaleString()}</td>
                      <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>PHP {Number(row.laborCost).toLocaleString()}</td>
                      <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>
                        {row.totalCost !== null ? `PHP ${Number(row.totalCost).toLocaleString()}` : "—"}
                      </td>
                      <td style={{ padding: "0.75rem 1rem" }}>
                        <span style={{
                          padding: "0.2rem 0.6rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600,
                          background: row.status === "COMPLETED" ? "#d1fae5" : "#fef3c7",
                          color: row.status === "COMPLETED" ? "#065f46" : "#92400e",
                        }}>
                          {row.status}
                        </span>
                      </td>
                      <td style={{ padding: "0.75rem 1rem", whiteSpace: "nowrap" }}>{row.maintenanceDate}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
