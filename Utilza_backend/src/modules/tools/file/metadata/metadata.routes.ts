import { Router } from "express";
import { asyncHandler, sendSuccess } from "../../../../utils/handler.js";
import { toolUpload, MAX_TOOL_FILE_BYTES } from "../../execute/execute.js";
import { badRequest } from "../../../../utils/errors.js";
import { sha256Hex } from "../file-shared.js";
import { countTextLines, sniffType } from "../sniff.js";

export const fileMetadataRouter = Router();

// POST /file/metadata — any single file (≤10MB) → metadata JSON.
// Bytes are inspected, never stored or echoed.
fileMetadataRouter.post(
  "/",
  toolUpload(2).single("files"),
  asyncHandler(async (req, res) => {
    const file = (req as typeof req & { file?: Express.Multer.File }).file;
    if (!file) throw badRequest("A file upload is required.");
    if (file.size <= 0 || file.size > MAX_TOOL_FILE_BYTES)
      throw badRequest("File size out of range.");
    const detected = await sniffType(file.buffer);
    sendSuccess(res, {
      name: file.originalname.split(/[\\/]/).pop() ?? "upload",
      size: file.size,
      declaredMime: file.mimetype,
      detectedType: detected.type,
      detectedMime: detected.mime,
      sha256: sha256Hex(file.buffer),
      textLines: countTextLines(file.buffer),
    });
  }),
);
