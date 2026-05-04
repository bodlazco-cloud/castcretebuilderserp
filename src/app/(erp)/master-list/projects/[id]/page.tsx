export const dynamic = "force-dynamic";
import { db } from "@/db";
import { projects, developers, blocks, projectUnits } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";
import { notFound } from "next/navigation";
import { ApproveProjectButton, AddBlockForm, AddUnitForm } from "./ProjectActions";

const FIELD: React.CSSProperties = { display: "flex", flexDirection: "column", gap: "0.2rem" };
const LABEL: React.CSSProperties = { fontSize: "0.78rem", fontWeight: 600, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.05em" };
const VALUE: React.CSSProperties = { fontSize: "0.95rem", color: "#111827", fontWeight: 500 };

const STATUS_STYLE: Record<string, { bg: string; color: string }> = {
  ACTIVE:    { bg: "#dcfce7", color: "#166534" },
  BIDDING:   { bg: "#eff6ff", color: "#1e40af" },
  ON_HOLD:   { bg: "#fef9c3", color: "#713f12" },
  COMPLETED: { bg: "#f0fdf4", color: "#166534" },
  CANCELLED: { bg: "#fef2f2", color: "#b91c1c" },
};

function php(v: string | null) {
  if (!v) return "—";
  return "PHP " + Number(v).toLocaleString("en-PH", { minimumFractionDigits: 2 });
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await getAuthUser();
  const { id } = await params;

  const [project] = await db
    .select({
      id:                     projects.id,
      name:                   projects.name,
      status:                 projects.status,
      contractValue:          projects.contractValue,
      developerAdvance:       projects.developerAdvance,
      advanceRecovered:       projects.advanceRecovered,
      targetUnitsPerMonth:    projects.targetUnitsPerMonth,
      minOperatingCashBuffer: projects.minOperatingCashBuffer,
      startDate:              projects.startDate,
      endDate:                projects.endDate,
      createdAt:              projects.createdAt,
      bodApprovedAt:          projects.bodApprovedAt,
      devName:                developers.name,
      devId:                  developers.id,
    })
    .from(projects)
    .leftJoin(developers, eq(projects.developerId, developers.id))
    .where(eq(projects.id, id));

  if (!project) notFound();

  const blockRows = await db
    .select({ id: blocks.id, blockName: blocks.blockName, totalLots: blocks.totalLots })
    .from(blocks)
    .where(eq(blocks.projectId, id))
    .orderBy(blocks.blockName);

  const unitRows = blockRows.length > 0
    ? await db
        .select({ id: projectUnits.id, blockId: projectUnits.blockId, unitCode: projectUnits.unitCode, lotNumber: projectUnits.lotNumber, unitModel: projectUnits.unitModel, status: projectUnits.status })
        .from(projectUnits)
        .where(eq(projectUnits.projectId, id))
        .orderBy(projectUnits.unitCode)
    : [];

  const sc = STATUS_STYLE[project.status] ?? { bg: "#f3f4f6", color: "#6b7280" };
  const isApproved = project.status === "ACTIVE" && !!project.bodApprovedAt;

  const UNIT_STATUS: Record<string, { bg: string; color: string }> = {
    PENDING:     { bg: "#f3f4f6", color: "#6b7280" },
    IN_PROGRESS: { bg: "#eff6ff", color: "#1e40af" },
    COMPLETED:   { bg: "#dcfce7", color: "#166534" },
  };

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "960px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/master-list/projects" style={{ fontSize: "0.8rem", color: "#6366f1", textDecoration: "none" }}>← Projects / Sites</a>
        </div>

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "1rem", marginBottom: "1.5rem", flexWrap: "wrap" }}>
          <div>
            <h1 style={{ margin: "0 0 0.35rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>{project.name}</h1>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", flexWrap: "wrap" }}>
              <span style={{ display: "inline-block", padding: "0.2rem 0.65rem", borderRadius: "999px", fontSize: "0.75rem", fontWeight: 600, background: sc.bg, color: sc.color }}>
                {project.status}
              </span>
              {project.bodApprovedAt && (
                <span style={{ fontSize: "0.75rem", color: "#16a34a", fontWeight: 600 }}>
                  ✓ BOD Approved {new Date(project.bodApprovedAt).toLocaleDateString("en-PH")}
                </span>
              )}
            </div>
          </div>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {!isApproved && <ApproveProjectButton projectId={id} />}
            <a href="/master-list/sow" style={{
              padding: "0.5rem 1rem", borderRadius: "6px", background: "#6366f1",
              color: "#fff", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none",
            }}>Scope of Work →</a>
            <a href={`/construction/ntp`} style={{
              padding: "0.5rem 1rem", borderRadius: "6px", background: "#057a55",
              color: "#fff", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none",
            }}>NTP Register →</a>
          </div>
        </div>

        {/* BOD Gate Banner */}
        {!isApproved && (
          <div style={{ padding: "0.85rem 1rem", background: "#fef9c3", border: "1px solid #fde047", borderRadius: "6px", fontSize: "0.875rem", color: "#713f12", marginBottom: "1.5rem" }}>
            <strong>BOD Gate:</strong> NTPs cannot be issued until BOD approves this project. Click &ldquo;BOD Approve&rdquo; to activate.
          </div>
        )}

        {/* Key metrics */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          {[
            { label: "Contract Value",     value: php(project.contractValue) },
            { label: "Developer Advance",  value: php(project.developerAdvance) },
            { label: "Advance Recovered",  value: php(project.advanceRecovered) },
            { label: "Target Units/Month", value: String(project.targetUnitsPerMonth) },
            { label: "Min. Cash Buffer",   value: php(project.minOperatingCashBuffer) },
            { label: "Total Units",        value: String(unitRows.length) },
          ].map((kpi) => (
            <div key={kpi.label} style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1rem 1.25rem" }}>
              <div style={{ fontSize: "0.75rem", fontWeight: 600, color: "#6b7280", marginBottom: "0.25rem" }}>{kpi.label}</div>
              <div style={{ fontSize: "1rem", fontWeight: 700, color: "#111827" }}>{kpi.value}</div>
            </div>
          ))}
        </div>

        {/* Details */}
        <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.5rem", marginBottom: "1.5rem" }}>
          <h2 style={{ margin: "0 0 1rem", fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>Project Details</h2>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1.25rem" }}>
            <div style={FIELD}><div style={LABEL}>Developer</div>
              {project.devId
                ? <a href={`/master-list/developers/${project.devId}`} style={{ ...VALUE, color: "#6366f1", textDecoration: "none" }}>{project.devName}</a>
                : <div style={VALUE}>—</div>}
            </div>
            <div style={FIELD}><div style={LABEL}>Start Date</div><div style={VALUE}>{project.startDate ?? "—"}</div></div>
            <div style={FIELD}><div style={LABEL}>End Date</div><div style={VALUE}>{project.endDate ?? "—"}</div></div>
            <div style={FIELD}><div style={LABEL}>Project ID</div><div style={{ ...VALUE, fontFamily: "monospace", fontSize: "0.78rem" }}>{project.id}</div></div>
            <div style={FIELD}><div style={LABEL}>Created</div><div style={VALUE}>{new Date(project.createdAt).toLocaleDateString("en-PH", { dateStyle: "long" })}</div></div>
          </div>
        </div>

        {/* Blocks & Units */}
        <div style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.75rem", flexWrap: "wrap", gap: "0.5rem" }}>
            <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "#374151" }}>Blocks & Units ({unitRows.length} units)</h2>
            <AddBlockForm projectId={id} />
          </div>

          {blockRows.length === 0 ? (
            <div style={{ padding: "1.5rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af", fontSize: "0.875rem" }}>
              No blocks yet. Add a block first, then add units.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
              {blockRows.map((block) => {
                const blockUnits = unitRows.filter((u) => u.blockId === block.id);
                return (
                  <div key={block.id} style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
                    <div style={{ padding: "0.75rem 1rem", background: "#f9fafb", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <div>
                        <span style={{ fontWeight: 700, color: "#111827", fontSize: "0.9rem" }}>{block.blockName}</span>
                        <span style={{ marginLeft: "0.5rem", fontSize: "0.8rem", color: "#6b7280" }}>{blockUnits.length}/{block.totalLots} lots</span>
                      </div>
                    </div>
                    {blockUnits.length > 0 && (
                      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                        <thead>
                          <tr>
                            {["Lot #", "Unit Code", "Model", "Status"].map((h, i) => (
                              <th key={i} style={{ padding: "0.5rem 0.9rem", textAlign: "left", fontWeight: 600, color: "#6b7280", borderBottom: "1px solid #f3f4f6", fontSize: "0.78rem" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {blockUnits.map((u) => {
                            const us = UNIT_STATUS[u.status] ?? { bg: "#f3f4f6", color: "#6b7280" };
                            return (
                              <tr key={u.id} style={{ borderBottom: "1px solid #f9fafb" }}>
                                <td style={{ padding: "0.5rem 0.9rem", color: "#6b7280" }}>{u.lotNumber}</td>
                                <td style={{ padding: "0.5rem 0.9rem", fontFamily: "monospace", fontSize: "0.82rem", fontWeight: 600, color: "#374151" }}>{u.unitCode}</td>
                                <td style={{ padding: "0.5rem 0.9rem", color: "#374151" }}>{u.unitModel}</td>
                                <td style={{ padding: "0.5rem 0.9rem" }}>
                                  <span style={{ display: "inline-block", padding: "0.15rem 0.5rem", borderRadius: "999px", fontSize: "0.7rem", fontWeight: 600, background: us.bg, color: us.color }}>{u.status}</span>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                    <div style={{ padding: "0.75rem 1rem", borderTop: blockUnits.length > 0 ? "1px solid #f3f4f6" : undefined }}>
                      <AddUnitForm projectId={id} blockOptions={blockRows.map((b) => ({ id: b.id, blockName: b.blockName }))} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Scope of Work */}
        <div style={{ padding: "1rem 1.25rem", background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", marginBottom: "1.5rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "#374151" }}>Scope of Work</div>
            <div style={{ fontSize: "0.82rem", color: "#6b7280", marginTop: "0.15rem" }}>Activity definitions are system-wide. Link to BOM entries for cost planning.</div>
          </div>
          <a href="/master-list/sow" style={{ padding: "0.45rem 0.9rem", borderRadius: "6px", background: "#6366f1", color: "#fff", fontSize: "0.8rem", fontWeight: 600, textDecoration: "none" }}>
            View Scope of Work →
          </a>
        </div>
      </div>
    </main>
  );
}
