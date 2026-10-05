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
import { wordToTxtRouter, wordToHtmlRouter, wordToMarkdownRouter } from "../word-convert.routes.js";
import { txtToPdfRouter } from "../txt-to-pdf/txt-to-pdf.routes.js";

function toolApp() {
  const app = express();
  app.use("/tools/document/word-to-txt", wordToTxtRouter);
  app.use("/tools/document/word-to-html", wordToHtmlRouter);
  app.use("/tools/document/word-to-markdown", wordToMarkdownRouter);
  app.use("/tools/document/txt-to-pdf", txtToPdfRouter);
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

async function downloadText(fileId: string): Promise<{ text: string; contentType: string }> {
  const dl = await request(app)
    .get(`/api/v1/files/${fileId}`)
    .buffer(true)
    .parse((res, cb) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(chunk as Buffer));
      res.on("end", () => cb(null, Buffer.concat(chunks)));
    });
  expect(dl.status).toBe(200);
  return {
    text: (dl.body as Buffer).toString("utf8"),
    contentType: dl.headers["content-type"] as string,
  };
}

function track(res: { body: { data: { fileId: string } } }): void {
  createdFileIds.push(res.body.data.fileId as string);
}

describe("POST /tools/document/word-to-txt", () => {
  it("extracts paragraphs as plain text", async () => {
    const res = await request(app)
      .post("/tools/document/word-to-txt")
      .attach("files", await makeDocx(["Hello txt", "Second"]), "doc.docx");
    expect(res.status).toBe(200);
    expect(res.body.data.mimeType).toBe("text/plain");
    track(res);
    const { text, contentType } = await downloadText(res.body.data.fileId as string);
    expect(contentType).toContain("text/plain");
    expect(text).toContain("Hello txt");
    expect(text).toContain("Second");
  });

  it("400 for non-docx upload", async () => {
    const res = await request(app)
      .post("/tools/document/word-to-txt")
      .attach("files", Buffer.from("nope"), "doc.docx");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("not a valid Word document");
  });
});

describe("POST /tools/document/word-to-html", () => {
  it("wraps paragraphs in escaped HTML", async () => {
    const res = await request(app)
      .post("/tools/document/word-to-html")
      .attach("files", await makeDocx(["A & B", "<tag>"]), "doc.docx");
    expect(res.status).toBe(200);
    expect(res.body.data.mimeType).toBe("text/html");
    track(res);
    const { text } = await downloadText(res.body.data.fileId as string);
    expect(text).toContain("<p>B A &amp; B</p>");
    expect(text).toContain("B &lt;tag&gt;");
    expect(text).toContain("<!DOCTYPE html>");
  });
});

describe("POST /tools/document/word-to-markdown", () => {
  it("joins paragraphs as markdown text", async () => {
    const res = await request(app)
      .post("/tools/document/word-to-markdown")
      .attach("files", await makeDocx(["First", "Second"]), "doc.docx");
    expect(res.status).toBe(200);
    expect(res.body.data.mimeType).toBe("text/markdown");
    track(res);
    const { text } = await downloadText(res.body.data.fileId as string);
    expect(text).toContain("First");
    expect(text).toContain("Second");
  });
});

describe("POST /tools/document/txt-to-pdf", () => {
  it("renders text lines into a PDF", async () => {
    const res = await request(app)
      .post("/tools/document/txt-to-pdf")
      .attach("files", Buffer.from("Hello pdf\nSecond line\n"), "notes.txt");
    expect(res.status).toBe(200);
    expect(res.body.data.mimeType).toBe("application/pdf");
    track(res);
    const dl = await request(app).get(res.body.data.downloadUrl as string);
    const doc = await PDFDocument.load(Buffer.from(dl.body as unknown as ArrayBuffer));
    expect(doc.getPageCount()).toBe(1);
    const pdf = await pdfjs.getDocument({ data: new Uint8Array(dl.body as Buffer) }).promise;
    const page = await pdf.getPage(1);
    const tc = await page.getTextContent();
    const all = tc.items
      .map((i) => ("str" in i && typeof i.str === "string" ? i.str : ""))
      .join(" ");
    expect(all).toContain("Hello pdf");
  });

  it("400 for binary input", async () => {
    const res = await request(app)
      .post("/tools/document/txt-to-pdf")
      .attach("files", Buffer.from([0x00, 0x01, 0x02]), "bin.txt");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("not valid UTF-8");
  });

  it("400 for empty text", async () => {
    const res = await request(app)
      .post("/tools/document/txt-to-pdf")
      .attach("files", Buffer.from("   \n  \n"), "empty.txt");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("No text found");
  });
});
