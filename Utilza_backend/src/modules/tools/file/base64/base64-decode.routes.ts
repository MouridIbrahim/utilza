import { Router } from "express";
import { createFileToolHandler } from "../../execute/execute.js";
import { badRequest } from "../../../../utils/errors.js";
import type { ToolFileInput, ToolProcessResult } from "../../execute/execute.js";

// Base64 decode: a .txt/.b64 file holding base64 text → raw bytes download
// (ext "bin", octet-stream — the original type is unknowable). Strict
// decoding: any invalid character fails instead of silently dropping data.
async function decodeBase64(inputs: ToolFileInput[]): Promise<ToolProcessResult> {
  if (inputs.length !== 1) throw badRequest("Exactly one file is required to decode.");
  const input = inputs[0] as ToolFileInput;
  const text = input.buffer.toString("utf8").replace(/\s+/g, "");
  if (text.length === 0 || text.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(text))
    throw badRequest("File is not valid Base64 text.");
  const buffer = Buffer.from(text, "base64");
  if (buffer.length === 0) throw badRequest("File is not valid Base64 text.");
  return { buffer, ext: "bin", mimeType: "application/octet-stream" };
}

export const base64DecodeRouter = Router();

base64DecodeRouter.post(
  "/",
  ...createFileToolHandler({
    toolSlug: "base64-decode",
    maxFiles: 2,
    allowedExts: ["txt", "b64", "md", "csv", "json"],
    process: decodeBase64,
  }),
);
