import type { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import type { AuthTokenPayload } from "../types/index.js";
import { forbidden, unauthorized } from "../utils/errors.js";

export interface AuthRequest extends Request {
  user?: { id: string; email: string };
}

export function signToken(userId: string, email: string): string {
  return jwt.sign({ sub: userId, email }, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as jwt.SignOptions);
}

export function verifyToken(token: string): AuthTokenPayload {
  return jwt.verify(token, env.JWT_SECRET) as AuthTokenPayload;
}

export function requireAuth(req: AuthRequest, _res: Response, next: NextFunction): void {
  try {
    const header = req.headers.authorization;
    if (!header?.startsWith("Bearer ")) throw unauthorized("Unauthorized.");
    const token = header.slice("Bearer ".length).trim();
    if (!token) throw unauthorized("Unauthorized.");
    const payload = verifyToken(token);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch {
    next(unauthorized("Unauthorized."));
  }
}

// Ownership guard: compare a resource's owner id against the authenticated
// user. List endpoints additionally scope queries by userId, so this is the
// belt-and-braces check for single-resource routes.
export function requireOwnership(resourceOwnerId: string, auth: AuthRequest): void {
  if (!auth.user || auth.user.id !== resourceOwnerId)
    throw forbidden("You do not own this resource.");
}

export function requireAdmin(req: AuthRequest, _res: Response, next: NextFunction): void {
  // Minimal admin gate: requires authenticated user whose email is in ADMIN_EMAILS.
  // Full AdminUser model is a future entity per 02-BACKEND.md:87.
  const admins = (process.env["ADMIN_EMAILS"] ?? "").split(",").filter(Boolean);
  if (!req.user) {
    next(unauthorized("Unauthorized."));
    return;
  }
  if (admins.length > 0 && !admins.includes(req.user.email)) {
    next(forbidden("Admin access required."));
    return;
  }
  if (admins.length === 0) {
    next(forbidden("Admin access is not configured."));
    return;
  }
  next();
}
