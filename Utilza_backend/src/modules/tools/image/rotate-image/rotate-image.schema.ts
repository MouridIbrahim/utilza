import { z } from "zod";

// Rotator contract. Exactly one image + angle; pixels are physically
// rotated (unlike PDF rotate, which sets a flag).
export const rotateImageConfig = {
  toolSlug: "image-rotate",
  maxFiles: 2,
  allowedExts: ["png", "jpg", "jpeg", "webp"],
} as const;

export const rotateImageBodySchema = z.object({
  angle: z.coerce
    .number()
    .int()
    .refine((a) => [90, 180, 270].includes(a), {
      message: "Angle must be one of 90, 180, 270.",
    }),
});

export type RotateImageBody = z.infer<typeof rotateImageBodySchema>;
