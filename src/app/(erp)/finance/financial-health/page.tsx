export const dynamic = "force-dynamic";
import { db } from "@/db";
import {
  bankAccounts, payables, paymentRequests, invoices,
} from "@/db/schema";
import { sum, and, eq, isNull, notInArray } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#1a56db";

// ─── Liquidity Ratio thresholds (current assets / current liabilities) ────────
// >= 1.5  → Healthy  (green)   enough cash to cover 1.5× obligations
// 1.0–1.5 → Watch    (amber)   solvent but thin margin
// < 1.0   → Critical (red)     current liabilities exceed cash

function liquidityColor(ratio: number | null) {
  if (ratio == null)   return { fg: "#6b7280", label: "N/A" };
  if (ratio >= 1.5)    return { fg: "#059669", label: "Healthy" };
  if (ratio >= 1.0)    return { fg: "#d97706", label: "Watch" };
  return               { fg: "#dc2626", label: "Critical" };
}

function workingCapitalColor(wc: number) {
  return wc >= 0 ? "#059669" : "#dc2626";
}

const fmtPhp = (n: number) =>
  (n < 0 ? "(" : "") +
  "₱ " +
  Math.abs(n).toLocaleString("en-PH", { minimumFractionDigits: 2 }) +
  (n < 0 ? ")" : "");

export default async function FinancialHealthPage() {
  await getAuthUser();

  const [cashRow] = await db
    .select({ total: sum(bankAccounts.currentBalance) })
    .from(bankAccounts);

  // Approved payables not yet paid (primary current liability)
  const [approvedPayablesRow] = await db
    .select({ total: sum(payables.netPayable) })
    .from(payables)
    .where(and(eq(payables.status, "APPROVED"), isNull(payables.paidAt)));

  // Pending payment requests (secondary current liability — in queue)
  const [pendingPrRow] = await db
    .select({ total: sum(paymentRequests.amount) })
    .from(paymentRequests)
    .where(eq(paymentRequests.status, "PENDING"));

  // Approved invoices not yet collected (current receivable from developer)
  const [receivablesRow] = await db
    .select({ total: sum(invoices.netAmountDue) })
    .from(invoices)
    .where(notInArray(invoices.status, ["COLLECTED", "REJECTED", "CANCELLED"]));

  const totalCash        = Number(cashRow?.total        ?? 0);
  const totalPayables    = Number(approvedPayablesRow?.total ?? 0)
                         + Number(pendingPrRow?.total        ?? 0);
  const totalReceivables = Number(receivablesRow?.total ?? 0);

  // Liquidity Ratio = Cash / Current Liabilities
  const liquidityRatio: number | null = totalPayables > 0
    ? totalCash / totalPayables
    : null;

  // Working Capital = Cash + Receivables − Payables
  const workingCapital = totalCash + totalReceivables - totalPayables;

  const liq     = liquidityColor(liquidityRatio);
  const wcColor = workingCapitalColor(workingCapital);

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "900px" }}>
        <div style={{ marginBottom: "1.25rem" }}>
          <a href="/finance" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>
            ← Finance & Accounting
          </a>
        </div>
        <div style={{ marginBottom: "1.75rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827", borderLeft: `4px solid ${ACCENT}`, paddingLeft: "0.75rem" }}>
            Financial Health
          </h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem", paddingLeft: "1.25rem" }}>
            Enterprise-wide liquidity and working capital — computed live from bank balances, approved payables, and outstanding invoices.
          </p>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1.5rem", marginBottom: "2rem" }}>

          {/* ── Liquidity Ratio ──────────────────────────────────────────── */}
          <div style={{
            background: "#fff", padding: "2rem", borderRadius: "12px",
            border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", textAlign: "center",
          }}>
            <p style={{ margin: "0 0 1rem", fontSize: "0.72rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Liquidity Ratio
            </p>
            <div style={{ fontSize: "3.5rem", fontWeight: 900, color: liq.fg, lineHeight: 1 }}>
              {liquidityRatio != null ? liquidityRatio.toFixed(2) : "—"}
            </div>
            <p style={{ margin: "0.75rem 0 0", fontSize: "0.875rem", fontWeight: 600, color: liq.fg }}>
              {liq.label}
            </p>
            <p style={{ margin: "0.4rem 0 0", fontSize: "0.78rem", color: "#6b7280" }}>
              {liquidityRatio != null
                ? `₱${liquidityRatio.toFixed(2)} cash available per ₱1 of liabilities`
                : "No outstanding payables on record"}
            </p>
            <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "space-around", fontSize: "0.78rem" }}>
              <div>
                <p style={{ margin: "0 0 0.2rem", color: "#6b7280" }}>Cash</p>
                <p style={{ margin: 0, fontWeight: 700, color: "#111827", fontFamily: "monospace" }}>{fmtPhp(totalCash)}</p>
              </div>
              <div>
                <p style={{ margin: "0 0 0.2rem", color: "#6b7280" }}>Payables</p>
                <p style={{ margin: 0, fontWeight: 700, color: "#111827", fontFamily: "monospace" }}>{fmtPhp(totalPayables)}</p>
              </div>
            </div>
          </div>

          {/* ── Working Capital ──────────────────────────────────────────── */}
          <div style={{
            background: "#fff", padding: "2rem", borderRadius: "12px",
            border: "1px solid #e5e7eb", boxShadow: "0 1px 4px rgba(0,0,0,0.06)", textAlign: "center",
          }}>
            <p style={{ margin: "0 0 1rem", fontSize: "0.72rem", fontWeight: 700, color: "#6b7280", textTransform: "uppercase", letterSpacing: "0.08em" }}>
              Net Working Capital
            </p>
            <div style={{ fontSize: "3rem", fontWeight: 900, color: wcColor, lineHeight: 1, fontFamily: "monospace" }}>
              {fmtPhp(workingCapital)}
            </div>
            <p style={{ margin: "0.75rem 0 0", fontSize: "0.875rem", fontWeight: 600, color: wcColor }}>
              {workingCapital >= 0 ? "Positive — operations funded" : "Negative — cash gap risk"}
            </p>
            <p style={{ margin: "0.4rem 0 0", fontSize: "0.78rem", color: "#6b7280" }}>
              Cash + Developer Receivables − Outstanding Payables
            </p>
            <div style={{ marginTop: "1.25rem", paddingTop: "1rem", borderTop: "1px solid #f3f4f6", display: "flex", justifyContent: "space-around", fontSize: "0.78rem" }}>
              <div>
                <p style={{ margin: "0 0 0.2rem", color: "#6b7280" }}>Receivables</p>
                <p style={{ margin: 0, fontWeight: 700, color: "#111827", fontFamily: "monospace" }}>{fmtPhp(totalReceivables)}</p>
              </div>
              <div>
                <p style={{ margin: "0 0 0.2rem", color: "#6b7280", fontSize: "0.72rem" }}>Solvency data<br />pending Loans module</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Methodology note ─────────────────────────────────────────────── */}
        <div style={{ background: "#eff6ff", border: "1px solid #bfdbfe", borderRadius: "8px", padding: "0.9rem 1.1rem" }}>
          <p style={{ margin: 0, fontSize: "0.8rem", color: "#1e40af", lineHeight: 1.6 }}>
            <strong>Methodology:</strong> Liquidity = bank cash ÷ (approved unpaid payables + pending payment requests).
            Working Capital = cash + uncollected developer invoices − same liabilities.
            Solvency (debt-to-equity) will be available once the Loans module is activated.
          </p>
        </div>
      </div>
    </main>
  );
}
