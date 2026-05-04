"use client";

import { useState, useTransition } from "react";
import { runAutoMatch, manualMatch, unmatch, finalizeReconciliation } from "@/actions/banking";
import { useRouter } from "next/navigation";

const ACCENT = "#ff5a1f";
const fmt = (n: number | string) =>
  `₱${Number(n).toLocaleString("en-PH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

type StatementLine = {
  id: string;
  transactionDate: string;
  description: string;
  referenceNumber: string | null;
  debitAmount: string;
  creditAmount: string;
};

type ErpTxn = {
  id: string;
  transactionDate: string;
  transactionType: string;
  amount: string;
  description: string;
  referenceNumber: string | null;
};

type MatchedItem = {
  id: string;
  statementLineId: string | null;
  erpTransactionId: string | null;
  matchType: string;
  statementAmount: string | null;
  erpAmount: string | null;
  variance: string | null;
  actionNote: string | null;
  stmtDesc: string;
  stmtDate: string;
  erpDesc: string;
  erpDate: string;
};

type Props = {
  importId:      string;
  accountName:   string;
  periodStart:   string;
  periodEnd:     string;
  status:        string;
  unmatchedLines: StatementLine[];
  availableErp:   ErpTxn[];
  matchedItems:   MatchedItem[];
};

export default function ReconcileClient({
  importId, accountName, periodStart, periodEnd, status,
  unmatchedLines: initLines,
  availableErp:   initErp,
  matchedItems:   initMatched,
}: Props) {
  const router = useRouter();

  const [lines,   setLines]   = useState<StatementLine[]>(initLines);
  const [erpTxns, setErpTxns] = useState<ErpTxn[]>(initErp);
  const [matched, setMatched] = useState<MatchedItem[]>(initMatched);

  const [selectedLine, setSelectedLine] = useState<string | null>(null);
  const [selectedErp,  setSelectedErp]  = useState<string | null>(null);

  const [isPending, startTransition] = useTransition();
  const [msg, setMsg] = useState("");
  const [err, setErr] = useState("");

  const isFinalized = status === "FINALIZED";

  function notice(m: string) { setMsg(m); setErr(""); setTimeout(() => setMsg(""), 4000); }
  function error(e: string)  { setErr(e); setMsg(""); }

  function handleAutoMatch() {
    startTransition(async () => {
      const res = await runAutoMatch({ importId });
      if (!res.success) { error(res.error); return; }
      notice(`Auto-match complete: ${res.matched} matched, ${res.remaining} remaining.`);
      router.refresh();
    });
  }

  function handleManualMatch() {
    if (!selectedLine || !selectedErp) return;
    startTransition(async () => {
      const res = await manualMatch({ importId, statementLineId: selectedLine, erpTransactionId: selectedErp });
      if (!res.success) { error(res.error); return; }
      setSelectedLine(null);
      setSelectedErp(null);
      notice("Matched successfully.");
      router.refresh();
    });
  }

  function handleUnmatch(itemId: string) {
    startTransition(async () => {
      const res = await unmatch({ reconciliationItemId: itemId });
      if (!res.success) { error(res.error); return; }
      notice("Unmatched.");
      router.refresh();
    });
  }

  function handleFinalize() {
    startTransition(async () => {
      const res = await finalizeReconciliation({ importId });
      if (!res.success) { error(res.error); return; }
      notice(`Finalized. Matched: ${res.matchedCount}, Unmatched: ${res.unmatchedCount}, Variance: ${fmt(res.variance)}`);
      router.refresh();
    });
  }

  const btnBase: React.CSSProperties = {
    padding: "0.5rem 1rem", borderRadius: "6px", fontSize: "0.85rem",
    fontWeight: 600, border: "none", cursor: "pointer",
  };

  return (
    <div style={{ maxWidth: "1300px" }}>
      {/* Header */}
      <div style={{ marginBottom: "1.5rem" }}>
        <a href="/finance/banking/reconciliations" style={{ fontSize: "0.8rem", color: ACCENT, textDecoration: "none" }}>
          ← Reconciliations
        </a>
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginBottom: "1.5rem" }}>
        <div>
          <h1 style={{ margin: "0 0 0.25rem", fontSize: "1.4rem", fontWeight: 700, color: "#111827", borderLeft: `4px solid ${ACCENT}`, paddingLeft: "0.75rem" }}>
            Reconcile — {accountName}
          </h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "0.875rem", paddingLeft: "1.25rem" }}>
            {periodStart} → {periodEnd} · {lines.length} unmatched statement lines · {erpTxns.length} unmatched ERP transactions
          </p>
        </div>
        <div style={{ display: "flex", gap: "0.75rem", alignItems: "center", flexWrap: "wrap" }}>
          {!isFinalized && (
            <>
              <button onClick={handleAutoMatch} disabled={isPending || lines.length === 0}
                style={{ ...btnBase, background: "#1a56db", color: "#fff", opacity: lines.length === 0 ? 0.5 : 1 }}>
                {isPending ? "Working…" : "Auto-Match"}
              </button>
              <button onClick={handleManualMatch} disabled={isPending || !selectedLine || !selectedErp}
                style={{ ...btnBase, background: selectedLine && selectedErp ? "#057a55" : "#e5e7eb", color: selectedLine && selectedErp ? "#fff" : "#9ca3af" }}>
                Match Selected
              </button>
              <button onClick={handleFinalize} disabled={isPending}
                style={{ ...btnBase, background: ACCENT, color: "#fff" }}>
                Finalize
              </button>
            </>
          )}
          {isFinalized && (
            <span style={{ padding: "0.4rem 0.85rem", borderRadius: "999px", background: "#f0fdf4", color: "#057a55", fontWeight: 700, fontSize: "0.82rem" }}>
              FINALIZED
            </span>
          )}
        </div>
      </div>

      {/* Status messages */}
      {msg && <div style={{ padding: "0.75rem 1rem", background: "#f0fdf4", border: "1px solid #a7f3d0", borderRadius: "8px", color: "#065f46", fontSize: "0.85rem", marginBottom: "1rem" }}>{msg}</div>}
      {err && <div style={{ padding: "0.75rem 1rem", background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", color: "#b91c1c", fontSize: "0.85rem", marginBottom: "1rem" }}>{err}</div>}

      {!isFinalized && selectedLine && !selectedErp && (
        <div style={{ padding: "0.6rem 1rem", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "6px", fontSize: "0.8rem", color: "#78350f", marginBottom: "1rem" }}>
          Statement line selected. Now select an ERP transaction to match it with.
        </div>
      )}

      {/* Split workspace */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem", marginBottom: "2rem" }}>
        {/* Unmatched statement lines */}
        <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #e5e7eb", overflow: "hidden" }}>
          <div style={{ padding: "0.85rem 1.25rem", background: "#f8fafc", borderBottom: "1px solid #e5e7eb", fontWeight: 700, fontSize: "0.88rem", color: "#374151" }}>
            Unmatched Statement Lines ({lines.length})
          </div>
          {lines.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af", fontSize: "0.85rem" }}>All lines matched.</div>
          ) : (
            <div style={{ maxHeight: "480px", overflowY: "auto" }}>
              {lines.map((l) => {
                const isDebit = Number(l.debitAmount) > 0;
                const amount  = isDebit ? Number(l.debitAmount) : Number(l.creditAmount);
                const selected = selectedLine === l.id;
                return (
                  <div key={l.id}
                    onClick={() => !isFinalized && setSelectedLine(selected ? null : l.id)}
                    style={{
                      padding: "0.75rem 1.25rem", borderBottom: "1px solid #f3f4f6",
                      cursor: isFinalized ? "default" : "pointer",
                      background: selected ? "#eff6ff" : "transparent",
                      borderLeft: selected ? "3px solid #1a56db" : "3px solid transparent",
                      transition: "background 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1, minWidth: 0, marginRight: "0.75rem" }}>
                        <div style={{ fontSize: "0.82rem", color: "#374151", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.description}</div>
                        <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: "0.15rem" }}>
                          {l.transactionDate}{l.referenceNumber ? ` · ${l.referenceNumber}` : ""}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.88rem", color: isDebit ? "#b91c1c" : "#057a55" }}>
                          {isDebit ? "−" : "+"}{fmt(amount)}
                        </div>
                        <div style={{ fontSize: "0.68rem", color: "#9ca3af" }}>{isDebit ? "DEBIT" : "CREDIT"}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Unmatched ERP transactions */}
        <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #e5e7eb", overflow: "hidden" }}>
          <div style={{ padding: "0.85rem 1.25rem", background: "#f8fafc", borderBottom: "1px solid #e5e7eb", fontWeight: 700, fontSize: "0.88rem", color: "#374151" }}>
            Unmatched ERP Transactions ({erpTxns.length})
          </div>
          {erpTxns.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "#9ca3af", fontSize: "0.85rem" }}>All ERP transactions matched.</div>
          ) : (
            <div style={{ maxHeight: "480px", overflowY: "auto" }}>
              {erpTxns.map((t) => {
                const isDebit  = t.transactionType === "DEBIT";
                const selected = selectedErp === t.id;
                return (
                  <div key={t.id}
                    onClick={() => !isFinalized && setSelectedErp(selected ? null : t.id)}
                    style={{
                      padding: "0.75rem 1.25rem", borderBottom: "1px solid #f3f4f6",
                      cursor: isFinalized ? "default" : "pointer",
                      background: selected ? "#f0fdf4" : "transparent",
                      borderLeft: selected ? "3px solid #057a55" : "3px solid transparent",
                      transition: "background 0.15s",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div style={{ flex: 1, minWidth: 0, marginRight: "0.75rem" }}>
                        <div style={{ fontSize: "0.82rem", color: "#374151", fontWeight: 500, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.description}</div>
                        <div style={{ fontSize: "0.72rem", color: "#9ca3af", marginTop: "0.15rem" }}>
                          {t.transactionDate}{t.referenceNumber ? ` · ${t.referenceNumber}` : ""}
                        </div>
                      </div>
                      <div style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontFamily: "monospace", fontWeight: 700, fontSize: "0.88rem", color: isDebit ? "#b91c1c" : "#057a55" }}>
                          {isDebit ? "−" : "+"}{fmt(t.amount)}
                        </div>
                        <div style={{ fontSize: "0.68rem", color: "#9ca3af" }}>{t.transactionType}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Matched items */}
      {matched.length > 0 && (
        <div style={{ background: "#fff", borderRadius: "10px", border: "1px solid #e5e7eb", overflow: "hidden" }}>
          <div style={{ padding: "0.85rem 1.25rem", background: "#f8fafc", borderBottom: "1px solid #e5e7eb", fontWeight: 700, fontSize: "0.88rem", color: "#374151" }}>
            Matched Pairs ({matched.length})
          </div>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.8rem", minWidth: "700px" }}>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {["Statement", "ERP Transaction", "Stmt Amount", "ERP Amount", "Variance", "Type", ""].map((h, i) => (
                    <th key={i} style={{ padding: "0.6rem 1rem", textAlign: i >= 2 && i <= 4 ? "right" : "left", fontWeight: 600, color: "#374151", borderBottom: "1px solid #e5e7eb", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matched.map((m) => {
                  const variance = Number(m.variance ?? 0);
                  return (
                    <tr key={m.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "0.6rem 1rem", color: "#374151", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <div>{m.stmtDesc || "—"}</div>
                        <div style={{ fontSize: "0.7rem", color: "#9ca3af" }}>{m.stmtDate}</div>
                      </td>
                      <td style={{ padding: "0.6rem 1rem", color: "#374151", maxWidth: "180px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <div>{m.erpDesc || "—"}</div>
                        <div style={{ fontSize: "0.7rem", color: "#9ca3af" }}>{m.erpDate}</div>
                      </td>
                      <td style={{ padding: "0.6rem 1rem", textAlign: "right", fontFamily: "monospace" }}>{m.statementAmount ? fmt(m.statementAmount) : "—"}</td>
                      <td style={{ padding: "0.6rem 1rem", textAlign: "right", fontFamily: "monospace" }}>{m.erpAmount ? fmt(m.erpAmount) : "—"}</td>
                      <td style={{ padding: "0.6rem 1rem", textAlign: "right", fontFamily: "monospace", color: variance > 0 ? "#d97706" : "#057a55", fontWeight: variance > 0 ? 700 : 400 }}>
                        {fmt(variance)}
                      </td>
                      <td style={{ padding: "0.6rem 1rem" }}>
                        <span style={{ fontSize: "0.72rem", fontWeight: 600, padding: "0.15rem 0.4rem", borderRadius: "4px", background: m.matchType === "MATCHED" ? "#f0fdf4" : "#f8fafc", color: m.matchType === "MATCHED" ? "#057a55" : "#6b7280" }}>
                          {m.matchType.replace("_", " ")}
                        </span>
                        {m.actionNote && m.actionNote !== "AUTO_MATCH" && m.actionNote !== "MANUAL_MATCH" && (
                          <div style={{ fontSize: "0.68rem", color: "#9ca3af", marginTop: "0.15rem" }}>{m.actionNote.replace(/^MANUAL_MATCH: /, "")}</div>
                        )}
                        <div style={{ fontSize: "0.65rem", color: "#c3b8a8", marginTop: "0.1rem" }}>
                          {m.actionNote?.startsWith("AUTO") ? "auto" : "manual"}
                        </div>
                      </td>
                      <td style={{ padding: "0.6rem 1rem" }}>
                        {!isFinalized && (
                          <button onClick={() => handleUnmatch(m.id)} disabled={isPending}
                            style={{ fontSize: "0.72rem", padding: "0.2rem 0.5rem", borderRadius: "4px", border: "1px solid #e5e7eb", background: "#fff", color: "#6b7280", cursor: "pointer" }}>
                            Unmatch
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
