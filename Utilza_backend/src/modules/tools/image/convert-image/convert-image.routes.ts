import { Router } from "express";
import { createFileToolHandler } from "../../execute/execute.js";
import { imageConvertBodySchema, imageConvertConfig } from "./convert-image.schema.js";
import { convertImage } from "./convert-image.service.js";

export const convertImageRouter = Router();

convertImageRouter.post(
  "/",
  ...createFileToolHandler({
    toolSlug: imageConvertConfig.toolSlug,
    maxFiles: imageConvertConfig.maxFiles,
    allowedExts: [...imageConvertConfig.allowedExts],
    bodySchema: imageConvertBodySchema,
    process: convertImage,
  }),
);
