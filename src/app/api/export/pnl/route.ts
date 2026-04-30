import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
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

  const rows: (string | number)[][] = [
    ["Castcrete Builders — Profit & Loss Statement"],
    [`As of ${period}`],
    [],
    ["REVENUE", "", "Amount (PHP)"],
    ...projRows.filter(([, p]) => p.revenue > 0).map(([name, p]) => [`  ${name}`, "", fmt(p.revenue)]),
    ["Total Revenue", "", fmt(totalRevenue)],
    [],
    ["COST OF REVENUE (Subcon Payables)", "", ""],
    ...projRows.filter(([, p]) => p.cost > 0).map(([name, p]) => [`  ${name}`, "", fmt(p.cost)]),
    ["Total Cost of Revenue", "", fmt(totalCost)],
    [],
    ["Gross Profit", "", fmt(grossProfit)],
    [],
    ...(opEx.length > 0 ? [
      ["OPERATING EXPENSES (Ledger Outflows)", "", ""],
      ...opEx.map((e) => [`  ${e.type}`, "", fmt(e.amount)]),
      ["Total Operating Expenses", "", fmt(totalOpEx)],
      [],
    ] : []),
    [`Net ${netIncome >= 0 ? "Income" : "Loss"}`, "", fmt(netIncome)],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 50 }, { wch: 5 }, { wch: 20 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "P&L");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(buf, {
    headers: {
      "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="profit-and-loss-${date}.xlsx"`,
    },
  });
}
