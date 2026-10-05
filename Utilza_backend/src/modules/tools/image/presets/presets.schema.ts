import { z } from "zod";

// Preset-resize contracts. Exactly one image each; center cover-fit to the
// preset canvas. Passport is a fixed 413x531 crop (35x45mm @300dpi) with NO
// face detection — the subject must already be roughly centered.
export const socialConfig = {
  toolSlug: "image-social",
  maxFiles: 2,
  allowedExts: ["png", "jpg", "jpeg", "webp"],
} as const;

export const socialBodySchema = z.object({
  preset: z.enum(["og", "square", "story", "banner"]),
});

export const passportConfig = {
  toolSlug: "image-passport",
  maxFiles: 2,
  allowedExts: ["png", "jpg", "jpeg", "webp"],
} as const;

export const passportBodySchema = z.object({}).strict();

export type SocialBody = z.infer<typeof socialBodySchema>;

export const PRESET_CANVAS = {
  og: { w: 1200, h: 630 },
  square: { w: 1080, h: 1080 },
  story: { w: 1080, h: 1920 },
  banner: { w: 1500, h: 500 },
} as const;

export const PASSPORT_CANVAS = { w: 413, h: 531 } as const;
