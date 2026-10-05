import express from "express";
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import JSZip from "jszip";
import { prisma } from "../../../../lib/prisma.js";
import { errorMiddleware, notFoundMiddleware } from "../../../../middleware/error.middleware.js";
import { tempStorage } from "../../../../lib/storage.js";
import { filesRouter } from "../../../files/files.routes.js";
import { extractPdfText, WORD_MIME } from "./pdf-to-word.service.js";
import { pdfToWordRouter } from "./pdf-to-word.routes.js";

function toolApp() {
  const app = express();
  app.use("/tools/pdf/to-word", pdfToWordRouter);
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

async function makeTextPdf(lines: string[]): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (const line of lines) {
    const page = doc.addPage([595, 842]);
    page.drawText(line, { x: 50, y: 750, size: 14, font });
  }
  return Buffer.from(await doc.save());
}

async function makeBlankPdf(pages: number): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i += 1) doc.addPage([595, 842]);
  return Buffer.from(await doc.save());
}

async function documentXml(fileId: string): Promise<string> {
  const dl = await request(app)
    .get(`/api/v1/files/${fileId}`)
    .buffer(true)
    .parse((res, cb) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(chunk as Buffer));
      res.on("end", () => cb(null, Buffer.concat(chunks)));
    });
  expect(dl.status).toBe(200);
  expect(dl.headers["content-type"]).toContain(
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  );
  const zip = await JSZip.loadAsync(dl.body as Buffer);
  const xml = zip.file("word/document.xml");
  expect(xml).not.toBeNull();
  return xml!.async("string");
}

describe("extractPdfText", () => {
  it("extracts lines per page", async () => {
    const pages = await extractPdfText(await makeTextPdf(["Alpha", "Beta"]));
    expect(pages).toEqual([["Alpha"], ["Beta"]]);
  });
});

describe("POST /tools/pdf/to-word", () => {
  it("converts text pages into a .docx containing the text", async () => {
    const pdf = await makeTextPdf(["Hello word", "Second page"]);
    const res = await request(app).post("/tools/pdf/to-word").attach("files", pdf, "doc.pdf");
    expect(res.status).toBe(200);
    expect(res.body.data.mimeType).toBe(WORD_MIME);
    createdFileIds.push(res.body.data.fileId as string);
    const xml = await documentXml(res.body.data.fileId as string);
    expect(xml).toContain("Hello word");
    expect(xml).toContain("Second page");
  });

  it("400 for scanned-like PDFs with no text layer", async () => {
    const res = await request(app)
      .post("/tools/pdf/to-word")
      .attach("files", await makeBlankPdf(2), "scan.pdf");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("No extractable text");
  });

  it("400 when two files uploaded (exactly one)", async () => {
    const pdf = await makeTextPdf(["x"]);
    const res = await request(app)
      .post("/tools/pdf/to-word")
      .attach("files", pdf, "a.pdf")
      .attach("files", pdf, "b.pdf");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("Exactly one PDF");
  });

  it("400 for non-PDF bytes", async () => {
    const res = await request(app)
      .post("/tools/pdf/to-word")
      .attach("files", Buffer.from("nope"), "doc.pdf");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("not a valid PDF");
  });
});
