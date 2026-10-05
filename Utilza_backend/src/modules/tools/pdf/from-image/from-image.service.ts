import { PDFDocument } from "pdf-lib";
import { badRequest } from "../../../../utils/errors.js";
import type { ToolFileInput, ToolProcessResult } from "../../execute/execute.js";

const A4_WIDTH = 595;
const A4_HEIGHT = 842;

// Pure transform: inputs → multi-page PDF bytes. No storage/DB access.
export async function imagesToPdf(inputs: ToolFileInput[]): Promise<ToolProcessResult> {
  if (inputs.length < 1) throw badRequest("At least one image file is required.");
  const pdf = await PDFDocument.create();
  for (const [index, input] of inputs.entries()) {
    let image;
    try {
      // Copy into an exact-size array: multer reuses pooled Buffers whose
      // byteOffset pdf-lib's JPEG parser ignores (reads SOI at the wrong
      // place). Uint8Array.from always has byteOffset 0.
      const bytes = Uint8Array.from(input.buffer);
      image = input.ext === "png" ? await pdf.embedPng(bytes) : await pdf.embedJpg(bytes);
    } catch {
      throw badRequest(`File #${index + 1} is not a valid ${input.ext.toUpperCase()} image.`);
    }
    const scale = Math.min(1, A4_WIDTH / image.width, A4_HEIGHT / image.height);
    const page = pdf.addPage([A4_WIDTH, A4_HEIGHT]);
    page.drawImage(image, {
      x: (A4_WIDTH - image.width * scale) / 2,
      y: (A4_HEIGHT - image.height * scale) / 2,
      width: image.width * scale,
      height: image.height * scale,
    });
  }
  const bytes = await pdf.save({ useObjectStreams: true });
  return { buffer: Buffer.from(bytes), ext: "pdf", mimeType: "application/pdf" };
}
