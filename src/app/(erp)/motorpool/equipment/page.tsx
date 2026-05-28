export const dynamic = "force-dynamic";

import { db } from "@/db";
import { equipment } from "@/db/schema";
import { count, asc } from "drizzle-orm";

async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    const result = await Promise.race([
      fn(),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("timeout")), 6000)
      ),
    ]);
    return result;
  } catch {
    return fallback;
  }
}

function statusBadge(status: string) {
  const map: Record<string, { bg: string; color: string }> = {
    AVAILABLE: { bg: "#dcfce7", color: "#166534" },
    ON_SITE: { bg: "#dbeafe", color: "#1e40af" },
    MAINTENANCE: { bg: "#fef9c3", color: "#713f12" },
    RETIRED: { bg: "#f3f4f6", color: "#6b7280" },
  };
  const s = map[status] ?? { bg: "#f3f4f6", color: "#6b7280" };
  return (
    <span
      style={{
        padding: "0.2rem 0.55rem",
        borderRadius: "9999px",
        fontSize: "0.72rem",
        fontWeight: 600,
        background: s.bg,
        color: s.color,
        whiteSpace: "nowrap",
      }}
    >
      {status.replace("_", " ")}
    </span>
  );
}

export default async function EquipmentRegisterPage() {
  const [allEquipment, rawCounts] = await Promise.all([
    safe(
      () =>
        db
          .select()
          .from(equipment)
          .orderBy(asc(equipment.code)),
      []
    ),
    safe(
      () =>
        db
          .select({ status: equipment.status, cnt: count() })
          .from(equipment)
          .groupBy(equipment.status),
      []
    ),
  ]);

  const statusCounts: Record<string, number> = {};
  for (const row of rawCounts) {
    statusCounts[row.status] = Number(row.cnt);
  }

  const flaggedCount = allEquipment.filter((e) => e.isFlaggedForFlip).length;

  const grouped: Record<string, typeof allEquipment> = {};
  for (const eq of allEquipment) {
    if (!grouped[eq.type]) grouped[eq.type] = [];
    grouped[eq.type].push(eq);
  }
  const types = Object.keys(grouped).sort();

  const kpis = [
    {
      label: "Available",
      value: statusCounts["AVAILABLE"] ?? 0,
      accent: "#057a55",
    },
    {
      label: "On Site",
      value: statusCounts["ON_SITE"] ?? 0,
      accent: "#1a56db",
    },
    {
      label: "Maintenance",
      value: statusCounts["MAINTENANCE"] ?? 0,
      accent: "#e3a008",
    },
    {
      label: "Flagged for Flip",
      value: flaggedCount,
      accent: "#dc2626",
    },
  ];

  return (
    <main
      style={{
        padding: "2rem",
        background: "#f9fafb",
        minHeight: "100vh",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <style>{`
        details > summary { list-style: none; cursor: pointer; }
        details > summary::-webkit-details-marker { display: none; }
        details > summary .chevron { display: inline-block; transition: transform 0.2s; }
        details[open] > summary .chevron { transform: rotate(90deg); }
      `}</style>

      <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a
            href="/motorpool"
            style={{ fontSize: "0.8rem", color: "#0694a2", textDecoration: "none" }}
          >
            ← Motorpool
          </a>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: "1rem",
            marginBottom: "1.75rem",
          }}
        >
          <div>
            <h1
              style={{
                margin: "0 0 0.25rem",
                fontSize: "1.5rem",
                fontWeight: 700,
                color: "#111827",
              }}
            >
              Equipment Register
            </h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem" }}>
              Full equipment fleet — status, engine hours, fuel standards, and rental rates.
            </p>
          </div>
          <a
            href="/motorpool/add-equipment"
            style={{
              padding: "0.55rem 1.1rem",
              borderRadius: "6px",
              background: "#0694a2",
              color: "#fff",
              fontSize: "0.875rem",
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            + Add Equipment
          </a>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(4, 1fr)",
            gap: "1rem",
            marginBottom: "1.75rem",
          }}
        >
          {kpis.map((k) => (
            <div
              key={k.label}
              style={{
                background: "#fff",
                border: "1px solid #e5e7eb",
                borderTop: `3px solid ${k.accent}`,
                borderRadius: "8px",
                padding: "1rem 1.25rem",
                boxShadow: "0 1px 3px rgba(0,0,0,0.06)",
              }}
            >
              <div
                style={{
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  color: "#6b7280",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                  marginBottom: "0.4rem",
                }}
              >
                {k.label}
              </div>
              <div
                style={{
                  fontSize: "2rem",
                  fontWeight: 700,
                  color: k.accent,
                  lineHeight: 1,
                }}
              >
                {k.value}
              </div>
            </div>
          ))}
        </div>

        {allEquipment.length === 0 ? (
          <div
            style={{
              background: "#fff",
              borderRadius: "8px",
              boxShadow: "0 1px 4px rgba(0,0,0,0.07)",
              padding: "3rem",
              textAlign: "center",
              color: "#9ca3af",
            }}
          >
            <div style={{ fontSize: "2.5rem", marginBottom: "0.75rem" }}>🚜</div>
            <div style={{ fontWeight: 600, fontSize: "1rem", color: "#6b7280" }}>
              No equipment records found.
            </div>
            <div style={{ fontSize: "0.875rem", marginTop: "0.25rem" }}>
              Add your first piece of equipment to get started.
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {types.map((type) => {
              const rows = grouped[type];
              return (
                <details
                  key={type}
                  open
                  style={{
                    background: "#fff",
                    borderRadius: "8px",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.07)",
                    border: "1px solid #e5e7eb",
                    overflow: "hidden",
                  }}
                >
                  <summary
                    style={{
                      padding: "0.9rem 1.25rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.6rem",
                      borderBottom: "1px solid #f3f4f6",
                      background: "#f9fafb",
                      userSelect: "none",
                    }}
                  >
                    <span className="chevron" style={{ color: "#9ca3af", fontSize: "0.75rem" }}>
                      ▶
                    </span>
                    <span style={{ fontWeight: 700, color: "#374151", fontSize: "0.9rem" }}>
                      {type}
                    </span>
                    <span
                      style={{
                        marginLeft: "0.25rem",
                        background: "#e5e7eb",
                        color: "#6b7280",
                        borderRadius: "9999px",
                        fontSize: "0.72rem",
                        fontWeight: 600,
                        padding: "0.1rem 0.5rem",
                      }}
                    >
                      {rows.length}
                    </span>
                  </summary>

                  <div style={{ overflowX: "auto" }}>
                    <table
                      style={{
                        width: "100%",
                        borderCollapse: "collapse",
                        fontSize: "0.825rem",
                      }}
                    >
                      <thead>
                        <tr style={{ background: "#f9fafb" }}>
                          {[
                            "Code",
                            "Name",
                            "Type",
                            "Make / Model / Year",
                            "Engine Hours",
                            "Fuel Std (L/hr)",
                            "Daily Rate",
                            "Status",
                            "Flags",
                          ].map((h) => (
                            <th
                              key={h}
                              style={{
                                padding: "0.6rem 1rem",
                                textAlign: "left",
                                fontWeight: 600,
                                color: "#6b7280",
                                fontSize: "0.72rem",
                                textTransform: "uppercase",
                                letterSpacing: "0.04em",
                                borderBottom: "1px solid #e5e7eb",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((eq, idx) => {
                          const parts: string[] = [];
                          if (eq.make) parts.push(eq.make);
                          if (eq.model && eq.year) parts.push(`${eq.model} (${eq.year})`);
                          else if (eq.model) parts.push(eq.model);
                          else if (eq.year) parts.push(String(eq.year));
                          const makeModelYear = parts.join(" ");

                          const flags: React.ReactNode[] = [];
                          if (eq.isLocked)
                            flags.push(
                              <span key="lock" style={{ color: "#dc2626", fontWeight: 600 }}>
                                🔒 Locked
                              </span>
                            );
                          if (eq.isFlaggedForFlip)
                            flags.push(
                              <span key="flip" style={{ color: "#d97706", fontWeight: 600 }}>
                                ♻ Flip
                              </span>
                            );

                          return (
                            <tr
                              key={eq.id}
                              style={{
                                background: idx % 2 === 0 ? "#fff" : "#fafafa",
                                borderBottom: "1px solid #f3f4f6",
                              }}
                            >
                              <td
                                style={{
                                  padding: "0.65rem 1rem",
                                  fontFamily: "monospace",
                                  fontWeight: 700,
                                  color: "#374151",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {eq.code}
                              </td>
                              <td
                                style={{
                                  padding: "0.65rem 1rem",
                                  color: "#111827",
                                  fontWeight: 600,
                                }}
                              >
                                {eq.name}
                              </td>
                              <td style={{ padding: "0.65rem 1rem", color: "#6b7280" }}>
                                {eq.type}
                              </td>
                              <td
                                style={{
                                  padding: "0.65rem 1rem",
                                  color: "#374151",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {makeModelYear || "—"}
                              </td>
                              <td
                                style={{
                                  padding: "0.65rem 1rem",
                                  color: "#374151",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {Number(eq.totalEngineHours).toLocaleString("en-PH", {
                                  maximumFractionDigits: 1,
                                })}{" "}
                                hrs
                              </td>
                              <td
                                style={{
                                  padding: "0.65rem 1rem",
                                  color: "#374151",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {Number(eq.fuelStandardLitersPerHour).toFixed(2)} L/hr
                              </td>
                              <td
                                style={{
                                  padding: "0.65rem 1rem",
                                  color: "#374151",
                                  whiteSpace: "nowrap",
                                }}
                              >
                                ₱
                                {Number(eq.dailyRentalRate).toLocaleString("en-PH", {
                                  minimumFractionDigits: 2,
                                })}
                              </td>
                              <td style={{ padding: "0.65rem 1rem", whiteSpace: "nowrap" }}>
                                {statusBadge(eq.status)}
                              </td>
                              <td style={{ padding: "0.65rem 1rem", whiteSpace: "nowrap" }}>
                                {flags.length > 0 ? (
                                  <span
                                    style={{
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: "0.2rem",
                                    }}
                                  >
                                    {flags}
                                  </span>
                                ) : (
                                  <span style={{ color: "#9ca3af" }}>—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </details>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
