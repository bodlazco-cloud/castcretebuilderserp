/**
 * Client-side CSV parser for Philippine bank statement exports.
 * Pure function — no DB access, no async. Runs in the browser after FileReader
 * delivers the text. The resulting StatementLine[] is then sent to the
 * importBankStatement server action.
 */

export type StatementLine = {
  transactionDate: string;        // YYYY-MM-DD
  valueDate:       string | null;
  description:     string;
  referenceNumber: string | null;
  debitAmount:     number;        // outflow from account (positive)
  creditAmount:    number;        // inflow to account (positive)
  runningBalance:  number | null;
};

type ColumnMap = {
  date:         number;
  valueDate?:   number;
  description:  number;
  reference?:   number;
  debit:        number;
  credit:       number;
  balance?:     number;
};

// Column positions are 0-indexed, after splitting each CSV row.
// Adjust if a specific bank changes its export layout.
export const BANK_FORMATS = {
  BDO:       { date: 0, reference: 1, description: 2, debit: 3, credit: 4, balance: 5 },
  BPI:       { date: 0, description: 1, reference: 2, debit: 3, credit: 4, balance: 5 },
  METROBANK: { date: 0, valueDate: 1, description: 2, reference: 3, debit: 4, credit: 5, balance: 6 },
  GENERIC:   { date: 0, description: 1, debit: 2, credit: 3, balance: 4 },
} satisfies Record<string, ColumnMap>;

export type BankFormat = keyof typeof BANK_FORMATS;

function parseAmount(raw: string): number {
  if (!raw || raw.trim() === "" || raw.trim() === "-") return 0;
  // Remove currency symbols, thousands separators, then parse
  return Math.abs(parseFloat(raw.replace(/[₱,\s]/g, "")) || 0);
}

function parseDate(raw: string): string | null {
  if (!raw || !raw.trim()) return null;
  // Common Philippine bank date formats: MM/DD/YYYY, DD-MM-YYYY, YYYY-MM-DD
  const s = raw.trim();

  // Already ISO
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;

  // MM/DD/YYYY
  const mdy = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) return `${mdy[3]}-${mdy[1].padStart(2, "0")}-${mdy[2].padStart(2, "0")}`;

  // DD-MM-YYYY or DD/MM/YYYY
  const dmy = s.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, "0")}-${dmy[1].padStart(2, "0")}`;

  // MMM DD, YYYY  e.g. "Jan 05, 2026"
  const monthNames: Record<string, string> = {
    jan: "01", feb: "02", mar: "03", apr: "04", may: "05", jun: "06",
    jul: "07", aug: "08", sep: "09", oct: "10", nov: "11", dec: "12",
  };
  const mdy2 = s.match(/^([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{4})$/);
  if (mdy2) {
    const mo = monthNames[mdy2[1].toLowerCase()];
    if (mo) return `${mdy2[3]}-${mo}-${mdy2[2].padStart(2, "0")}`;
  }

  return null;
}

function splitCSVRow(row: string): string[] {
  // Handle quoted fields (descriptions sometimes contain commas)
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (const ch of row) {
    if (ch === '"') { inQuotes = !inQuotes; continue; }
    if (ch === "," && !inQuotes) { result.push(current.trim()); current = ""; continue; }
    current += ch;
  }
  result.push(current.trim());
  return result;
}

export type ParseResult =
  | { ok: true;  lines: StatementLine[]; skipped: number }
  | { ok: false; error: string };

export function parseBankCSV(
  csvText:    string,
  format:     BankFormat = "GENERIC",
  skipRows:   number     = 1,   // header rows to skip before data starts
): ParseResult {
  const map: ColumnMap = BANK_FORMATS[format];
  const rows  = csvText.split(/\r?\n/).filter((r) => r.trim().length > 0);
  const data  = rows.slice(skipRows);

  if (data.length === 0) return { ok: false, error: "No data rows found after header." };

  const lines: StatementLine[] = [];
  let skipped = 0;

  for (const row of data) {
    const cols = splitCSVRow(row);

    const rawDate = cols[map.date] ?? "";
    const date    = parseDate(rawDate);
    if (!date) { skipped++; continue; }   // skip summary/totals rows with no valid date

    const debit  = parseAmount(cols[map.debit]  ?? "");
    const credit = parseAmount(cols[map.credit] ?? "");

    // Skip rows where both amounts are zero (blank spacer rows)
    if (debit === 0 && credit === 0) { skipped++; continue; }

    lines.push({
      transactionDate: date,
      valueDate:       map.valueDate != null ? parseDate(cols[map.valueDate] ?? "") : null,
      description:     cols[map.description]?.trim() ?? "",
      referenceNumber: map.reference != null ? (cols[map.reference]?.trim() || null) : null,
      debitAmount:     debit,
      creditAmount:    credit,
      runningBalance:  map.balance != null ? parseAmount(cols[map.balance] ?? "") || null : null,
    });
  }

  if (lines.length === 0) {
    return { ok: false, error: `No valid transaction rows parsed. ${skipped} rows skipped.` };
  }

  return { ok: true, lines, skipped };
}
