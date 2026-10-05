import { marked } from "marked";
import { badRequest } from "../../../../utils/errors.js";
import type { ToolFileInput, ToolProcessResult } from "../../execute/execute.js";

// Markdown cap: bounded input for a synchronous render (marked is fast,
// but output HTML expands on pathological nesting).
const MAX_MARKDOWN_CHARS = 500_000;

// Strips script blocks + event-handler attributes from rendered HTML.
// Downloads are inert files, but defense in depth costs one regex pass;
// consumers embedding the HTML must still sandbox it.
function stripScripts(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script\s*>/gi, "")
    .replace(/\son\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
}

// Pure transform: inputs → standalone HTML bytes. No storage/DB access.
export async function markdownToHtml(inputs: ToolFileInput[]): Promise<ToolProcessResult> {
  if (inputs.length !== 1) throw badRequest("Exactly one Markdown file is required to convert.");
  const input = inputs[0] as ToolFileInput;
  if (input.buffer.includes(0)) throw badRequest("File is not valid UTF-8 text.");
  const markdown = input.buffer.toString("utf8").replace(/^\uFEFF/, "");
  if (markdown.trim().length === 0) throw badRequest("No text found in the file.");
  if (markdown.length > MAX_MARKDOWN_CHARS)
    throw badRequest(`Markdown is too large (max ${MAX_MARKDOWN_CHARS} chars).`);
  const body = stripScripts(await marked.parse(markdown, { async: false, breaks: false }));
  const html = `<!DOCTYPE html>\n<html>\n<head>\n<meta charset="utf-8">\n</head>\n<body>\n${String(body)}</body>\n</html>\n`;
  return { buffer: Buffer.from(html, "utf8"), ext: "html", mimeType: "text/html" };
}
