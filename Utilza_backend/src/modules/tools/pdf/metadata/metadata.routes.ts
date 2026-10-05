import { Router } from "express";
import { asyncHandler, sendSuccess } from "../../../../utils/handler.js";
import { toolUpload, MAX_TOOL_FILE_BYTES } from "../../execute/execute.js";
import { extOf, loadPdf } from "../pdf-utils.js";
import { badRequest } from "../../../../utils/errors.js";

export const pdfMetadataRouter = Router();

// POST /pdf/metadata — exactly one PDF → document metadata as JSON.
// Absent fields come back null; never echoes file bytes.
pdfMetadataRouter.post(
  "/",
  toolUpload(2).single("files"),
  asyncHandler(async (req, res) => {
    const file = (req as typeof req & { file?: Express.Multer.File }).file;
    if (!file) throw badRequest("A file upload is required.");
    if (extOf(file.originalname) !== "pdf")
      throw badRequest("Unsupported file type: expected .pdf.");
    if (file.size <= 0 || file.size > MAX_TOOL_FILE_BYTES)
      throw badRequest("File size out of range.");
    const doc = await loadPdf(file.buffer, "File");
    const creation = doc.getCreationDate();
    const mod = doc.getModificationDate();
    sendSuccess(res, {
      title: doc.getTitle() ?? null,
      author: doc.getAuthor() ?? null,
      subject: doc.getSubject() ?? null,
      keywords: doc.getKeywords() ?? null,
      producer: doc.getProducer() ?? null,
      creator: doc.getCreator() ?? null,
      creationDate: creation ? creation.toISOString() : null,
      modificationDate: mod ? mod.toISOString() : null,
      pageCount: doc.getPageCount(),
    });
  }),
);
