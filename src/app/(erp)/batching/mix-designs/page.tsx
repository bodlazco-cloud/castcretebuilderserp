export const dynamic = "force-dynamic";
import { db } from "@/db";
import { standardMixes, mixDesigns, projects, projectUnits } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { AddStandardMixForm } from "./AddStandardMixForm";

const ACCENT = "#e02424";

const UNIT_TYPE_COLORS: Record<string, { bg: string; color: string }> = {
  BEG: { bg: "#eff6ff", color: "#1e40af" },
  REG: { bg: "#f0fdf4", color: "#166534" },
  END: { bg: "#fef9c3", color: "#713f12" },
};

export default async function MixDesignsPage() {
  await getAuthUser();

  type MixRow = {
    id: string; unitModel: string; unitType: string; volumeM3: string | null;
    description: string | null; isActive: boolean; createdAt: Date | string;
    projName: string | null; projId: string | null; mixCode: string | null;
    mixName: string | null; cementBags: string | null;
  };

  let mixes: MixRow[] = [];
  let needsMigration = false;

  try {
    mixes = await db
      .select({
        id:          standardMixes.id,
        unitModel:   standardMixes.unitModel,
        unitType:    standardMixes.unitType,
        volumeM3:    standardMixes.volumePerUnitM3,
        description: standardMixes.description,
        isActive:    standardMixes.isActive,
        createdAt:   standardMixes.createdAt,
        projName:    projects.name,
        projId:      projects.id,
        mixCode:     mixDesigns.code,
        mixName:     mixDesigns.name,
        cementBags:  mixDesigns.cementBagsPerM3,
      })
      .from(standardMixes)
      .leftJoin(projects, eq(standardMixes.projectId, projects.id))
      .leftJoin(mixDesigns, eq(standardMixes.mixDesignId, mixDesigns.id))
      .orderBy(projects.name, standardMixes.unitModel, standardMixes.unitType);
  } catch {
    needsMigration = true;
  }

  const [mixDesignRows, projectRows, unitModelRowsRaw] = await Promise.all([
    db.select({ id: mixDesigns.id, code: mixDesigns.code, name: mixDesigns.name })
      .from(mixDesigns)
      .where(eq(mixDesigns.isActive, true))
      .orderBy(mixDesigns.code),
    db.select({ id: projects.id, name: projects.name })
      .from(projects)
      .orderBy(projects.name),
    db.execute(sql`SELECT DISTINCT project_id, unit_model FROM project_units ORDER BY unit_model`),
  ]);

  const unitModelRows = (unitModelRowsRaw as unknown as { project_id: string; unit_model: string }[])
    .map((r) => ({ projectId: r.project_id, unitModel: r.unit_model }));

  const dedupedUnitModels = unitModelRows;

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "1100px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/batching" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Batching Plant</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Standard Mixes</h1>
            <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>
              Pre-defined concrete mix assignments per project, unit model, and unit type for faster production logging.
            </p>
          </div>
          <AddStandardMixForm projects={projectRows} mixDesigns={mixDesignRows} unitModels={dedupedUnitModels} />
        </div>

        {needsMigration && (
          <div style={{ padding: "0.85rem 1rem", background: "#fffbeb", border: "1px solid #fcd34d", borderRadius: "6px", fontSize: "0.875rem", color: "#92400e", marginBottom: "1.5rem" }}>
            <strong>Migration needed:</strong> Run migration 014 in Supabase SQL editor to enable the Standard Mixes table. Standard mix data cannot be saved until the migration is applied.
          </div>
        )}

        {mixes.length === 0 ? (
          <div style={{ padding: "3rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af" }}>
            No standard mixes defined yet. Add one to enable faster production logging.
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem", minWidth: "800px" }}>
                <thead>
                  <tr style={{ background: "#f9fafb" }}>
                    {["Project", "Unit Model", "Type", "Mix Design", "Vol / Unit (m³)", "Description", "Status"].map((h, i) => (
                      <th key={i} style={{ padding: "0.75rem 1rem", textAlign: i === 4 ? "right" : "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {mixes.map((m) => {
                    const tc = UNIT_TYPE_COLORS[m.unitType] ?? { bg: "#f3f4f6", color: "#374151" };
                    return (
                      <tr key={m.id} style={{ borderBottom: "1px solid #f3f4f6", opacity: m.isActive ? 1 : 0.5 }}>
                        <td style={{ padding: "0.65rem 1rem", fontWeight: 500, color: "#374151" }}>{m.projName ?? "—"}</td>
                        <td style={{ padding: "0.65rem 1rem", color: "#111827", fontWeight: 600 }}>{m.unitModel}</td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <span style={{ fontSize: "0.72rem", fontWeight: 700, padding: "0.15rem 0.5rem", borderRadius: "4px", background: tc.bg, color: tc.color }}>
                            {m.unitType}
                          </span>
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          {m.mixCode ? (
                            <div>
                              <div style={{ fontWeight: 500, color: "#374151", fontSize: "0.82rem" }}>{m.mixCode}</div>
                              <div style={{ fontSize: "0.75rem", color: "#9ca3af" }}>{m.mixName}</div>
                            </div>
                          ) : <span style={{ color: "#9ca3af" }}>—</span>}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 600, color: "#374151" }}>
                          {m.volumeM3 ? Number(m.volumeM3).toFixed(4) : "—"}
                        </td>
                        <td style={{ padding: "0.65rem 1rem", color: "#6b7280", fontSize: "0.82rem", maxWidth: "200px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {m.description ?? "—"}
                        </td>
                        <td style={{ padding: "0.65rem 1rem" }}>
                          <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "0.15rem 0.4rem", borderRadius: "4px", background: m.isActive ? "#f0fdf4" : "#f3f4f6", color: m.isActive ? "#057a55" : "#9ca3af" }}>
                            {m.isActive ? "ACTIVE" : "INACTIVE"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
