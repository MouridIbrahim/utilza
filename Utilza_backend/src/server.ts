import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { prisma } from "./lib/prisma.js";

process.on("unhandledRejection", (reason) => {
  logger.error({ err: reason }, "unhandled promise rejection");
});

process.on("uncaughtException", (err) => {
  logger.fatal({ err }, "uncaught exception, exiting");
  process.exit(1);
});

function maskSecret(value: string): string {
  return value ? "[set]" : "[missing]";
}

async function checkDatabase(): Promise<boolean> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error("DB check timed out")), 8000),
  );
  try {
    await Promise.race([prisma.$queryRaw`SELECT 1`, timeout]);
    return true;
  } catch (err) {
    logger.warn({ err }, "database unreachable — API runs on the static registry fallback");
    return false;
  }
}

async function boot(): Promise<void> {
  const app = createApp();
  const server = app.listen(env.PORT, async () => {
    const adminEnv = (process.env["ADMIN_EMAILS"] ?? "").trim();
    const db = await checkDatabase();
    logger.info(
      {
        port: env.PORT,
        env: env.NODE_ENV,
        db: db ? "connected" : "fallback",
        cors: env.CORS_ORIGIN,
        admin: adminEnv ? "allowlist configured" : "disabled",
        jwt: maskSecret(env.JWT_SECRET),
        storage: env.STORAGE_BUCKET || "local-temp",
        ai: env.AI_API_KEY ? `model=${env.AI_MODEL || "unset"}` : "not configured",
      },
      `Utilza backend listening on :${env.PORT}`,
    );
  });

  function shutdown(signal: string) {
    logger.info(`${signal} received, shutting down...`);
    server.close(() => {
      logger.info("Server closed.");
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  }

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
}

boot().catch((err) => {
  logger.fatal({ err }, "failed to boot");
  process.exit(1);
});
