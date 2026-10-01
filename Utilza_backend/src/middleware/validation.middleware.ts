import type { NextFunction, Request, Response } from "express";
import { ZodError, type ZodSchema } from "zod";

interface ValidateSchemas {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}

export function validate(schemas: ValidateSchemas) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.query) {
        const parsed = schemas.query.parse(req.query);
        Object.defineProperty(req, "query", { value: parsed, writable: true });
      }
      if (schemas.params) req.params = schemas.params.parse(req.params);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        const appErr = new Error("Invalid input.") as Error & {
          status?: number;
          code?: string;
          details?: unknown;
        };
        appErr.status = 400;
        appErr.code = "VALIDATION_ERROR";
        appErr.details = err.flatten();
        next(appErr);
        return;
      }
      next(err);
    }
  };
}
