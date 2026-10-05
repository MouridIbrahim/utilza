import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { LocalTempStorage } from "./storage.js";
import { purgeExpiredFiles, scheduleCleanup } from "./cleanup.js";

let root: string;
let storage: LocalTempStorage;

beforeAll(() => {
  root = join(tmpdir(), `utilza-test-${randomUUID()}`);
  storage = new LocalTempStorage(root, 60_000);
});

afterAll(async () => {
  await fs.rm(root, { recursive: true, force: true });
});

describe("LocalTempStorage put/get", () => {
  it("round-trips bytes with metadata", async () => {
    const data = Buffer.from("hello-tools");
    const stored = await storage.put(data, { ext: "png", mimeType: "image/png" });
    expect(stored.key).toMatch(/^[0-9a-f-]{36}\.png$/);
    expect(stored.size).toBe(data.length);
    expect(stored.mimeType).toBe("image/png");
    expect(stored.expiresAt.getTime()).toBeGreaterThan(Date.now());
    expect(await storage.get(stored.key)).toEqual(data);
  });

  it("keys never leak paths", async () => {
    const stored = await storage.put(Buffer.from("x"), { ext: "pdf" });
    expect(stored.key).not.toContain("/");
    expect(stored.key).not.toContain("\\");
    expect(stored.key).not.toContain("..");
  });

  it("get returns null for unknown keys", async () => {
    expect(await storage.get(`${randomUUID()}.png`)).toBeNull();
  });

  it("rejects invalid extensions", async () => {
    await expect(storage.put(Buffer.from("x"), { ext: "../../evil" })).rejects.toThrow(
      "Invalid file extension.",
    );
    await expect(storage.put(Buffer.from("x"), { ext: "" })).rejects.toThrow(
      "Invalid file extension.",
    );
  });

  it("rejects empty files", async () => {
    await expect(storage.put(Buffer.alloc(0), { ext: "png" })).rejects.toThrow("Empty file.");
  });
});

describe("path traversal", () => {
  it("get refuses traversal keys", async () => {
    expect(await storage.get("../../etc/passwd")).toBeNull();
    expect(await storage.get("..\\windows\\system32")).toBeNull();
    expect(await storage.get("/abs/path.png")).toBeNull();
    expect(await storage.get("no-extension")).toBeNull();
  });

  it("del refuses traversal keys", async () => {
    expect(await storage.del("../../etc/passwd")).toBe(false);
  });
});

describe("lifecycle expiry", () => {
  it("expired entries read as null", async () => {
    const stored = await storage.put(Buffer.from("short-lived"), { ext: "txt", ttlMs: 10 });
    await new Promise((r) => setTimeout(r, 30));
    expect(await storage.get(stored.key)).toBeNull();
  });

  it("cleanupExpired removes only expired entries", async () => {
    const dying = await storage.put(Buffer.from("a"), { ext: "txt", ttlMs: 10 });
    const living = await storage.put(Buffer.from("b"), { ext: "txt", ttlMs: 60_000 });
    await new Promise((r) => setTimeout(r, 30));
    expect(await storage.cleanupExpired()).toBeGreaterThanOrEqual(1);
    expect(await storage.get(dying.key)).toBeNull();
    expect(await storage.get(living.key)).not.toBeNull();
    await storage.del(living.key);
  });

  it("del removes bytes from disk", async () => {
    const stored = await storage.put(Buffer.from("gone"), { ext: "txt" });
    expect(await storage.del(stored.key)).toBe(true);
    expect(await storage.get(stored.key)).toBeNull();
    expect(await storage.del(stored.key)).toBe(false);
  });

  it("sweepStaleFiles removes orphan files by age", async () => {
    const stale = new LocalTempStorage(join(root, "stale"), 60_000);
    const stored = await stale.put(Buffer.from("old"), { ext: "txt" });
    const stalePath = join(root, "stale", stored.key);
    const past = new Date(Date.now() - 100_000);
    await fs.utimes(stalePath, past, past);
    expect(await stale.sweepStaleFiles(60_000)).toBe(1);
    expect(await stale.get(stored.key)).toBeNull();
  });
});

describe("purge helpers", () => {
  it("purgeExpiredFiles returns removed count", async () => {
    await storage.put(Buffer.from("z"), { ext: "txt", ttlMs: 10 });
    await new Promise((r) => setTimeout(r, 30));
    expect(await purgeExpiredFiles(storage)).toBeGreaterThanOrEqual(1);
  });

  it("scheduleCleanup purges on interval and stops", async () => {
    vi.useFakeTimers();
    try {
      const stop = scheduleCleanup(storage, 1_000);
      await storage.put(Buffer.from("t"), { ext: "txt", ttlMs: 10 });
      await vi.advanceTimersByTimeAsync(1_100);
      stop();
    } finally {
      vi.useRealTimers();
    }
  });
});
