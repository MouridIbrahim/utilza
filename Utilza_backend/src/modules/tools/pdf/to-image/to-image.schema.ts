import { z } from "zod";

// Raster input contract. Exactly one PDF → ZIP of rendered page images.
// `pages` selects 1-based pages (default all, capped); `format` + `scale`
// control output size. Rendering needs pdfjs + prebuilt canvas (no system
// deps); scanned PDFs rasterize fine (pixels, not text).
export const rasterConfig = {
  toolSlug: "pdf-to-image",
  maxFiles: 2,
  allowedExts: ["pdf"],
  maxPages: 20,
} as const;

export const rasterBodySchema = z.object({
  format: z.enum(["png", "jpg"]).default("png"),
  pages: z.string().min(1).max(200).optional(),
  scale: z.coerce.number().min(1).max(3).default(2),
});

export type RasterBody = z.infer<typeof rasterBodySchema>;
