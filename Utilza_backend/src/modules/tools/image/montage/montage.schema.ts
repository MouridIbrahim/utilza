import { z } from "zod";

// Montage contract. 2–9 images arranged in a grid; all cells equal size;
// images cover-fit their cells. Output format matches the first image.
export const montageConfig = {
  toolSlug: "image-montage",
  maxFiles: 9,
  allowedExts: ["png", "jpg", "jpeg", "webp"],
} as const;

export const montageBodySchema = z.object({
  cols: z.coerce.number().int().min(1).max(3).default(2),
  rows: z.coerce.number().int().min(1).max(3).default(2),
  gap: z.coerce.number().int().min(0).max(50).default(4),
  background: z
    .string()
    .regex(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)
    .default("#ffffff"),
});

export type MontageBody = z.infer<typeof montageBodySchema>;
