import { badRequest } from "../../../../utils/errors.js";
import type { ToolFileInput, ToolProcessResult, ExecuteContext } from "../../execute/execute.js";
import { exactlyOneImage, mimeFor, pipelineFor, probeImage } from "../image-shared.js";
import type { CropImageBody } from "./crop-image.schema.js";

// Pure transform: inputs → cropped image bytes (same format). No storage/DB.
export async function cropImage(
  inputs: ToolFileInput[],
  ctx: ExecuteContext,
): Promise<ToolProcessResult> {
  const input = exactlyOneImage(inputs, "crop");
  const { left, top, width, height } = ctx.body as CropImageBody;
  const { format, width: imgW, height: imgH } = await probeImage(input);
  if (left + width > imgW || top + height > imgH)
    throw badRequest(`Crop area exceeds image dimensions (${imgW}x${imgH}).`);
  try {
    const buffer = await pipelineFor(input.buffer, format)
      .extract({ left, top, width, height })
      .toBuffer();
    return { buffer, ext: input.ext, mimeType: mimeFor(format) };
  } catch (err) {
    if (typeof (err as { status?: unknown }).status === "number") throw err;
    throw badRequest("Could not crop the image.");
  }
}
