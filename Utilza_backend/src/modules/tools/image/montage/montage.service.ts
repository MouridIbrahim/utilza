import sharp from "sharp";
import { badRequest } from "../../../../utils/errors.js";
import type { ToolFileInput, ToolProcessResult, ExecuteContext } from "../../execute/execute.js";
import { probeImage, mimeFor } from "../image-shared.js";
import type { MontageBody } from "./montage.schema.js";

const MAX_MONTAGE_FILES = 9;

// Pure transform: inputs → montage image bytes. No storage/DB access.
export async function montageImage(
  inputs: ToolFileInput[],
  ctx: ExecuteContext,
): Promise<ToolProcessResult> {
  if (inputs.length < 2) throw badRequest("At least two images are required for a montage.");
  if (inputs.length > MAX_MONTAGE_FILES)
    throw badRequest(`Maximum ${MAX_MONTAGE_FILES} images allowed in a montage.`);

  const { cols, rows, gap, background } = ctx.body as MontageBody;
  const expected = cols * rows;
  if (inputs.length !== expected)
    throw badRequest(
      `Montage ${cols}x${rows} requires exactly ${expected} images (got ${inputs.length}).`,
    );

  // Parse background hex
  const hex = background.replace("#", "");
  const bgR = parseInt(hex.slice(0, 2), 16);
  const bgG = parseInt(hex.slice(2, 4), 16);
  const bgB = parseInt(hex.slice(4, 6), 16);

  // Probe all images to verify validity and get dimensions
  const metas = await Promise.all(
    inputs.map(async (input, i) => {
      const meta = await probeImage(input);
      console.log(`META ${i}:`, meta);
      return { ...meta, index: i, ext: input.ext, buffer: input.buffer };
    }),
  );

  // Use first image's format for output
  const format = metas[0].format;
  const cellW = metas[0].width;
  const cellH = metas[0].height;
  console.log("MONTAGE DEBUG:", { cols, rows, gap, background, cellW, cellH, format, metas: metas.map(m => ({ w: m.width, h: m.height, format: m.format })) });

  // Calculate canvas dimensions
  const totalWidth = cols * metas[0].width + (cols - 1) * gap;
  const totalHeight = rows * metas[0].height + (rows - 1) * gap;

  // Create base canvas with background
  const base = sharp({
    create: {
      width: totalWidth,
      height: totalHeight,
      channels: 4,
      background: { r: bgR, g: bgG, b: bgB, alpha: 1 },
    },
  });

  // Composite each image into its grid cell
  const compositeOps = await Promise.all(
    metas.map(async (meta, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      const left = col * (cellW + gap);
      const top = row * (cellH + gap);
      const buffer = await sharp(meta.buffer, { failOn: "error" })
        .resize(cellW, cellH, { fit: "cover", position: "centre" })
        .toBuffer();
      return { input: buffer, left, top };
    }),
  );

  const out = await base.composite(compositeOps).toFormat(format).toBuffer();

  console.log("MONTAGE OUTPUT:", { size: out.length, format, ext: metas[0].ext });
  return { buffer: out, ext: metas[0].ext, mimeType: mimeFor(format) };
}
