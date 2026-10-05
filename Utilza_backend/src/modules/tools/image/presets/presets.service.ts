import { badRequest } from "../../../../utils/errors.js";
import type { ToolFileInput, ToolProcessResult, ExecuteContext } from "../../execute/execute.js";
import { exactlyOneImage, mimeFor, pipelineFor, probeImage } from "../image-shared.js";
import { PASSPORT_CANVAS, PRESET_CANVAS, type SocialBody } from "./presets.schema.js";

async function resizeToCanvas(
  input: ToolFileInput,
  w: number,
  h: number,
): Promise<ToolProcessResult> {
  const { format } = await probeImage(input);
  try {
    const buffer = await pipelineFor(input.buffer, format)
      .resize(w, h, { fit: "cover", position: "centre" })
      .toBuffer();
    return { buffer, ext: input.ext, mimeType: mimeFor(format) };
  } catch (err) {
    if (typeof (err as { status?: unknown }).status === "number") throw err;
    throw badRequest("Could not resize the image.");
  }
}

// Pure transforms: inputs → preset-canvas bytes (same format). No storage/DB.
export async function socialResize(
  inputs: ToolFileInput[],
  ctx: ExecuteContext,
): Promise<ToolProcessResult> {
  const input = exactlyOneImage(inputs, "resize for social");
  const { preset } = ctx.body as SocialBody;
  const { w, h } = PRESET_CANVAS[preset];
  return resizeToCanvas(input, w, h);
}

export async function passportPhoto(inputs: ToolFileInput[]): Promise<ToolProcessResult> {
  const input = exactlyOneImage(inputs, "make a passport photo from");
  return resizeToCanvas(input, PASSPORT_CANVAS.w, PASSPORT_CANVAS.h);
}
