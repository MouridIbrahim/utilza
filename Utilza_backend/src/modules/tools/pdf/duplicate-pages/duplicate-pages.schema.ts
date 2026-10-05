import { z } from "zod";

// Duplicate-pages contract. Exactly one PDF + `ranges` + `times` (1–10):
// the selected pages are appended `times` more (originals stay in place).
export const duplicatePagesConfig = {
  toolSlug: "pdf-duplicate",
  maxFiles: 2,
  allowedExts: ["pdf"],
} as const;

export const duplicatePagesBodySchema = z.object({
  ranges: z.string().min(1).max(200),
  times: z.coerce.number().int().min(1).max(10).default(1),
});

export type DuplicatePagesBody = z.infer<typeof duplicatePagesBodySchema>;
