import { Router } from "express";
import { createFileToolHandler } from "../../execute/execute.js";
import { badRequest } from "../../../../utils/errors.js";
import type { ToolFileInput, ToolProcessResult } from "../../execute/execute.js";
import { renderParagraphsToPdf } from "../word-to-pdf/word-to-pdf.service.js";

// TXT to PDF: UTF-8 text in, paginated PDF out. Rejects binary input
// (null bytes) and caps paragraphs like word-to-pdf.
const MAX_PARAGRAPHS = 2000;

async function txtToPdf(inputs: ToolFileInput[]): Promise<ToolProcessResult> {
  if (inputs.length !== 1) throw badRequest("Exactly one text file is required to convert.");
  const input = inputs[0] as ToolFileInput;
  if (input.buffer.includes(0)) throw badRequest("File is not valid UTF-8 text.");
  const text = input.buffer.toString("utf8").replace(/^\uFEFF/, "");
  const paras = text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
  if (paras.length === 0) throw badRequest("No text found in the file.");
  if (paras.length > MAX_PARAGRAPHS)
    throw badRequest(`File has too many lines (max ${MAX_PARAGRAPHS}).`);
  const buffer = await renderParagraphsToPdf(paras);
  return { buffer, ext: "pdf", mimeType: "application/pdf" };
}

export const txtToPdfRouter = Router();

txtToPdfRouter.post(
  "/",
  ...createFileToolHandler({
    toolSlug: "txt-to-pdf",
    maxFiles: 2,
    allowedExts: ["txt"],
    process: txtToPdf,
  }),
);
