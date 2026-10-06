import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { env } from "../config/env.js";
import { prisma } from "./prisma.js";
import { completeAi, isAiConfigured, monthlyTokensUsed } from "./ai-gateway.js";

const USER = "ai-test-user";
const MONTH = `${new Date().getUTCFullYear()}-${String(new Date().getUTCMonth() + 1).padStart(2, "0")}`;

function withFakeKey(): void {
  env.AI_API_URL = "https://ai.example.test";
  env.AI_API_KEY = "test-key-that-must-never-leak";
  env.AI_MODEL = "test-model";
}

function clearKey(): void {
  env.AI_API_URL = "";
  env.AI_API_KEY = "";
  env.AI_MODEL = "";
}

afterEach(async () => {
  vi.unstubAllGlobals();
  clearKey();
  await prisma.aiUsage.deleteMany({ where: { userId: USER } });
});

afterAll(async () => {
  await prisma.aiUsage.deleteMany({ where: { userId: USER } });
  await prisma.$disconnect();
});

describe("AI gateway (no provider key configured)", () => {
  it("reports unconfigured and fails closed", async () => {
    expect(isAiConfigured()).toBe(false);
    await expect(completeAi({ userId: USER, system: "s", input: "hello" })).rejects.toMatchObject({
      status: 503,
      code: "AI_NOT_CONFIGURED",
    });
  });

  it("never leaks a key in errors", async () => {
    try {
      await completeAi({ userId: USER, system: "s", input: "hello" });
      expect.unreachable("should have thrown");
    } catch (err) {
      expect(JSON.stringify(err)).not.toContain("sk-");
      expect((err as { code?: string }).code).toBe("AI_NOT_CONFIGURED");
    }
  });
});

describe("AI gateway validation (key present)", () => {
  it("400 on empty/oversized input", async () => {
    withFakeKey();
    await expect(completeAi({ userId: USER, system: "s", input: "" })).rejects.toMatchObject({
      status: 400,
      code: "VALIDATION_ERROR",
    });
    await expect(
      completeAi({ userId: USER, system: "s", input: "x".repeat(8001) }),
    ).rejects.toMatchObject({ status: 400, code: "VALIDATION_ERROR" });
  });

  it("429 when the monthly quota is exhausted", async () => {
    withFakeKey();
    await prisma.aiUsage.upsert({
      where: { userId_month: { userId: USER, month: MONTH } },
      update: { tokens: env.AI_MONTHLY_TOKEN_LIMIT },
      create: { userId: USER, month: MONTH, calls: 0, tokens: env.AI_MONTHLY_TOKEN_LIMIT },
    });
    await expect(completeAi({ userId: USER, system: "s", input: "hi" })).rejects.toMatchObject({
      status: 429,
      code: "AI_QUOTA_EXCEEDED",
    });
  });
});

describe("AI gateway success path (mocked provider)", () => {
  it("meters usage and keeps the key in the Authorization header only", async () => {
    withFakeKey();
    let seenAuth: string | null = null;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (_url: unknown, init?: { headers?: Record<string, string> }) => {
        seenAuth = init?.headers?.["authorization"] ?? null;
        return {
          ok: true,
          json: () =>
            Promise.resolve({
              choices: [{ message: { content: "hello back" } }],
              usage: { total_tokens: 42 },
            }),
        } as Response;
      }),
    );
    const before = await monthlyTokensUsed(USER);
    const res = await completeAi({ userId: USER, system: "be nice", input: "hello" });
    expect(res).toEqual({ text: "hello back", tokens: 42 });
    expect(seenAuth).toBe("Bearer test-key-that-must-never-leak");
    expect(await monthlyTokensUsed(USER)).toBe(before + 42);
    const row = await prisma.aiUsage.findUnique({
      where: { userId_month: { userId: USER, month: MONTH } },
    });
    expect(row?.calls).toBe(1);
  });

  it("502 when the provider fails, without leaking the key", async () => {
    withFakeKey();
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.resolve({ ok: false, status: 500 }) as unknown as Response),
    );
    await expect(completeAi({ userId: USER, system: "s", input: "hi" })).rejects.toMatchObject({
      status: 502,
      code: "AI_PROVIDER_ERROR",
    });
  });
});
