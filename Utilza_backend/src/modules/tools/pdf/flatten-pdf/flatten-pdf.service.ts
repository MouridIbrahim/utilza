import { PDFDocument } from "pdf-lib";
import { badRequest } from "../../../../utils/errors.js";
import type { ToolFileInput, ToolProcessResult } from "../../execute/execute.js";
import { loadPdf } from "../pdf-utils.js";

// Pure transform: inputs → normalized PDF bytes. No storage/DB access.
export async function flattenPdf(inputs: ToolFileInput[]): Promise<ToolProcessResult> {
  if (inputs.length !== 1) throw badRequest("Exactly one PDF file is required to flatten.");
  const input = inputs[0] as ToolFileInput;
  const src = await loadPdf(input.buffer, "File");
  const out = await PDFDocument.create();
  out.setTitle(src.getTitle() ?? "");
  out.setAuthor(src.getAuthor() ?? "");
  out.setSubject(src.getSubject() ?? "");
  out.setProducer(src.getProducer() ?? "");
  out.setCreator(src.getCreator() ?? "");
  const copied = await out.copyPages(src, src.getPageIndices());
  for (const page of copied) out.addPage(page);
  const bytes = await out.save({ useObjectStreams: true });
  return { buffer: Buffer.from(bytes), ext: "pdf", mimeType: "application/pdf" };
}
