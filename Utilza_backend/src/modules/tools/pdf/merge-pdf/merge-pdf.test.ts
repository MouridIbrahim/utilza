import express from "express";
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { PDFDocument } from "pdf-lib";
import { prisma } from "../../../../lib/prisma.js";
import { errorMiddleware, notFoundMiddleware } from "../../../../middleware/error.middleware.js";
import { tempStorage } from "../../../../lib/storage.js";
import { filesRouter } from "../../../files/files.routes.js";
import { mergePdfRouter } from "./merge-pdf.routes.js";

function toolApp() {
  const app = express();
  app.use("/tools/pdf/merge", mergePdfRouter);
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

async function pageCount(res: request.Response): Promise<number> {
  const dl = await request(app).get(res.body.data.downloadUrl as string);
  expect(dl.status).toBe(200);
  const doc = await PDFDocument.load(Buffer.from(dl.body as unknown as ArrayBuffer));
  return doc.getPageCount();
}

describe("POST /tools/pdf/merge", () => {
  it("merges two PDFs and the download has both pages", async () => {
    const a = await makePdf(1);
    const b = await makePdf(2);
    const res = await request(app)
      .post("/tools/pdf/merge")
      .attach("files", a, "a.pdf")
      .attach("files", b, "b.pdf");
    expect(res.status).toBe(200);
    expect(res.body.data.mimeType).toBe("application/pdf");
    expect(res.body.data.downloadUrl).toMatch(/^\/api\/v1\/files\//);
    createdFileIds.push(res.body.data.fileId as string);
    expect(await pageCount(res)).toBe(3);
  });

  it("400 with a single file (minimum two)", async () => {
    const a = await makePdf(1);
    const res = await request(app).post("/tools/pdf/merge").attach("files", a, "a.pdf");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("At least two PDF");
  });

  it("400 for non-PDF bytes with a .pdf name", async () => {
    const a = await makePdf(1);
    const res = await request(app)
      .post("/tools/pdf/merge")
      .attach("files", a, "a.pdf")
      .attach("files", Buffer.from("not a pdf at all"), "b.pdf");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("not a valid PDF");
  });

  it("400 for disallowed extension", async () => {
    const res = await request(app)
      .post("/tools/pdf/merge")
      .attach("files", Buffer.from("x"), "a.pdf")
      .attach("files", Buffer.from("x"), "b.exe");
    expect(res.status).toBe(400);
  });

  it("400 when no files uploaded", async () => {
    const res = await request(app).post("/tools/pdf/merge");
    expect(res.status).toBe(400);
  });
});
