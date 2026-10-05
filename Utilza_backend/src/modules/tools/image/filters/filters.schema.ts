import { z } from "zod";

// Filter contracts. Exactly one image each; output keeps the input format.
// Brightness uses modulate; contrast uses linear() around the midpoint:
// out = level * in - 128 * (level - 1).
export const imageFilterConfig = {
  maxFiles: 2,
  allowedExts: ["png", "jpg", "jpeg", "webp"],
} as const;

export const grayscaleBodySchema = z.object({}).strict();

export const blurBodySchema = z.object({
  sigma: z.coerce.number().min(0.3).max(50).default(5),
});

export const sharpenBodySchema = z.object({
  sigma: z.coerce.number().min(0.5).max(10).default(1),
});

export const brightnessBodySchema = z.object({
  level: z.coerce.number().min(0.1).max(3).default(1.2),
});

export const contrastBodySchema = z.object({
  level: z.coerce.number().min(0.1).max(3).default(1.2),
});

export type BlurBody = z.infer<typeof blurBodySchema>;
export type SharpenBody = z.infer<typeof sharpenBodySchema>;
export type BrightnessBody = z.infer<typeof brightnessBodySchema>;
export type ContrastBody = z.infer<typeof contrastBodySchema>;
