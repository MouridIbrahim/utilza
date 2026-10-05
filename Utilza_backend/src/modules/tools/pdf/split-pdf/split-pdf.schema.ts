import { z } from "zod";

// Split-PDF input contract. One PDF + multipart text field `ranges`
// (e.g. "1-3,5"); output is a single PDF with those pages in order.
// Burst-to-many-PDFs arrives with ZIP support (Wave 2); until then this also
// covers page extraction.
export const splitPdfConfig = {
  toolSlug: "pdf-split",
  // Gate allows 2 so the service — not multer — returns the specific
  // "Exactly one PDF" error; more than 2 is still rejected at the gate.
  maxFiles: 2,
  allowedExts: ["pdf"],
  maxSelectedPages: 500,
} as const;

export const splitPdfBodySchema = z.object({
  ranges: z.string().min(1).max(200),
});

export type SplitPdfBody = z.infer<typeof splitPdfBodySchema>;
