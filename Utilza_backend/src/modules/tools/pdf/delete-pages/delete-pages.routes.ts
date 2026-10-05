import { Router } from "express";
import { createFileToolHandler } from "../../execute/execute.js";
import { deletePagesBodySchema, deletePagesConfig } from "./delete-pages.schema.js";
import { deletePdfPages } from "./delete-pages.service.js";

export const deletePagesRouter = Router();

deletePagesRouter.post(
  "/",
  ...createFileToolHandler({
    toolSlug: deletePagesConfig.toolSlug,
    maxFiles: deletePagesConfig.maxFiles,
    allowedExts: [...deletePagesConfig.allowedExts],
    bodySchema: deletePagesBodySchema,
    process: deletePdfPages,
  }),
);
