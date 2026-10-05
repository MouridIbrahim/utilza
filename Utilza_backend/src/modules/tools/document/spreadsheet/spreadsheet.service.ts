import { badRequest } from "../../../../utils/errors.js";
import type { ToolFileInput, ToolProcessResult } from "../../execute/execute.js";
import { MAX_DATA_COLS, MAX_DATA_ROWS, parseCsv, stringifyCsv, uniqueHeaders } from "./csv.js";
import { XLSX_MIME, readFirstSheet, writeXlsx, type CellValue } from "./excel.js";

export const CSV_MIME = "text/csv";
export const JSON_MIME = "application/json";

function exactlyOne(inputs: ToolFileInput[], what: string): ToolFileInput {
  if (inputs.length !== 1) throw badRequest(`Exactly one ${what} file is required.`);
  return inputs[0] as ToolFileInput;
}

function cellText(v: CellValue): string {
  return v === null ? "" : String(v);
}

// First sheet → CSV download (header row included).
export async function excelToCsv(inputs: ToolFileInput[]): Promise<ToolProcessResult> {
  const { headers, rows } = await readFirstSheet(exactlyOne(inputs, "Excel").buffer);
  const buffer = Buffer.from(stringifyCsv([headers, ...rows.map((r) => r.map(cellText))]), "utf8");
  return { buffer, ext: "csv", mimeType: CSV_MIME };
}

// First sheet → JSON array download (first row = keys).
export async function excelToJson(inputs: ToolFileInput[]): Promise<ToolProcessResult> {
  const { headers, rows } = await readFirstSheet(exactlyOne(inputs, "Excel").buffer);
  const keys = uniqueHeaders(headers);
  const docs = rows.map((r) =>
    Object.fromEntries(keys.map((k, i) => [k, (r[i] as CellValue) ?? null])),
  );
  const buffer = Buffer.from(JSON.stringify(docs, null, 2), "utf8");
  return { buffer, ext: "json", mimeType: JSON_MIME };
}

// CSV file → JSON array download.
export async function csvToJson(inputs: ToolFileInput[]): Promise<ToolProcessResult> {
  const input = exactlyOne(inputs, "CSV");
  const rows = parseCsv(input.buffer.toString("utf8"));
  const keys = uniqueHeaders(rows[0] as string[]);
  const docs = rows
    .slice(1)
    .map((r) => Object.fromEntries(keys.map((k, i) => [k, (r[i] as string) ?? null])));
  const buffer = Buffer.from(JSON.stringify(docs, null, 2), "utf8");
  return { buffer, ext: "json", mimeType: JSON_MIME };
}

// CSV file → .xlsx download (first row kept as the header row).
export async function csvToExcel(inputs: ToolFileInput[]): Promise<ToolProcessResult> {
  const input = exactlyOne(inputs, "CSV");
  const rows = parseCsv(input.buffer.toString("utf8"));
  const buffer = await writeXlsx(rows[0] as string[], rows.slice(1));
  return { buffer, ext: "xlsx", mimeType: XLSX_MIME };
}

function jsonScalar(v: unknown): string {
  if (v === null || v === undefined) return "";
  if (typeof v === "string") return v;
  if (typeof v === "number" || typeof v === "boolean") return String(v);
  return JSON.stringify(v);
}

// JSON array file → CSV download. Objects only; keys union in first-seen
// order; nested values are JSON-encoded into their cell.
export async function jsonToCsv(inputs: ToolFileInput[]): Promise<ToolProcessResult> {
  const input = exactlyOne(inputs, "JSON");
  let docs: unknown;
  try {
    docs = JSON.parse(input.buffer.toString("utf8"));
  } catch {
    throw badRequest("File is not valid JSON.");
  }
  if (!Array.isArray(docs)) throw badRequest("JSON must be an array of objects.");
  if (docs.length === 0) throw badRequest("JSON array is empty.");
  if (docs.length > MAX_DATA_ROWS)
    throw badRequest(`JSON has too many rows (max ${MAX_DATA_ROWS}).`);
  const keys: string[] = [];
  for (const doc of docs) {
    if (typeof doc !== "object" || doc === null || Array.isArray(doc))
      throw badRequest("JSON must be an array of objects.");
    for (const k of Object.keys(doc)) if (!keys.includes(k)) keys.push(k);
  }
  if (keys.length > MAX_DATA_COLS)
    throw badRequest(`JSON has too many columns (max ${MAX_DATA_COLS}).`);
  const rows = (docs as Array<Record<string, unknown>>).map((doc) =>
    keys.map((k) => jsonScalar(doc[k])),
  );
  const buffer = Buffer.from(stringifyCsv([keys, ...rows]), "utf8");
  return { buffer, ext: "csv", mimeType: CSV_MIME };
}
