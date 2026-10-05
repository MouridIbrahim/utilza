import { Router } from "express";
import { createFileToolHandler } from "../../execute/execute.js";
import {
  csvToExcel,
  csvToJson,
  excelToCsv,
  excelToJson,
  jsonToCsv,
} from "./spreadsheet.service.js";

const MAX_FILES = 2;
const XLSX = ["xlsx"];
const CSV = ["csv"];
const JSON = ["json"];

function fileRouter(
  toolSlug: string,
  allowedExts: string[],
  process: Parameters<typeof createFileToolHandler>[0]["process"],
): Router {
  const router = Router();
  router.post(
    "/",
    ...createFileToolHandler({ toolSlug, maxFiles: MAX_FILES, allowedExts, process }),
  );
  return router;
}

export const excelToCsvRouter = fileRouter("excel-to-csv", XLSX, excelToCsv);
export const excelToJsonRouter = fileRouter("excel-to-json", XLSX, excelToJson);
export const csvToJsonRouter = fileRouter("csv-to-json", CSV, csvToJson);
export const csvToExcelRouter = fileRouter("csv-to-excel", CSV, csvToExcel);
export const jsonToCsvRouter = fileRouter("json-to-csv", JSON, jsonToCsv);
