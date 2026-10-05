import { z } from "zod";

// Page-numbering contract. Exactly one PDF; numbers every page bottom-center
// as "Page N of TOTAL" (default) or "N".
export const numberPagesConfig = {
  toolSlug: "pdf-number-pages",
  maxFiles: 2,
  allowedExts: ["pdf"],
} as const;

export const numberPagesBodySchema = z.object({
  format: z.enum(["n-of-total", "n"]).default("n-of-total"),
  size: z.coerce.number().int().min(8).max(36).default(10),
});

export type NumberPagesBody = z.infer<typeof numberPagesBodySchema>;
