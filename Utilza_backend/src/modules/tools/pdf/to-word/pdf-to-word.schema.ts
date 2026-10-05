// PDF to Word input contract. Exactly one PDF + no extra fields.
// Output is a text-extraction .docx (paragraphs per page) — layout fidelity
// (tables/images/columns) is NOT preserved; scanned image-only PDFs are
// rejected with an actionable error.
export const pdfToWordConfig = {
  toolSlug: "pdf-to-word",
  // Gate allows 2 so the service — not multer — returns the specific
  // "Exactly one PDF" error; more than 2 is still rejected at the gate.
  maxFiles: 2,
  allowedExts: ["pdf"],
  maxPages: 200,
} as const;

export type PdfToWordConfig = typeof pdfToWordConfig;
