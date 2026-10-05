// Image-to-PDF input contract. 1–10 images (PNG/JPG); each becomes one page,
// scaled to fit A4 (never upscaled). Covers catalog "JPG to PDF" + "PNG to PDF".
export const imageToPdfConfig = {
  toolSlug: "image-to-pdf",
  maxFiles: 10,
  allowedExts: ["png", "jpg", "jpeg"],
} as const;

export type ImageToPdfConfig = typeof imageToPdfConfig;
