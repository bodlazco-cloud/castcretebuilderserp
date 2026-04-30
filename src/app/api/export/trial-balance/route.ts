import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { db } from "@/db";
import { financialLedger, costCenters } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({
      costCenterId:   financialLedger.costCenterId,
      costCenterCode: costCenters.code,
      costCenterName: costCenters.name,
      type:           financialLedger.transactionType,
      total:          sql<string>`sum(amount::numeric)`,
    })
    .from(financialLedger)
    .leftJoin(costCenters, eq(financialLedger.costCenterId, costCenters.id))
    .groupBy(financialLedger.costCenterId, costCenters.code, costCenters.name, financialLedger.transactionType);

  const ccMap = new Map<string, { code: string; name: string; debit: number; credit: number }>();
  for (const row of rows) {
    const k = row.costCenterId;
    if (!ccMap.has(k)) ccMap.set(k, { code: row.costCenterCode ?? "—", name: row.costCenterName ?? "Unknown", debit: 0, credit: 0 });
    const e = ccMap.get(k)!;
    if (row.type === "OUTFLOW") e.debit  += Number(row.total ?? 0);
    if (row.type === "INFLOW")  e.credit += Number(row.total ?? 0);
  }

  const ccRows = [...ccMap.values()].sort((a, b) => a.code.localeCompare(b.code));
  const totalDebit  = ccRows.reduce((s, r) => s + r.debit, 0);
  const totalCredit = ccRows.reduce((s, r) => s + r.credit, 0);
  const isBalanced  = Math.abs(totalDebit - totalCredit) < 0.01;
  const fmt = (n: number) => Number(n.toFixed(2));
  const date = new Date().toISOString().slice(0, 10);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Trial Balance");
  ws.columns = [{ width: 15 }, { width: 35 }, { width: 18 }, { width: 18 }, { width: 18 }];

  ws.addRow(["Castcrete Builders — Trial Balance"]);
  ws.addRow([`As of ${date}  |  ${isBalanced ? "BALANCED" : "IMBALANCED"}`]);
  ws.addRow([]);
  ws.addRow(["Cost Center", "Name", "Debit (Outflow)", "Credit (Inflow)", "Balance"]);
  ccRows.forEach((r) => ws.addRow([r.code, r.name, fmt(r.debit), fmt(r.credit), fmt(r.credit - r.debit)]));
  ws.addRow([]);
  ws.addRow(["TOTALS", "", fmt(totalDebit), fmt(totalCredit), fmt(totalCredit - totalDebit)]);

  const buf = await wb.xlsx.writeBuffer();

  return new NextResponse(Buffer.from(buf), {
    headers: {
      "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="trial-balance-${date}.xlsx"`,
    },
  });
}
