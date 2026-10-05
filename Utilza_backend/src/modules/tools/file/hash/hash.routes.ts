import { Router } from "express";
import { asyncHandler, sendSuccess } from "../../../../utils/handler.js";
import { toolUpload, MAX_TOOL_FILE_BYTES } from "../../execute/execute.js";
import { extOf } from "../../pdf/pdf-utils.js";
import { badRequest } from "../../../../utils/errors.js";
import { sha256Hex, sha512Hex } from "../file-shared.js";

export const fileHashRouter = Router();

// POST /file/hash — exactly one file of any type (inputs are hashed, never
// stored) → {sha256, sha512, size}. Extension-agnostic: even executables are
// safe to hash since bytes are never executed, persisted, or echoed.
fileHashRouter.post(
  "/",
  toolUpload(2).single("files"),
  asyncHandler(async (req, res) => {
    const file = (req as typeof req & { file?: Express.Multer.File }).file;
    if (!file) throw badRequest("A file upload is required.");
    if (extOf(file.originalname) === "") throw badRequest("File must have an extension.");
    if (file.size <= 0 || file.size > MAX_TOOL_FILE_BYTES)
      throw badRequest("File size out of range.");
    sendSuccess(res, {
      sha256: sha256Hex(file.buffer),
      sha512: sha512Hex(file.buffer),
      size: file.size,
    });
  }),
);
