import { z } from "zod";

// Pixelate contract: downscale to `blocks` wide then back up with nearest
// neighbor. Watermark contract: SVG-composited text label at a corner/center.
export const pixelateBodySchema = z.object({
  blocks: z.coerce.number().int().min(4).max(100).default(20),
});

const positions = ["top-left", "top-right", "bottom-left", "bottom-right", "center"] as const;

export const watermarkBodySchema = z.object({
  text: z.string().min(1).max(100),
  position: z.enum(positions).default("bottom-right"),
  opacity: z.coerce.number().min(0.05).max(0.8).default(0.5),
  size: z.coerce.number().int().min(8).max(144).default(24),
});

export type PixelateBody = z.infer<typeof pixelateBodySchema>;
export type WatermarkBody = z.infer<typeof watermarkBodySchema>;
export type WatermarkPosition = (typeof positions)[number];
