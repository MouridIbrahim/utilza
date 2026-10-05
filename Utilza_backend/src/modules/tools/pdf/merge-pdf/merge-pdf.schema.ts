import { z } from "zod";

// Merge-PDF input contract. Files arrive as multipart field `files`;
// the shared execute helper enforces these limits before `process` runs.
export const mergePdfConfig = {
  toolSlug: "pdf-merge",
  maxFiles: 20,
  allowedExts: ["pdf"],
} as const;

export type MergePdfConfig = typeof mergePdfConfig;
void z;
