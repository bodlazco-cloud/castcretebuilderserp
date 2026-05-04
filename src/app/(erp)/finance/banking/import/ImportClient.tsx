"use client";

import { useState, useRef, useTransition } from "react";
import { parseBankCSV, BANK_FORMATS, type BankFormat, type StatementLine } from "@/lib/bank-csv-parser";
import { importBankStatement } from "@/actions/banking";
import { useRouter } from "next/navigation";

type BankAccount = { id: string; bankName: string; accountName: string; accountNumber: string };

const ACCENT = "#ff5a1f";
const fmt = (n: number) => `₱${n.toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function today() {
  return new Date().toISOString().split("T")[0];
}

function monthStart() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export default function ImportClient({ accounts }: { accounts: BankAccount[] }) {
  const router  = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [bankAccountId, setBankAccountId] = useState(accounts[0]?.id ?? "");
  const [bankFormat,    setBankFormat]    = useState<BankFormat>("BDO");
  const [skipRows,      setSkipRows]      = useState(1);
  const [periodStart,   setPeriodStart]   = useState(monthStart());
  const [periodEnd,     setPeriodEnd]     = useState(today());
  const [openingBal,    setOpeningBal]    = useState("");
  const [closingBal,    setClosingBal]    = useState("");
  const [fileName,      setFileName]      = useState("");

  const [lines,   setLines]   = useState<StatementLine[] | null>(null);
  const [skipped, setSkipped] = useState(0);
  const [parseErr, setParseErr] = useState("");

  const [isPending, startTransition] = useTransition();
  const [submitErr, setSubmitErr]    = useState("");

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const result = parseBankCSV(text, bankFormat, skipRows);
      if (!result.ok) {
        setParseErr(result.error);
        setLines(null);
      } else {
        setParseErr("");
        setLines(result.lines);
        setSkipped(result.skipped);
      }
    };
    reader.readAsText(file);
  }

  function reparse() {
    if (!fileRef.current?.files?.[0]) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const result = parseBankCSV(text, bankFormat, skipRows);
      if (!result.ok) {
        setParseErr(result.error);
        setLines(null);
      } else {
        setParseErr("");
        setLines(result.lines);
        setSkipped(result.skipped);
      }
    };
    reader.readAsText(fileRef.current.files[0]);
  }

  function handleSubmit() {
    if (!lines || lines.length === 0) return;
    const ob = parseFloat(openingBal.replace(/,/g, ""));
    const cb = parseFloat(closingBal.replace(/,/g, ""));
    if (isNaN(ob) || isNaN(cb)) { setSubmitErr("Enter valid opening and closing balances."); return; }
    if (!periodStart || !periodEnd) { setSubmitErr("Period start and end are required."); return; }

    setSubmitErr("");
    startTransition(async () => {
      const res = await importBankStatement({
        bankAccountId,
        bankFormat,
        fileName: fileName || undefined,
        periodStart,
        periodEnd,
        openingBalance: ob,
        closingBalance: cb,
        lines,
      });
      if (!res.success) {
        setSubmitErr(res.error);
      } else {
        router.push(`/finance/banking/reconcile/${res.importId}`);
      }
    });
  }

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "0.45rem 0.7rem", borderRadius: "6px",
    border: "1px solid #d1d5db", fontSize: "0.85rem", boxSizing: "border-box",
  };

  return (
    <div style={{ maxWidth: "900px" }}>
      <div style={{ marginBottom: "1.5rem" }}>
        <a href="/finance/banking/reconciliations" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>
          ← Reconciliations
        </a>
      </div>

      <h1 style={{ margin: "0 0 0.5rem", fontSize: "1.4rem", fontWeight: 700, color: "#111827", borderLeft: `4px solid ${ACCENT}`, paddingLeft: "0.75rem" }}>
        Import Bank Statement
      </h1>
      <p style={{ margin: "0 0 2rem", color: "#6b7280", fontSize: "0.875rem", paddingLeft: "1.25rem" }}>
        Upload a CSV export from your bank, preview the parsed transactions, then confirm the import.
      </p>

      {/* Setup form */}
      <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #e5e7eb", padding: "1.5rem", marginBottom: "1.5rem" }}>
        <h2 style={{ margin: "0 0 1rem", fontSize: "0.95rem", fontWeight: 700, color: "#374151" }}>Statement Details</h2>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "1rem" }}>
          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem" }}>Bank Account</label>
            <select value={bankAccountId} onChange={(e) => setBankAccountId(e.target.value)} style={inputStyle}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.bankName} – {a.accountName} ({a.accountNumber})</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem" }}>Bank Format</label>
            <select value={bankFormat} onChange={(e) => { setBankFormat(e.target.value as BankFormat); }} style={inputStyle}>
              {(Object.keys(BANK_FORMATS) as BankFormat[]).map((f) => (
                <option key={f} value={f}>{f}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem" }}>Header Rows to Skip</label>
            <input type="number" min={0} max={10} value={skipRows}
              onChange={(e) => setSkipRows(Number(e.target.value))}
              style={inputStyle} />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem" }}>Period Start</label>
            <input type="date" value={periodStart} onChange={(e) => setPeriodStart(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem" }}>Period End</label>
            <input type="date" value={periodEnd} onChange={(e) => setPeriodEnd(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem" }}>Opening Balance</label>
            <input type="text" placeholder="0.00" value={openingBal}
              onChange={(e) => setOpeningBal(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem" }}>Closing Balance</label>
            <input type="text" placeholder="0.00" value={closingBal}
              onChange={(e) => setClosingBal(e.target.value)} style={inputStyle} />
          </div>

          <div>
            <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "#374151", marginBottom: "0.3rem" }}>CSV File</label>
            <input ref={fileRef} type="file" accept=".csv,text/csv" onChange={handleFile} style={inputStyle} />
          </div>
        </div>

        {lines && (
          <div style={{ marginTop: "1rem" }}>
            <button onClick={reparse} style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem", border: "1px solid #d1d5db", borderRadius: "6px", background: "#f9fafb", cursor: "pointer" }}>
              Re-parse with current settings
            </button>
          </div>
        )}
      </div>

      {/* Parse error */}
      {parseErr && (
        <div style={{ padding: "0.85rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#b91c1c", fontSize: "0.85rem", marginBottom: "1.5rem" }}>
          {parseErr}
        </div>
      )}

      {/* Preview table */}
      {lines && lines.length > 0 && (
        <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #e5e7eb", overflow: "hidden", marginBottom: "1.5rem" }}>
          <div style={{ padding: "1rem 1.5rem", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#111827" }}>
              Preview — {lines.length} rows{skipped > 0 ? `, ${skipped} skipped` : ""}
            </div>
            <div style={{ fontSize: "0.78rem", color: "#6b7280" }}>Showing first 20 rows</div>
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", minWidth: "700px" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {["Date", "Description", "Reference", "Debit", "Credit", "Balance"].map((h, i) => (
                    <th key={i} style={{ padding: "0.6rem 0.85rem", textAlign: i >= 3 ? "right" : "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lines.slice(0, 20).map((l, i) => (
                  <tr key={i} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "0.5rem 0.85rem", color: "#6b7280", whiteSpace: "nowrap" }}>{l.transactionDate}</td>
                    <td style={{ padding: "0.5rem 0.85rem", color: "#374151", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.description}</td>
                    <td style={{ padding: "0.5rem 0.85rem", color: "#9ca3af", fontFamily: "monospace", fontSize: "0.75rem" }}>{l.referenceNumber ?? "—"}</td>
                    <td style={{ padding: "0.5rem 0.85rem", textAlign: "right", fontFamily: "monospace", color: l.debitAmount > 0 ? "#b91c1c" : "#9ca3af" }}>
                      {l.debitAmount > 0 ? fmt(l.debitAmount) : "—"}
                    </td>
                    <td style={{ padding: "0.5rem 0.85rem", textAlign: "right", fontFamily: "monospace", color: l.creditAmount > 0 ? "#057a55" : "#9ca3af" }}>
                      {l.creditAmount > 0 ? fmt(l.creditAmount) : "—"}
                    </td>
                    <td style={{ padding: "0.5rem 0.85rem", textAlign: "right", fontFamily: "monospace", color: "#6b7280" }}>
                      {l.runningBalance != null ? fmt(l.runningBalance) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {lines.length > 20 && (
            <div style={{ padding: "0.6rem 1.5rem", background: "#f9fafb", borderTop: "1px solid #e5e7eb", fontSize: "0.78rem", color: "#6b7280" }}>
              + {lines.length - 20} more rows not shown
            </div>
          )}
        </div>
      )}

      {/* Submit error */}
      {submitErr && (
        <div style={{ padding: "0.85rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#b91c1c", fontSize: "0.85rem", marginBottom: "1rem" }}>
          {submitErr}
        </div>
      )}

      {/* Confirm button */}
      {lines && lines.length > 0 && (
        <div style={{ display: "flex", gap: "1rem", alignItems: "center" }}>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            style={{
              padding: "0.65rem 1.5rem", borderRadius: "6px", background: isPending ? "#9ca3af" : ACCENT,
              color: "#fff", fontSize: "0.9rem", fontWeight: 600, border: "none", cursor: isPending ? "not-allowed" : "pointer",
            }}
          >
            {isPending ? "Importing…" : `Confirm Import (${lines.length} rows)`}
          </button>
          <span style={{ fontSize: "0.8rem", color: "#6b7280" }}>You will be taken to the reconciliation workspace.</span>
        </div>
      )}
    </div>
  );
}
