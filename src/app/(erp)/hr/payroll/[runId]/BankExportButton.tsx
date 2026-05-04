"use client";

import { useTransition } from "react";
import { generatePayrollBankExport } from "@/actions/hr";

export default function BankExportButton({ runId }: { runId: string }) {
  const [isPending, startTransition] = useTransition();

  function handleExport() {
    startTransition(async () => {
      const result = await generatePayrollBankExport({ runId });
      if (!result.success) { alert(result.error); return; }

      const blob = new Blob([result.csv], { type: "text/csv;charset=utf-8;" });
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = result.filename;
      a.click();
      URL.revokeObjectURL(url);

      if (result.skipped > 0) {
        alert(`Exported ${result.totalRows} employees. ${result.skipped} skipped — missing bank account details.`);
      }
    });
  }

  return (
    <button
      onClick={handleExport}
      disabled={isPending}
      style={{
        padding: "0.5rem 1.25rem",
        background: isPending ? "#d1d5db" : "#1d4ed8",
        color: "#fff",
        border: "none",
        borderRadius: "6px",
        fontWeight: 600,
        fontSize: "0.875rem",
        cursor: isPending ? "not-allowed" : "pointer",
      }}
    >
      {isPending ? "Generating…" : "↓ Bank Export"}
    </button>
  );
}
