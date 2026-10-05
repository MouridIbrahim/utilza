import { PDFDocument } from "pdf-lib";
import { badRequest } from "../../../../utils/errors.js";
import type { ToolFileInput, ToolProcessResult, ExecuteContext } from "../../execute/execute.js";
import { loadPdf } from "../pdf-utils.js";
import { splitPdfConfig, type SplitPdfBody } from "./split-pdf.schema.js";

// "1-3,5" → [1,2,3,5] (1-based). Strict: integers only, in range, capped.
export function parseRanges(ranges: string, pageCount: number): number[] {
  const pages: number[] = [];
  for (const part of ranges.split(",")) {
    const token = part.trim();
    if (!/^\d+(-\d+)?$/.test(token)) throw badRequest(`Invalid page range: "${token}".`);
    const [startRaw, endRaw] = token.split("-");
    const start = Number(startRaw);
    const end = endRaw === undefined ? start : Number(endRaw);
    if (start < 1 || end < start)
      throw badRequest(`Invalid page range: "${token}". Use 1-based pages, e.g. "1-3,5".`);
    for (let p = start; p <= end; p += 1) {
      if (p > pageCount)
        throw badRequest(`Page ${p} is out of range (document has ${pageCount} pages).`);
      pages.push(p);
    }
  }
  if (pages.length === 0) throw badRequest("No pages selected.");
  if (pages.length > splitPdfConfig.maxSelectedPages)
    throw badRequest(`Too many pages selected (max ${splitPdfConfig.maxSelectedPages}).`);
  return pages;
}

// Pure transform: inputs → split PDF bytes. No storage/DB access.
export async function splitPdf(
  inputs: ToolFileInput[],
  ctx: ExecuteContext,
): Promise<ToolProcessResult> {
  if (inputs.length !== 1) throw badRequest("Exactly one PDF file is required to split.");
  const input = inputs[0] as ToolFileInput;
  const src = await loadPdf(input.buffer, "File");
  const { ranges } = ctx.body as SplitPdfBody;
  const pages = parseRanges(ranges, src.getPageCount());
  const out = await PDFDocument.create();
  const copied = await out.copyPages(
    src,
    pages.map((p) => p - 1),
  );
  for (const page of copied) out.addPage(page);
  const bytes = await out.save();
  return { buffer: Buffer.from(bytes), ext: "pdf", mimeType: "application/pdf" };
}
