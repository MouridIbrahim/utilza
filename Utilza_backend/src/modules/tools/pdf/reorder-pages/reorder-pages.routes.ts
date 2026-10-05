import { Router } from "express";
import { createFileToolHandler } from "../../execute/execute.js";
import { reorderPagesBodySchema, reorderPagesConfig } from "./reorder-pages.schema.js";
import { reorderPdfPages } from "./reorder-pages.service.js";

export const reorderPagesRouter = Router();

reorderPagesRouter.post(
  "/",
  ...createFileToolHandler({
    toolSlug: reorderPagesConfig.toolSlug,
    maxFiles: reorderPagesConfig.maxFiles,
    allowedExts: [...reorderPagesConfig.allowedExts],
    bodySchema: reorderPagesBodySchema,
    process: reorderPdfPages,
  }),
);
