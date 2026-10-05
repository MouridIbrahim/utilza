import express from "express";
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { prisma } from "../../../../lib/prisma.js";
import { errorMiddleware, notFoundMiddleware } from "../../../../middleware/error.middleware.js";
import { tempStorage } from "../../../../lib/storage.js";
import { filesRouter } from "../../../files/files.routes.js";
import { compressPdfRouter } from "./compress-pdf.routes.js";

function toolApp() {
  const app = express();
  app.use("/tools/pdf/compress", compressPdfRouter);
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

// Bloated PDF: metadata-heavy + no object streams, like many producers emit.
async function makeBloatedPdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.setTitle("Bloated ".repeat(30));
  doc.setAuthor("Author ".repeat(30));
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < 5; i += 1) {
    const page = doc.addPage([595, 842]);
    page.drawText("content ".repeat(100), { x: 50, y: 750, size: 12, font });
  }
  return Buffer.from(await doc.save({ useObjectStreams: false }));
}

describe("POST /tools/pdf/compress", () => {
  it("shrinks a bloated PDF and keeps all pages", async () => {
    const bloated = await makeBloatedPdf();
    const res = await request(app).post("/tools/pdf/compress").attach("files", bloated, "big.pdf");
    expect(res.status).toBe(200);
    expect(res.body.data.mimeType).toBe("application/pdf");
    createdFileIds.push(res.body.data.fileId as string);

    const dl = await request(app).get(res.body.data.downloadUrl as string);
    expect(dl.status).toBe(200);
    expect(dl.headers["content-type"]).toContain("application/pdf");
    const out = await PDFDocument.load(Buffer.from(dl.body as unknown as ArrayBuffer));
    expect(out.getPageCount()).toBe(5);
    expect(Number(res.body.data.size)).toBeLessThan(bloated.length);
  });

  it("still returns a valid PDF for already-optimal input", async () => {
    const doc = await PDFDocument.create();
    doc.addPage([595, 842]);
    const optimal = Buffer.from(await doc.save({ useObjectStreams: true }));
    const res = await request(app).post("/tools/pdf/compress").attach("files", optimal, "ok.pdf");
    expect(res.status).toBe(200);
    createdFileIds.push(res.body.data.fileId as string);
    const dl = await request(app).get(res.body.data.downloadUrl as string);
    const out = await PDFDocument.load(Buffer.from(dl.body as unknown as ArrayBuffer));
    expect(out.getPageCount()).toBe(1);
  });

  it("400 when two files uploaded (exactly one)", async () => {
    const doc = await PDFDocument.create();
    doc.addPage([595, 842]);
    const pdf = Buffer.from(await doc.save());
    const res = await request(app)
      .post("/tools/pdf/compress")
      .attach("files", pdf, "a.pdf")
      .attach("files", pdf, "b.pdf");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("Exactly one PDF");
  });

  it("400 for non-PDF bytes", async () => {
    const res = await request(app)
      .post("/tools/pdf/compress")
      .attach("files", Buffer.from("nope"), "doc.pdf");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("not a valid PDF");
  });
});
