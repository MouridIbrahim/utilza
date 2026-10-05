import sharp from "sharp";
import JSZip from "jszip";
import { badRequest } from "../../../../utils/errors.js";
import type { ToolFileInput, ToolProcessResult } from "../../execute/execute.js";
import { exactlyOneImage, mimeFor, pipelineFor, probeImage } from "../image-shared.js";

const FAVICON_SIZES = [16, 32, 48, 180, 192] as const;

// Pure transforms: inputs → bytes. No storage/DB access.
export async function removeExif(inputs: ToolFileInput[]): Promise<ToolProcessResult> {
  const input = exactlyOneImage(inputs, "strip metadata from");
  const { format } = await probeImage(input);
  try {
    const pipeline = pipelineFor(input.buffer, format);
    // Re-encode without withMetadata(): all EXIF/XMP/ICC profiles dropped.
    if (format === "jpeg") pipeline.jpeg({ quality: 100, mozjpeg: true });
    const buffer = await pipeline.toBuffer();
    return { buffer, ext: input.ext, mimeType: mimeFor(format) };
  } catch (err) {
    if (typeof (err as { status?: unknown }).status === "number") throw err;
    throw badRequest("Could not process the image.");
  }
}

export async function faviconPack(inputs: ToolFileInput[]): Promise<ToolProcessResult> {
  const input = exactlyOneImage(inputs, "build favicons from");
  await probeImage(input);
  try {
    const square = await sharp(input.buffer, { failOn: "error" })
      .resize(512, 512, { fit: "cover", position: "centre" })
      .png()
      .toBuffer();
    const zip = new JSZip();
    for (const size of FAVICON_SIZES) {
      const icon = await sharp(square).resize(size, size).png().toBuffer();
      const name = size <= 48 ? `favicon-${size}x${size}.png` : `icon-${size}x${size}.png`;
      zip.file(name, icon);
    }
    zip.file(
      "site.webmanifest",
      JSON.stringify(
        {
          name: "App",
          icons: [48, 180, 192].map((size) => ({
            src: size <= 48 ? `favicon-${size}x${size}.png` : `icon-${size}x${size}.png`,
            sizes: `${size}x${size}`,
            type: "image/png",
          })),
        },
        null,
        2,
      ),
    );
    const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    return { buffer, ext: "zip", mimeType: "application/zip" };
  } catch (err) {
    if (typeof (err as { status?: unknown }).status === "number") throw err;
    throw badRequest("Could not build favicons from the image.");
  }
}
