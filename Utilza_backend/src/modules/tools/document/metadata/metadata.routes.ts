import { Router } from "express";
import JSZip from "jszip";
import { asyncHandler, sendSuccess } from "../../../../utils/handler.js";
import { toolUpload, MAX_TOOL_FILE_BYTES } from "../../execute/execute.js";
import { extOf } from "../../pdf/pdf-utils.js";
import { badRequest } from "../../../../utils/errors.js";

export const documentMetadataRouter = Router();

function textOf(xml: string, tag: string): string | null {
  const match = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`).exec(xml);
  if (!match) return null;
  const unescaped = (match[1] as string)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'");
  return unescaped === "" ? null : unescaped;
}

async function docxMetadata(buffer: Buffer): Promise<Record<string, string | number | null>> {
  let core = "";
  let app = "";
  try {
    const zip = await JSZip.loadAsync(buffer);
    core = await (zip.file("docProps/core.xml")?.async("string") ?? Promise.resolve(""));
    app = await (zip.file("docProps/app.xml")?.async("string") ?? Promise.resolve(""));
    if (!zip.file("word/document.xml")) throw badRequest("File is not a valid Word document.");
  } catch (err) {
    if (typeof (err as { status?: unknown }).status === "number") throw err;
    throw badRequest("File is not a valid Word document.");
  }
  return {
    format: "docx",
    title: textOf(core, "dc:title"),
    creator: textOf(core, "dc:creator"),
    subject: textOf(core, "dc:subject"),
    keywords: textOf(core, "cp:keywords"),
    created: textOf(core, "dcterms:created"),
    modified: textOf(core, "dcterms:modified"),
    application: textOf(app, "Application"),
    pages: textOf(app, "Pages") === null ? null : Number(textOf(app, "Pages")),
    words: textOf(app, "Words") === null ? null : Number(textOf(app, "Words")),
  };
}

async function xlsxMetadata(buffer: Buffer): Promise<Record<string, string | number | null>> {
  let core = "";
  let book = "";
  try {
    const zip = await JSZip.loadAsync(buffer);
    core = await (zip.file("docProps/core.xml")?.async("string") ?? Promise.resolve(""));
    book = await (zip.file("xl/workbook.xml")?.async("string") ?? Promise.resolve(""));
    // A valid .xlsx always has xl/workbook.xml; anything else is rejected.
    if (!book) throw badRequest("File is not a valid Excel workbook.");
  } catch (err) {
    if (typeof (err as { status?: unknown }).status === "number") throw err;
    throw badRequest("File is not a valid Excel workbook.");
  }
  return {
    format: "xlsx",
    title: textOf(core, "dc:title"),
    creator: textOf(core, "dc:creator"),
    subject: textOf(core, "dc:subject"),
    keywords: textOf(core, "cp:keywords"),
    created: textOf(core, "dcterms:created"),
    modified: textOf(core, "dcterms:modified"),
    sheets: (book.match(/<sheet[\s>]/g) ?? []).length,
  };
}

// POST /document/metadata — exactly one .docx/.xlsx → metadata JSON.
// Never echoes file bytes.
documentMetadataRouter.post(
  "/",
  toolUpload(2).single("files"),
  asyncHandler(async (req, res) => {
    const file = (req as typeof req & { file?: Express.Multer.File }).file;
    if (!file) throw badRequest("A file upload is required.");
    const ext = extOf(file.originalname);
    if (ext !== "docx" && ext !== "xlsx")
      throw badRequest("Unsupported file type: expected .docx or .xlsx.");
    if (file.size <= 0 || file.size > MAX_TOOL_FILE_BYTES)
      throw badRequest("File size out of range.");
    sendSuccess(
      res,
      ext === "docx" ? await docxMetadata(file.buffer) : await xlsxMetadata(file.buffer),
    );
  }),
);
