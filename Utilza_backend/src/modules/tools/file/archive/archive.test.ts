import express from "express";
import { afterAll, describe, expect, it } from "vitest";
import request from "supertest";
import JSZip from "jszip";
import * as tar from "tar";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import { prisma } from "../../../../lib/prisma.js";
import { errorMiddleware, notFoundMiddleware } from "../../../../middleware/error.middleware.js";
import { tempStorage } from "../../../../lib/storage.js";
import { filesRouter } from "../../../files/files.routes.js";
import { untar } from "./archive-shared.js";
import {
  renameRouter,
  folderZipRouter,
  tarCreateRouter,
  tarExtractRouter,
  zipToTarRouter,
  tarToZipRouter,
} from "./archive.routes.js";

function toolApp() {
  const app = express();
  app.use("/tools/file/rename", renameRouter);
  app.use("/tools/file/folder-to-zip", folderZipRouter);
  app.use("/tools/file/tar-create", tarCreateRouter);
  app.use("/tools/file/tar-extract", tarExtractRouter);
  app.use("/tools/file/zip-to-tar", zipToTarRouter);
  app.use("/tools/file/tar-to-zip", tarToZipRouter);
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

async function makeTar(files: Record<string, string>): Promise<Buffer> {
  const dir = join(tmpdir(), `utilza-test-${randomUUID()}`);
  await fs.mkdir(dir, { recursive: true });
  try {
    for (const [name, content] of Object.entries(files))
      await fs.writeFile(join(dir, name), content);
    const out = join(dir, "out.tar.gz");
    await tar.c({ gzip: true, file: out, cwd: dir }, Object.keys(files));
    return fs.readFile(out);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

describe("POST /tools/file/rename", () => {
  it("renames entries by pattern", async () => {
    const res = await request(app)
      .post("/tools/file/rename")
      .field("pattern", "photo-{i}")
      .attach("files", Buffer.from("a"), "x.txt")
      .attach("files", Buffer.from("b"), "y.txt");
    expect(res.status).toBe(200);
    track(res);
    const zip = await JSZip.loadAsync(await downloadBytes(res.body.data.fileId as string));
    expect(Object.keys(zip.files).sort()).toEqual(["photo-1.txt", "photo-2.txt"]);
  });

  it("400 without {i} in pattern", async () => {
    const res = await request(app)
      .post("/tools/file/rename")
      .field("pattern", "same-name")
      .attach("files", Buffer.from("a"), "x.txt")
      .attach("files", Buffer.from("b"), "y.txt");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("{i}");
  });
});

describe("POST /tools/file/folder-to-zip", () => {
  it("preserves folder structure, rejects traversal", async () => {
    const res = await request(app)
      .post("/tools/file/folder-to-zip")
      .field("paths", JSON.stringify(["docs/a.txt", "img/b.txt"]))
      .attach("files", Buffer.from("a"), "x.txt")
      .attach("files", Buffer.from("b"), "y.txt");
    expect(res.status).toBe(200);
    track(res);
    const zip = await JSZip.loadAsync(await downloadBytes(res.body.data.fileId as string));
    expect(
      Object.keys(zip.files)
        .filter((n) => !zip.files[n]?.dir)
        .sort(),
    ).toEqual(["docs/a.txt", "img/b.txt"]);
  });

  it("400 for traversal paths", async () => {
    const res = await request(app)
      .post("/tools/file/folder-to-zip")
      .field("paths", JSON.stringify(["../evil.txt", "b.txt"]))
      .attach("files", Buffer.from("a"), "x.txt")
      .attach("files", Buffer.from("b"), "y.txt");
    expect(res.status).toBe(400);
    expect(res.body.error.message).toContain("..");
  });

  it("400 when paths count mismatches", async () => {
    const res = await request(app)
      .post("/tools/file/folder-to-zip")
      .field("paths", JSON.stringify(["only-one.txt"]))
      .attach("files", Buffer.from("a"), "x.txt")
      .attach("files", Buffer.from("b"), "y.txt");
    expect(res.status).toBe(400);
  });
});

describe("POST /tools/file/tar-create + tar-extract", () => {
  it("round-trips through tar.gz", async () => {
    const create = await request(app)
      .post("/tools/file/tar-create")
      .attach("files", Buffer.from("alpha"), "a.txt")
      .attach("files", Buffer.from("beta"), "b.txt");
    expect(create.status).toBe(200);
    expect(create.body.data.mimeType).toBe("application/gzip");
    track(create);
    const tgz = await downloadBytes(create.body.data.fileId as string);
    expect(tgz.subarray(0, 2).toString("hex")).toBe("1f8b");

    const extract = await request(app)
      .post("/tools/file/tar-extract")
      .attach("files", tgz, "a.tgz");
    expect(extract.status).toBe(200);
    track(extract);
    const zip = await JSZip.loadAsync(await downloadBytes(extract.body.data.fileId as string));
    expect(await zip.file("a.txt")?.async("string")).toBe("alpha");
    expect(await zip.file("b.txt")?.async("string")).toBe("beta");
  });

  it("400 for non-tar bytes", async () => {
    const res = await request(app)
      .post("/tools/file/tar-extract")
      .attach("files", Buffer.from("definitely not a tarball"), "a.tar");
    expect(res.status).toBe(400);
  });
});

describe("POST /tools/file/zip-to-tar + tar-to-zip", () => {
  it("converts both directions losslessly", async () => {
    const tgz = await makeTar({ "x.txt": "one", "y.txt": "two" });
    const toZip = await request(app).post("/tools/file/tar-to-zip").attach("files", tgz, "a.tgz");
    expect(toZip.status).toBe(200);
    track(toZip);
    const zipBytes = await downloadBytes(toZip.body.data.fileId as string);
    const toTar = await request(app)
      .post("/tools/file/zip-to-tar")
      .attach("files", zipBytes, "b.zip");
    expect(toTar.status).toBe(200);
    track(toTar);
    const back = await untar(await downloadBytes(toTar.body.data.fileId as string));
    expect(Object.fromEntries(back.map((e) => [e.name, e.data.toString()]))).toEqual({
      "x.txt": "one",
      "y.txt": "two",
    });
  });
});
