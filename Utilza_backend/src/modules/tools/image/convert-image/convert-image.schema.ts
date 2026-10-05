import { z } from "zod";

// Image-converter input contract. Exactly one image + required `format`
// (multipart text field). Output is re-encoded in the target format at
// high quality; metadata is stripped by default (privacy). For size
// reduction use the compressor instead.
export const imageConvertConfig = {
  toolSlug: "image-convert",
  // Gate allows 2 so the service — not multer — returns the specific
  // "Exactly one image" error; more than 2 is still rejected at the gate.
  maxFiles: 2,
  allowedExts: ["png", "jpg", "jpeg", "webp"],
  defaultQuality: 90,
} as const;

export const imageConvertBodySchema = z.object({
  format: z.enum(["png", "jpg", "webp"]),
});

export type ImageConvertBody = z.infer<typeof imageConvertBodySchema>;
export type ImageConvertConfig = typeof imageConvertConfig;
