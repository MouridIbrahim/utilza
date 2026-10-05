import { Router } from "express";
import { asyncHandler, sendSuccess } from "../../../../utils/handler.js";
import { toolUpload, MAX_TOOL_FILE_BYTES } from "../../execute/execute.js";
import { extOf, loadPdf } from "../pdf-utils.js";
import { extractPdfText } from "../to-word/pdf-to-word.service.js";
import { badRequest } from "../../../../utils/errors.js";

export const extractTextRouter = Router();

// POST /pdf/text — exactly one PDF → {pageCount, pages, charCount}.
// JSON output (no download); reuses the to-word extractor.
extractTextRouter.post(
  "/",
  toolUpload(2).single("files"),
  asyncHandler(async (req, res) => {
    const file = (req as typeof req & { file?: Express.Multer.File }).file;
    if (!file) throw badRequest("A file upload is required.");
    if (extOf(file.originalname) !== "pdf")
      throw badRequest("Unsupported file type: expected .pdf.");
    if (file.size <= 0 || file.size > MAX_TOOL_FILE_BYTES)
      throw badRequest("File size out of range.");
    await loadPdf(file.buffer, "File");
    const pages = await extractPdfText(file.buffer);
    const charCount = pages.flat().join("").length;
    sendSuccess(res, { pageCount: pages.length, pages, charCount });
  }),
);
