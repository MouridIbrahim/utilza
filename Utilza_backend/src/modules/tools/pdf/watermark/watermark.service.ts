import { StandardFonts } from "pdf-lib";
import { badRequest } from "../../../../utils/errors.js";
import type { ToolFileInput, ToolProcessResult, ExecuteContext } from "../../execute/execute.js";
import { loadPdf, stampCentered } from "../pdf-utils.js";
import type { WatermarkBody } from "./watermark.schema.js";

// Pure transform: inputs → watermarked PDF bytes. No storage/DB access.
export async function watermarkPdf(
  inputs: ToolFileInput[],
  ctx: ExecuteContext,
): Promise<ToolProcessResult> {
  if (inputs.length !== 1) throw badRequest("Exactly one PDF file is required.");
  const input = inputs[0] as ToolFileInput;
  const src = await loadPdf(input.buffer, "File");
  const { text, opacity, size } = ctx.body as WatermarkBody;
  const font = await src.embedFont(StandardFonts.HelveticaBold);
  await stampCentered(src, font, text, src.getPageIndices(), {
    size,
    opacity,
    rotateDegrees: 45,
  });
  const bytes = await src.save({ useObjectStreams: true });
  return { buffer: Buffer.from(bytes), ext: "pdf", mimeType: "application/pdf" };
}
