import { z } from "zod";

// Header/footer contract. Exactly one PDF + at least one of `header`/`footer`
// (max 200 chars each), stamped top-center / bottom-center on every page.
export const headerFooterConfig = {
  toolSlug: "pdf-header-footer",
  maxFiles: 2,
  allowedExts: ["pdf"],
} as const;

export const headerFooterBodySchema = z
  .object({
    header: z.string().min(1).max(200).optional(),
    footer: z.string().min(1).max(200).optional(),
    size: z.coerce.number().int().min(8).max(36).default(10),
  })
  .refine((b) => b.header !== undefined || b.footer !== undefined, {
    message: "At least one of header or footer is required.",
  });

export type HeaderFooterBody = z.infer<typeof headerFooterBodySchema>;
