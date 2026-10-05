import pino from "pino";
import { env } from "../config/env.js";

export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : env.NODE_ENV === "test" ? "silent" : "debug",
  base: { service: "utilza_backend" },
  timestamp: pino.stdTimeFunctions.isoTime,
  redact: {
    paths: [
      "password",
      "passwordHash",
      "token",
      "accessToken",
      "refreshToken",
      "authorization",
      "DATABASE_URL",
      "JWT_SECRET",
      "STORAGE_SECRET_KEY",
      "STORAGE_ACCESS_KEY",
    ],
    remove: true,
  },
});
