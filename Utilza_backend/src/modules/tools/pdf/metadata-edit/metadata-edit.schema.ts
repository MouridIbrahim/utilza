import { z } from "zod";

// Metadata-editor contract. Exactly one PDF + at least one field to set.
// Empty string clears a field; omitted fields are left untouched.
export const metadataEditConfig = {
  toolSlug: "pdf-metadata-edit",
  maxFiles: 2,
  allowedExts: ["pdf"],
} as const;

const field = z.string().max(500);

export const metadataEditBodySchema = z
  .object({
    title: field.optional(),
    author: field.optional(),
    subject: field.optional(),
    keywords: field.optional(),
    producer: field.optional(),
    creator: field.optional(),
  })
  .refine(
    (b) =>
      b.title !== undefined ||
      b.author !== undefined ||
      b.subject !== undefined ||
      b.keywords !== undefined ||
      b.producer !== undefined ||
      b.creator !== undefined,
    { message: "At least one metadata field is required." },
  );

export type MetadataEditBody = z.infer<typeof metadataEditBodySchema>;
