import { Router } from "express";
import { createFileToolHandler } from "../../execute/execute.js";
import { compressPdfConfig } from "./compress-pdf.schema.js";
import { compressPdf } from "./compress-pdf.service.js";

export const compressPdfRouter = Router();

compressPdfRouter.post(
  "/",
  ...createFileToolHandler({
    toolSlug: compressPdfConfig.toolSlug,
    maxFiles: compressPdfConfig.maxFiles,
    allowedExts: [...compressPdfConfig.allowedExts],
    process: compressPdf,
  }),
);
