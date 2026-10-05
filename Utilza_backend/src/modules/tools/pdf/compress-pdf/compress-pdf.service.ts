import { badRequest } from "../../../../utils/errors.js";
import type { ToolFileInput, ToolProcessResult, ExecuteContext } from "../../execute/execute.js";
import { loadPdf } from "../pdf-utils.js";

// Pure transform: inputs → optimized PDF bytes. No storage/DB access.
// Optimizer level: metadata stripped + object-stream re-save. This shrinks
// bloated PDFs (spike: 11,938 → 3,104 bytes, ratio 0.26) but cannot
// downsample embedded images — that needs ghostscript-quality tooling and
// stays out of scope until usage justifies the native dependency.
export async function compressPdf(
  inputs: ToolFileInput[],
  _ctx: ExecuteContext,
): Promise<ToolProcessResult> {
  if (inputs.length !== 1) throw badRequest("Exactly one PDF file is required to compress.");
  const input = inputs[0] as ToolFileInput;
  const src = await loadPdf(input.buffer, "File");
  src.setTitle("");
  src.setAuthor("");
  src.setSubject("");
  src.setKeywords([]);
  src.setProducer("");
  src.setCreator("");
  const bytes = await src.save({ useObjectStreams: true });
  return { buffer: Buffer.from(bytes), ext: "pdf", mimeType: "application/pdf" };
}
