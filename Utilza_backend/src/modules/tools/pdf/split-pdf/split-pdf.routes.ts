import { Router } from "express";
import { createFileToolHandler } from "../../execute/execute.js";
import { splitPdfBodySchema, splitPdfConfig } from "./split-pdf.schema.js";
import { splitPdf } from "./split-pdf.service.js";

export const splitPdfRouter = Router();

splitPdfRouter.post(
  "/",
  ...createFileToolHandler({
    toolSlug: splitPdfConfig.toolSlug,
    maxFiles: splitPdfConfig.maxFiles,
    allowedExts: [...splitPdfConfig.allowedExts],
    bodySchema: splitPdfBodySchema,
    process: splitPdf,
  }),
);
