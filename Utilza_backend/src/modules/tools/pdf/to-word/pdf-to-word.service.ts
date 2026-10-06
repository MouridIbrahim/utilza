import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { badRequest } from "../../../../utils/errors.js";
import type { ToolFileInput, ToolProcessResult, ExecuteContext } from "../../execute/execute.js";
import { loadPdf, standardFontDataUrl } from "../pdf-utils.js";
import { pdfToWordConfig } from "./pdf-to-word.schema.js";

export const WORD_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// Extracts printable text lines per page (1-based index preserved by order).
export async function extractPdfText(buffer: Buffer): Promise<string[][]> {
  await loadPdf(buffer, "File");
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(buffer),
    standardFontDataUrl: standardFontDataUrl(),
  }).promise;
  try {
    if (doc.numPages > pdfToWordConfig.maxPages)
      throw badRequest(`PDF has too many pages (max ${pdfToWordConfig.maxPages}).`);
    const pages: string[][] = [];
    for (let i = 1; i <= doc.numPages; i += 1) {
      const page = await doc.getPage(i);
      const content = await page.getTextContent();
      pages.push(
        content.items
          .map((item) => ("str" in item && typeof item.str === "string" ? item.str : ""))
          .map((s) => s.trim())
          .filter((s) => s.length > 0),
      );
    }
    return pages;
  } finally {
    // pdf.js v6 Node build has no destroy(); page buffers are GC'd.
    await doc.cleanup();
  }
}

// Pure transform: inputs → .docx bytes. No storage/DB access.
export async function pdfToWord(
  inputs: ToolFileInput[],
  _ctx: ExecuteContext,
): Promise<ToolProcessResult> {
  if (inputs.length !== 1) throw badRequest("Exactly one PDF file is required to convert.");
  const pages = await extractPdfText((inputs[0] as ToolFileInput).buffer);
  if (pages.every((lines) => lines.length === 0))
    throw badRequest("No extractable text found (scanned image-only PDF?).");
  const children = pages.flatMap((lines, index) => [
    new Paragraph({ children: [new TextRun({ text: `Page ${index + 1}`, bold: true })] }),
    ...lines.map((line) => new Paragraph({ children: [new TextRun(line)] })),
  ]);
  const buffer = Buffer.from(await Packer.toBuffer(new Document({ sections: [{ children }] })));
  return { buffer, ext: "docx", mimeType: WORD_MIME };
}
