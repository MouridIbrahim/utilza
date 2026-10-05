import { Router } from "express";
import sharp from "sharp";
import { asyncHandler, sendSuccess } from "../../../../utils/handler.js";
import { toolUpload, MAX_TOOL_FILE_BYTES } from "../../execute/execute.js";
import { extOf } from "../../pdf/pdf-utils.js";
import { badRequest } from "../../../../utils/errors.js";
import { IMAGE_EXTS } from "../image-shared.js";

export const imageMetadataRouter = Router();

// POST /image/metadata — exactly one image → sharp metadata JSON.
// Never echoes bytes.
imageMetadataRouter.post(
  "/",
  toolUpload(2).single("files"),
  asyncHandler(async (req, res) => {
    const file = (req as typeof req & { file?: Express.Multer.File }).file;
    if (!file) throw badRequest("A file upload is required.");
    if (!IMAGE_EXTS.includes(extOf(file.originalname) as (typeof IMAGE_EXTS)[number]))
      throw badRequest("Unsupported file type: expected an image.");
    if (file.size <= 0 || file.size > MAX_TOOL_FILE_BYTES)
      throw badRequest("File size out of range.");
    let meta;
    try {
      meta = await sharp(file.buffer, { failOn: "error" }).metadata();
    } catch {
      throw badRequest("File is not a valid image.");
    }
    sendSuccess(res, {
      format: meta.format ?? null,
      width: meta.width ?? null,
      height: meta.height ?? null,
      space: meta.space ?? null,
      channels: meta.channels ?? null,
      depth: meta.depth ?? null,
      density: meta.density ?? null,
      hasAlpha: meta.hasAlpha ?? false,
      hasProfile: meta.hasProfile ?? false,
      isProgressive: meta.isProgressive ?? false,
      size: file.size,
    });
  }),
);
