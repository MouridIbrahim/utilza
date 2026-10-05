import { Router } from "express";
import { z } from "zod";
import { validate } from "../../middleware/validation.middleware.js";
import { asyncHandler, sendSuccess } from "../../utils/handler.js";
import { notFound } from "../../utils/errors.js";
import { getToolBySlug, listTools } from "./tools.service.js";
import { mergePdfRouter } from "./pdf/merge-pdf/merge-pdf.routes.js";
import { splitPdfRouter } from "./pdf/split-pdf/split-pdf.routes.js";
import { compressPdfRouter } from "./pdf/compress-pdf/compress-pdf.routes.js";
import { pdfToWordRouter } from "./pdf/to-word/pdf-to-word.routes.js";
import { compressImageRouter } from "./image/compress-image/compress-image.routes.js";
import { convertImageRouter } from "./image/convert-image/convert-image.routes.js";
import { resizeImageRouter } from "./image/resize-image/resize-image.routes.js";
import { cropImageRouter } from "./image/crop-image/crop-image.routes.js";
import { rotateImageRouter } from "./image/rotate-image/rotate-image.routes.js";
import { flipImageRouter } from "./image/flip-image/flip-image.routes.js";
import { exifRouter, faviconRouter } from "./image/meta/meta.routes.js";
import { pixelateRouter, imageWatermarkRouter } from "./image/effects/effects.routes.js";
import { imageMetadataRouter } from "./image/metadata/metadata.routes.js";
import {
  grayscaleRouter,
  blurRouter,
  sharpenRouter,
  brightnessRouter,
  contrastRouter,
} from "./image/filters/filters.routes.js";
import { wordToPdfRouter } from "./document/word-to-pdf/word-to-pdf.routes.js";
import {
  wordToTxtRouter,
  wordToHtmlRouter,
  wordToMarkdownRouter,
} from "./document/word-convert.routes.js";
import { txtToPdfRouter } from "./document/txt-to-pdf/txt-to-pdf.routes.js";
import { zipCreateRouter } from "./file/zip-create/zip-create.routes.js";
import { zipExtractRouter } from "./file/zip-extract/zip-extract.routes.js";
import { fileHashRouter } from "./file/hash/hash.routes.js";
import {
  textMergeRouter,
  textSplitRouter,
  gzipRouter,
} from "./file/text-tools/text-tools.routes.js";
import { fileMetadataRouter } from "./file/metadata/metadata.routes.js";
import { fileTypeRouter } from "./file/type/type.routes.js";
import { base64EncodeRouter } from "./file/base64/base64-encode.routes.js";
import { base64DecodeRouter } from "./file/base64/base64-decode.routes.js";
import { markdownToHtmlRouter } from "./document/markdown-to-html/markdown-to-html.routes.js";
import { documentMetadataRouter } from "./document/metadata/metadata.routes.js";
import {
  excelToCsvRouter,
  excelToJsonRouter,
  csvToJsonRouter,
  csvToExcelRouter,
  jsonToCsvRouter,
} from "./document/spreadsheet/spreadsheet.routes.js";
import { imageToPdfRouter } from "./pdf/from-image/from-image.routes.js";
import { rotatePdfRouter } from "./pdf/rotate-pages/rotate-pages.routes.js";
import { deletePagesRouter } from "./pdf/delete-pages/delete-pages.routes.js";
import { extractTextRouter } from "./pdf/extract-text/extract-text.routes.js";
import { pdfMetadataRouter } from "./pdf/metadata/metadata.routes.js";
import { watermarkRouter } from "./pdf/watermark/watermark.routes.js";
import { numberPagesRouter } from "./pdf/number-pages/number-pages.routes.js";
import { headerFooterRouter } from "./pdf/header-footer/header-footer.routes.js";
import { reorderPagesRouter } from "./pdf/reorder-pages/reorder-pages.routes.js";
import { duplicatePagesRouter } from "./pdf/duplicate-pages/duplicate-pages.routes.js";
import { flattenPdfRouter } from "./pdf/flatten-pdf/flatten-pdf.routes.js";
import { searchPdfRouter } from "./pdf/search-pdf/search-pdf.routes.js";
import { redactRouter } from "./pdf/redact/redact.routes.js";
import { socialRouter, passportRouter } from "./image/presets/presets.routes.js";
import { montageRouter } from "./image/montage/montage.routes.js";

