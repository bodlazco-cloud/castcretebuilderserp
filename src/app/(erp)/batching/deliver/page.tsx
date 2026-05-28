export const dynamic = "force-dynamic";

import { getAuthUser } from "@/lib/supabase-server";
import { db } from "@/db";
import {
  concreteDeliveryNotes, concreteDeliveryReceipts,
  batchingProductionLogs, mixDesigns, projects, projectUnits,
} from "@/db/schema";
import { eq, isNull, notInArray } from "drizzle-orm";

const ACCENT = "#1a56db";

export default async function PendingDeliveriesPage() {
  await getAuthUser();

  // Notes without receipts
  const signedNoteIds = (
    await db.select({ id: concreteDeliveryReceipts.deliveryNoteId }).from(concreteDeliveryReceipts)
  ).map((r) => r.id);

  const notesQuery = db
    .select({
      id:                 concreteDeliveryNotes.id,
      dispatchedAt:       concreteDeliveryNotes.dispatchedAt,
      volumeDispatchedM3: concreteDeliveryNotes.volumeDispatchedM3,
      projectName:        projects.name,
      unitCode:           projectUnits.unitCode,
      mixCode:            mixDesigns.code,
      mixName:            mixDesigns.name,
      batchDate:          batchingProductionLogs.batchDate,
      shift:              batchingProductionLogs.shift,
    })
    .from(concreteDeliveryNotes)
    .leftJoin(batchingProductionLogs, eq(concreteDeliveryNotes.productionLogId, batchingProductionLogs.id))
    .leftJoin(mixDesigns, eq(batchingProductionLogs.mixDesignId, mixDesigns.id))
    .leftJoin(projects, eq(concreteDeliveryNotes.projectId, projects.id))
    .leftJoin(projectUnits, eq(concreteDeliveryNotes.unitId, projectUnits.id))
    .orderBy(concreteDeliveryNotes.dispatchedAt);

  const pendingNotes = signedNoteIds.length > 0
    ? await notesQuery.where(notInArray(concreteDeliveryNotes.id, signedNoteIds))
    : await notesQuery;

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

        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "1.5rem", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h1 style={{ margin: 0, fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Pending Deliveries</h1>
            <p style={{ margin: "0.25rem 0 0", fontSize: "0.875rem", color: "#6b7280" }}>
              Concrete delivery notes awaiting site engineer sign-off. Signing triggers IDB billing and inventory drawdown.
            </p>
          </div>
          <a href="/batching/dispatch" style={{
            padding: "0.5rem 1rem", background: ACCENT, color: "#fff",
            borderRadius: "7px", fontSize: "0.82rem", fontWeight: 600, textDecoration: "none",
          }}>
            + New Dispatch
          </a>
        </div>

        {pendingNotes.length === 0 ? (
          <div style={{
            padding: "3rem", background: "#fff", borderRadius: "10px",
            boxShadow: "0 1px 4px rgba(0,0,0,0.07)", textAlign: "center", color: "#9ca3af",
          }}>
            <div style={{ fontSize: "2rem", marginBottom: "0.75rem" }}>✓</div>
            <p style={{ margin: 0, fontSize: "0.9rem" }}>No pending deliveries — all notes have been signed off.</p>
          </div>
        ) : (
          <div style={{ background: "#fff", borderRadius: "10px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", overflow: "hidden" }}>
            <div style={{ padding: "0.75rem 1.25rem", borderBottom: "1px solid #f3f4f6" }}>
              <span style={{ fontSize: "0.82rem", fontWeight: 600, color: "#374151" }}>
                {pendingNotes.length} pending {pendingNotes.length === 1 ? "delivery" : "deliveries"}
              </span>
            </div>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.83rem" }}>
                <thead>
                  <tr style={{ background: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
                    {["Dispatched At", "Project", "Unit", "Mix Design", "Batch Date / Shift", "Volume (m³)", "Action"].map((h, i) => (
                      <th key={i} style={{
                        padding: "0.65rem 1rem", fontWeight: 600, color: "#374151",
                        textAlign: i === 5 ? "right" : "left", whiteSpace: "nowrap",
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pendingNotes.map((note, i) => (
                    <tr key={note.id} style={{ borderBottom: "1px solid #f3f4f6", background: i % 2 === 0 ? "#fff" : "#fafafa" }}>
                      <td style={{ padding: "0.65rem 1rem", color: "#6b7280", whiteSpace: "nowrap" }}>
                        {new Date(note.dispatchedAt).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" })}
                      </td>
                      <td style={{ padding: "0.65rem 1rem", fontWeight: 500, color: "#374151" }}>{note.projectName ?? "—"}</td>
                      <td style={{ padding: "0.65rem 1rem", fontFamily: "monospace", fontWeight: 600, color: ACCENT }}>{note.unitCode ?? "—"}</td>
                      <td style={{ padding: "0.65rem 1rem", color: "#374151" }}>
                        <span style={{ fontWeight: 600 }}>{note.mixCode}</span>
                        {note.mixName && <span style={{ color: "#9ca3af", marginLeft: "0.35rem" }}>{note.mixName}</span>}
                      </td>
                      <td style={{ padding: "0.65rem 1rem", color: "#6b7280", whiteSpace: "nowrap" }}>
                        {note.batchDate}
                        {note.shift && <span style={{
                          marginLeft: "0.4rem", padding: "0.1rem 0.35rem",
                          background: "#eff6ff", color: "#1e40af",
                          borderRadius: "3px", fontSize: "0.68rem", fontWeight: 700,
                        }}>{note.shift}</span>}
                      </td>
                      <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontFamily: "monospace", fontWeight: 700, color: "#111827" }}>
                        {Number(note.volumeDispatchedM3).toFixed(2)}
                      </td>
                      <td style={{ padding: "0.65rem 1rem" }}>
                        <a href={`/batching/deliver/${note.id}`} style={{
                          padding: "0.3rem 0.7rem", background: "#ecfdf5", color: "#057a55",
                          borderRadius: "5px", fontSize: "0.75rem", fontWeight: 700,
                          textDecoration: "none", whiteSpace: "nowrap",
                        }}>
                          Sign Receipt →
                        </a>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
