import { Router } from "express";
import { createFileToolHandler } from "../../execute/execute.js";
import { flattenPdfConfig } from "./flatten-pdf.schema.js";
import { flattenPdf } from "./flatten-pdf.service.js";

export const flattenPdfRouter = Router();

flattenPdfRouter.post(
  "/",
  ...createFileToolHandler({
    toolSlug: flattenPdfConfig.toolSlug,
    maxFiles: flattenPdfConfig.maxFiles,
    allowedExts: [...flattenPdfConfig.allowedExts],
    process: flattenPdf,
  }),
);
