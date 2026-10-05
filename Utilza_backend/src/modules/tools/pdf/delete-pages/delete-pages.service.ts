import { PDFDocument } from "pdf-lib";
import { badRequest } from "../../../../utils/errors.js";
import type { ToolFileInput, ToolProcessResult, ExecuteContext } from "../../execute/execute.js";
import { loadPdf } from "../pdf-utils.js";
import { parseRanges } from "../split-pdf/split-pdf.service.js";
import type { DeletePagesBody } from "./delete-pages.schema.js";

// Pure transform: inputs → PDF bytes minus the ranged pages.
export async function deletePdfPages(
  inputs: ToolFileInput[],
  ctx: ExecuteContext,
): Promise<ToolProcessResult> {
  if (inputs.length !== 1) throw badRequest("Exactly one PDF file is required.");
  const input = inputs[0] as ToolFileInput;
  const src = await loadPdf(input.buffer, "File");
  const { ranges } = ctx.body as DeletePagesBody;
  const doomed = new Set(parseRanges(ranges, src.getPageCount()).map((p) => p - 1));
  const kept = src.getPageIndices().filter((i) => !doomed.has(i));
  if (kept.length === 0) throw badRequest("Cannot delete all pages of the document.");
  const out = await PDFDocument.create();
  const copied = await out.copyPages(src, kept);
  for (const page of copied) out.addPage(page);
  const bytes = await out.save({ useObjectStreams: true });
  return { buffer: Buffer.from(bytes), ext: "pdf", mimeType: "application/pdf" };
}
