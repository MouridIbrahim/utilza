import { z } from "zod";

// Delete-pages input contract. Exactly one PDF + required `ranges`
// (pages to remove); at least one page must remain.
export const deletePagesConfig = {
  toolSlug: "pdf-page-delete",
  maxFiles: 2,
  allowedExts: ["pdf"],
} as const;

export const deletePagesBodySchema = z.object({
  ranges: z.string().min(1).max(200),
});

export type DeletePagesBody = z.infer<typeof deletePagesBodySchema>;
