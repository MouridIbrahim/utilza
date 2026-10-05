import { degrees } from "pdf-lib";
import { badRequest } from "../../../../utils/errors.js";
import type { ToolFileInput, ToolProcessResult, ExecuteContext } from "../../execute/execute.js";
import { loadPdf } from "../pdf-utils.js";
import { parseRanges } from "../split-pdf/split-pdf.service.js";
import type { RotatePdfBody } from "./rotate-pages.schema.js";

// Pure transform: inputs → rotated PDF bytes. No storage/DB access.
// Rotation is absolute (overrides any existing page rotation).
export async function rotatePdf(
  inputs: ToolFileInput[],
  ctx: ExecuteContext,
): Promise<ToolProcessResult> {
  if (inputs.length !== 1) throw badRequest("Exactly one PDF file is required to rotate.");
  const input = inputs[0] as ToolFileInput;
  const src = await loadPdf(input.buffer, "File");
  const { angle, ranges } = ctx.body as RotatePdfBody;
  const indices =
    ranges === undefined
      ? src.getPageIndices()
      : parseRanges(ranges, src.getPageCount()).map((p) => p - 1);
  for (const index of indices) src.getPage(index)?.setRotation(degrees(angle));
  const bytes = await src.save({ useObjectStreams: true });
  return { buffer: Buffer.from(bytes), ext: "pdf", mimeType: "application/pdf" };
}
