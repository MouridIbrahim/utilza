import sharp from "sharp";
import { badRequest } from "../../../../utils/errors.js";
import type { ToolFileInput, ToolProcessResult, ExecuteContext } from "../../execute/execute.js";
import type { ImageCompressBody } from "./compress-image.schema.js";

// Cap decoded pixels against decompression bombs (sharp default is 268M).
const MAX_INPUT_PIXELS = 100_000_000;

function isAppError(err: unknown): boolean {
  return typeof (err as { status?: unknown }).status === "number";
}

// Pure transform: inputs → recompressed image bytes. No storage/DB access.
export async function compressImage(
  inputs: ToolFileInput[],
  ctx: ExecuteContext,
): Promise<ToolProcessResult> {
  if (inputs.length !== 1) throw badRequest("Exactly one image file is required to compress.");
  const input = inputs[0] as ToolFileInput;
  const { quality } = ctx.body as ImageCompressBody;
  try {
    const meta = await sharp(input.buffer, {
      failOn: "error",
      limitInputPixels: MAX_INPUT_PIXELS,
    }).metadata();
    if (!meta.format || !["jpeg", "png", "webp"].includes(meta.format))
      throw badRequest("Unsupported image content.");
    const pipeline = sharp(input.buffer, { failOn: "error", limitInputPixels: MAX_INPUT_PIXELS });
    if (meta.format === "jpeg") pipeline.jpeg({ quality, mozjpeg: true });
    else if (meta.format === "png") pipeline.png({ quality, compressionLevel: 9, palette: true });
    else pipeline.webp({ quality });
    const buffer = await pipeline.toBuffer();
    const mimeType =
      meta.format === "jpeg" ? "image/jpeg" : meta.format === "png" ? "image/png" : "image/webp";
    return { buffer, ext: input.ext, mimeType };
  } catch (err) {
    if (isAppError(err)) throw err;
    throw badRequest("File is not a valid image.");
  }
}
