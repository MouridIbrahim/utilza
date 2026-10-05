import { Router } from "express";
import { createFileToolHandler } from "../../execute/execute.js";
import { resizeImageBodySchema, resizeImageConfig } from "./resize-image.schema.js";
import { resizeImage } from "./resize-image.service.js";

export const resizeImageRouter = Router();

resizeImageRouter.post(
  "/",
  ...createFileToolHandler({
    toolSlug: resizeImageConfig.toolSlug,
    maxFiles: resizeImageConfig.maxFiles,
    allowedExts: [...resizeImageConfig.allowedExts],
    bodySchema: resizeImageBodySchema,
    process: resizeImage,
  }),
);
