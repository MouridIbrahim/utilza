import { Router } from "express";
import { createFileToolHandler } from "../../execute/execute.js";
import {
  passportBodySchema,
  passportConfig,
  socialBodySchema,
  socialConfig,
} from "./presets.schema.js";
import { passportPhoto, socialResize } from "./presets.service.js";

export const socialRouter = Router();
socialRouter.post(
  "/",
  ...createFileToolHandler({
    toolSlug: socialConfig.toolSlug,
    maxFiles: socialConfig.maxFiles,
    allowedExts: [...socialConfig.allowedExts],
    bodySchema: socialBodySchema,
    process: socialResize,
  }),
);

export const passportRouter = Router();
passportRouter.post(
  "/",
  ...createFileToolHandler({
    toolSlug: passportConfig.toolSlug,
    maxFiles: passportConfig.maxFiles,
    allowedExts: [...passportConfig.allowedExts],
    bodySchema: passportBodySchema,
    process: passportPhoto,
  }),
);
