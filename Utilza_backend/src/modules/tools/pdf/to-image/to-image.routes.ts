import { Router } from "express";
import { createFileToolHandler } from "../../execute/execute.js";
import { rasterBodySchema, rasterConfig } from "./to-image.schema.js";
import { rasterPdf } from "./to-image.service.js";

export const rasterRouter = Router();

rasterRouter.post(
  "/",
  ...createFileToolHandler({
    toolSlug: rasterConfig.toolSlug,
    maxFiles: rasterConfig.maxFiles,
    allowedExts: [...rasterConfig.allowedExts],
    bodySchema: rasterBodySchema,
    process: rasterPdf,
  }),
);
