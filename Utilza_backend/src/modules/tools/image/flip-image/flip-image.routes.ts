import { Router } from "express";
import { createFileToolHandler } from "../../execute/execute.js";
import { flipImageBodySchema, flipImageConfig } from "./flip-image.schema.js";
import { flipImage } from "./flip-image.service.js";

export const flipImageRouter = Router();

flipImageRouter.post(
  "/",
  ...createFileToolHandler({
    toolSlug: flipImageConfig.toolSlug,
    maxFiles: flipImageConfig.maxFiles,
    allowedExts: [...flipImageConfig.allowedExts],
    bodySchema: flipImageBodySchema,
    process: flipImage,
  }),
);
