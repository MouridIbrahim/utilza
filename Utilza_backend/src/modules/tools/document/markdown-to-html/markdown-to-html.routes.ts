import { Router } from "express";
import { createFileToolHandler } from "../../execute/execute.js";
import { markdownToHtml } from "./markdown-to-html.service.js";

export const markdownToHtmlRouter = Router();

markdownToHtmlRouter.post(
  "/",
  ...createFileToolHandler({
    toolSlug: "markdown-to-html",
    maxFiles: 2,
    allowedExts: ["md", "markdown"],
    process: markdownToHtml,
  }),
);
