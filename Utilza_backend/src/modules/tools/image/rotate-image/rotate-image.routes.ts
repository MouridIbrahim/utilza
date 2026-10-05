import { Router } from "express";
import { createFileToolHandler } from "../../execute/execute.js";
import { rotateImageBodySchema, rotateImageConfig } from "./rotate-image.schema.js";
import { rotateImage } from "./rotate-image.service.js";

export const rotateImageRouter = Router();

rotateImageRouter.post(
  "/",
  ...createFileToolHandler({
    toolSlug: rotateImageConfig.toolSlug,
    maxFiles: rotateImageConfig.maxFiles,
    allowedExts: [...rotateImageConfig.allowedExts],
    bodySchema: rotateImageBodySchema,
    process: rotateImage,
  }),
);
