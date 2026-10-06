import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";
import * as tar from "tar";
import { badRequest } from "../../../../utils/errors.js";
import { MAX_ARCHIVE_ENTRIES, MAX_ARCHIVE_TOTAL_BYTES } from "../file-shared.js";

// Scratch-space tar I/O: the `tar` package works on disk paths, so inputs
// are staged under a per-job temp dir that is always removed afterwards.
// Entry names are sanitized; absolute/parent paths never escape the scratch.
export interface ArchiveEntry {
  name: string;
  data: Buffer;
}

async function withScratch<T>(fn: (dir: string) => Promise<T>): Promise<T> {
  const dir = join(tmpdir(), `utilza-arch-${randomUUID()}`);
  await fs.mkdir(dir, { recursive: true });
  try {
    return await fn(dir);
  } finally {
    await fs.rm(dir, { recursive: true, force: true });
  }
}

export function sanitizeEntryName(name: string, fallback: string): string {
  const flat = name
    .split(/[\\/]/)
    .pop()
    ?.replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/^\.+/, "");
  const clean = (flat ?? "").slice(0, 200);
  return clean.length > 0 ? clean : fallback;
}

export async function tarGzip(files: ArchiveEntry[]): Promise<Buffer> {
  return withScratch(async (dir) => {
    const names: string[] = [];
    for (const [i, f] of files.entries()) {
      const name = sanitizeEntryName(f.name, `file_${i}.bin`);
      names.push(name);
      await fs.writeFile(join(dir, name), f.data);
    }
    const out = join(dir, "out.tar.gz");
    await tar.c({ gzip: true, file: out, cwd: dir }, names);
    return fs.readFile(out);
  });
}

async function walkFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  const walk = async (base: string): Promise<void> => {
    for (const entry of await fs.readdir(base, { withFileTypes: true })) {
      const full = join(base, entry.name);
      if (entry.isDirectory()) await walk(full);
      else if (entry.isFile()) out.push(relative(dir, full).split(sep).join("/"));
    }
  };
  await walk(dir);
  return out;
}

export async function untar(buffer: Buffer): Promise<ArchiveEntry[]> {
  return withScratch(async (dir) => {
    const input = join(dir, "in.tar");
    await fs.writeFile(input, buffer);
    const outDir = join(dir, "out");
    await fs.mkdir(outDir);
    try {
      // preservePaths:false (default) strips absolute paths and .. segments.
      await tar.x({ file: input, cwd: outDir, preservePaths: false });
    } catch {
      throw badRequest("File is not a valid tar archive.");
    }
    const names = await walkFiles(outDir);
    if (names.length === 0) throw badRequest("Archive contains no files.");
    if (names.length > MAX_ARCHIVE_ENTRIES)
      throw badRequest(`Archive has too many entries (max ${MAX_ARCHIVE_ENTRIES}).`);
    const entries: ArchiveEntry[] = [];
    let total = 0;
    for (const [i, name] of names.entries()) {
      const data = await fs.readFile(join(dir, "out", ...name.split("/")));
      total += data.length;
      if (total > MAX_ARCHIVE_TOTAL_BYTES)
        throw badRequest("Uncompressed size exceeds the 50 MB archive limit.");
      entries.push({ name: sanitizeEntryName(name, `file_${i}.bin`), data });
    }
    return entries;
  });
}
