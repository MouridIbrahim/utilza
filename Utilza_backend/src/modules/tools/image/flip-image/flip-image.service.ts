import { badRequest } from "../../../../utils/errors.js";
import type { ToolFileInput, ToolProcessResult, ExecuteContext } from "../../execute/execute.js";
import { exactlyOneImage, mimeFor, pipelineFor, probeImage } from "../image-shared.js";
import type { FlipImageBody } from "./flip-image.schema.js";

// Pure transform: inputs → mirrored image bytes (same format). No storage/DB.
export async function flipImage(
  inputs: ToolFileInput[],
  ctx: ExecuteContext,
): Promise<ToolProcessResult> {
  const input = exactlyOneImage(inputs, "flip");
  const { direction } = ctx.body as FlipImageBody;
  const { format } = await probeImage(input);
  try {
    const pipeline = pipelineFor(input.buffer, format);
    if (direction === "horizontal") pipeline.flop();
    else pipeline.flip();
    const buffer = await pipeline.toBuffer();
    return { buffer, ext: input.ext, mimeType: mimeFor(format) };
  } catch (err) {
    if (typeof (err as { status?: unknown }).status === "number") throw err;
    throw badRequest("Could not flip the image.");
  }
}
