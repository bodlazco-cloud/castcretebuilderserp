import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
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

  const sheetRows: (string | number)[][] = [
    ["Castcrete Builders — General Ledger"],
    [`Exported ${new Date().toLocaleDateString("en-PH", { dateStyle: "long" })} — up to 5,000 entries`],
    [],
    ["Date", "Type", "Ref Type", "Debit", "Credit", "Running Balance", "Project", "Cost Center", "Dept", "Description"],
    ...withBalance.map((e) => {
      const amt = Number(e.amount);
      return [
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
      ];
    }),
  ];

  const ws = XLSX.utils.aoa_to_sheet(sheetRows);
  ws["!cols"] = [
    { wch: 12 }, { wch: 18 }, { wch: 20 },
    { wch: 16 }, { wch: 16 }, { wch: 18 },
    { wch: 30 }, { wch: 14 }, { wch: 12 }, { wch: 40 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Ledger");

  const buf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  const date = new Date().toISOString().slice(0, 10);

  return new NextResponse(buf, {
    headers: {
      "Content-Type":        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="general-ledger-${date}.xlsx"`,
    },
  });
}
