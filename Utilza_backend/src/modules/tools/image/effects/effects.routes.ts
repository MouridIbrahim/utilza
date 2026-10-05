import { Router } from "express";
import { createFileToolHandler } from "../../execute/execute.js";
import { pixelateBodySchema, watermarkBodySchema } from "./effects.schema.js";
import { pixelateImage, watermarkImage } from "./effects.service.js";

const MAX_FILES = 2;
const ALLOWED = ["png", "jpg", "jpeg", "webp"];

export const pixelateRouter = Router();
pixelateRouter.post(
  "/",
  ...createFileToolHandler({
    toolSlug: "image-pixelate",
    maxFiles: MAX_FILES,
    allowedExts: ALLOWED,
    bodySchema: pixelateBodySchema,
    process: pixelateImage,
  }),
);

export const imageWatermarkRouter = Router();
imageWatermarkRouter.post(
  "/",
  ...createFileToolHandler({
    toolSlug: "image-watermark",
    maxFiles: MAX_FILES,
    allowedExts: ALLOWED,
    bodySchema: watermarkBodySchema,
    process: watermarkImage,
  }),
);
