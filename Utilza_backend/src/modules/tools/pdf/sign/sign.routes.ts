import { Router } from "express";
import { createFileToolHandler } from "../../execute/execute.js";
import { signBodySchema, signConfig } from "./sign.schema.js";
import { signPdf } from "./sign.service.js";

export const signRouter = Router();

signRouter.post(
  "/",
  ...createFileToolHandler({
    toolSlug: signConfig.toolSlug,
    maxFiles: signConfig.maxFiles,
    allowedExts: [...signConfig.allowedExts],
    bodySchema: signBodySchema,
    process: signPdf,
  }),
);
