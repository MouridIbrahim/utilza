import { Router } from "express";
import { createFileToolHandler } from "../../execute/execute.js";
import { wordToPdfConfig } from "./word-to-pdf.schema.js";
import { wordToPdf } from "./word-to-pdf.service.js";

export const wordToPdfRouter = Router();

wordToPdfRouter.post(
  "/",
  ...createFileToolHandler({
    toolSlug: wordToPdfConfig.toolSlug,
    maxFiles: wordToPdfConfig.maxFiles,
    allowedExts: [...wordToPdfConfig.allowedExts],
    process: wordToPdf,
  }),
);
