import type { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger.js";

// Debug console: one readable line per request (method, route, status,
// duration). Errors (5xx) log at error level with the request id so they can
// be correlated with the error middleware output below.
export function requestLogMiddleware(req: Request, res: Response, next: NextFunction): void {
  const start = process.hrtime.bigint();
  res.on("finish", () => {
    const ms = Number(process.hrtime.bigint() - start) / 1_000_000;
    const base = {
      reqId: (req as Request & { id?: string }).id,
      method: req.method,
      route: req.originalUrl,
      status: res.statusCode,
      durationMs: Math.round(ms * 10) / 10,
    };
    if (res.statusCode >= 500) logger.error(base, "request failed");
    else if (res.statusCode >= 400) logger.warn(base, "request rejected");
    else logger.info(base, "request ok");
  });
  next();
}
