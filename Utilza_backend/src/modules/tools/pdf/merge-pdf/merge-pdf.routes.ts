import { Router } from "express";
import { createFileToolHandler } from "../../execute/execute.js";
import { mergePdfConfig } from "./merge-pdf.schema.js";
import { mergePdfs } from "./merge-pdf.service.js";

export const mergePdfRouter = Router();

mergePdfRouter.post(
  "/",
  ...createFileToolHandler({
    toolSlug: mergePdfConfig.toolSlug,
    maxFiles: mergePdfConfig.maxFiles,
    allowedExts: [...mergePdfConfig.allowedExts],
    process: mergePdfs,
  }),
);
