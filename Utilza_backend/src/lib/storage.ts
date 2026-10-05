import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Opaque keys only: "<uuid>.<ext>". Anything else is rejected so a
// user-controlled value can never become a filesystem path (§31).
const KEY_PATTERN = /^[0-9a-f-]{36}\.[a-z0-9]{1,10}$/;
const EXT_PATTERN = /^[a-z0-9]{1,10}$/;

export interface StoredFile {
  key: string;
  size: number;
  mimeType?: string;
  expiresAt: Date;
}

export interface StorageAdapter {
  put(data: Buffer, opts: { ext: string; mimeType?: string; ttlMs?: number }): Promise<StoredFile>;
  get(key: string): Promise<Buffer | null>;
  del(key: string): Promise<boolean>;
  cleanupExpired(): Promise<number>;
  sweepStaleFiles(maxAgeMs: number): Promise<number>;
}

interface Entry {
  path: string;
  mimeType?: string;
  size: number;
  expiresAt: number;
}

export const DEFAULT_TTL_MS = 60 * 60 * 1000; // 1 hour

// Local temp-file storage. Used directly now; object storage (S3/GCS) slots
// behind the same interface later without touching tool code.
export class LocalTempStorage implements StorageAdapter {
  private readonly root: string;
  private readonly defaultTtlMs: number;
  private readonly entries = new Map<string, Entry>();

  constructor(root = join(tmpdir(), "utilza-files"), defaultTtlMs = DEFAULT_TTL_MS) {
    this.root = root;
    this.defaultTtlMs = defaultTtlMs;
  }

  private async ensureRoot(): Promise<void> {
    await fs.mkdir(this.root, { recursive: true });
  }

  async put(
    data: Buffer,
    opts: { ext: string; mimeType?: string; ttlMs?: number },
  ): Promise<StoredFile> {
    const ext = opts.ext.toLowerCase();
    if (!EXT_PATTERN.test(ext)) throw new Error("Invalid file extension.");
    if (data.length === 0) throw new Error("Empty file.");
    await this.ensureRoot();
    const key = `${randomUUID()}.${ext}`;
    const path = join(this.root, key);
    await fs.writeFile(path, data);
    const expiresAt = new Date(Date.now() + (opts.ttlMs ?? this.defaultTtlMs));
    this.entries.set(key, {
      path,
      mimeType: opts.mimeType,
      size: data.length,
      expiresAt: +expiresAt,
    });
    return { key, size: data.length, mimeType: opts.mimeType, expiresAt };
  }

  async get(key: string): Promise<Buffer | null> {
    if (!KEY_PATTERN.test(key)) return null;
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (entry.expiresAt <= Date.now()) {
      await this.del(key);
      return null;
    }
    try {
      return await fs.readFile(entry.path);
    } catch {
      this.entries.delete(key);
      return null;
    }
  }

  async del(key: string): Promise<boolean> {
    if (!KEY_PATTERN.test(key)) return false;
    const entry = this.entries.get(key);
    this.entries.delete(key);
    if (!entry) return false;
    try {
      await fs.unlink(entry.path);
    } catch {
      // Already gone — still counts as deleted.
    }
    return true;
  }

  async cleanupExpired(): Promise<number> {
    const now = Date.now();
    let removed = 0;
    for (const [key, entry] of this.entries) {
      if (entry.expiresAt <= now) {
        await this.del(key);
        removed += 1;
      }
    }
    return removed;
  }

  // Removes files on disk older than maxAgeMs, including orphans from a
  // previous process lifetime (metadata map is in-memory only).
  async sweepStaleFiles(maxAgeMs: number): Promise<number> {
    await this.ensureRoot();
    const cutoff = Date.now() - maxAgeMs;
    let removed = 0;
    const names = await fs.readdir(this.root);
    for (const name of names) {
      if (!KEY_PATTERN.test(name)) continue;
      try {
        const stat = await fs.stat(join(this.root, name));
        if (+stat.mtime <= cutoff) {
          await this.del(name);
          removed += 1;
        }
      } catch {
        // Raced deletion — ignore.
      }
    }
    return removed;
  }
}

export const tempStorage = new LocalTempStorage();
