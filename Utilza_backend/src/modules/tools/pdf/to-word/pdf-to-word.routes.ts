import { Router } from "express";
import { createFileToolHandler } from "../../execute/execute.js";
import { pdfToWordConfig } from "./pdf-to-word.schema.js";
import { pdfToWord } from "./pdf-to-word.service.js";

export const pdfToWordRouter = Router();

pdfToWordRouter.post(
  "/",
  ...createFileToolHandler({
    toolSlug: pdfToWordConfig.toolSlug,
    maxFiles: pdfToWordConfig.maxFiles,
    allowedExts: [...pdfToWordConfig.allowedExts],
    process: pdfToWord,
  }),
);
