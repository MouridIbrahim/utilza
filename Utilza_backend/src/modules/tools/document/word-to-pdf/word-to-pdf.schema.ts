// Word-to-PDF input contract. Exactly one .docx; output is a text-level PDF
// rebuild (paragraphs re-rendered, word-wrapped). Layout fidelity (tables,
// images, columns, headers/footers) is NOT preserved — that needs LibreOffice
// and stays out of scope. Standard PDF fonts cover Latin scripts only.
export const wordToPdfConfig = {
  toolSlug: "word-to-pdf",
  // Gate allows 2 so the service — not multer — returns the specific
  // "Exactly one Word document" error; more than 2 is still rejected.
  maxFiles: 2,
  allowedExts: ["docx"],
  maxParagraphs: 2000,
} as const;

export type WordToPdfConfig = typeof wordToPdfConfig;
