import { PDFDocument, PDFFont, PDFPage, degrees } from "pdf-lib";
import { join, dirname } from "node:path";
import { badRequest } from "../../../utils/errors.js";

const PDF_MAGIC = Buffer.from("%PDF-");

// Extension of a user filename (lowercased, no dot). Extension allowlists
// are one layer only — content is always verified separately.
export function extOf(filename: string): string {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? (parts[parts.length - 1] as string) : "";
}

// Resolves to <pdfjs-dist>/standard_fonts/ in both src (tsx) and dist (tsc)
// so production logs stay free of pdf.js font warnings. Falls back to
// undefined (warning only — extraction still works) if unresolvable.
export function standardFontDataUrl(): string | undefined {
  try {
    const pkg = require.resolve("pdfjs-dist/package.json") as string;
    // Forward slashes: pdf.js validates this as a URL-like factory path,
    // and Windows backslashes are rejected ("must include trailing slash").
    return `${join(dirname(pkg), "standard_fonts").replace(/\\/g, "/")}/`;
  } catch {
    return undefined;
  }
}

// Shared PDF loading with uniform validation: magic bytes + parse.
// `label` identifies the file in errors (e.g. "File", "File #2").
// Copies into an exact-size array first: multer reuses pooled Buffers whose
// byteOffset some parsers ignore (see from-image.service.ts).
export async function loadPdf(buffer: Buffer, label: string): Promise<PDFDocument> {
  if (!buffer.subarray(0, 5).equals(PDF_MAGIC)) throw badRequest(`${label} is not a valid PDF.`);
  // Copy into an exact-size array: multer reuses pooled Buffers whose
  // byteOffset some parsers ignore (see from-image.service.ts).
  const bytes = Uint8Array.from(buffer);
  try {
    return await PDFDocument.load(bytes, { ignoreEncryption: false });
  } catch {
    throw badRequest(`${label} is not a valid PDF.`);
  }
}

// Shared centered-text stamper for watermark/numbering/header-footer tools.
export interface CenteredStamp {
  size?: number;
  opacity?: number;
  rotateDegrees?: number;
  y?: number; // default: vertical center
}

export async function stampCentered(
  doc: PDFDocument,
  font: PDFFont,
  text: string,
  pageIndices: number[],
  stamp: CenteredStamp = {},
): Promise<void> {
  const { size = 12, opacity = 1, rotateDegrees = 0, y } = stamp;
  for (const index of pageIndices) {
    const page = doc.getPage(index) as PDFPage | undefined;
    if (!page) throw badRequest(`Page ${index + 1} does not exist.`);
    const { width, height } = page.getSize();
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: Math.max(0, (width - textWidth) / 2),
      y: y ?? height / 2,
      size,
      font,
      opacity,
      rotate: degrees(rotateDegrees),
    });
  }
}
