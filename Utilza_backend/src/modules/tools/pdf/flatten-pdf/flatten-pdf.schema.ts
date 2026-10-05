// Flatten-PDF contract. Exactly one PDF, no params: every page is copied
// into a fresh document, dropping incremental-update history and orphaned
// objects. Metadata is preserved (unlike compress, which strips it).
export const flattenPdfConfig = {
  toolSlug: "pdf-flatten",
  maxFiles: 2,
  allowedExts: ["pdf"],
} as const;

export type FlattenPdfConfig = typeof flattenPdfConfig;
