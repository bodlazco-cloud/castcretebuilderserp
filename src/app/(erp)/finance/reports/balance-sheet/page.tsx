export const dynamic = "force-dynamic";
import { db } from "@/db";
import {
  bankAccounts, invoices, payables, inventoryStock, developerAdvanceTracker,
} from "@/db/schema";
import { eq, sql, notInArray, inArray } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

const ACCENT = "#ff5a1f";

export default async function BalanceSheetPage() {
  await getAuthUser();

  const asOf = new Date().toLocaleDateString("en-PH", { dateStyle: "long" });

  const [bankData, receivableData, inventoryData, payableData, advanceData] = await Promise.all([
    // Assets: cash in banks
    db.select({
      bankName:        bankAccounts.bankName,
      accountName:     bankAccounts.accountName,
      currentBalance:  bankAccounts.currentBalance,
    }).from(bankAccounts).where(eq(bankAccounts.isActive, true)),

    // Assets: outstanding invoices (receivables)
    db.select({
      total: sql<string>`sum(net_amount_due::numeric)`.as("total"),
    }).from(invoices).where(notInArray(invoices.status, ["COLLECTED", "REJECTED"])),

    // Assets: inventory on hand
    db.select({
      total: sql<string>`sum(quantity_on_hand::numeric)`.as("total"),
    }).from(inventoryStock),

    // Liabilities: approved unpaid payables
    db.select({
      total: sql<string>`sum(net_payable::numeric)`.as("total"),
    }).from(payables).where(inArray(payables.status, ["APPROVED", "PENDING_REVIEW", "DRAFT"])),

    // Liabilities: developer advance (remaining balance owed)
    db.select({
      total: sql<string>`sum(remaining_balance::numeric)`.as("total"),
    }).from(developerAdvanceTracker),
  ]);

  const cashTotal        = bankData.reduce((s, b) => s + Number(b.currentBalance), 0);
  const receivablesTotal = Number(receivableData[0]?.total ?? 0);
  const inventoryValue   = Number(inventoryData[0]?.total ?? 0); // unit count, not monetary — shows as units
  const totalAssets      = cashTotal + receivablesTotal;

  const payablesTotal    = Number(payableData[0]?.total ?? 0);
  const advanceTotal     = Number(advanceData[0]?.total ?? 0);
  const totalLiabilities = payablesTotal + advanceTotal;

  const equity = totalAssets - totalLiabilities;
  const fmt = (v: number) => `PHP ${v.toLocaleString("en-PH", { minimumFractionDigits: 2 })}`;

  const Section = ({ title, color, children }: { title: string; color: string; children: React.ReactNode }) => (
    <div style={{ marginBottom: "1.5rem" }}>
      <div style={{ padding: "0.6rem 1rem", background: color, borderRadius: "6px 6px 0 0", fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.05em", color: "#374151" }}>
        {title}
      </div>
      <div style={{ background: "#fff", borderRadius: "0 0 6px 6px", overflow: "hidden" }}>
        {children}
      </div>
    </div>
  );

  const Row = ({ label, value, sub = false, total = false }: { label: string; value: string; sub?: boolean; total?: boolean }) => (
    <div style={{
      display: "flex", justifyContent: "space-between", alignItems: "center",
      padding: "0.65rem 1rem", paddingLeft: sub ? "1.75rem" : "1rem",
      borderBottom: "1px solid #f3f4f6", background: total ? "#f9fafb" : "transparent",
      fontWeight: total ? 700 : 400,
    }}>
      <span style={{ color: "#374151" }}>{label}</span>
      <span style={{ fontFamily: "monospace", color: "#111827" }}>{value}</span>
    </div>
  );

  return (
    <main style={{ padding: "2rem", background: "#f9fafb", minHeight: "100vh", fontFamily: "system-ui, sans-serif" }}>
      <div style={{ maxWidth: "760px" }}>
        <div style={{ marginBottom: "1.5rem" }}>
          <a href="/finance" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>← Finance & Accounting</a>
        </div>

        <div style={{ marginBottom: "1.5rem" }}>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.5rem", fontWeight: 700, color: "#111827" }}>Balance Sheet</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.9rem" }}>As of {asOf}</p>
        </div>

        <div style={{ boxShadow: "0 1px 4px rgba(0,0,0,0.07)", borderRadius: "8px", overflow: "hidden" }}>
          {/* ASSETS */}
          <Section title="Assets" color="#f0fdf4">
            <Row label="Cash in Banks" value="" sub={false} />
            {bankData.map((b) => (
              <Row key={b.accountName} label={`${b.bankName} — ${b.accountName}`} value={fmt(Number(b.currentBalance))} sub />
            ))}
            <Row label="Total Cash" value={fmt(cashTotal)} total />
            <Row label="Trade Receivables (Outstanding Invoices)" value={fmt(receivablesTotal)} />
            <Row label="Inventory on Hand (units)" value={inventoryValue.toLocaleString("en-PH")} />
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 1rem", background: "#dcfce7", fontWeight: 700 }}>
              <span style={{ color: "#057a55" }}>TOTAL ASSETS</span>
              <span style={{ fontFamily: "monospace", color: "#057a55" }}>{fmt(totalAssets)}</span>
            </div>
          </Section>

          {/* LIABILITIES */}
          <Section title="Liabilities" color="#fef2f2">
            <Row label="Subcon Payables (pending/approved/unpaid)" value={fmt(payablesTotal)} />
            <Row label="Developer Advance Remaining Balance" value={fmt(advanceTotal)} />
            <div style={{ display: "flex", justifyContent: "space-between", padding: "0.75rem 1rem", background: "#fee2e2", fontWeight: 700 }}>
              <span style={{ color: "#b91c1c" }}>TOTAL LIABILITIES</span>
              <span style={{ fontFamily: "monospace", color: "#b91c1c" }}>{fmt(totalLiabilities)}</span>
            </div>
          </Section>

          {/* EQUITY */}
          <div style={{ display: "flex", justifyContent: "space-between", padding: "1rem", background: equity >= 0 ? "#eff6ff" : "#fef2f2", fontWeight: 700, fontSize: "1rem", borderTop: "2px solid #e5e7eb" }}>
            <span style={{ color: equity >= 0 ? "#1a56db" : "#b91c1c" }}>NET EQUITY (Assets − Liabilities)</span>
            <span style={{ fontFamily: "monospace", color: equity >= 0 ? "#1a56db" : "#b91c1c" }}>{fmt(equity)}</span>
          </div>
        </div>
      </div>
    </main>
  );
}
