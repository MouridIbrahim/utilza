import { Router } from "express";
import { createFileToolHandler } from "../../execute/execute.js";
import { exifBodySchema, exifConfig, faviconBodySchema, faviconConfig } from "./meta.schema.js";
import { removeExif, faviconPack } from "./meta.service.js";

export const exifRouter = Router();
exifRouter.post(
  "/",
  ...createFileToolHandler({
    toolSlug: exifConfig.toolSlug,
    maxFiles: exifConfig.maxFiles,
    allowedExts: [...exifConfig.allowedExts],
    bodySchema: exifBodySchema,
    process: removeExif,
  }),
);

export const faviconRouter = Router();
faviconRouter.post(
  "/",
  ...createFileToolHandler({
    toolSlug: faviconConfig.toolSlug,
    maxFiles: faviconConfig.maxFiles,
    allowedExts: [...faviconConfig.allowedExts],
    bodySchema: faviconBodySchema,
    process: faviconPack,
  }),
);
