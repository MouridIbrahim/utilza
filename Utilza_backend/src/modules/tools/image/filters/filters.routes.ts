import { Router } from "express";
import { createFileToolHandler } from "../../execute/execute.js";
import {
  blurBodySchema,
  brightnessBodySchema,
  contrastBodySchema,
  grayscaleBodySchema,
  imageFilterConfig,
  sharpenBodySchema,
} from "./filters.schema.js";
import {
  blurImage,
  brightenImage,
  contrastImage,
  grayscale,
  sharpenImage,
} from "./filters.service.js";

function filterRouter(
  toolSlug: string,
  bodySchema: Parameters<typeof createFileToolHandler>[0]["bodySchema"],
  process: Parameters<typeof createFileToolHandler>[0]["process"],
): Router {
  const router = Router();
  router.post(
    "/",
    ...createFileToolHandler({
      toolSlug,
      maxFiles: imageFilterConfig.maxFiles,
      allowedExts: [...imageFilterConfig.allowedExts],
      bodySchema,
      process,
    }),
  );
  return router;
}

export const grayscaleRouter = filterRouter("image-grayscale", grayscaleBodySchema, grayscale);
export const blurRouter = filterRouter("image-blur", blurBodySchema, blurImage);
export const sharpenRouter = filterRouter("image-sharpen", sharpenBodySchema, sharpenImage);
export const brightnessRouter = filterRouter(
  "image-brightness",
  brightnessBodySchema,
  brightenImage,
);
export const contrastRouter = filterRouter("image-contrast", contrastBodySchema, contrastImage);
