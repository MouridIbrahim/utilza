import type { NextFunction, Request, Response } from "express";
import multer from "multer";
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
  _next: NextFunction,
): void {
  let status = err.status ?? 500;
  let code =
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
              : status === 410
                ? "GONE"
                : status === 413
                  ? "PAYLOAD_TOO_LARGE"
                  : status === 429
                    ? "RATE_LIMITED"
                    : "INTERNAL_ERROR");

  if (err instanceof multer.MulterError) {
    status = err.code === "LIMIT_FILE_SIZE" ? 413 : 400;
    code = err.code === "LIMIT_FILE_SIZE" ? "FILE_TOO_LARGE" : "UPLOAD_ERROR";
  }

  const message =
    status >= 500
      ? "Something went wrong. Please try again."
      : err instanceof multer.MulterError
        ? status === 413
          ? "File too large."
          : "Invalid upload."
        : (err.message ?? "Request failed.");
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
      // Field-level validation details are safe (no paths/stack/secrets).
      // Production responses stay minimal per 02-BACKEND.md:237.
      ...(env.NODE_ENV !== "production" && err.details !== undefined
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
