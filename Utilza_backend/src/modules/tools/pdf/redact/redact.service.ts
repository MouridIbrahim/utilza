import { rgb } from "pdf-lib";
import { badRequest } from "../../../../utils/errors.js";
import type { ToolFileInput, ToolProcessResult, ExecuteContext } from "../../execute/execute.js";
import { loadPdf } from "../pdf-utils.js";
import { redactRegionsSchema, type RedactBody } from "./redact.schema.js";

// Pure transform: inputs → covered PDF bytes. No storage/DB access.
// See schema notes: visual cover only, not content removal.
export async function redactPdf(
  inputs: ToolFileInput[],
  ctx: ExecuteContext,
): Promise<ToolProcessResult> {
  if (inputs.length !== 1) throw badRequest("Exactly one PDF file is required to redact.");
  const input = inputs[0] as ToolFileInput;
  const src = await loadPdf(input.buffer, "File");
  let regions: Array<{ page: number; x: number; y: number; w: number; h: number }>;
  try {
    regions = redactRegionsSchema.parse(JSON.parse((ctx.body as RedactBody).regions));
  } catch {
    throw badRequest('Invalid regions JSON (e.g. [{"page":1,"x":10,"y":10,"w":100,"h":20}]).');
  }
  const pageCount = src.getPageCount();
  for (const [i, r] of regions.entries()) {
    if (r.page > pageCount)
      throw badRequest(`Region #${i + 1}: page ${r.page} out of range (${pageCount} pages).`);
    const page = src.getPage(r.page - 1);
    if (!page) throw badRequest(`Region #${i + 1}: page ${r.page} does not exist.`);
    page.drawRectangle({
      x: r.x,
      y: r.y,
      width: r.w,
      height: r.h,
      color: rgb(0, 0, 0),
      opacity: 1,
    });
  }
  const bytes = await src.save({ useObjectStreams: true });
  return { buffer: Buffer.from(bytes), ext: "pdf", mimeType: "application/pdf" };
}
