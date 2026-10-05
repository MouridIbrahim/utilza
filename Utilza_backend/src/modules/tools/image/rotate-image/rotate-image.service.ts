import { badRequest } from "../../../../utils/errors.js";
import type { ToolFileInput, ToolProcessResult, ExecuteContext } from "../../execute/execute.js";
import { exactlyOneImage, mimeFor, pipelineFor, probeImage } from "../image-shared.js";
import type { RotateImageBody } from "./rotate-image.schema.js";

// Pure transform: inputs → rotated image bytes (same format). No storage/DB.
export async function rotateImage(
  inputs: ToolFileInput[],
  ctx: ExecuteContext,
): Promise<ToolProcessResult> {
  const input = exactlyOneImage(inputs, "rotate");
  const { angle } = ctx.body as RotateImageBody;
  const { format } = await probeImage(input);
  try {
    const buffer = await pipelineFor(input.buffer, format).rotate(angle).toBuffer();
    return { buffer, ext: input.ext, mimeType: mimeFor(format) };
  } catch (err) {
    if (typeof (err as { status?: unknown }).status === "number") throw err;
    throw badRequest("Could not rotate the image.");
  }
}
