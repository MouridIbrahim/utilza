import { Router } from "express";
import { createFileToolHandler } from "../../execute/execute.js";
import { badRequest } from "../../../../utils/errors.js";
import type { ToolFileInput, ToolProcessResult } from "../../execute/execute.js";

// Base64 encode: any single file ≤5MB in → .b64 text download (33% growth
// makes the 10MB default wasteful; 5MB keeps responses sane).
const MAX_ENCODE_BYTES = 5 * 1024 * 1024;

async function encodeBase64(inputs: ToolFileInput[]): Promise<ToolProcessResult> {
  if (inputs.length !== 1) throw badRequest("Exactly one file is required to encode.");
  const input = inputs[0] as ToolFileInput;
  if (input.size > MAX_ENCODE_BYTES)
    throw badRequest("File too large for Base64 encoding (max 5 MB).");
  const buffer = Buffer.from(input.buffer.toString("base64"), "utf8");
  return { buffer, ext: "b64", mimeType: "text/plain" };
}

export const base64EncodeRouter = Router();

base64EncodeRouter.post(
  "/",
  ...createFileToolHandler({
    toolSlug: "base64-encode",
    maxFiles: 2,
    allowedExts: ["png", "jpg", "jpeg", "webp", "pdf", "txt", "md", "csv", "json", "bin"],
    process: encodeBase64,
  }),
);