const listQuery = z.object({
  category: z.string().min(1).max(64).optional(),
  search: z.string().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

const slugParams = z.object({ slug: z.string().min(1).max(100) });

export const toolsRouter = Router();

// Backend executors (POST) mount before the GET /:slug lookup below.
toolsRouter.use("/pdf/merge", mergePdfRouter);
toolsRouter.use("/pdf/split", splitPdfRouter);
toolsRouter.use("/pdf/compress", compressPdfRouter);
toolsRouter.use("/pdf/to-word", pdfToWordRouter);
toolsRouter.use("/image/compress", compressImageRouter);
toolsRouter.use("/image/convert", convertImageRouter);
toolsRouter.use("/image/resize", resizeImageRouter);
toolsRouter.use("/image/crop", cropImageRouter);
toolsRouter.use("/image/rotate", rotateImageRouter);
toolsRouter.use("/image/flip", flipImageRouter);
toolsRouter.use("/image/exif-remove", exifRouter);
toolsRouter.use("/image/favicon", faviconRouter);
toolsRouter.use("/image/pixelate", pixelateRouter);
toolsRouter.use("/image/watermark", imageWatermarkRouter);
toolsRouter.use("/image/metadata", imageMetadataRouter);
toolsRouter.use("/image/grayscale", grayscaleRouter);
toolsRouter.use("/image/blur", blurRouter);
toolsRouter.use("/image/sharpen", sharpenRouter);
toolsRouter.use("/image/brightness", brightnessRouter);
toolsRouter.use("/image/contrast", contrastRouter);
toolsRouter.use("/document/to-pdf", wordToPdfRouter);
toolsRouter.use("/document/word-to-txt", wordToTxtRouter);
toolsRouter.use("/document/word-to-html", wordToHtmlRouter);
toolsRouter.use("/document/word-to-markdown", wordToMarkdownRouter);
toolsRouter.use("/document/txt-to-pdf", txtToPdfRouter);
toolsRouter.use("/file/zip-create", zipCreateRouter);
toolsRouter.use("/file/zip-extract", zipExtractRouter);
toolsRouter.use("/file/hash", fileHashRouter);
toolsRouter.use("/file/merge", textMergeRouter);
toolsRouter.use("/file/split", textSplitRouter);
toolsRouter.use("/file/compress", gzipRouter);
toolsRouter.use("/file/metadata", fileMetadataRouter);
toolsRouter.use("/file/type", fileTypeRouter);
toolsRouter.use("/file/base64-encode", base64EncodeRouter);
toolsRouter.use("/file/base64-decode", base64DecodeRouter);
toolsRouter.use("/document/markdown-to-html", markdownToHtmlRouter);
toolsRouter.use("/document/metadata", documentMetadataRouter);
toolsRouter.use("/document/excel-to-csv", excelToCsvRouter);
toolsRouter.use("/document/excel-to-json", excelToJsonRouter);
toolsRouter.use("/document/csv-to-json", csvToJsonRouter);
toolsRouter.use("/document/csv-to-excel", csvToExcelRouter);
toolsRouter.use("/document/json-to-csv", jsonToCsvRouter);
toolsRouter.use("/pdf/from-image", imageToPdfRouter);
toolsRouter.use("/pdf/rotate", rotatePdfRouter);
toolsRouter.use("/pdf/delete-pages", deletePagesRouter);
toolsRouter.use("/pdf/text", extractTextRouter);
toolsRouter.use("/pdf/metadata", pdfMetadataRouter);
toolsRouter.use("/pdf/watermark", watermarkRouter);
toolsRouter.use("/pdf/number-pages", numberPagesRouter);
toolsRouter.use("/pdf/header-footer", headerFooterRouter);
toolsRouter.use("/pdf/reorder", reorderPagesRouter);
toolsRouter.use("/pdf/duplicate", duplicatePagesRouter);
toolsRouter.use("/pdf/flatten", flattenPdfRouter);
toolsRouter.use("/pdf/search", searchPdfRouter);
toolsRouter.use("/pdf/redact", redactRouter);
toolsRouter.use("/image/social", socialRouter);
toolsRouter.use("/image/passport", passportRouter);
toolsRouter.use("/image/montage", montageRouter);

toolsRouter.get(
  "/",
  validate({ query: listQuery }),
  asyncHandler(async (req, res) => {
    const q = req.query as unknown as {
      category?: string;
      search?: string;
      page: number;
      limit: number;
    };
    const result = await listTools({
      category: q.category,
      search: q.search,
      page: q.page,
      limit: q.limit,
    });
    sendSuccess(res, result);
  }),
);

toolsRouter.get(
  "/:slug",
  validate({ params: slugParams }),
  asyncHandler(async (req, res) => {
    const item = await getToolBySlug(req.params["slug"] as string);
    if (!item || (typeof item === "object" && "isActive" in item && !item.isActive))
      throw notFound("Tool not found.", "TOOL_NOT_FOUND");
    sendSuccess(res, item);
  }),
);
