import { Router } from "express";
import { createFileToolHandler } from "../../execute/execute.js";
import { numberPagesBodySchema, numberPagesConfig } from "./number-pages.schema.js";
import { numberPdfPages } from "./number-pages.service.js";

export const numberPagesRouter = Router();

numberPagesRouter.post(
  "/",
  ...createFileToolHandler({
    toolSlug: numberPagesConfig.toolSlug,
    maxFiles: numberPagesConfig.maxFiles,
    allowedExts: [...numberPagesConfig.allowedExts],
    bodySchema: numberPagesBodySchema,
    process: numberPdfPages,
  }),
);
