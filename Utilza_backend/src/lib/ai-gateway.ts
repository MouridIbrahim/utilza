import { env } from "../config/env.js";
import { prisma } from "./prisma.js";
import { logger } from "./logger.js";

// AI gateway (T116 gate). Single choke point for every future AI tool:
// server-side keys only, monthly per-user quotas, input caps, strict
// system/user separation, and usage metering. No live tool routes exist
// until a provider key is configured — calls fail closed with
// AI_NOT_CONFIGURED instead of a fake response.
export const AI_MAX_INPUT_CHARS = 8_000;
export const AI_MAX_SYSTEM_CHARS = 2_000;

export interface AiCompletion {
  text: string;
  tokens: number;
}

function monthKey(now = new Date()): string {
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function isAiConfigured(): boolean {
  return env.AI_API_URL.length > 0 && env.AI_API_KEY.length > 0 && env.AI_MODEL.length > 0;
}

export async function monthlyTokensUsed(userId: string, month = monthKey()): Promise<number> {
  const row = await prisma.aiUsage.findUnique({ where: { userId_month: { userId, month } } });
  return row?.tokens ?? 0;
}

export interface CompleteOptions {
  userId: string;
  system: string;
  input: string;
  maxTokens?: number;
}

export async function completeAi({
  userId,
  system,
  input,
  maxTokens = 1024,
}: CompleteOptions): Promise<AiCompletion> {
  if (!isAiConfigured()) {
    const err = new Error("AI is not configured.") as Error & { status?: number; code?: string };
    err.status = 503;
    err.code = "AI_NOT_CONFIGURED";
    throw err;
  }
  if (
    system.length > AI_MAX_SYSTEM_CHARS ||
    input.length === 0 ||
    input.length > AI_MAX_INPUT_CHARS
  ) {
    const err = new Error("Invalid input.") as Error & { status?: number; code?: string };
    err.status = 400;
    err.code = "VALIDATION_ERROR";
    throw err;
  }
  const month = monthKey();
  const used = await monthlyTokensUsed(userId, month);
  if (used >= env.AI_MONTHLY_TOKEN_LIMIT) {
    const err = new Error("Monthly AI quota exceeded.") as Error & {
      status?: number;
      code?: string;
    };
    err.status = 429;
    err.code = "AI_QUOTA_EXCEEDED";
    throw err;
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 30_000);
  let res: Response;
  try {
    res = await fetch(`${env.AI_API_URL}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${env.AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: env.AI_MODEL,
        max_tokens: maxTokens,
        messages: [
          { role: "system", content: system },
          { role: "user", content: input },
        ],
      }),
    });
  } catch {
    throw providerError();
  } finally {
    clearTimeout(timer);
  }
  if (!res.ok) {
    logger.error({ status: res.status }, "AI provider request failed");
    throw providerError();
  }
  const data = (await res.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
    usage?: { total_tokens?: number };
  };
  const text = data.choices?.[0]?.message?.content ?? "";
  // Trust provider usage when present; otherwise estimate conservatively.
  const tokens =
    data.usage?.total_tokens ?? Math.ceil((system.length + input.length + text.length) / 4);
  await prisma.aiUsage.upsert({
    where: { userId_month: { userId, month } },
    update: { calls: { increment: 1 }, tokens: { increment: tokens } },
    create: { userId, month, calls: 1, tokens },
  });
  return { text, tokens };
}

function providerError(): Error & { status?: number; code?: string } {
  const err = new Error("AI provider request failed.") as Error & {
    status?: number;
    code?: string;
  };
  err.status = 502;
  err.code = "AI_PROVIDER_ERROR";
  return err;
}
