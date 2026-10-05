import JSZip from "jszip";
import { badRequest } from "../../../utils/errors.js";
import type { ToolFileInput } from "../execute/execute.js";
import { extractDocxParagraphs } from "./word-to-pdf/word-to-pdf.service.js";

// Loads + extracts paragraphs from exactly one .docx input shared by the
// word-to-* converters.
export async function docxParagraphs(inputs: ToolFileInput[], tool: string): Promise<string[]> {
  if (inputs.length !== 1) throw badRequest(`Exactly one Word document is required to ${tool}.`);
  const input = inputs[0] as ToolFileInput;
  let xml: string;
  try {
    const zip = await JSZip.loadAsync(input.buffer);
    const file = zip.file("word/document.xml");
    if (!file) throw badRequest("File is not a valid Word document.");
    xml = await file.async("string");
  } catch (err) {
    if (typeof (err as { status?: unknown }).status === "number") throw err;
    throw badRequest("File is not a valid Word document.");
  }
  const paras = extractDocxParagraphs(xml);
  if (paras.length === 0) throw badRequest("No extractable text found in the document.");
  return paras;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
