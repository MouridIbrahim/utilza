import { badRequest } from "../../../../utils/errors.js";
import type { ToolFileInput, ToolProcessResult, ExecuteContext } from "../../execute/execute.js";
import { exactlyOneImage, mimeFor, pipelineFor, probeImage } from "../image-shared.js";
import type { BlurBody, BrightnessBody, ContrastBody, SharpenBody } from "./filters.schema.js";

type Filter =
  | { kind: "grayscale" }
  | { kind: "blur"; sigma: number }
  | { kind: "sharpen"; sigma: number }
  | { kind: "brightness"; level: number }
  | { kind: "contrast"; level: number };

// Pure transforms: inputs → filtered image bytes (same format). No storage/DB.
async function applyFilter(inputs: ToolFileInput[], filter: Filter): Promise<ToolProcessResult> {
  const input = exactlyOneImage(inputs, "filter");
  const { format } = await probeImage(input);
  try {
    const pipeline = pipelineFor(input.buffer, format);
    if (filter.kind === "grayscale") pipeline.grayscale();
    else if (filter.kind === "blur") pipeline.blur(filter.sigma);
    else if (filter.kind === "sharpen") pipeline.sharpen({ sigma: filter.sigma });
    else if (filter.kind === "brightness") pipeline.modulate({ brightness: filter.level });
    else pipeline.linear(filter.level, -(128 * (filter.level - 1)));
    const buffer = await pipeline.toBuffer();
    return { buffer, ext: input.ext, mimeType: mimeFor(format) };
  } catch (err) {
    if (typeof (err as { status?: unknown }).status === "number") throw err;
    throw badRequest("Could not filter the image.");
  }
}

export function grayscale(inputs: ToolFileInput[]): Promise<ToolProcessResult> {
  return applyFilter(inputs, { kind: "grayscale" });
}

export function blurImage(
  inputs: ToolFileInput[],
  ctx: ExecuteContext,
): Promise<ToolProcessResult> {
  return applyFilter(inputs, { kind: "blur", sigma: (ctx.body as BlurBody).sigma });
}

export function sharpenImage(
  inputs: ToolFileInput[],
  ctx: ExecuteContext,
): Promise<ToolProcessResult> {
  return applyFilter(inputs, { kind: "sharpen", sigma: (ctx.body as SharpenBody).sigma });
}

export function brightenImage(
  inputs: ToolFileInput[],
  ctx: ExecuteContext,
): Promise<ToolProcessResult> {
  return applyFilter(inputs, { kind: "brightness", level: (ctx.body as BrightnessBody).level });
}

export function contrastImage(
  inputs: ToolFileInput[],
  ctx: ExecuteContext,
): Promise<ToolProcessResult> {
  return applyFilter(inputs, { kind: "contrast", level: (ctx.body as ContrastBody).level });
}
