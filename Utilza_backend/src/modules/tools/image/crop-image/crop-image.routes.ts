import { Router } from "express";
import { createFileToolHandler } from "../../execute/execute.js";
import { cropImageBodySchema, cropImageConfig } from "./crop-image.schema.js";
import { cropImage } from "./crop-image.service.js";

export const cropImageRouter = Router();

cropImageRouter.post(
  "/",
  ...createFileToolHandler({
    toolSlug: cropImageConfig.toolSlug,
    maxFiles: cropImageConfig.maxFiles,
    allowedExts: [...cropImageConfig.allowedExts],
    bodySchema: cropImageBodySchema,
    process: cropImage,
  }),
);
