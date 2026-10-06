import { z } from "zod";

// Sign input contract: exactly one PDF + one signature image. The image is
// stamped at (x, y) scaled to `width` points (aspect kept). This is a visible
// mark, NOT a cryptographic/digital signature.
export const signConfig = {
  toolSlug: "pdf-sign",
  maxFiles: 3,
  allowedExts: ["pdf", "png", "jpg", "jpeg"],
} as const;

export const signBodySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  x: z.coerce.number().min(0).max(2000).default(50),
  y: z.coerce.number().min(0).max(2000).default(50),
  width: z.coerce.number().int().min(10).max(500).default(150),
});

export type SignBody = z.infer<typeof signBodySchema>;
