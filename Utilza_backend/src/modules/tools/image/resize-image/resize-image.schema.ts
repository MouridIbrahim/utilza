import { z } from "zod";

// Resizer contract. Exactly one image + width and/or height (1–8000px,
// at least one required); aspect preserved (`inside`), never upscaled.
export const resizeImageConfig = {
  toolSlug: "image-resize",
  maxFiles: 2,
  allowedExts: ["png", "jpg", "jpeg", "webp"],
} as const;

export const resizeImageBodySchema = z
  .object({
    width: z.coerce.number().int().min(1).max(8000).optional(),
    height: z.coerce.number().int().min(1).max(8000).optional(),
  })
  .refine((b) => b.width !== undefined || b.height !== undefined, {
    message: "At least one of width or height is required.",
  });

export type ResizeImageBody = z.infer<typeof resizeImageBodySchema>;
