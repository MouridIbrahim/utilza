import { z } from "zod";

// Reorder-pages contract. Exactly one PDF + `order` (1-based page list in the
// desired sequence, e.g. "3,1,2"). Must be a true permutation: every page
// exactly once (subsets = split, repeats = duplicate).
export const reorderPagesConfig = {
  toolSlug: "pdf-reorder",
  maxFiles: 2,
  allowedExts: ["pdf"],
} as const;

export const reorderPagesBodySchema = z.object({
  order: z.string().min(1).max(500),
});

export type ReorderPagesBody = z.infer<typeof reorderPagesBodySchema>;
