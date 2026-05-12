"use client";

import { useState, useRef, useTransition } from "react";
import * as XLSX from "xlsx";
import { importMaterials, importVendors, importDevelopers, importSubcontractors } from "@/actions/import-data";
import type { ImportRow, ImportResult } from "@/actions/import-data";

const ACCENT = "#6366f1";

const ENTITY_CONFIG = {
  materials: {
    label: "Materials",
    href: "/master-list/materials",
    columns: ["code*", "name*", "unit*", "admin_price*", "category", "minimum_quantity"],
    sample: [
      { code: "MTL-001", name: "Portland Cement (40kg)", unit: "bag", admin_price: 285.00, category: "Concrete", minimum_quantity: 50 },
      { code: "MTL-002", name: "Deformed Bar 12mm x 6m", unit: "pc", admin_price: 310.00, category: "Steel", minimum_quantity: 100 },
    ],
  },
  vendors: {
    label: "Vendors / Suppliers",
    href: "/master-list/vendors",
    columns: ["name*", "contact_person", "phone", "email", "address"],
    sample: [
      { name: "Holcim Philippines", contact_person: "Juan dela Cruz", phone: "09171234567", email: "orders@holcim.ph", address: "Makati City" },
      { name: "Pag-IBIG Hardware", contact_person: "Maria Santos", phone: "09281234567", email: "", address: "Quezon City" },
    ],
  },
  developers: {
    label: "Developers",
    href: "/master-list/developers",
    columns: ["name*"],
    sample: [
      { name: "Filinvest Land, Inc." },
      { name: "SM Prime Holdings" },
    ],
  },
  subcontractors: {
    label: "Subcontractors",
    href: "/master-list/subcontractors",
    columns: ["code*", "name*", "trade_types*", "default_max_active_units", "manpower_benchmark"],
    sample: [
      { code: "SC-001", name: "Reyes Construction Group", trade_types: "STRUCTURAL", default_max_active_units: 15, manpower_benchmark: 1.5 },
      { code: "SC-002", name: "Santos Finish Works", trade_types: "ARCHITECTURAL", default_max_active_units: 10, manpower_benchmark: 1.0 },
    ],
  },
} as const;

type EntityKey = keyof typeof ENTITY_CONFIG;

function downloadTemplate(entity: EntityKey) {
  const cfg = ENTITY_CONFIG[entity];
  const ws = XLSX.utils.json_to_sheet([...cfg.sample]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, cfg.label);
  XLSX.writeFile(wb, `import-template-${entity}.xlsx`);
}

