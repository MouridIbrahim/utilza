import sharp from "sharp";
import { badRequest } from "../../../../utils/errors.js";
import type { ToolFileInput, ToolProcessResult, ExecuteContext } from "../../execute/execute.js";
import { exactlyOneImage, mimeFor, pipelineFor, probeImage } from "../image-shared.js";
import type { PixelateBody, WatermarkBody, WatermarkPosition } from "./effects.schema.js";

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

type SharpGravity = "northwest" | "northeast" | "southwest" | "southeast" | "centre";

function gravityFor(position: WatermarkPosition): SharpGravity {
  switch (position) {
    case "top-left":
      return "northwest";
    case "top-right":
      return "northeast";
    case "bottom-left":
      return "southwest";
    case "bottom-right":
      return "southeast";
    case "center":
      return "centre";
  }
}

// Pure transforms: inputs → effected image bytes (same format). No storage/DB.
export async function pixelateImage(
  inputs: ToolFileInput[],
  ctx: ExecuteContext,
): Promise<ToolProcessResult> {
  const input = exactlyOneImage(inputs, "pixelate");
  const { blocks } = ctx.body as PixelateBody;
  const { format, width, height } = await probeImage(input);
  try {
    const smallW = Math.max(1, Math.min(blocks, width));
    const smallH = Math.max(1, Math.round((smallW * height) / width));
    const small = await sharp(input.buffer, { failOn: "error" })
      .resize(smallW, smallH, { fit: "fill", kernel: "nearest" })
      .toBuffer();
    const buffer = await sharp(small, { failOn: "error" })
      .resize(width, height, { kernel: "nearest" })
      .toFormat(format)
      .toBuffer();
    return { buffer, ext: input.ext, mimeType: mimeFor(format) };
  } catch (err) {
    if (typeof (err as { status?: unknown }).status === "number") throw err;
    throw badRequest("Could not pixelate the image.");
  }
}

export async function watermarkImage(
  inputs: ToolFileInput[],
  ctx: ExecuteContext,
): Promise<ToolProcessResult> {
  const input = exactlyOneImage(inputs, "watermark");
  const { text, position, opacity, size } = ctx.body as WatermarkBody;
  const { format, width, height } = await probeImage(input);
  try {
    const svg =
      `<svg width="${width}" height="${height}">` +
      `<text x="50%" y="50%" font-family="sans-serif" font-size="${size}" ` +
      `fill="white" fill-opacity="${opacity}" text-anchor="middle" ` +
      `dominant-baseline="middle">${escapeXml(text)}</text></svg>`;
    const buffer = await pipelineFor(input.buffer, format)
      .composite([{ input: Buffer.from(svg), gravity: gravityFor(position) }])
      .toBuffer();
    return { buffer, ext: input.ext, mimeType: mimeFor(format) };
  } catch (err) {
    if (typeof (err as { status?: unknown }).status === "number") throw err;
    throw badRequest("Could not watermark the image.");
  }
}
