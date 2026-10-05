import { StandardFonts } from "pdf-lib";
import { badRequest } from "../../../../utils/errors.js";
import type { ToolFileInput, ToolProcessResult, ExecuteContext } from "../../execute/execute.js";
import { loadPdf, stampCentered } from "../pdf-utils.js";
import type { HeaderFooterBody } from "./header-footer.schema.js";

// Pure transform: inputs → stamped PDF bytes. No storage/DB access.
export async function headerFooterPdf(
  inputs: ToolFileInput[],
  ctx: ExecuteContext,
): Promise<ToolProcessResult> {
  if (inputs.length !== 1) throw badRequest("Exactly one PDF file is required.");
  const input = inputs[0] as ToolFileInput;
  const src = await loadPdf(input.buffer, "File");
  const { header, footer, size } = ctx.body as HeaderFooterBody;
  const font = await src.embedFont(StandardFonts.Helvetica);
  const indices = src.getPageIndices();
  if (header !== undefined) {
    for (const index of indices) {
      const { height } = src.getPage(index)?.getSize() ?? { height: 842 };
      await stampCentered(src, font, header, [index], { size, y: height - 30 });
    }
  }
  if (footer !== undefined) {
    await stampCentered(src, font, footer, indices, { size, y: 30 });
  }
  const bytes = await src.save({ useObjectStreams: true });
  return { buffer: Buffer.from(bytes), ext: "pdf", mimeType: "application/pdf" };
}
