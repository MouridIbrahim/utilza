import { Buffer } from "node:buffer";
import ExcelJS from "exceljs";
import { badRequest } from "../../../../utils/errors.js";
import { MAX_DATA_COLS, MAX_DATA_ROWS } from "./csv.js";

export type CellValue = string | number | boolean | null;

export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

function normalizeCell(value: unknown): CellValue {
  if (value === null || value === undefined) return null;
  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean")
    return value;
  if (value instanceof Date) return value.toISOString();
  if (typeof value === "object") {
    const v = value as { text?: unknown; richText?: Array<{ text?: unknown }>; result?: unknown };
    if (Array.isArray(v.richText))
      return v.richText.map((r) => (typeof r.text === "string" ? r.text : "")).join("");
    if (typeof v.text === "string") return v.text;
    if (
      v.result === null ||
      typeof v.result === "string" ||
      typeof v.result === "number" ||
      typeof v.result === "boolean"
    )
      return v.result;
    return JSON.stringify(value);
  }
  return String(value);
}

// Reads the first worksheet: first row = headers, rest = data rows.
// Ragged rows are padded with null to the widest row.
export async function readFirstSheet(
  buffer: Buffer,
): Promise<{ headers: string[]; rows: CellValue[][] }> {
  const workbook = new ExcelJS.Workbook();
  try {
    // exceljs 4.x ships a fake global `Buffer extends ArrayBuffer` type, so
    // hand load() a genuine ArrayBuffer copy (JSZip accepts it natively).
    const data = new Uint8Array(buffer).buffer;
    await workbook.xlsx.load(data);
  } catch {
    throw badRequest("File is not a valid Excel workbook.");
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) throw badRequest("Workbook has no worksheets.");
  const raw: CellValue[][] = [];
  sheet.eachRow({ includeEmpty: false }, (row) => {
    const vals: CellValue[] = [];
    row.eachCell({ includeEmpty: true }, (cell, col) => {
      if (col > MAX_DATA_COLS)
        throw badRequest(`Worksheet has too many columns (max ${MAX_DATA_COLS}).`);
      vals[col - 1] = normalizeCell(cell.value);
    });
    raw.push(vals);
  });
  if (raw.length === 0) throw badRequest("Worksheet is empty.");
  if (raw.length > MAX_DATA_ROWS)
    throw badRequest(`Worksheet has too many rows (max ${MAX_DATA_ROWS}).`);
  const width = Math.max(...raw.map((r) => r.length));
  const padded = raw.map((r) => {
    while (r.length < width) r.push(null);
    return r;
  });
  const headers = (padded[0] as CellValue[]).map((h) => (h === null ? "" : String(h)));
  return { headers, rows: padded.slice(1) };
}

export async function writeXlsx(headers: string[], rows: CellValue[][]): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet("Sheet1");
  sheet.addRow(headers);
  for (const row of rows) sheet.addRow(row.map((v) => (v === null ? null : v)));
  const out: unknown = await workbook.xlsx.writeBuffer();
  // Copy through Uint8Array: avoids exceljs's fake global Buffer type.
  return Buffer.from(out as Uint8Array);
}
