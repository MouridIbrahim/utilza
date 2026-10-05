import { badRequest } from "../../../../utils/errors.js";
import type { ToolFileInput, ToolProcessResult, ExecuteContext } from "../../execute/execute.js";
import { exactlyOneImage, mimeFor, pipelineFor, probeImage } from "../image-shared.js";
import type { ResizeImageBody } from "./resize-image.schema.js";

// Pure transform: inputs → resized image bytes (same format). No storage/DB.
export async function resizeImage(
  inputs: ToolFileInput[],
  ctx: ExecuteContext,
): Promise<ToolProcessResult> {
  const input = exactlyOneImage(inputs, "resize");
  const { width, height } = ctx.body as ResizeImageBody;
  const { format } = await probeImage(input);
  try {
    const buffer = await pipelineFor(input.buffer, format)
      .resize({ width, height, fit: "inside", withoutEnlargement: true })
      .toBuffer();
    return { buffer, ext: input.ext, mimeType: mimeFor(format) };
  } catch (err) {
    if (typeof (err as { status?: unknown }).status === "number") throw err;
    throw badRequest("Could not resize the image.");
  }
}
