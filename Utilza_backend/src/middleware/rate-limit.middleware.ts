import rateLimit, { type RateLimitRequestHandler } from "express-rate-limit";
import { env } from "../config/env.js";

// Raw factory: explicit max is respected as-is (used by behavior tests).
export function makeLimiter(
  windowMs: number,
  max: number,
  message: string,
): RateLimitRequestHandler {
  return rateLimit({
    windowMs,
    max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { success: false, error: { code: "RATE_LIMITED", message } },
  });
}

// Tests run the whole suite from one IP across shared module state; relax
// limits there so rate limiting never masks functional failures. The
// production limits below remain active in dev/staging/production.
const TEST_MAX = 100_000;

function limiter(windowMs: number, max: number, message: string): RateLimitRequestHandler {
  return makeLimiter(windowMs, env.NODE_ENV === "test" ? Math.max(max, TEST_MAX) : max, message);
}

export const globalLimiter = limiter(15 * 60 * 1000, 300, "Too many requests.");

export const authLimiter = limiter(15 * 60 * 1000, 30, "Too many auth attempts. Try again later.");

export const fileLimiter = limiter(15 * 60 * 1000, 30, "Too many file requests. Try again later.");

export const analyticsLimiter = limiter(1 * 60 * 1000, 60, "Too many requests.");
