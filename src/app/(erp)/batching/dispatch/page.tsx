export const dynamic = "force-dynamic";

import { getAuthUser } from "@/lib/supabase-server";
import { db } from "@/db";
import {
  batchingProductionLogs, concreteDeliveryNotes,
  mixDesigns, projects, projectUnits,
} from "@/db/schema";
import { eq, isNull, notInArray } from "drizzle-orm";
import { DispatchForm } from "./DispatchForm";

const ACCENT = "#1a56db";

export default async function DispatchPage() {
  const user = await getAuthUser();

  // Production logs that have no delivery note yet
  const existingNotes = await db
    .select({ productionLogId: concreteDeliveryNotes.productionLogId })
    .from(concreteDeliveryNotes);

  const usedLogIds = existingNotes.map((n) => n.productionLogId);

  const logsQuery = db
    .select({
      id:               batchingProductionLogs.id,
      batchDate:        batchingProductionLogs.batchDate,
      shift:            batchingProductionLogs.shift,
      volumeProducedM3: batchingProductionLogs.volumeProducedM3,
      mixCode:          mixDesigns.code,
      mixName:          mixDesigns.name,
      projectId:        batchingProductionLogs.projectId,
      projectName:      projects.name,
    })
    .from(batchingProductionLogs)
    .leftJoin(mixDesigns, eq(batchingProductionLogs.mixDesignId, mixDesigns.id))
    .leftJoin(projects, eq(batchingProductionLogs.projectId, projects.id))
    .orderBy(batchingProductionLogs.createdAt);

  const [pendingLogs, allProjects, allUnits] = await Promise.all([
    usedLogIds.length > 0
      ? logsQuery.where(notInArray(batchingProductionLogs.id, usedLogIds))
      : logsQuery,
    db.select({ id: projects.id, name: projects.name }).from(projects).orderBy(projects.name),
    db.select({ id: projectUnits.id, unitCode: projectUnits.unitCode, projectId: projectUnits.projectId })
      .from(projectUnits).orderBy(projectUnits.unitCode),
  ]);

  return (
    <main style={{ minHeight: "100vh", background: "#f9fafb", fontFamily: "system-ui, sans-serif" }}>
      <nav style={{
        display: "flex", alignItems: "center", padding: "0 2rem", height: "56px",
        background: "#fff", borderBottom: "1px solid #e5e7eb", position: "sticky", top: 0, zIndex: 10,
      }}>
        <span style={{ fontWeight: 700, fontSize: "1.1rem" }}>Castcrete 360</span>
      </nav>

      <div style={{ padding: "2rem", maxWidth: "1100px", margin: "0 auto" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/batching" style={{ fontSize: "0.85rem", color: ACCENT, textDecoration: "none" }}>← Back to Batching</a>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Dispatch Concrete</h1>
          <p style={{ margin: "0.25rem 0 0", fontSize: "0.875rem", color: "#6b7280" }}>
            Create a Concrete Delivery Note for a completed production batch. Site engineer will sign on delivery.
          </p>
        </div>

        {/* Info */}
        <div style={{
          marginBottom: "1.5rem", padding: "0.75rem 1rem", background: "#eff6ff",
          border: "1px solid #bfdbfe", borderRadius: "8px", fontSize: "0.82rem", color: "#1e40af",
        }}>
          <strong>Dispatch Flow:</strong> Select a ready batch → specify volume dispatched → a Delivery Note is created.
          Site engineer receives and signs at site to trigger auto IDB billing and inventory drawdown.
        </div>

        {pendingLogs.length === 0 ? (
          <div style={{
            padding: "3rem", background: "#fff", borderRadius: "10px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af",
          }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>✓</div>
            <p style={{ margin: 0, fontSize: "0.9rem" }}>All batches have been dispatched.</p>
            <p style={{ margin: "0.5rem 0 0", fontSize: "0.8rem" }}>
              <a href="/batching/log-batch" style={{ color: ACCENT }}>Log a new batch</a> to add more.
            </p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
            {pendingLogs.map((log) => (
              <div key={log.id} style={{
                background: "#fff", borderRadius: "10px",
                boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden",
              }}>
                {/* Batch header */}
                <div style={{
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "0.85rem 1.25rem", borderBottom: "1px solid #f3f4f6",
                  flexWrap: "wrap", gap: "0.5rem",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <span style={{
                      padding: "0.2rem 0.55rem", background: "#eff6ff", color: "#1e40af",
                      borderRadius: "4px", fontSize: "0.7rem", fontWeight: 700,
                    }}>
                      {log.shift} SHIFT
                    </span>
                    <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151" }}>
                      {log.batchDate} — {log.projectName ?? "Unknown Project"}
                    </span>
                    <span style={{ fontSize: "0.78rem", color: "#9ca3af" }}>
                      Mix: <strong>{log.mixCode}</strong> {log.mixName}
                    </span>
                  </div>
                  <span style={{
                    fontSize: "0.82rem", fontWeight: 700, color: "#111827",
                    fontFamily: "monospace",
                  }}>
                    {Number(log.volumeProducedM3).toFixed(2)} m³ available
                  </span>
                </div>

                {/* Dispatch form */}
                <div style={{ padding: "1rem 1.25rem" }}>
                  <DispatchForm
                    productionLogId={log.id}
                    projectId={log.projectId}
                    maxVolumeM3={Number(log.volumeProducedM3)}
                    userId={user?.id ?? ""}
                    units={allUnits.filter((u) => u.projectId === log.projectId)}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
