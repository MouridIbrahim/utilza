import express from "express";
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { PDFDocument } from "pdf-lib";
import { prisma } from "../../../../lib/prisma.js";
import { errorMiddleware, notFoundMiddleware } from "../../../../middleware/error.middleware.js";
import { tempStorage } from "../../../../lib/storage.js";
import { filesRouter } from "../../../files/files.routes.js";
import { parseRanges } from "./split-pdf.service.js";
import { splitPdfRouter } from "./split-pdf.routes.js";

function toolApp() {
  const app = express();
  app.use("/tools/pdf/split", splitPdfRouter);
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

async function makePdf(pages: number): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pages; i += 1) doc.addPage([595, 842]);
  return Buffer.from(await doc.save());
}

async function downloadPageCount(fileId: string): Promise<number> {
  const dl = await request(app).get(`/api/v1/files/${fileId}`);
  expect(dl.status).toBe(200);
  const doc = await PDFDocument.load(Buffer.from(dl.body as unknown as ArrayBuffer));
  return doc.getPageCount();
}

describe("parseRanges", () => {
  it("parses singles and ranges", () => {
    expect(parseRanges("1-3,5", 10)).toEqual([1, 2, 3, 5]);
    expect(parseRanges("2", 10)).toEqual([2]);
  });

  it("rejects malformed tokens", () => {
    expect(() => parseRanges("abc", 10)).toThrow();
    expect(() => parseRanges("1--3", 10)).toThrow();
    expect(() => parseRanges("3-1", 10)).toThrow();
    expect(() => parseRanges("", 10)).toThrow();
  });

  it("rejects out-of-range pages", () => {
    expect(() => parseRanges("9", 3)).toThrow();
  });
});

describe("POST /tools/pdf/split", () => {
  it("splits pages 2-3 out of 3", async () => {
    const pdf = await makePdf(3);
    const res = await request(app)
      .post("/tools/pdf/split")
      .field("ranges", "2-3")
      .attach("files", pdf, "doc.pdf");
    expect(res.status).toBe(200);
    expect(res.body.data.mimeType).toBe("application/pdf");
    createdFileIds.push(res.body.data.fileId as string);
    expect(await downloadPageCount(res.body.data.fileId as string)).toBe(2);
  });

  it("400 when ranges missing (body schema)", async () => {
    const pdf = await makePdf(2);
    const res = await request(app).post("/tools/pdf/split").attach("files", pdf, "doc.pdf");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("400 for out-of-range pages", async () => {
    const pdf = await makePdf(2);
    const res = await request(app)
      .post("/tools/pdf/split")
      .field("ranges", "1-9")
      .attach("files", pdf, "doc.pdf");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("out of range");
  });

  it("400 when two files uploaded (exactly one)", async () => {
    const pdf = await makePdf(1);
    const res = await request(app)
      .post("/tools/pdf/split")
      .field("ranges", "1")
      .attach("files", pdf, "a.pdf")
      .attach("files", pdf, "b.pdf");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("Exactly one PDF");
  });

  it("400 for non-PDF bytes", async () => {
    const res = await request(app)
      .post("/tools/pdf/split")
      .field("ranges", "1")
      .attach("files", Buffer.from("nope"), "doc.pdf");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("not a valid PDF");
  });
});
