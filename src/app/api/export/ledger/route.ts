import { NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { db } from "@/db";
import { financialLedger, projects, costCenters, departments } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getAuthUser } from "@/lib/supabase-server";

export async function GET() {
  const user = await getAuthUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entries = await db
    .select({
      transactionDate: financialLedger.transactionDate,
      transactionType: financialLedger.transactionType,
      referenceType:   financialLedger.referenceType,
      amount:          financialLedger.amount,
      description:     financialLedger.description,
      projName:        projects.name,
      costCenterCode:  costCenters.code,
      deptCode:        departments.code,
    })
    .from(financialLedger)
    .leftJoin(projects,    eq(financialLedger.projectId,    projects.id))
    .leftJoin(costCenters, eq(financialLedger.costCenterId, costCenters.id))
    .leftJoin(departments, eq(financialLedger.deptId,       departments.id))
    .orderBy(desc(financialLedger.transactionDate), desc(financialLedger.createdAt))
    .limit(5000);

  let runningBalance = 0;
  const withBalance = [...entries].reverse().map((e) => {
    const amt = Number(e.amount);
    if (e.transactionType === "INFLOW")  runningBalance += amt;
    if (e.transactionType === "OUTFLOW") runningBalance -= amt;
    return { ...e, runningBalance };
  }).reverse();

  const fmt = (n: number) => Number(n.toFixed(2));
  const date = new Date().toISOString().slice(0, 10);

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet("Ledger");
  ws.columns = [
    { width: 12 }, { width: 18 }, { width: 20 },
    { width: 16 }, { width: 16 }, { width: 18 },
    { width: 30 }, { width: 14 }, { width: 12 }, { width: 40 },
  ];

  ws.addRow(["Castcrete Builders — General Ledger"]);
  ws.addRow([`Exported ${new Date().toLocaleDateString("en-PH", { dateStyle: "long" })} — up to 5,000 entries`]);
  ws.addRow([]);
  ws.addRow(["Date", "Type", "Ref Type", "Debit", "Credit", "Running Balance", "Project", "Cost Center", "Dept", "Description"]);

  withBalance.forEach((e) => {
    const amt = Number(e.amount);
    ws.addRow([
      e.transactionDate,
      e.transactionType,
      e.referenceType ?? "",
      e.transactionType === "OUTFLOW" ? fmt(amt) : "",
      e.transactionType === "INFLOW"  ? fmt(amt) : "",
      fmt(e.runningBalance),
      e.projName ?? "",
      e.costCenterCode ?? "",
      e.deptCode ?? "",
      e.description ?? "",
    ]);
  });

  const buf = await wb.xlsx.writeBuffer();

  return new NextResponse(Buffer.from(buf), {
    headers: {
      "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="general-ledger-${date}.xlsx"`,
    },
  });
}
