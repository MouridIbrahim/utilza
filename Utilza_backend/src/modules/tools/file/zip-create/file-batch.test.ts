import express from "express";
import { createHash } from "node:crypto";
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import JSZip from "jszip";
import { prisma } from "../../../../lib/prisma.js";
import { errorMiddleware, notFoundMiddleware } from "../../../../middleware/error.middleware.js";
import { tempStorage } from "../../../../lib/storage.js";
import { filesRouter } from "../../../files/files.routes.js";
import { zipCreateRouter } from "../zip-create/zip-create.routes.js";
import { zipExtractRouter } from "../zip-extract/zip-extract.routes.js";
import { fileHashRouter } from "../hash/hash.routes.js";
import { base64EncodeRouter } from "../base64/base64-encode.routes.js";
import { base64DecodeRouter } from "../base64/base64-decode.routes.js";

function toolApp() {
  const app = express();
  app.use("/tools/file/zip-create", zipCreateRouter);
  app.use("/tools/file/zip-extract", zipExtractRouter);
  app.use("/tools/file/hash", fileHashRouter);
  app.use("/tools/file/base64-encode", base64EncodeRouter);
  app.use("/tools/file/base64-decode", base64DecodeRouter);
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

describe("POST /tools/file/zip-create", () => {
  it("zips two text files with sanitized names", async () => {
    const res = await request(app)
      .post("/tools/file/zip-create")
      .attach("files", Buffer.from("hello"), "a.txt")
      .attach("files", Buffer.from("world"), "b.txt");
    expect(res.status).toBe(200);
    expect(res.body.data.mimeType).toBe("application/zip");
    track(res);
    const zip = await JSZip.loadAsync(await downloadBytes(res.body.data.fileId as string));
    expect(Object.keys(zip.files).sort()).toEqual(["a.txt", "b.txt"]);
    expect(await zip.file("a.txt")?.async("string")).toBe("hello");
  });

  it("400 with a single file (minimum two)", async () => {
    const res = await request(app)
      .post("/tools/file/zip-create")
      .attach("files", Buffer.from("x"), "a.txt");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("At least two files");
  });

  it("400 for executable types", async () => {
    const res = await request(app)
      .post("/tools/file/zip-create")
      .attach("files", Buffer.from("x"), "a.txt")
      .attach("files", Buffer.from("MZ"), "run.exe");
    expect(res.status).toBe(400);
    // Rejected by the route allowlist before the executable blocklist.
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });
});

describe("file-shared guards", () => {
  it("blocks executables even if an allowlist widens later", async () => {
    const { assertCreatable, safeEntryName } = await import("../file-shared.js");
    expect(() => assertCreatable("exe")).toThrow("Executable");
    expect(() => assertCreatable("txt")).not.toThrow();
    expect(safeEntryName("../../evil.txt", 0, "txt")).toBe("evil.txt");
    expect(safeEntryName("...hidden", 1, "txt")).not.toContain("..");
    expect(safeEntryName("", 2, "txt")).toBe("file_2.txt");
  });
});

describe("POST /tools/file/zip-extract", () => {
  it("extracts entries as individually downloadable files", async () => {
    const zip = new JSZip();
    zip.file("hello.txt", "hello-zip");
    const buf = await zip.generateAsync({ type: "nodebuffer" });
    const res = await request(app).post("/tools/file/zip-extract").attach("files", buf, "a.zip");
    expect(res.status).toBe(200);
    expect(res.body.data.count).toBe(1);
    const entry = res.body.data.files[0] as { fileId: string; name: string; size: number };
    expect(entry.name).toBe("hello.txt");
    createdFileIds.push(entry.fileId);
    expect((await downloadBytes(entry.fileId)).toString()).toBe("hello-zip");
  });

  it("400 for non-zip bytes", async () => {
    const res = await request(app)
      .post("/tools/file/zip-extract")
      .attach("files", Buffer.from("nope"), "a.zip");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("not a valid ZIP");
  });
});

describe("POST /tools/file/hash", () => {
  it("returns sha256 + sha512 without storing anything", async () => {
    const data = Buffer.from("hash me");
    const res = await request(app).post("/tools/file/hash").attach("files", data, "a.txt");
    expect(res.status).toBe(200);
    expect(res.body.data.sha256).toBe(createHash("sha256").update(data).digest("hex"));
    expect(res.body.data.sha512).toBe(createHash("sha512").update(data).digest("hex"));
    expect(res.body.data.size).toBe(data.length);
  });
});

describe("POST /tools/file/base64-encode + decode", () => {
  it("round-trips bytes through text", async () => {
    const original = Buffer.from("round-trip-bytes-123");
    const enc = await request(app)
      .post("/tools/file/base64-encode")
      .attach("files", original, "a.txt");
    expect(enc.status).toBe(200);
    expect(enc.body.data.mimeType).toBe("text/plain");
    track(enc);
    const b64 = (await downloadBytes(enc.body.data.fileId as string)).toString();
    expect(b64).toBe(original.toString("base64"));

    const dec = await request(app)
      .post("/tools/file/base64-decode")
      .attach("files", Buffer.from(b64), "a.b64");
    expect(dec.status).toBe(200);
    track(dec);
    expect(await downloadBytes(dec.body.data.fileId as string)).toEqual(original);
  });

  it("400 for invalid base64 text", async () => {
    const res = await request(app)
      .post("/tools/file/base64-decode")
      .attach("files", Buffer.from("!!! not base64 !!!"), "a.txt");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("not valid Base64");
  });
});
