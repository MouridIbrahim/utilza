import { Router } from "express";
import { createFileToolHandler } from "../../execute/execute.js";
import { montageBodySchema, montageConfig } from "./montage.schema.js";
import { montageImage } from "./montage.service.js";

export const montageRouter = Router();

montageRouter.post(
  "/",
  ...createFileToolHandler({
    toolSlug: montageConfig.toolSlug,
    maxFiles: montageConfig.maxFiles,
    allowedExts: [...montageConfig.allowedExts],
    bodySchema: montageBodySchema,
    process: montageImage,
  }),
);
