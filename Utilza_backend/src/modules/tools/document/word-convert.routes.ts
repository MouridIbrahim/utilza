import { Router } from "express";
import { createFileToolHandler } from "../execute/execute.js";
import { docxParagraphs, escapeHtml } from "./docx-shared.js";
import type { ToolFileInput, ToolProcessResult } from "../execute/execute.js";

const MAX_FILES = 2;

async function convert(
  inputs: ToolFileInput[],
  kind: "txt" | "html" | "md",
): Promise<ToolProcessResult> {
  const paras = await docxParagraphs(inputs, `convert to ${kind.toUpperCase()}`);
  if (kind === "txt") {
    return {
      buffer: Buffer.from(paras.join("\n\n"), "utf8"),
      ext: "txt",
      mimeType: "text/plain",
    };
  }
  if (kind === "html") {
    const body = paras.map((p) => `  <p>${escapeHtml(p)}</p>`).join("\n");
    const html = `<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n</head>\n<body>\n${body}\n</body>\n</html>\n`;
    return { buffer: Buffer.from(html, "utf8"), ext: "html", mimeType: "text/html" };
  }
  // Plain paragraphs are already valid Markdown; no syntax to invent.
  const md = paras.join("\n\n");
  return { buffer: Buffer.from(`${md}\n`, "utf8"), ext: "md", mimeType: "text/markdown" };
}

function routerFor(kind: "txt" | "html" | "md", toolSlug: string): Router {
  const router = Router();
  router.post(
    "/",
    ...createFileToolHandler({
      toolSlug,
      maxFiles: MAX_FILES,
      allowedExts: ["docx"],
      process: (inputs) => convert(inputs, kind),
    }),
  );
  return router;
}

export const wordToTxtRouter = routerFor("txt", "word-to-txt");
export const wordToHtmlRouter = routerFor("html", "word-to-html");
export const wordToMarkdownRouter = routerFor("md", "word-to-markdown");
