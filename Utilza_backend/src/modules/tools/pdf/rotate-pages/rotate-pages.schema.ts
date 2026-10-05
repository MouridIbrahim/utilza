import { z } from "zod";

// Rotate-PDF input contract. Exactly one PDF + `angle` (absolute rotation
// applied to the selected pages); optional `ranges` (default: all pages).
export const rotatePdfConfig = {
  toolSlug: "pdf-rotate",
  maxFiles: 2,
  allowedExts: ["pdf"],
} as const;

export const rotatePdfBodySchema = z.object({
  angle: z.coerce
    .number()
    .int()
    .refine((a) => [90, 180, 270].includes(a), {
      message: "Angle must be one of 90, 180, 270.",
    }),
  ranges: z.string().min(1).max(200).optional(),
});

export type RotatePdfBody = z.infer<typeof rotatePdfBodySchema>;
