import { z } from "zod";

// Flipper contract. Exactly one image + direction; pixels are mirrored.
export const flipImageConfig = {
  toolSlug: "image-flip",
  maxFiles: 2,
  allowedExts: ["png", "jpg", "jpeg", "webp"],
} as const;

export const flipImageBodySchema = z.object({
  direction: z.enum(["horizontal", "vertical"]),
});

export type FlipImageBody = z.infer<typeof flipImageBodySchema>;
