import sharp from "sharp";
import { badRequest } from "../../../utils/errors.js";
import type { ToolFileInput } from "../execute/execute.js";

// Shared image guards for the geometry tools (resize/crop/rotate/flip).
export const MAX_INPUT_PIXELS = 100_000_000;
export const IMAGE_EXTS = ["png", "jpg", "jpeg", "webp"] as const;

export type ImageFormat = "jpeg" | "png" | "webp";

export function isAppError(err: unknown): boolean {
  return typeof (err as { status?: unknown }).status === "number";
}

export function exactlyOneImage(inputs: ToolFileInput[], tool: string): ToolFileInput {
  if (inputs.length !== 1) throw badRequest(`Exactly one image file is required to ${tool}.`);
  return inputs[0] as ToolFileInput;
}

export async function probeImage(
  input: ToolFileInput,
): Promise<{ format: ImageFormat; width: number; height: number }> {
  let meta;
  try {
    meta = await sharp(input.buffer, {
      failOn: "error",
      limitInputPixels: MAX_INPUT_PIXELS,
    }).metadata();
  } catch {
    throw badRequest("File is not a valid image.");
  }
  if (!meta.format || !["jpeg", "png", "webp"].includes(meta.format))
    throw badRequest("Unsupported image content.");
  if (!meta.width || !meta.height) throw badRequest("Could not read image dimensions.");
  return { format: meta.format as ImageFormat, width: meta.width, height: meta.height };
}

export function mimeFor(format: ImageFormat): string {
  return format === "jpeg" ? "image/jpeg" : format === "png" ? "image/png" : "image/webp";
}

export function pipelineFor(buffer: Buffer, format: ImageFormat) {
  const pipeline = sharp(buffer, { failOn: "error", limitInputPixels: MAX_INPUT_PIXELS });
  if (format === "jpeg") pipeline.jpeg();
  else if (format === "png") pipeline.png();
  else pipeline.webp();
  return pipeline;
}