function EntityImporter({ entity, onDone }: { entity: EntityKey; onDone: (r: ImportResult) => void }) {
  const cfg = ENTITY_CONFIG[entity];
  const fileRef = useRef<HTMLInputElement>(null);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ImportRow[]>([]);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setParseError(null);
    setRows([]);

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = ev.target?.result;
        const wb = XLSX.read(data, { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const parsed = XLSX.utils.sheet_to_json<ImportRow>(ws, { defval: "" });
        if (parsed.length === 0) { setParseError("File appears to be empty."); return; }
        setRows(parsed);
      } catch {
        setParseError("Could not parse file. Make sure it is a valid .xlsx or .csv.");
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function handleImport() {
    if (rows.length === 0) return;
    startTransition(async () => {
      let result: ImportResult;
      if (entity === "materials")       result = await importMaterials(rows);
      else if (entity === "vendors")     result = await importVendors(rows);
      else if (entity === "developers")  result = await importDevelopers(rows);
      else                               result = await importSubcontractors(rows);
      setRows([]);
      setFileName("");
      if (fileRef.current) fileRef.current.value = "";
      onDone(result);
    });
  }

  return (
    <div style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 1px 4px rgba(0,0,0,0.07)", padding: "1.25rem", marginBottom: "1.25rem" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "0.75rem" }}>
        <h3 style={{ margin: 0, fontSize: "0.9rem", fontWeight: 700, color: "#374151" }}>{cfg.label}</h3>
        <div style={{ display: "flex", gap: "0.5rem" }}>
          <button
            onClick={() => downloadTemplate(entity)}
            style={{ padding: "0.35rem 0.8rem", borderRadius: "5px", border: "1px solid #d1d5db", background: "#fff", color: "#374151", fontSize: "0.78rem", fontWeight: 600, cursor: "pointer" }}
          >
            ↓ Sample Template
          </button>
          <a href={cfg.href} style={{ padding: "0.35rem 0.8rem", borderRadius: "5px", border: "1px solid #d1d5db", background: "#fff", color: "#6366f1", fontSize: "0.78rem", fontWeight: 600, textDecoration: "none" }}>
            View List →
          </a>
        </div>
      </div>

      <div style={{ fontSize: "0.75rem", color: "#9ca3af", marginBottom: "0.75rem" }}>
        Required columns: {cfg.columns.filter((c) => c.endsWith("*")).map((c) => c.replace("*", "")).join(", ")}
        {cfg.columns.some((c) => !c.endsWith("*")) && (
          <> &nbsp;·&nbsp; Optional: {cfg.columns.filter((c) => !c.endsWith("*")).join(", ")}</>
        )}
      </div>

      <div style={{ display: "flex", gap: "0.75rem", alignItems: "center" }}>
        <label style={{
          display: "inline-flex", alignItems: "center", gap: "0.5rem", padding: "0.45rem 0.9rem",
          borderRadius: "6px", border: "2px dashed #d1d5db", cursor: "pointer", fontSize: "0.8rem", color: "#6b7280",
          background: "#f9fafb",
        }}>
          <span>📁 {fileName || "Choose CSV or Excel file…"}</span>
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleFile} style={{ display: "none" }} />
        </label>

        {rows.length > 0 && (
          <button
            onClick={handleImport}
            disabled={isPending}
            style={{ padding: "0.45rem 1rem", borderRadius: "6px", background: isPending ? "#a5b4fc" : ACCENT, color: "#fff", border: "none", fontSize: "0.8rem", fontWeight: 600, cursor: isPending ? "not-allowed" : "pointer" }}
          >
            {isPending ? "Importing…" : `Import ${rows.length} row${rows.length !== 1 ? "s" : ""}`}
          </button>
        )}
      </div>

      {parseError && (
        <div style={{ marginTop: "0.6rem", padding: "0.55rem 0.8rem", background: "#fef2f2", borderRadius: "5px", color: "#b91c1c", fontSize: "0.8rem" }}>
          {parseError}
        </div>
      )}

      {rows.length > 0 && !parseError && (
        <div style={{ marginTop: "0.6rem", fontSize: "0.78rem", color: "#6b7280" }}>
          Preview: {rows.length} row{rows.length !== 1 ? "s" : ""} detected — columns found: {Object.keys(rows[0]).join(", ")}
        </div>
      )}
    </div>
  );
}

export function ImportHub() {
  const [results, setResults] = useState<Array<{ entity: string; result: ImportResult }>>([]);

  function handleDone(entity: string, result: ImportResult) {
    setResults((prev) => [{ entity, result }, ...prev]);
  }

  return (
    <div>
      {(["materials", "vendors", "developers", "subcontractors"] as EntityKey[]).map((e) => (
        <EntityImporter key={e} entity={e} onDone={(r) => handleDone(ENTITY_CONFIG[e].label, r)} />
      ))}

      {results.length > 0 && (
        <div style={{ marginTop: "1.5rem" }}>
          <h2 style={{ margin: "0 0 0.75rem", fontSize: "0.95rem", fontWeight: 700, color: "#374151" }}>Import Results</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
            {results.map((r, i) => (
              <div key={i} style={{ background: "#fff", borderRadius: "7px", boxShadow: "0 1px 3px rgba(0,0,0,0.06)", padding: "0.9rem 1.1rem" }}>
                <div style={{ display: "flex", gap: "1rem", alignItems: "center", marginBottom: r.result.errors.length > 0 ? "0.5rem" : 0 }}>
                  <span style={{ fontWeight: 700, color: "#374151", fontSize: "0.875rem" }}>{r.entity}</span>
                  <span style={{ padding: "0.15rem 0.55rem", borderRadius: "999px", background: "#dcfce7", color: "#166534", fontSize: "0.72rem", fontWeight: 600 }}>
                    {r.result.imported} imported
                  </span>
                  {r.result.skipped > 0 && (
                    <span style={{ padding: "0.15rem 0.55rem", borderRadius: "999px", background: "#fef9c3", color: "#713f12", fontSize: "0.72rem", fontWeight: 600 }}>
                      {r.result.skipped} skipped
                    </span>
                  )}
                </div>
                {r.result.errors.length > 0 && (
                  <ul style={{ margin: 0, paddingLeft: "1.2rem", fontSize: "0.78rem", color: "#b91c1c" }}>
                    {r.result.errors.slice(0, 5).map((e, j) => <li key={j}>{e}</li>)}
                    {r.result.errors.length > 5 && <li>…and {r.result.errors.length - 5} more</li>}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
