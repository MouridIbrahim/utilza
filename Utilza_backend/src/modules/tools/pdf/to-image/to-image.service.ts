import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { createCanvas } from "@napi-rs/canvas";
import JSZip from "jszip";
import { badRequest } from "../../../../utils/errors.js";
import type { ToolFileInput, ToolProcessResult, ExecuteContext } from "../../execute/execute.js";
import { loadPdf, standardFontDataUrl } from "../pdf-utils.js";
import { parseRanges } from "../split-pdf/split-pdf.service.js";
import { rasterConfig, type RasterBody } from "./to-image.schema.js";

// Pure transform: inputs → ZIP of rendered page images. No storage/DB access.
export async function rasterPdf(
  inputs: ToolFileInput[],
  ctx: ExecuteContext,
): Promise<ToolProcessResult> {
  if (inputs.length !== 1) throw badRequest("Exactly one PDF file is required to rasterize.");
  const input = inputs[0] as ToolFileInput;
  await loadPdf(input.buffer, "File");
  const { format, pages, scale } = ctx.body as RasterBody;
  const doc = await pdfjs.getDocument({
    data: new Uint8Array(input.buffer),
    standardFontDataUrl: standardFontDataUrl(),
  }).promise;
  try {
    const wanted =
      pages === undefined
        ? Array.from({ length: doc.numPages }, (_, i) => i + 1)
        : parseRanges(pages, doc.numPages);
    if (wanted.length > rasterConfig.maxPages)
      throw badRequest(`Too many pages selected (max ${rasterConfig.maxPages}).`);
    const zip = new JSZip();
    for (const pageNo of wanted) {
      const page = await doc.getPage(pageNo);
      const viewport = page.getViewport({ scale });
      const canvas = createCanvas(Math.ceil(viewport.width), Math.ceil(viewport.height));
      // pdf.js v6 requires both canvas and canvasContext in RenderParameters;
      // napi-rs canvas objects are cast to the DOM types it declares.
      await page.render({
        canvas: canvas as unknown as HTMLCanvasElement,
        canvasContext: canvas.getContext("2d") as unknown as CanvasRenderingContext2D,
        viewport,
      }).promise;
      const bytes = Buffer.from(
        format === "png" ? await canvas.encode("png") : await canvas.encode("jpeg", 90),
      );
      zip.file(`page-${String(pageNo).padStart(2, "0")}.${format}`, bytes);
    }
    const buffer = await zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
    return { buffer, ext: "zip", mimeType: "application/zip" };
  } finally {
    await doc.cleanup();
  }
}
