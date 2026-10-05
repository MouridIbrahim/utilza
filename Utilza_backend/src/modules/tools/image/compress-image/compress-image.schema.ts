import { z } from "zod";

// Image-compressor input contract. Exactly one image; optional `quality`
// (1–100, default 80) arrives as a multipart text field. Output keeps the
// input format, re-encoded; metadata is stripped by default (privacy).
// No resizing — that is the resizer tool (Wave 2).
export const imageCompressConfig = {
  toolSlug: "image-compress",
  // Gate allows 2 so the service — not multer — returns the specific
  // "Exactly one image" error; more than 2 is still rejected at the gate.
  maxFiles: 2,
  allowedExts: ["png", "jpg", "jpeg", "webp"],
  defaultQuality: 80,
} as const;

export const imageCompressBodySchema = z.object({
  quality: z.coerce.number().int().min(1).max(100).default(imageCompressConfig.defaultQuality),
});

export type ImageCompressBody = z.infer<typeof imageCompressBodySchema>;
export type ImageCompressConfig = typeof imageCompressConfig;
