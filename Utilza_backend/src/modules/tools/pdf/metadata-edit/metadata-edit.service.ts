import { badRequest } from "../../../../utils/errors.js";
import type { ToolFileInput, ToolProcessResult, ExecuteContext } from "../../execute/execute.js";
import { loadPdf } from "../pdf-utils.js";
import type { MetadataEditBody } from "./metadata-edit.schema.js";

// Pure transform: inputs → PDF bytes with updated metadata. No storage/DB.
export async function editPdfMetadata(
  inputs: ToolFileInput[],
  ctx: ExecuteContext,
): Promise<ToolProcessResult> {
  if (inputs.length !== 1) throw badRequest("Exactly one PDF file is required.");
  const input = inputs[0] as ToolFileInput;
  const src = await loadPdf(input.buffer, "File");
  const body = ctx.body as MetadataEditBody;
  if (body.title !== undefined) src.setTitle(body.title);
  if (body.author !== undefined) src.setAuthor(body.author);
  if (body.subject !== undefined) src.setSubject(body.subject);
  if (body.keywords !== undefined) src.setKeywords(body.keywords.split(",").map((k) => k.trim()));
  if (body.producer !== undefined) src.setProducer(body.producer);
  if (body.creator !== undefined) src.setCreator(body.creator);
  const bytes = await src.save({ useObjectStreams: true });
  return { buffer: Buffer.from(bytes), ext: "pdf", mimeType: "application/pdf" };
}
