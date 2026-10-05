import { PDFDocument } from "pdf-lib";
import { badRequest } from "../../../../utils/errors.js";
import type { ToolFileInput, ToolProcessResult, ExecuteContext } from "../../execute/execute.js";
import { loadPdf } from "../pdf-utils.js";
import { parseRanges } from "../split-pdf/split-pdf.service.js";
import type { DuplicatePagesBody } from "./duplicate-pages.schema.js";

// Pure transform: inputs → PDF bytes with ranged pages appended `times` more.
export async function duplicatePdfPages(
  inputs: ToolFileInput[],
  ctx: ExecuteContext,
): Promise<ToolProcessResult> {
  if (inputs.length !== 1) throw badRequest("Exactly one PDF file is required to duplicate pages.");
  const input = inputs[0] as ToolFileInput;
  const src = await loadPdf(input.buffer, "File");
  const { ranges, times } = ctx.body as DuplicatePagesBody;
  const picked = parseRanges(ranges, src.getPageCount()).map((p) => p - 1);
  const out = await PDFDocument.create();
  const originals = await out.copyPages(src, src.getPageIndices());
  for (const page of originals) out.addPage(page);
  for (let t = 0; t < times; t += 1) {
    const copies = await out.copyPages(src, picked);
    for (const page of copies) out.addPage(page);
  }
  const bytes = await out.save({ useObjectStreams: true });
  return { buffer: Buffer.from(bytes), ext: "pdf", mimeType: "application/pdf" };
}
