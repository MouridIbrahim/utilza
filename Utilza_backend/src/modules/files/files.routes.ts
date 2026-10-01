import { randomUUID } from "node:crypto";
import { Router } from "express";
import multer from "multer";
import { fileLimiter } from "../../middleware/rate-limit.middleware.js";
import { asyncHandler, sendSuccess } from "../../utils/handler.js";
import { badRequest } from "../../utils/errors.js";
import { logger } from "../../lib/logger.js";

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
