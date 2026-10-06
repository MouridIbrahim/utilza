import { badRequest } from "../../../../utils/errors.js";
import type { ToolFileInput, ToolProcessResult, ExecuteContext } from "../../execute/execute.js";
import { loadPdf } from "../pdf-utils.js";
import type { SignBody } from "./sign.schema.js";

const IMAGE_EXTS = new Set(["png", "jpg", "jpeg"]);

// Pure transform: inputs → signed PDF bytes. No storage/DB access.
// Visible image stamp only — not a cryptographic signature.
export async function signPdf(
  inputs: ToolFileInput[],
  ctx: ExecuteContext,
): Promise<ToolProcessResult> {
  const pdfs = inputs.filter((i) => i.ext === "pdf");
  const images = inputs.filter((i) => IMAGE_EXTS.has(i.ext));
  if (pdfs.length !== 1 || images.length !== 1)
    throw badRequest("Upload exactly one PDF and one signature image (png/jpg).");
  const pdfInput = pdfs[0] as ToolFileInput;
  const imgInput = images[0] as ToolFileInput;
  const src = await loadPdf(pdfInput.buffer, "File");
  const { page, x, y, width } = ctx.body as SignBody;
  if (page > src.getPageCount())
    throw badRequest(`Page ${page} out of range (${src.getPageCount()} pages).`);
  // Exact-size copy: pooled multer Buffers confuse some parsers (see
  // from-image.service.ts); embed paths get clean bytes. Normalize through
  // sharp so jpg and png both embed reliably.
  const imgBytes = Uint8Array.from(imgInput.buffer);
  const { default: sharp } = await import("sharp");
  const normalized = await sharp(Buffer.from(imgBytes), { failOn: "error" }).png().toBuffer();
  const target = src.getPage(page - 1);
  if (!target) throw badRequest(`Page ${page} does not exist.`);
  const embedded = await src.embedPng(Uint8Array.from(normalized));
  const scale = width / embedded.width;
  target.drawImage(embedded, { x, y, width, height: embedded.height * scale });
  const bytes = await src.save({ useObjectStreams: true });
  return { buffer: Buffer.from(bytes), ext: "pdf", mimeType: "application/pdf" };
}
