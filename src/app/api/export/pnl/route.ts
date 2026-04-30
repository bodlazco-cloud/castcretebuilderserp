import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { db } from "@/db";
import { invoices, payables, financialLedger, projects } from "@/db/schema";
import { eq, sql, inArray } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const period = new Date().toLocaleDateString("en-PH", { dateStyle: "long" });

  const [invoiceData, payableData, ledgerData] = await Promise.all([
    db.select({ projName: projects.name, total: sql<string>`sum(collection_amount::numeric)` })
      .from(invoices).leftJoin(projects, eq(invoices.projectId, projects.id))
      .where(eq(invoices.status, "COLLECTED")).groupBy(projects.name),
    db.select({ projName: projects.name, total: sql<string>`sum(net_payable::numeric)` })
      .from(payables).leftJoin(projects, eq(payables.projectId, projects.id))
      .where(inArray(payables.status, ["APPROVED"])).groupBy(projects.name),
    db.select({ refType: financialLedger.referenceType, total: sql<string>`sum(amount::numeric)` })
      .from(financialLedger).where(eq(financialLedger.transactionType, "OUTFLOW"))
      .groupBy(financialLedger.referenceType),
  ]);

  const projMap = new Map<string, { revenue: number; cost: number }>();
  for (const r of invoiceData) {
    const k = r.projName ?? "—";
    if (!projMap.has(k)) projMap.set(k, { revenue: 0, cost: 0 });
    projMap.get(k)!.revenue += Number(r.total ?? 0);
  }
  for (const r of payableData) {
    const k = r.projName ?? "—";
    if (!projMap.has(k)) projMap.set(k, { revenue: 0, cost: 0 });
    projMap.get(k)!.cost += Number(r.total ?? 0);
  }

  const projRows = [...projMap.entries()];
  const totalRevenue = projRows.reduce((s, [, p]) => s + p.revenue, 0);
  const totalCost    = projRows.reduce((s, [, p]) => s + p.cost, 0);
  const grossProfit  = totalRevenue - totalCost;
  const opEx         = ledgerData.map((r) => ({ type: r.refType, amount: Number(r.total ?? 0) }));
  const totalOpEx    = opEx.reduce((s, e) => s + e.amount, 0);
  const netIncome    = grossProfit - totalOpEx;
  const fmt = (n: number) => Number(n.toFixed(2));

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("P&L");
  ws.columns = [{ width: 50 }, { width: 5 }, { width: 20 }];

  ws.addRow(["Castcrete Builders — Profit & Loss Statement"]);
  ws.addRow([`As of ${period}`]);
  ws.addRow([]);
  ws.addRow(["REVENUE", "", "Amount (PHP)"]);
  projRows.filter(([, p]) => p.revenue > 0).forEach(([name, p]) => ws.addRow([`  ${name}`, "", fmt(p.revenue)]));
  ws.addRow(["Total Revenue", "", fmt(totalRevenue)]);
  ws.addRow([]);
  ws.addRow(["COST OF REVENUE (Subcon Payables)"]);
  projRows.filter(([, p]) => p.cost > 0).forEach(([name, p]) => ws.addRow([`  ${name}`, "", fmt(p.cost)]));
  ws.addRow(["Total Cost of Revenue", "", fmt(totalCost)]);
  ws.addRow([]);
  ws.addRow(["Gross Profit", "", fmt(grossProfit)]);
  ws.addRow([]);
  if (opEx.length > 0) {
    ws.addRow(["OPERATING EXPENSES (Ledger Outflows)"]);
    opEx.forEach((e) => ws.addRow([`  ${e.type}`, "", fmt(e.amount)]));
    ws.addRow(["Total Operating Expenses", "", fmt(totalOpEx)]);
    ws.addRow([]);
  }
  ws.addRow([`Net ${netIncome >= 0 ? "Income" : "Loss"}`, "", fmt(netIncome)]);

  const buf = await wb.xlsx.writeBuffer();
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(Buffer.from(buf), {
    headers: {
      "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="profit-and-loss-${date}.xlsx"`,
    },
  });
}
