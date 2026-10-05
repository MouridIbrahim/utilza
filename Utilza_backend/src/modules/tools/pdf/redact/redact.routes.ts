import { Router } from "express";
import { createFileToolHandler } from "../../execute/execute.js";
import { redactBodySchema, redactConfig } from "./redact.schema.js";
import { redactPdf } from "./redact.service.js";

export const redactRouter = Router();

redactRouter.post(
  "/",
  ...createFileToolHandler({
    toolSlug: redactConfig.toolSlug,
    maxFiles: redactConfig.maxFiles,
    allowedExts: [...redactConfig.allowedExts],
    bodySchema: redactBodySchema,
    process: redactPdf,
  }),
);
