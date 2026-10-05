import { z } from "zod";

// EXIF-remover contract: re-encode at near-lossless settings with all
// metadata dropped (sharp strips unless withMetadata is called).
export const exifConfig = {
  toolSlug: "image-exif-remove",
  maxFiles: 2,
  allowedExts: ["png", "jpg", "jpeg", "webp"],
} as const;

export const exifBodySchema = z.object({}).strict();

// Favicon contract: square-ish source → ZIP of standard icons + manifest.
export const faviconConfig = {
  toolSlug: "image-favicon",
  maxFiles: 2,
  allowedExts: ["png", "jpg", "jpeg", "webp"],
} as const;

export const faviconBodySchema = z.object({}).strict();
