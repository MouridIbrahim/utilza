import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 chars"),
  JWT_EXPIRES_IN: z.string().default("7d"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  STORAGE_ENDPOINT: z.string().optional().default(""),
  STORAGE_BUCKET: z.string().optional().default(""),
  STORAGE_ACCESS_KEY: z.string().optional().default(""),
  STORAGE_SECRET_KEY: z.string().optional().default(""),
  // AI provider (T116). Optional: gateway reports AI_NOT_CONFIGURED without
  // a key instead of failing boot, so AI tools degrade honestly pre-launch.
  AI_API_URL: z.string().optional().default(""),
  AI_API_KEY: z.string().optional().default(""),
  AI_MODEL: z.string().optional().default(""),
  AI_MONTHLY_TOKEN_LIMIT: z.coerce.number().int().positive().default(100_000),
});

function buildEnv() {
  const nodeEnv = process.env["NODE_ENV"] ?? "development";

  // Allow tests / local boot without real secrets. Fail fast otherwise.
  const raw = {
    NODE_ENV: nodeEnv,
    PORT: process.env["PORT"] ?? "4000",
    DATABASE_URL:
      process.env["DATABASE_URL"] ??
      (nodeEnv === "test" || nodeEnv === "development"
        ? "postgresql://test:test@localhost:5432/test?schema=public"
        : ""),
    JWT_SECRET:
      process.env["JWT_SECRET"] ??
      (nodeEnv === "test" ? "test-secret-must-be-at-least-32-chars-long!!" : ""),
    JWT_EXPIRES_IN: process.env["JWT_EXPIRES_IN"] ?? "7d",
    CORS_ORIGIN: process.env["CORS_ORIGIN"] ?? "http://localhost:5173",
    STORAGE_ENDPOINT: process.env["STORAGE_ENDPOINT"] ?? "",
    STORAGE_BUCKET: process.env["STORAGE_BUCKET"] ?? "",
    STORAGE_ACCESS_KEY: process.env["STORAGE_ACCESS_KEY"] ?? "",
    STORAGE_SECRET_KEY: process.env["STORAGE_SECRET_KEY"] ?? "",
    AI_API_URL: process.env["AI_API_URL"] ?? "",
    AI_API_KEY: process.env["AI_API_KEY"] ?? "",
    AI_MODEL: process.env["AI_MODEL"] ?? "",
    AI_MONTHLY_TOKEN_LIMIT: process.env["AI_MONTHLY_TOKEN_LIMIT"] ?? "100000",
  };

  const parsed = envSchema.safeParse(raw);
  if (!parsed.success) {
    const details = parsed.error.flatten().fieldErrors;
    console.error("Invalid environment configuration:", details);
    throw new Error("Invalid environment configuration");
  }
  return parsed.data;
}

export const env = buildEnv();
export type Env = typeof env;
