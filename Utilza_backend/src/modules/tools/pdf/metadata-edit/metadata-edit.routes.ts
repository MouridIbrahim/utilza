import { Router } from "express";
import { createFileToolHandler } from "../../execute/execute.js";
import { metadataEditBodySchema, metadataEditConfig } from "./metadata-edit.schema.js";
import { editPdfMetadata } from "./metadata-edit.service.js";

export const metadataEditRouter = Router();

metadataEditRouter.post(
  "/",
  ...createFileToolHandler({
    toolSlug: metadataEditConfig.toolSlug,
    maxFiles: metadataEditConfig.maxFiles,
    allowedExts: [...metadataEditConfig.allowedExts],
    bodySchema: metadataEditBodySchema,
    process: editPdfMetadata,
  }),
);
