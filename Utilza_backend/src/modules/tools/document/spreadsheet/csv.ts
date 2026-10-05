import { badRequest } from "../../../../utils/errors.js";

// Abuse caps for spreadsheet-adjacent data (shared by CSV/JSON/Excel tools).
export const MAX_DATA_ROWS = 50_000;
export const MAX_DATA_COLS = 100;

// RFC4180-ish CSV parser: commas, quotes, "" escapes, \r\n and \n
// (including inside quoted fields). Rejects ragged-oversize input.
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^\uFEFF/, "");
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  let i = 0;
  while (i < src.length) {
    const c = src[i] as string;
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      field += c;
      i += 1;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (c === ",") {
      row.push(field);
      field = "";
      i += 1;
      continue;
    }
    if (c === "\r" || c === "\n") {
      row.push(field);
      field = "";
      rows.push(row);
      row = [];
      i += c === "\r" && src[i + 1] === "\n" ? 2 : 1;
      continue;
    }
    field += c;
    i += 1;
  }
  if (inQuotes) throw badRequest("Malformed CSV: unterminated quoted field.");
  row.push(field);
  rows.push(row);
  while (rows.length > 0 && (rows[rows.length - 1] as string[]).every((f) => f === "")) rows.pop();
  if (rows.length === 0) throw badRequest("CSV has no rows.");
  if (rows.length > MAX_DATA_ROWS)
    throw badRequest(`CSV has too many rows (max ${MAX_DATA_ROWS}).`);
  for (const r of rows)
    if (r.length > MAX_DATA_COLS)
      throw badRequest(`CSV has too many columns (max ${MAX_DATA_COLS}).`);
  return rows;
}

export function stringifyCsv(rows: string[][]): string {
  return (
    rows
      .map((r) => r.map((f) => (/[",\r\n]/.test(f) ? `"${f.replace(/"/g, '""')}"` : f)).join(","))
      .join("\r\n") + "\r\n"
  );
}

// First-row keys with duplicate suffixes (a,a → a,a_2) so JSON objects
// never silently drop columns.
export function uniqueHeaders(cells: string[]): string[] {
  const seen = new Map<string, number>();
  return cells.map((h, i) => {
    const name = h === "" ? `col${i + 1}` : h;
    const n = (seen.get(name) ?? 0) + 1;
    seen.set(name, n);
    return n === 1 ? name : `${name}_${n}`;
  });
}
