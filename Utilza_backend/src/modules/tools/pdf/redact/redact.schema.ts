import { z } from "zod";

// Redact input contract. Exactly one PDF + `regions` as a JSON string
// (multipart text fields can't nest, so clients send e.g.
// '[{"page":1,"x":10,"y":10,"w":100,"h":20}]', max 100 regions).
// VISUAL COVER ONLY: rectangles are drawn over the content — the underlying
// text operators remain in the file and stay extractable. NOT suitable for
// truly sensitive data (that needs content-stream surgery, deferred).
export const redactConfig = {
  toolSlug: "pdf-redact",
  maxFiles: 2,
  allowedExts: ["pdf"],
  maxRegions: 100,
} as const;

const regionSchema = z.object({
  page: z.number().int().min(1),
  x: z.number().min(0).max(2000),
  y: z.number().min(0).max(2000),
  w: z.number().min(1).max(2000),
  h: z.number().min(1).max(2000),
});

export const redactBodySchema = z.object({
  regions: z.string().min(2).max(20000),
});

export const redactRegionsSchema = z.array(regionSchema).min(1).max(redactConfig.maxRegions);

export type RedactBody = z.infer<typeof redactBodySchema>;
