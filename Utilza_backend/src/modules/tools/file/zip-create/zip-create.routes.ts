import { Router } from "express";
import { createFileToolHandler } from "../../execute/execute.js";
import { badRequest } from "../../../../utils/errors.js";
import type { ToolFileInput, ToolProcessResult } from "../../execute/execute.js";
import {
  JSZip,
  MAX_ARCHIVE_FILES,
  MAX_ARCHIVE_TOTAL_BYTES,
  assertCreatable,
  safeEntryName,
} from "../file-shared.js";

async function createZip(inputs: ToolFileInput[]): Promise<ToolProcessResult> {
  if (inputs.length < 2) throw badRequest("At least two files are required to create a ZIP.");
  let total = 0;
  for (const input of inputs) {
    assertCreatable(input.ext);
    total += input.size;
  }
  if (total > MAX_ARCHIVE_TOTAL_BYTES)
    throw badRequest("Combined file size exceeds the 50 MB archive limit.");
  const zip = new JSZip();
  inputs.forEach((input, i) => {
    zip.file(safeEntryName(input.originalName || `file.${input.ext}`, i, input.ext), input.buffer);
  });
  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  return { buffer, ext: "zip", mimeType: "application/zip" };
}

export const zipCreateRouter = Router();

zipCreateRouter.post(
  "/",
  ...createFileToolHandler({
    toolSlug: "zip-create",
    maxFiles: MAX_ARCHIVE_FILES,
    allowedExts: [
      "png",
      "jpg",
      "jpeg",
      "webp",
      "pdf",
      "txt",
      "md",
      "csv",
      "json",
      "docx",
      "xlsx",
      "html",
    ],
    process: createZip,
  }),
);
