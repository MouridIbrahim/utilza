import { z } from "zod";

// Watermark input contract. Exactly one PDF + diagonal translucent text
// centered on every page.
export const watermarkConfig = {
  toolSlug: "pdf-watermark",
  maxFiles: 2,
  allowedExts: ["pdf"],
} as const;

export const watermarkBodySchema = z.object({
  text: z.string().min(1).max(100),
  opacity: z.coerce.number().min(0.05).max(0.5).default(0.15),
  size: z.coerce.number().int().min(12).max(144).default(48),
});

export type WatermarkBody = z.infer<typeof watermarkBodySchema>;
