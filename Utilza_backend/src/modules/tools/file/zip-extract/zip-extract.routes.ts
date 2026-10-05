import { Router } from "express";
import { asyncHandler, sendSuccess } from "../../../../utils/handler.js";
import { toolUpload, MAX_TOOL_FILE_BYTES } from "../../execute/execute.js";
import { extOf } from "../../pdf/pdf-utils.js";
import { prisma } from "../../../../lib/prisma.js";
import { tempStorage } from "../../../../lib/storage.js";
import { badRequest } from "../../../../utils/errors.js";
import {
  JSZip,
  MAX_ARCHIVE_ENTRIES,
  MAX_ARCHIVE_TOTAL_BYTES,
  safeEntryName,
} from "../file-shared.js";

export const zipExtractRouter = Router();

// POST /file/zip-extract — exactly one .zip → JSON manifest of extracted
// entries, each downloadable via its own GeneratedFile row. Zip-bomb guards:
// entry count + total uncompressed size caps; directory entries skipped;
// names sanitized; nothing is written to disk under user names.
zipExtractRouter.post(
  "/",
  toolUpload(2).single("files"),
  asyncHandler(async (req, res) => {
    const file = (req as typeof req & { file?: Express.Multer.File }).file;
    if (!file) throw badRequest("A file upload is required.");
    if (extOf(file.originalname) !== "zip")
      throw badRequest("Unsupported file type: expected .zip.");
    if (file.size <= 0 || file.size > MAX_TOOL_FILE_BYTES)
      throw badRequest("File size out of range.");
    let zip;
    try {
      zip = await JSZip.loadAsync(file.buffer);
    } catch {
      throw badRequest("File is not a valid ZIP archive.");
    }
    const entries = Object.values(zip.files).filter((e) => !e.dir);
    if (entries.length === 0) throw badRequest("Archive contains no files.");
    if (entries.length > MAX_ARCHIVE_ENTRIES)
      throw badRequest(`Archive has too many entries (max ${MAX_ARCHIVE_ENTRIES}).`);
    const files: Array<{
      fileId: string;
      downloadUrl: string;
      name: string;
      size: number;
      mimeType: string;
    }> = [];
    let total = 0;
    let index = 0;
    for (const entry of entries) {
      const data = Buffer.from(await entry.async("nodebuffer"));
      total += data.length;
      if (total > MAX_ARCHIVE_TOTAL_BYTES)
        throw badRequest("Uncompressed size exceeds the 50 MB archive limit.");
      const name = safeEntryName(entry.name, index, "bin");
      const suffix = name.split(".").pop() ?? "bin";
      const ext = /^[a-z0-9]{1,10}$/.test(suffix) ? suffix : "bin";
      const stored = await tempStorage.put(data, {
        ext,
        mimeType: "application/octet-stream",
      });
      const row = await prisma.generatedFile.create({
        data: {
          toolSlug: "zip-extract",
          storageKey: stored.key,
          mimeType: "application/octet-stream",
          size: data.length,
          status: "ready",
          expiresAt: stored.expiresAt,
        },
      });
      files.push({
        fileId: row.id,
        downloadUrl: `/api/v1/files/${row.id}`,
        name,
        size: data.length,
        mimeType: "application/octet-stream",
      });
      index += 1;
    }
    sendSuccess(res, { count: files.length, files });
  }),
);
