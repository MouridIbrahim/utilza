import { PDFDocument, type PDFFont } from "pdf-lib";
import * as fontkit from "@pdf-lib/fontkit";
import JSZip from "jszip";
import { readFile } from "node:fs/promises";
import { badRequest } from "../../../../utils/errors.js";
import type { ToolFileInput, ToolProcessResult, ExecuteContext } from "../../execute/execute.js";
import { wordToPdfConfig } from "./word-to-pdf.schema.js";

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 50;
const FONT_SIZE = 12;
const LINE_HEIGHT = 18;

// Extracts non-empty paragraph texts from word/document.xml. Runs, tabs,
// breaks and the five XML entities are handled; tables/images/headers are
// out of scope for text-level conversion.
export function extractDocxParagraphs(documentXml: string): string[] {
  const paras: string[] = [];
  const pRe = /<w:p(?:\s[^>]*)?>([\s\S]*?)<\/w:p>/g;
  let pMatch: RegExpExecArray | null;
  while ((pMatch = pRe.exec(documentXml)) !== null) {
    const inner = (pMatch[1] as string).replace(/<w:tab\s*\/>/g, " ");
    // Walk text nodes and line breaks in document order so <w:br/> between
    // runs survives the join.
    const parts: string[] = [];
    const nodeRe = /<w:br\s*\/>|<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g;
    let node: RegExpExecArray | null;
    while ((node = nodeRe.exec(inner)) !== null) {
      if (node[0].startsWith("<w:br")) {
        parts.push("\n");
      } else {
        parts.push(
          (node[1] as string)
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/&quot;/g, '"')
            .replace(/&apos;/g, "'"),
        );
      }
    }
    const text = parts.join("").trim();
    if (text) paras.push(text);
  }
  return paras;
}

function wrapLine(line: string, font: PDFFont, maxWidth: number): string[] {
  const out: string[] = [];
  let current = "";
  const flush = (): void => {
    if (current) {
      out.push(current);
      current = "";
    }
  };
  for (const word of line.split(/\s+/).filter((w) => w.length > 0)) {
    const candidate = current ? `${current} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, FONT_SIZE) <= maxWidth) {
      current = candidate;
    } else {
      flush();
      // Hard-split words wider than the page (e.g. long URLs).
      let rest = word;
      while (font.widthOfTextAtSize(rest, FONT_SIZE) > maxWidth && rest.length > 1) {
        let cut = rest.length - 1;
        while (cut > 1 && font.widthOfTextAtSize(rest.slice(0, cut), FONT_SIZE) > maxWidth)
          cut -= 1;
        out.push(rest.slice(0, cut));
        rest = rest.slice(cut);
      }
      current = rest;
    }
  }
  flush();
  return out.length > 0 ? out : [""];
}

// Renders paragraphs into paginated PDF bytes. Shared by word-to-pdf and
// txt-to-pdf (and later markdown-to-pdf).
//
// Uses an embedded DejaVu Sans subset (Latin, Greek, Cyrillic, common
// symbols/arrows) instead of WinAnsi-only Helvetica, so real-world documents
// convert instead of crashing. Emoji, CJK and complex scripts have no glyphs
// and still fail as a 400 via the pre-flight below.
let cachedSansFont: Buffer | null = null;
let supportedCodePoints: Set<number> | null = null;

async function loadSansFont(): Promise<Buffer> {
  if (!cachedSansFont) {
    // No "exports" map in dejavu-fonts-ttf, so a file subpath resolves.
    const fontPath = require.resolve("dejavu-fonts-ttf/ttf/DejaVuSans.ttf");
    cachedSansFont = await readFile(fontPath);
  }
  return cachedSansFont;
}

async function loadFontCoverage(): Promise<Set<number>> {
  if (!supportedCodePoints) {
    supportedCodePoints = new Set(fontkit.create(await loadSansFont()).characterSet);
  }
  return supportedCodePoints;
}

export async function renderParagraphsToPdf(paras: string[]): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  const font = await pdf.embedFont(await loadSansFont(), { subset: true });
  // Reject characters the font cannot draw (emoji, CJK, complex scripts):
  // the embedder would silently render them as blank .notdef glyphs.
  // The message names the first offending code points so users can find
  // and remove them.
  const supported = await loadFontCoverage();
  const missing: string[] = [];
  for (const para of paras) {
    for (const ch of para) {
      const cp = ch.codePointAt(0) as number;
      if (cp === 0x0a || cp === 0x0d) continue;
      if (!supported.has(cp)) {
        const label = `U+${cp.toString(16).toUpperCase().padStart(4, "0")}`;
        if (!missing.includes(label)) missing.push(label);
        if (missing.length >= 5) break;
      }
    }
    if (missing.length >= 5) break;
  }
  if (missing.length > 0) {
    throw badRequest(
      `Document contains characters this converter cannot render (${missing.join(", ")}). Only Latin, Greek, Cyrillic and common symbols are supported.`,
    );
  }
  const maxWidth = PAGE_WIDTH - MARGIN * 2;
  let page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  let y = PAGE_HEIGHT - MARGIN;
  for (const para of paras) {
    for (const rawLine of para.split("\n")) {
      for (const line of wrapLine(rawLine, font, maxWidth)) {
        if (y < MARGIN + LINE_HEIGHT) {
          page = pdf.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
          y = PAGE_HEIGHT - MARGIN;
        }
        page.drawText(line, { x: MARGIN, y, size: FONT_SIZE, font });
        y -= LINE_HEIGHT;
      }
      y -= LINE_HEIGHT / 2; // paragraph gap
    }
  }
  return Buffer.from(await pdf.save({ useObjectStreams: true }));
}

// Pure transform: inputs → PDF bytes. No storage/DB access.
export async function wordToPdf(
  inputs: ToolFileInput[],
  _ctx: ExecuteContext,
): Promise<ToolProcessResult> {
  if (inputs.length !== 1) throw badRequest("Exactly one Word document is required to convert.");
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
  if (paras.length > wordToPdfConfig.maxParagraphs)
    throw badRequest(`Document has too many paragraphs (max ${wordToPdfConfig.maxParagraphs}).`);

  const buffer = await renderParagraphsToPdf(paras);
  return { buffer, ext: "pdf", mimeType: "application/pdf" };
}
