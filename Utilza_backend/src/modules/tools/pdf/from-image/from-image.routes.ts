import { Router } from "express";
import { createFileToolHandler } from "../../execute/execute.js";
import { imageToPdfConfig } from "./from-image.schema.js";
import { imagesToPdf } from "./from-image.service.js";

export const imageToPdfRouter = Router();

imageToPdfRouter.post(
  "/",
  ...createFileToolHandler({
    toolSlug: imageToPdfConfig.toolSlug,
    maxFiles: imageToPdfConfig.maxFiles,
    allowedExts: [...imageToPdfConfig.allowedExts],
    process: imagesToPdf,
  }),
);
