import createHttpError from "http-errors";

export { createHttpError };

export function notFound(message = "Not found", code = "NOT_FOUND") {
  const err = createHttpError(404, message) as Error & { code?: string };
  err.code = code;
  return err;
}

export function badRequest(message = "Invalid input.", code = "VALIDATION_ERROR") {
  const err = createHttpError(400, message) as Error & { code?: string };
  err.code = code;
  return err;
}

export function unauthorized(message = "Unauthorized.") {
  const err = createHttpError(401, message) as Error & { code?: string };
  err.code = "UNAUTHORIZED";
  return err;
}

export function forbidden(message = "Forbidden.") {
  const err = createHttpError(403, message) as Error & { code?: string };
  err.code = "FORBIDDEN";
  return err;
}

export function conflict(message: string, code = "CONFLICT") {
  const err = createHttpError(409, message) as Error & { code?: string };
  err.code = code;
  return err;
}

export function gone(message = "Gone.", code = "GONE") {
  const err = createHttpError(410, message) as Error & { code?: string };
  err.code = code;
  return err;
}
