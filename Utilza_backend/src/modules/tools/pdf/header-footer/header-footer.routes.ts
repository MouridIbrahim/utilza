import { Router } from "express";
import { createFileToolHandler } from "../../execute/execute.js";
import { headerFooterBodySchema, headerFooterConfig } from "./header-footer.schema.js";
import { headerFooterPdf } from "./header-footer.service.js";

export const headerFooterRouter = Router();

headerFooterRouter.post(
  "/",
  ...createFileToolHandler({
    toolSlug: headerFooterConfig.toolSlug,
    maxFiles: headerFooterConfig.maxFiles,
    allowedExts: [...headerFooterConfig.allowedExts],
    bodySchema: headerFooterBodySchema,
    process: headerFooterPdf,
  }),
);
