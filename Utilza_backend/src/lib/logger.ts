import pino from "pino";
import { env } from "../config/env.js";

const isProd = env.NODE_ENV === "production";
const isTest = env.NODE_ENV === "test";

export const logger = pino({
  level: isProd ? "info" : isTest ? "silent" : "debug",
  base: { service: "utilza_backend" },
  timestamp: pino.stdTimeFunctions.isoTime,
  // Human-readable colorized console in development; structured JSON in
  // production (log aggregators). pino-pretty is a devDependency and only
  // loaded outside production.
  ...(isProd
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            singleLine: false,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname,service",
            errorLikeObjectKeys: ["err", "error"],
          },
        },
      }),
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
      "AI_API_KEY",
    ],
    remove: true,
  },
});
