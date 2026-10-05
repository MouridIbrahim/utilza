import sharp from "sharp";
import { badRequest } from "../../../../utils/errors.js";
import type { ToolFileInput, ToolProcessResult, ExecuteContext } from "../../execute/execute.js";
import { imageConvertConfig, type ImageConvertBody } from "./convert-image.schema.js";

// Cap decoded pixels against decompression bombs (sharp default is 268M).
const MAX_INPUT_PIXELS = 100_000_000;

function isAppError(err: unknown): boolean {
  return typeof (err as { status?: unknown }).status === "number";
}

// Pure transform: inputs → converted image bytes. No storage/DB access.
export async function convertImage(
  inputs: ToolFileInput[],
  ctx: ExecuteContext,
): Promise<ToolProcessResult> {
  if (inputs.length !== 1) throw badRequest("Exactly one image file is required to convert.");
  const input = inputs[0] as ToolFileInput;
  const { format } = ctx.body as ImageConvertBody;
  try {
    const meta = await sharp(input.buffer, {
      failOn: "error",
      limitInputPixels: MAX_INPUT_PIXELS,
    }).metadata();
    if (!meta.format || !["jpeg", "png", "webp"].includes(meta.format))
      throw badRequest("Unsupported image content.");
    const pipeline = sharp(input.buffer, { failOn: "error", limitInputPixels: MAX_INPUT_PIXELS });
    if (format === "jpg")
      pipeline.jpeg({ quality: imageConvertConfig.defaultQuality, mozjpeg: true });
    else if (format === "png") pipeline.png();
    else pipeline.webp({ quality: imageConvertConfig.defaultQuality });
    const buffer = await pipeline.toBuffer();
    const mimeType =
      format === "jpg" ? "image/jpeg" : format === "png" ? "image/png" : "image/webp";
    return { buffer, ext: format, mimeType };
  } catch (err) {
    if (isAppError(err)) throw err;
    throw badRequest("File is not a valid image.");
  }
}
