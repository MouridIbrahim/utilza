// Compress-PDF input contract. Exactly one PDF; output is the same document
// re-saved with object streams + metadata stripped (optimizer level).
// True image downsampling needs ghostscript (deferred — see service notes).
export const compressPdfConfig = {
  toolSlug: "pdf-compress",
  // Gate allows 2 so the service — not multer — returns the specific
  // "Exactly one PDF" error; more than 2 is still rejected at the gate.
  maxFiles: 2,
  allowedExts: ["pdf"],
} as const;

export type CompressPdfConfig = typeof compressPdfConfig;
