import { Router } from "express";
import { z } from "zod";
import { validate } from "../../../../middleware/validation.middleware.js";
import { asyncHandler, sendSuccess } from "../../../../utils/handler.js";
import { toolUpload, MAX_TOOL_FILE_BYTES } from "../../execute/execute.js";
import { extOf, loadPdf } from "../pdf-utils.js";
import { extractPdfText } from "../to-word/pdf-to-word.service.js";
import { badRequest } from "../../../../utils/errors.js";

const searchBodySchema = z.object({
  query: z.string().min(1).max(200),
});

const MAX_MATCHES = 50;

export const searchPdfRouter = Router();

// POST /pdf/search — exactly one PDF + `query` → {pageCount, matches:[{page,
// line}]} (case-insensitive, capped). JSON output, no download.
searchPdfRouter.post(
  "/",
  toolUpload(2).single("files"),
  validate({ body: searchBodySchema }),
  asyncHandler(async (req, res) => {
    const file = (req as typeof req & { file?: Express.Multer.File }).file;
    if (!file) throw badRequest("A file upload is required.");
    if (extOf(file.originalname) !== "pdf")
      throw badRequest("Unsupported file type: expected .pdf.");
    if (file.size <= 0 || file.size > MAX_TOOL_FILE_BYTES)
      throw badRequest("File size out of range.");
    await loadPdf(file.buffer, "File");
    const query = (req.body as { query: string }).query.toLowerCase();
    const pages = await extractPdfText(file.buffer);
    const matches: Array<{ page: number; line: string }> = [];
    for (const [index, lines] of pages.entries()) {
      for (const line of lines) {
        if (line.toLowerCase().includes(query)) {
          matches.push({ page: index + 1, line: line.slice(0, 300) });
          if (matches.length >= MAX_MATCHES) break;
        }
      }
      if (matches.length >= MAX_MATCHES) break;
    }
    sendSuccess(res, { pageCount: pages.length, query: req.body.query, matches });
  }),
);
