import { Router } from "express";
import JSZip from "jszip";
import { createFileToolHandler } from "../../execute/execute.js";
import { badRequest } from "../../../../utils/errors.js";
import type { ToolFileInput, ToolProcessResult } from "../../execute/execute.js";

// Document compressor: .docx/.xlsx are already ZIPs — unpack and repack at
// max DEFLATE level. Gains are usually small (producers already compress);
// the output is always a normalized, valid file of the same type.
async function compressDocument(inputs: ToolFileInput[]): Promise<ToolProcessResult> {
  if (inputs.length !== 1) throw badRequest("Exactly one document is required to compress.");
  const input = inputs[0] as ToolFileInput;
  let zip;
  try {
    zip = await JSZip.loadAsync(input.buffer);
  } catch {
    throw badRequest("File is not a valid document archive.");
  }
  const isDocx = input.ext === "docx";
  const sentinel = isDocx ? "word/document.xml" : "xl/workbook.xml";
  if (!zip.file(sentinel)) throw badRequest(`File is not a valid .${input.ext} document.`);
  const out = new JSZip();
  for (const [name, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    out.file(name, await entry.async("nodebuffer"), { compression: "DEFLATE" });
  }
  const buffer = await out.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 9 },
  });
  return {
    buffer,
    ext: input.ext,
    mimeType: isDocx
      ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  };
}

export const documentCompressRouter = Router();

documentCompressRouter.post(
  "/",
  ...createFileToolHandler({
    toolSlug: "document-compress",
    maxFiles: 2,
    allowedExts: ["docx", "xlsx"],
    process: compressDocument,
  }),
);
