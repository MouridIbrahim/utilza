import { PDFDocument } from "pdf-lib";
import { badRequest } from "../../../../utils/errors.js";
import type { ToolFileInput, ToolProcessResult, ExecuteContext } from "../../execute/execute.js";
import { loadPdf } from "../pdf-utils.js";
import { parseRanges } from "../split-pdf/split-pdf.service.js";
import type { ReorderPagesBody } from "./reorder-pages.schema.js";

// Pure transform: inputs → reordered PDF bytes. No storage/DB access.
export async function reorderPdfPages(
  inputs: ToolFileInput[],
  ctx: ExecuteContext,
): Promise<ToolProcessResult> {
  if (inputs.length !== 1) throw badRequest("Exactly one PDF file is required to reorder.");
  const input = inputs[0] as ToolFileInput;
  const src = await loadPdf(input.buffer, "File");
  const { order } = ctx.body as ReorderPagesBody;
  const wanted = parseRanges(order, src.getPageCount());
  const total = src.getPageCount();
  if (wanted.length !== total || new Set(wanted).size !== total)
    throw badRequest(`Order must list every page exactly once (1-${total}).`);
  const out = await PDFDocument.create();
  const copied = await out.copyPages(
    src,
    wanted.map((p) => p - 1),
  );
  for (const page of copied) out.addPage(page);
  const bytes = await out.save({ useObjectStreams: true });
  return { buffer: Buffer.from(bytes), ext: "pdf", mimeType: "application/pdf" };
}
