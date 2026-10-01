import type { NextFunction, Request, Response } from "express";
import { logger } from "../lib/logger.js";
import { env } from "../config/env.js";

export interface AppError extends Error {
  status?: number;
  code?: string;
  details?: unknown;
}

// Centralized Express error handler. Produces stable shape:
// { success:false, error:{ code, message, details? } }
export function errorMiddleware(
  err: AppError,
  req: Request,
  res: Response,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _next: NextFunction,
): void {
  const status = err.status ?? 500;
  const code =
    err.code ??
    (status === 400
      ? "VALIDATION_ERROR"
      : status === 401
        ? "UNAUTHORIZED"
        : status === 403
          ? "FORBIDDEN"
          : status === 404
            ? "NOT_FOUND"
            : status === 409
              ? "CONFLICT"
              : status === 429
                ? "RATE_LIMITED"
                : "INTERNAL_ERROR");

  const message =
    status >= 500 ? "Something went wrong. Please try again." : (err.message ?? "Request failed.");

  logger.error(
    {
      reqId: (req as Request & { id?: string }).id,
      method: req.method,
      route: req.originalUrl,
      status,
      code,
    },
    err.message,
  );

  res.status(status).json({
    success: false,
    error: {
      code,
      message,
      ...(env.NODE_ENV === "development" && err.details !== undefined
        ? { details: err.details }
        : {}),
    },
  });
}

export function notFoundMiddleware(req: Request, _res: Response, next: NextFunction): void {
  const err = new Error(`Route not found: ${req.method} ${req.originalUrl}`) as AppError;
  err.status = 404;
  err.code = "NOT_FOUND";
  next(err);
}
