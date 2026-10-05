import { Router } from "express";
import { createFileToolHandler } from "../../execute/execute.js";
import { imageCompressBodySchema, imageCompressConfig } from "./compress-image.schema.js";
import { compressImage } from "./compress-image.service.js";

export const compressImageRouter = Router();

compressImageRouter.post(
  "/",
  ...createFileToolHandler({
    toolSlug: imageCompressConfig.toolSlug,
    maxFiles: imageCompressConfig.maxFiles,
    allowedExts: [...imageCompressConfig.allowedExts],
    bodySchema: imageCompressBodySchema,
    process: compressImage,
  }),
);
