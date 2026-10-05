import express from "express";
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { PDFDocument } from "pdf-lib";
import * as pdfjs from "pdfjs-dist/legacy/build/pdf.mjs";
import { prisma } from "../../../../lib/prisma.js";
import { errorMiddleware, notFoundMiddleware } from "../../../../middleware/error.middleware.js";
import { tempStorage } from "../../../../lib/storage.js";
import { filesRouter } from "../../../files/files.routes.js";
import { watermarkRouter } from "../watermark/watermark.routes.js";
import { numberPagesRouter } from "../number-pages/number-pages.routes.js";
import { headerFooterRouter } from "../header-footer/header-footer.routes.js";

function toolApp() {
  const app = express();
  app.use("/tools/pdf/watermark", watermarkRouter);
  app.use("/tools/pdf/number-pages", numberPagesRouter);
  app.use("/tools/pdf/header-footer", headerFooterRouter);
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

async function downloadBytes(fileId: string): Promise<Buffer> {
  const dl = await request(app)
    .get(`/api/v1/files/${fileId}`)
    .buffer(true)
    .parse((res, cb) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk) => chunks.push(chunk as Buffer));
      res.on("end", () => cb(null, Buffer.concat(chunks)));
    });
  expect(dl.status).toBe(200);
  return dl.body as Buffer;
}

async function pdfTextBytes(buf: Buffer): Promise<string> {
  const doc = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
  const out: string[] = [];
  for (let i = 1; i <= doc.numPages; i += 1) {
    const page = await doc.getPage(i);
    const tc = await page.getTextContent();
    out.push(
      tc.items
        .map((item) => ("str" in item && typeof item.str === "string" ? item.str : ""))
        .join(" "),
    );
  }
  return out.join("\n");
}

function track(res: { body: { data: { fileId: string } } }): void {
  createdFileIds.push(res.body.data.fileId as string);
}

describe("POST /tools/pdf/watermark", () => {
  it("stamps translucent diagonal text on every page", async () => {
    const res = await request(app)
      .post("/tools/pdf/watermark")
      .field("text", "DRAFT")
      .attach("files", await makePdf(2), "doc.pdf");
    expect(res.status).toBe(200);
    track(res);
    const text = await pdfTextBytes(await downloadBytes(res.body.data.fileId as string));
    expect(text).toContain("DRAFT");
  });

  it("400 when text missing", async () => {
    const res = await request(app)
      .post("/tools/pdf/watermark")
      .attach("files", await makePdf(1), "doc.pdf");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("POST /tools/pdf/number-pages", () => {
  it("numbers pages as Page N of TOTAL", async () => {
    const res = await request(app)
      .post("/tools/pdf/number-pages")
      .attach("files", await makePdf(2), "doc.pdf");
    expect(res.status).toBe(200);
    track(res);
    const text = await pdfTextBytes(await downloadBytes(res.body.data.fileId as string));
    expect(text).toContain("Page 1 of 2");
    expect(text).toContain("Page 2 of 2");
  });

  it("supports bare-number format", async () => {
    const res = await request(app)
      .post("/tools/pdf/number-pages")
      .field("format", "n")
      .attach("files", await makePdf(1), "doc.pdf");
    expect(res.status).toBe(200);
    track(res);
  });
});

describe("POST /tools/pdf/header-footer", () => {
  it("stamps header and footer", async () => {
    const res = await request(app)
      .post("/tools/pdf/header-footer")
      .field("header", "ACME Report")
      .field("footer", "confidential")
      .attach("files", await makePdf(1), "doc.pdf");
    expect(res.status).toBe(200);
    track(res);
    const text = await pdfTextBytes(await downloadBytes(res.body.data.fileId as string));
    expect(text).toContain("ACME Report");
    expect(text).toContain("confidential");
  });

  it("400 when neither header nor footer given", async () => {
    const res = await request(app)
      .post("/tools/pdf/header-footer")
      .attach("files", await makePdf(1), "doc.pdf");
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
    expect(JSON.stringify(res.body.error.details)).toContain("At least one of header or footer");
  });
});
