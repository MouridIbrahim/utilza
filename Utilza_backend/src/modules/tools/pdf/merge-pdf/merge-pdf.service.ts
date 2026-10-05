import { PDFDocument } from "pdf-lib";
import { badRequest } from "../../../../utils/errors.js";
import type { ToolFileInput, ToolProcessResult } from "../../execute/execute.js";
import { loadPdf } from "../pdf-utils.js";

// Pure transform: inputs → merged PDF bytes. No storage/DB access;
// the shared execute helper owns temp ids, storage rows and the response.
export async function mergePdfs(inputs: ToolFileInput[]): Promise<ToolProcessResult> {
  if (inputs.length < 2) throw badRequest("At least two PDF files are required to merge.");
  const merged = await PDFDocument.create();
  for (const [index, input] of inputs.entries()) {
    const src = await loadPdf(input.buffer, `File #${index + 1}`);
    const pages = await merged.copyPages(src, src.getPageIndices());
    for (const page of pages) merged.addPage(page);
  }
  const bytes = await merged.save();
  return { buffer: Buffer.from(bytes), ext: "pdf", mimeType: "application/pdf" };
}
