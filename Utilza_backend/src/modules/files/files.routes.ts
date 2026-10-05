import { randomUUID } from "node:crypto";
import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { fileLimiter } from "../../middleware/rate-limit.middleware.js";
import { validate } from "../../middleware/validation.middleware.js";
import { asyncHandler, sendSuccess } from "../../utils/handler.js";
import { badRequest, gone, notFound } from "../../utils/errors.js";
import { logger } from "../../lib/logger.js";
import { prisma } from "../../lib/prisma.js";
import { tempStorage } from "../../lib/storage.js";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB MVP limit
const ALLOWED_EXT = new Set(["png", "jpg", "jpeg", "webp", "pdf"]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES, files: 1 },
});

function extOf(filename: string): string {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? (parts[parts.length - 1] as string) : "";
}

const fileIdParams = z.object({ fileId: z.string().min(20).max(30) });

export const filesRouter = Router();

filesRouter.post(
  "/process",
  fileLimiter,
  upload.single("file"),
  asyncHandler(async (req, res) => {
    const file = (req as typeof req & { file?: Express.Multer.File }).file;
    if (!file) throw badRequest("A file upload is required.");

    // Defense in depth: never trust MIME alone, check extension + size.
    const ext = extOf(file.originalname);
    if (!ALLOWED_EXT.has(ext)) throw badRequest(`Unsupported file type: .${ext || "unknown"}`);
    if (file.size <= 0 || file.size > MAX_BYTES) throw badRequest("File size out of range.");

    const jobId = randomUUID();
    // MVP: no persistent storage. Echo metadata; real transforms come later.
    // Temp buffer is dropped after response (no disk writes).
    logger.info(
      { jobId, ext, size: file.size, mimetype: file.mimetype },
      "file processed (metadata only)",
    );

    sendSuccess(res, {
      jobId,
      originalName: "upload", // never echo user filename as path
      ext,
      size: file.size,
      note: "MVP stub: validated only. Transforms not yet implemented.",
    });
  }),
);

// Download for files produced by backend tool executors (TASK-103).
// Filename is derived server-side — the user filename is never used or echoed.
filesRouter.get(
  "/:fileId",
  validate({ params: fileIdParams }),
  asyncHandler(async (req, res) => {
    const fileId = req.params["fileId"] as string;
    const row = await prisma.generatedFile.findUnique({ where: { id: fileId } });
    if (!row || row.status !== "ready") throw notFound("File not found.", "FILE_NOT_FOUND");
    if (row.expiresAt && row.expiresAt.getTime() <= Date.now()) {
      await prisma.generatedFile
        .update({ where: { id: row.id }, data: { status: "expired" } })
        .catch(() => undefined);
      throw gone("File expired.", "FILE_EXPIRED");
    }
    const bytes = await tempStorage.get(row.storageKey);
    if (!bytes) throw notFound("File not found.", "FILE_NOT_FOUND");
    const ext = row.storageKey.split(".").pop() ?? "bin";
    res.setHeader("Content-Type", row.mimeType ?? "application/octet-stream");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="${row.toolSlug ?? "result"}-result.${ext}"`,
    );
    res.send(bytes);
  }),
);
