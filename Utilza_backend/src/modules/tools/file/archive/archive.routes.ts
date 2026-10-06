import { Router } from "express";
import { z } from "zod";
import JSZip from "jszip";
import { createFileToolHandler } from "../../execute/execute.js";
import { badRequest } from "../../../../utils/errors.js";
import type { ToolFileInput, ToolProcessResult } from "../../execute/execute.js";
import { MAX_ARCHIVE_TOTAL_BYTES, assertCreatable, safeEntryName } from "../file-shared.js";
import { sanitizeEntryName, tarGzip, untar, type ArchiveEntry } from "./archive-shared.js";

const COMMON_EXTS = [
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
];
const TAR_EXTS = ["tar", "tgz", "gz"];
const MAX_FILES = 20;

function exactlyN(inputs: ToolFileInput[], min: number, what: string): void {
  if (inputs.length < min) throw badRequest(`At least ${min} files are required (${what}).`);
}

async function zipEntries(files: ArchiveEntry[]): Promise<Buffer> {
  const zip = new JSZip();
  files.forEach((f, i) => zip.file(sanitizeEntryName(f.name, `file_${i}.bin`), f.data));
  return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
}

function routerFor(
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

// file-rename: 2–20 common files + pattern with {i} → ZIP with renamed entries.
async function renameFiles(inputs: ToolFileInput[], pattern: string): Promise<ToolProcessResult> {
  exactlyN(inputs, 2, "rename");
  if (!pattern.includes("{i}")) throw badRequest('Pattern must contain "{i}" (e.g. "photo-{i}").');
  const clean = pattern.replace(/[\\/]/g, "").slice(0, 100);
  if (!/^[A-Za-z0-9 _\-+.{}()[\]]+$/.test(clean) || clean.length === 0)
    throw badRequest("Pattern uses unsupported characters.");
  for (const input of inputs) assertCreatable(input.ext);
  const zip = new JSZip();
  inputs.forEach((input, i) => {
    zip.file(
      safeEntryName(`${clean.replaceAll("{i}", String(i + 1))}.${input.ext}`, i, input.ext),
      input.buffer,
    );
  });
  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  return { buffer, ext: "zip", mimeType: "application/zip" };
}

// folder-to-zip: files + `paths` JSON array (parallel) → ZIP preserving folders.
async function folderZip(inputs: ToolFileInput[], pathsRaw: string): Promise<ToolProcessResult> {
  exactlyN(inputs, 2, "folder zip");
  let paths: unknown;
  try {
    paths = JSON.parse(pathsRaw);
  } catch {
    throw badRequest("Invalid paths JSON (array of relative paths).");
  }
  if (!Array.isArray(paths) || paths.length !== inputs.length)
    throw badRequest("paths must be an array matching the file count.");
  const zip = new JSZip();
  inputs.forEach((input, i) => {
    assertCreatable(input.ext);
    const raw = paths[i] as string;
    if (typeof raw !== "string" || raw.length === 0 || raw.length > 200)
      throw badRequest(`paths[${i}] must be a non-empty relative path.`);
    const normalized = raw.replace(/\\/g, "/");
    if (normalized.startsWith("/") || normalized.split("/").includes(".."))
      throw badRequest(`paths[${i}] must be relative without "..".`);
    const clean = normalized
      .split("/")
      .map((part) =>
        part
          .replace(/[^a-zA-Z0-9._-]+/g, "_")
          .replace(/^\.+/, "")
          .slice(0, 100),
      )
      .filter((part) => part.length > 0)
      .join("/");
    if (!clean) throw badRequest(`paths[${i}] is empty after sanitizing.`);
    zip.file(clean, input.buffer);
  });
  const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  return { buffer, ext: "zip", mimeType: "application/zip" };
}

export const renameRouter = Router();
renameRouter.post(
  "/",
  ...createFileToolHandler({
    toolSlug: "file-rename",
    maxFiles: MAX_FILES,
    allowedExts: COMMON_EXTS,
    bodySchema: z.object({ pattern: z.string().min(1).max(100) }),
    process: (inputs, ctx) => renameFiles(inputs, (ctx.body as { pattern: string }).pattern),
  }),
);

export const folderZipRouter = Router();
folderZipRouter.post(
  "/",
  ...createFileToolHandler({
    toolSlug: "folder-to-zip",
    maxFiles: MAX_FILES,
    allowedExts: COMMON_EXTS,
    bodySchema: z.object({ paths: z.string().min(2) }),
    process: (inputs, ctx) => folderZip(inputs, (ctx.body as { paths: string }).paths),
  }),
);

export const tarCreateRouter = routerFor("tar-create", COMMON_EXTS, async (inputs) => {
  exactlyN(inputs, 2, "tar creation");
  let total = 0;
  const files: ArchiveEntry[] = inputs.map((input, i) => {
    assertCreatable(input.ext);
    total += input.size;
    return {
      name: safeEntryName(input.originalName || `file.${input.ext}`, i, input.ext),
      data: input.buffer,
    };
  });
  if (total > MAX_ARCHIVE_TOTAL_BYTES)
    throw badRequest("Combined file size exceeds the 50 MB archive limit.");
  const buffer = await tarGzip(files);
  return { buffer, ext: "tgz", mimeType: "application/gzip" };
});

export const tarExtractRouter = routerFor("tar-extract", TAR_EXTS, async (inputs) => {
  if (inputs.length !== 1) throw badRequest("Exactly one archive is required.");
  const entries = await untar((inputs[0] as ToolFileInput).buffer);
  const buffer = await zipEntries(entries);
  return { buffer, ext: "zip", mimeType: "application/zip" };
});

export const zipToTarRouter = routerFor("zip-to-tar", ["zip"], async (inputs) => {
  if (inputs.length !== 1) throw badRequest("Exactly one archive is required.");
  const input = inputs[0] as ToolFileInput;
  let zip;
  try {
    zip = await JSZip.loadAsync(input.buffer);
  } catch {
    throw badRequest("File is not a valid ZIP archive.");
  }
  const files: ArchiveEntry[] = [];
  let total = 0;
  let i = 0;
  for (const [name, entry] of Object.entries(zip.files)) {
    if (entry.dir) continue;
    const data = Buffer.from(await entry.async("nodebuffer"));
    total += data.length;
    if (total > MAX_ARCHIVE_TOTAL_BYTES)
      throw badRequest("Uncompressed size exceeds the 50 MB archive limit.");
    files.push({ name: sanitizeEntryName(name, `file_${i}.bin`), data });
    i += 1;
    if (files.length > 50) throw badRequest("Archive has too many entries (max 50).");
  }
  if (files.length === 0) throw badRequest("Archive contains no files.");
  const buffer = await tarGzip(files);
  return { buffer, ext: "tgz", mimeType: "application/gzip" };
});

export const tarToZipRouter = routerFor("tar-to-zip", TAR_EXTS, async (inputs) => {
  if (inputs.length !== 1) throw badRequest("Exactly one archive is required.");
  const entries = await untar((inputs[0] as ToolFileInput).buffer);
  const buffer = await zipEntries(entries);
  return { buffer, ext: "zip", mimeType: "application/zip" };
});
