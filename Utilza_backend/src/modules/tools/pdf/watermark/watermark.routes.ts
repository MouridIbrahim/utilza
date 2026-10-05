import { Router } from "express";
import { createFileToolHandler } from "../../execute/execute.js";
import { watermarkBodySchema, watermarkConfig } from "./watermark.schema.js";
import { watermarkPdf } from "./watermark.service.js";

export const watermarkRouter = Router();

watermarkRouter.post(
  "/",
  ...createFileToolHandler({
    toolSlug: watermarkConfig.toolSlug,
    maxFiles: watermarkConfig.maxFiles,
    allowedExts: [...watermarkConfig.allowedExts],
    bodySchema: watermarkBodySchema,
    process: watermarkPdf,
  }),
);
