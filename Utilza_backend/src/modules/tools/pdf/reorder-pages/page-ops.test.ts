import express from "express";
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { PDFDocument, StandardFonts } from "pdf-lib";
import { prisma } from "../../../../lib/prisma.js";
import { errorMiddleware, notFoundMiddleware } from "../../../../middleware/error.middleware.js";
import { tempStorage } from "../../../../lib/storage.js";
import { filesRouter } from "../../../files/files.routes.js";
import { reorderPagesRouter } from "../reorder-pages/reorder-pages.routes.js";
import { duplicatePagesRouter } from "../duplicate-pages/duplicate-pages.routes.js";
import { flattenPdfRouter } from "../flatten-pdf/flatten-pdf.routes.js";
import { searchPdfRouter } from "../search-pdf/search-pdf.routes.js";

function toolApp() {
  const app = express();
  app.use("/tools/pdf/reorder", reorderPagesRouter);
  app.use("/tools/pdf/duplicate", duplicatePagesRouter);
  app.use("/tools/pdf/flatten", flattenPdfRouter);
  app.use("/tools/pdf/search", searchPdfRouter);
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

async function makePdf(pages: number, label = "p"): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  for (let i = 0; i < pages; i += 1) {
    const page = doc.addPage([595, 842]);
    page.drawText(`${label}-${i + 1}`, { x: 50, y: 750, size: 14, font });
  }
  return Buffer.from(await doc.save());
}

async function downloadPageCount(fileId: string): Promise<number> {
  const dl = await request(app).get(`/api/v1/files/${fileId}`);
  expect(dl.status).toBe(200);
  const doc = await PDFDocument.load(Buffer.from(dl.body as unknown as ArrayBuffer));
  return doc.getPageCount();
}

function track(res: { body: { data: { fileId: string } } }): void {
  createdFileIds.push(res.body.data.fileId as string);
}

describe("POST /tools/pdf/reorder", () => {
  it("reorders 3 pages to 3,1,2", async () => {
    const res = await request(app)
      .post("/tools/pdf/reorder")
      .field("order", "3,1,2")
      .attach("files", await makePdf(3), "doc.pdf");
    expect(res.status).toBe(200);
    track(res);
    expect(await downloadPageCount(res.body.data.fileId as string)).toBe(3);
  });

  it("400 for non-permutation (subset)", async () => {
    const res = await request(app)
      .post("/tools/pdf/reorder")
      .field("order", "1,2")
      .attach("files", await makePdf(3), "doc.pdf");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("every page exactly once");
  });

  it("400 for repeats", async () => {
    const res = await request(app)
      .post("/tools/pdf/reorder")
      .field("order", "1,1,2")
      .attach("files", await makePdf(3), "doc.pdf");
    expect(res.status).toBe(400);
  });
});

describe("POST /tools/pdf/duplicate", () => {
  it("appends copies of ranged pages", async () => {
    const res = await request(app)
      .post("/tools/pdf/duplicate")
      .field("ranges", "1")
      .field("times", "2")
      .attach("files", await makePdf(2), "doc.pdf");
    expect(res.status).toBe(200);
    track(res);
    expect(await downloadPageCount(res.body.data.fileId as string)).toBe(4);
  });

  it("400 for bad times (body schema)", async () => {
    const res = await request(app)
      .post("/tools/pdf/duplicate")
      .field("ranges", "1")
      .field("times", "99")
      .attach("files", await makePdf(1), "doc.pdf");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /tools/pdf/flatten", () => {
  it("normalizes into a valid same-page PDF", async () => {
    const res = await request(app)
      .post("/tools/pdf/flatten")
      .attach("files", await makePdf(2), "doc.pdf");
    expect(res.status).toBe(200);
    track(res);
    expect(await downloadPageCount(res.body.data.fileId as string)).toBe(2);
  });

  it("400 for non-PDF bytes", async () => {
    const res = await request(app)
      .post("/tools/pdf/flatten")
      .attach("files", Buffer.from("nope"), "doc.pdf");
    expect(res.status).toBe(400);
  });
});

describe("POST /tools/pdf/search", () => {
  it("finds matching lines with page numbers", async () => {
    const res = await request(app)
      .post("/tools/pdf/search")
      .field("query", "needle")
      .attach("files", await makePdf(1, "needle here"), "doc.pdf");
    expect(res.status).toBe(200);
    expect(res.body.data.pageCount).toBe(1);
    expect(res.body.data.matches).toHaveLength(1);
    expect(res.body.data.matches[0].page).toBe(1);
    expect(res.body.data.matches[0].line).toContain("needle");
  });

  it("returns empty matches without error", async () => {
    const res = await request(app)
      .post("/tools/pdf/search")
      .field("query", "zzz-no-match")
      .attach("files", await makePdf(1, "plain"), "doc.pdf");
    expect(res.status).toBe(200);
    expect(res.body.data.matches).toHaveLength(0);
  });
});
