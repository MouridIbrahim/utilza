import { gzipSync } from "node:zlib";
import { Router } from "express";
import { createFileToolHandler } from "../../execute/execute.js";
import { badRequest } from "../../../../utils/errors.js";
import type { ToolFileInput, ToolProcessResult } from "../../execute/execute.js";
import { JSZip } from "../file-shared.js";

const MAX_FILES = 20;
const TEXT_EXTS = ["txt", "md", "csv", "json"];
const MAX_TEXT_BYTES = 5 * 1024 * 1024;

function exactlyOne(inputs: ToolFileInput[]): ToolFileInput {
  if (inputs.length !== 1) throw badRequest("Exactly one file is required.");
  return inputs[0] as ToolFileInput;
}

function assertText(input: ToolFileInput): string {
  if (input.buffer.includes(0)) throw badRequest("File is not valid UTF-8 text.");
  return input.buffer.toString("utf8");
}

// Text merger: 2–20 uniform-ext text files concatenated (newline-joined).
async function mergeText(inputs: ToolFileInput[]): Promise<ToolProcessResult> {
  if (inputs.length < 2) throw badRequest("At least two files are required to merge.");
  const exts = new Set(inputs.map((i) => i.ext));
  if (exts.size !== 1) throw badRequest("All files must share the same extension.");
  const parts = inputs.map((i) => assertText(i));
  const buffer = Buffer.from(parts.join("\n"), "utf8");
  return { buffer, ext: inputs[0]?.ext ?? "txt", mimeType: "text/plain" };
}

// Text splitter: 1 text file → ZIP of N roughly-even line chunks.
async function splitText(inputs: ToolFileInput[]): Promise<ToolProcessResult> {
  void exactlyOne(inputs);
  const text = assertText(inputs[0] as ToolFileInput);
  const lines = text.split(/\r?\n/);
  if (lines.length < 2) throw badRequest("File has too few lines to split.");
  const parts = Math.min(lines.length, 20);
  const per = Math.ceil(lines.length / parts);
  const zip = new JSZip();
  for (let i = 0; i < parts; i += 1) {
    zip.file(`part-${i + 1}.txt`, lines.slice(i * per, (i + 1) * per).join("\n"));
  }
  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  return { buffer, ext: "zip", mimeType: "application/zip" };
}

// Gzip: 1 file ≤5MB → .gz download.
async function gzipFile(inputs: ToolFileInput[]): Promise<ToolProcessResult> {
  const input = exactlyOne(inputs);
  if (input.size > MAX_TEXT_BYTES) throw badRequest("File too large to compress (max 5 MB).");
  return { buffer: gzipSync(input.buffer), ext: "gz", mimeType: "application/gzip" };
}

function textRouter(
  toolSlug: string,
  allowedExts: string[],
  process: (inputs: ToolFileInput[]) => Promise<ToolProcessResult>,
): Router {
  const router = Router();
  router.post(
    "/",
    ...createFileToolHandler({ toolSlug, maxFiles: MAX_FILES, allowedExts, process }),
  );
  return router;
}

export const textMergeRouter = textRouter("file-merge", TEXT_EXTS, mergeText);
export const textSplitRouter = textRouter("file-split", TEXT_EXTS, splitText);
export const gzipRouter = textRouter(
  "file-compress",
  ["txt", "md", "csv", "json", "html", "bin"],
  gzipFile,
);
