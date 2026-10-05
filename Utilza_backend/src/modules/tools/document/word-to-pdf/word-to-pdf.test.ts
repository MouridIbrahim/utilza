import express from "express";
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { PDFDocument } from "pdf-lib";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { prisma } from "../../../../lib/prisma.js";
import { errorMiddleware, notFoundMiddleware } from "../../../../middleware/error.middleware.js";
import { tempStorage } from "../../../../lib/storage.js";
import { filesRouter } from "../../../files/files.routes.js";
import { extractDocxParagraphs } from "./word-to-pdf.service.js";
import { wordToPdfRouter } from "./word-to-pdf.routes.js";

function toolApp() {
  const app = express();
  app.use("/tools/document/to-pdf", wordToPdfRouter);
  app.use("/api/v1/files", filesRouter);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);
  return app;
}

const app = toolApp();
const createdFileIds: string[] = [];

afterAll(async () => {
  for (const id of createdFileIds) {
    const row = await prisma.generatedFile.findUnique({ where: { id } });
    if (row) await tempStorage.del(row.storageKey).catch(() => false);
    await prisma.generatedFile.deleteMany({ where: { id } });
  }
  await prisma.$disconnect();
});

async function makeDocx(lines: string[]): Promise<Buffer> {
  const word = new Document({
    sections: [
      {
        children: lines.map(
          (line) =>
            new Paragraph({
              children: [new TextRun({ text: "B ", bold: true }), new TextRun(line)],
            }),
        ),
      },
    ],
  });
  return Buffer.from(await Packer.toBuffer(word));
}

async function pdfText(fileId: string): Promise<string> {
  const dl = await request(app)
    .get(`/api/v1/files/${fileId}`)
    .buffer(true)
    .parse((res, cb) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(chunk as Buffer));
      res.on("end", () => cb(null, Buffer.concat(chunks)));
    });
  expect(dl.status).toBe(200);
  const doc = await pdfjs.getDocument({ data: new Uint8Array(dl.body as Buffer) }).promise;
  const out: string[] = [];
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    out.push(
      tc.items
        .map((item) => ("str" in item && typeof item.str === "string" ? item.str : ""))
        // pdf.js items carry no spacing; rejoin with spaces for assertions.
        .join(" "),
    );
  }
  return out.join("\n");
}

describe("extractDocxParagraphs", () => {
  it("joins runs, unescapes entities, handles tabs and breaks", () => {
    const xml =
      `<w:p><w:r><w:t xml:space="preserve">A &amp; </w:t></w:r>` +
      `<w:r><w:t>B</w:t></w:r><w:r><w:tab/></w:r></w:p>` +
      `<w:p><w:r><w:t>line1</w:t></w:r><w:r><w:br/></w:r><w:r><w:t>line2</w:t></w:r></w:p>` +
      `<w:p><w:r><w:t>   </w:t></w:r></w:p>`;
    expect(extractDocxParagraphs(xml)).toEqual(["A & B", "line1\nline2"]);
  });
});

describe("POST /tools/document/to-pdf", () => {
  it("round-trips docx text into a PDF", async () => {
    const res = await request(app)
      .post("/tools/document/to-pdf")
      .attach("files", await makeDocx(["Hello word", "Second line"]), "doc.docx");
    expect(res.status).toBe(200);
    expect(res.body.data.mimeType).toBe("application/pdf");
    createdFileIds.push(res.body.data.fileId as string);
    const text = await pdfText(res.body.data.fileId as string);
    expect(text).toContain("Hello word");
    expect(text).toContain("Second line");
  });

  it("wraps long lines instead of overflowing the page", async () => {
    const res = await request(app)
      .post("/tools/document/to-pdf")
      .attach("files", await makeDocx([`word `.repeat(200)]), "long.docx");
    expect(res.status).toBe(200);
    createdFileIds.push(res.body.data.fileId as string);
    const dl = await request(app).get(res.body.data.downloadUrl as string);
    const doc = await PDFDocument.load(Buffer.from(dl.body as unknown as ArrayBuffer));
    expect(doc.getPageCount()).toBeGreaterThanOrEqual(1);
    expect(async () => pdfText(res.body.data.fileId as string)).not.toThrow();
  });

  it("400 for a docx with no text", async () => {
    const word = new Document({ sections: [{ children: [new Paragraph({})] }] });
    const empty = Buffer.from(await Packer.toBuffer(word));
    const res = await request(app).post("/tools/document/to-pdf").attach("files", empty, "e.docx");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("No extractable text");
  });

  it("400 for a zip that is not a docx", async () => {
    const JSZip = (await import("jszip")).default;
    const zip = await new JSZip().file("hello.txt", "hi").generateAsync({ type: "nodebuffer" });
    const res = await request(app).post("/tools/document/to-pdf").attach("files", zip, "a.docx");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("not a valid Word document");
  });

  it("400 when two files uploaded (exactly one)", async () => {
    const docx = await makeDocx(["x"]);
    const res = await request(app)
      .post("/tools/document/to-pdf")
      .attach("files", docx, "a.docx")
      .attach("files", docx, "b.docx");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("Exactly one Word document");
  });

  it("400 for non-zip bytes", async () => {
    const res = await request(app)
      .post("/tools/document/to-pdf")
      .attach("files", Buffer.from("nope"), "doc.docx");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("not a valid Word document");
  });
});
