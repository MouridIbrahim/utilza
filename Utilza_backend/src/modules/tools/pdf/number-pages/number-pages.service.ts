import { StandardFonts } from "pdf-lib";
import { badRequest } from "../../../../utils/errors.js";
import type { ToolFileInput, ToolProcessResult, ExecuteContext } from "../../execute/execute.js";
import { loadPdf, stampCentered } from "../pdf-utils.js";
import type { NumberPagesBody } from "./number-pages.schema.js";

// Pure transform: inputs → numbered PDF bytes. No storage/DB access.
export async function numberPdfPages(
  inputs: ToolFileInput[],
  ctx: ExecuteContext,
): Promise<ToolProcessResult> {
  if (inputs.length !== 1) throw badRequest("Exactly one PDF file is required.");
  const input = inputs[0] as ToolFileInput;
  const src = await loadPdf(input.buffer, "File");
  const { format, size } = ctx.body as NumberPagesBody;
  const font = await src.embedFont(StandardFonts.Helvetica);
  const total = src.getPageCount();
  for (const [i, index] of src.getPageIndices().entries()) {
    const text = format === "n" ? `${i + 1}` : `Page ${i + 1} of ${total}`;
    await stampCentered(src, font, text, [index], { size, y: 30 });
  }
  const bytes = await src.save({ useObjectStreams: true });
  return { buffer: Buffer.from(bytes), ext: "pdf", mimeType: "application/pdf" };
}
