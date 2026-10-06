import express from "express";
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import { Document, Packer, Paragraph, TextRun } from "docx";
import JSZip from "jszip";
import { prisma } from "../../../../lib/prisma.js";
import { errorMiddleware, notFoundMiddleware } from "../../../../middleware/error.middleware.js";
import { tempStorage } from "../../../../lib/storage.js";
import { filesRouter } from "../../../files/files.routes.js";
import { documentCompressRouter } from "./compress.routes.js";

function toolApp() {
  const app = express();
  app.use("/tools/document/compress", documentCompressRouter);
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

function track(res: { body: { data: { fileId: string } } }): void {
  createdFileIds.push(res.body.data.fileId as string);
}

describe("POST /tools/document/compress", () => {
  it("repacks a docx at max level, staying valid", async () => {
    const word = new Document({
      sections: [
        {
          children: [new Paragraph({ children: [new TextRun("compress me ".repeat(50))] })],
        },
      ],
    });
    const docx = Buffer.from(await Packer.toBuffer(word));
    const res = await request(app)
      .post("/tools/document/compress")
      .attach("files", docx, "doc.docx");
    expect(res.status).toBe(200);
    expect(res.body.data.mimeType).toContain("wordprocessingml");
    track(res);
    const out = await downloadBytes(res.body.data.fileId as string);
    expect(out.length).toBeLessThanOrEqual(docx.length);
    const zip = await JSZip.loadAsync(out);
    expect(zip.file("word/document.xml")).not.toBeNull();
  });

  it("400 for a zip that is not a docx", async () => {
    const zip = new JSZip();
    zip.file("hello.txt", "hi");
    const buf = await zip.generateAsync({ type: "nodebuffer" });
    const res = await request(app).post("/tools/document/compress").attach("files", buf, "a.docx");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("not a valid .docx");
  });
});
