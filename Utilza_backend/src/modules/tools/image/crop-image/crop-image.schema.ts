import { z } from "zod";

// Cropper contract. Exactly one image + left/top/width/height in pixels;
// the region must fit inside the image (checked against real dimensions).
export const cropImageConfig = {
  toolSlug: "image-crop",
  maxFiles: 2,
  allowedExts: ["png", "jpg", "jpeg", "webp"],
  maxSide: 8000,
} as const;

export const cropImageBodySchema = z.object({
  left: z.coerce.number().int().min(0).max(cropImageConfig.maxSide),
  top: z.coerce.number().int().min(0).max(cropImageConfig.maxSide),
  width: z.coerce.number().int().min(1).max(cropImageConfig.maxSide),
  height: z.coerce.number().int().min(1).max(cropImageConfig.maxSide),
});

export type CropImageBody = z.infer<typeof cropImageBodySchema>;
