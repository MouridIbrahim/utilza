import { Router } from "express";
import { createFileToolHandler } from "../../execute/execute.js";
import { rotatePdfBodySchema, rotatePdfConfig } from "./rotate-pages.schema.js";
import { rotatePdf } from "./rotate-pages.service.js";

export const rotatePdfRouter = Router();

rotatePdfRouter.post(
  "/",
  ...createFileToolHandler({
    toolSlug: rotatePdfConfig.toolSlug,
    maxFiles: rotatePdfConfig.maxFiles,
    allowedExts: [...rotatePdfConfig.allowedExts],
    bodySchema: rotatePdfBodySchema,
    process: rotatePdf,
  }),
);
