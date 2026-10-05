import { Router } from "express";
import { createFileToolHandler } from "../../execute/execute.js";
import { duplicatePagesBodySchema, duplicatePagesConfig } from "./duplicate-pages.schema.js";
import { duplicatePdfPages } from "./duplicate-pages.service.js";

export const duplicatePagesRouter = Router();

duplicatePagesRouter.post(
  "/",
  ...createFileToolHandler({
    toolSlug: duplicatePagesConfig.toolSlug,
    maxFiles: duplicatePagesConfig.maxFiles,
    allowedExts: [...duplicatePagesConfig.allowedExts],
    bodySchema: duplicatePagesBodySchema,
    process: duplicatePdfPages,
  }),
);
