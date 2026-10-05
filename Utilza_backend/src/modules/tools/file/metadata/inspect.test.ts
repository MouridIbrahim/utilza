import express from "express";
import { describe, expect, it } from "vitest";
import request from "supertest";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import { errorMiddleware, notFoundMiddleware } from "../../../../middleware/error.middleware.js";
import { fileMetadataRouter } from "../metadata/metadata.routes.js";
import { fileTypeRouter } from "../type/type.routes.js";
import { countTextLines, sniffType } from "../sniff.js";

function toolApp() {
  const app = express();
  app.use("/tools/file/metadata", fileMetadataRouter);
  app.use("/tools/file/type", fileTypeRouter);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);
  return app;
}

const app = toolApp();

describe("sniffType", () => {
  it("detects png/jpeg/webp/gif/pdf/mp3/mp4/text/unknown", async () => {
    expect(
      await sniffType(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
    ).toMatchObject({ type: "png" });
    expect(await sniffType(Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]))).toMatchObject({
      type: "jpeg",
    });
    expect(
      await sniffType(Buffer.concat([Buffer.from("RIFF...."), Buffer.from("WEBP")], 12)),
    ).toMatchObject({ type: "webp" });
    expect(await sniffType(Buffer.from("GIF89a123"))).toMatchObject({ type: "gif" });
    expect(await sniffType(Buffer.from("%PDF-1.7 test"))).toMatchObject({ type: "pdf" });
    expect(await sniffType(Buffer.from("ID3\x04test"))).toMatchObject({ type: "mp3" });
    const mp4 = Buffer.concat([Buffer.alloc(4), Buffer.from("ftypisom")]);
    expect(await sniffType(mp4)).toMatchObject({ type: "mp4" });
    expect(await sniffType(Buffer.from("plain text\n"))).toMatchObject({ type: "text" });
    expect(await sniffType(Buffer.from([0x00, 0x01, 0x02, 0xff]))).toMatchObject({
      type: "unknown",
    });
  });

  it("distinguishes docx/xlsx/zip by sentinel entries", async () => {
    const docx = new JSZip();
    docx.file("word/document.xml", "<w:doc/>");
    expect(await sniffType(await docx.generateAsync({ type: "nodebuffer" }))).toMatchObject({
      type: "docx",
    });
    const xlsx = new JSZip();
    xlsx.file("xl/workbook.xml", "<wb/>");
    expect(await sniffType(await xlsx.generateAsync({ type: "nodebuffer" }))).toMatchObject({
      type: "xlsx",
    });
    const plain = new JSZip();
    plain.file("a.txt", "hi");
    expect(await sniffType(await plain.generateAsync({ type: "nodebuffer" }))).toMatchObject({
      type: "zip",
    });
  });

  it("counts text lines, null for binary", () => {
    expect(countTextLines(Buffer.from("a\nb\nc\n"))).toBe(3);
    expect(countTextLines(Buffer.from([0x00, 0x01]))).toBeNull();
    expect(countTextLines(Buffer.from("  \n"))).toBe(0);
  });
});

describe("POST /tools/file/metadata", () => {
  it("reports metadata for a PDF without storing it", async () => {
    const doc = await PDFDocument.create();
    doc.addPage([595, 842]);
    const pdf = Buffer.from(await doc.save());
    const res = await request(app).post("/tools/file/metadata").attach("files", pdf, "doc.pdf");
    expect(res.status).toBe(200);
    expect(res.body.data.detectedType).toBe("pdf");
    expect(res.body.data.size).toBe(pdf.length);
    expect(res.body.data.sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(res.body.data.name).toBe("doc.pdf");
    expect(JSON.stringify(res.body)).not.toContain("%PDF");
  });

  it("reports text line counts", async () => {
    const res = await request(app)
      .post("/tools/file/metadata")
      .attach("files", Buffer.from("one\ntwo\n"), "notes.txt");
    expect(res.status).toBe(200);
    expect(res.body.data.detectedType).toBe("text");
    expect(res.body.data.textLines).toBe(2);
  });
});

describe("POST /tools/file/type", () => {
  it("ignores the extension entirely", async () => {
    const doc = await PDFDocument.create();
    doc.addPage([595, 842]);
    const pdf = Buffer.from(await doc.save());
    const res = await request(app).post("/tools/file/type").attach("files", pdf, "totally.txt");
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({ type: "pdf", mime: "application/pdf" });
  });
});
