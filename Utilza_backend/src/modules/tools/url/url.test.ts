import type { Server } from "node:http";
import express from "express";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { errorMiddleware, notFoundMiddleware } from "../../../middleware/error.middleware.js";
import { assertPublicUrl, fetchUrl } from "../../../lib/safe-fetch.js";
import { urlStatusRouter, urlMetadataRouter, dnsRouter, sslRouter } from "./url.routes.js";

function toolApp() {
  const app = express();
  app.use(express.json());
  app.use("/url/status", urlStatusRouter);
  app.use("/url/metadata", urlMetadataRouter);
  app.use("/url/dns", dnsRouter);
  app.use("/url/ssl", sslRouter);
  app.use(notFoundMiddleware);
  app.use(errorMiddleware);
  return app;
}

const app = toolApp();

// Local target server: exercises fetchUrl end-to-end (redirects, bodies)
// without touching the public internet. Routes always forbid private IPs,
// so these flows are covered at the helper level, not through the routes.
let server: Server;
let base = "";

beforeAll(async () => {
  const inner = express();
  inner.get("/page", (_req, res) => {
    res
      .type("html")
      .send(
        '<html><head><title>Local Page</title><meta name="description" content="local desc">' +
          '<meta property="og:title" content="OG Local"></head><body>hi</body></html>',
      );
  });
  inner.get("/old", (_req, res) => res.redirect(302, "/page"));
  inner.get("/loop", (_req, res) => res.redirect(302, "/loop"));
  inner.get("/big", (_req, res) => {
    res.type("text/plain").send("x".repeat(200));
  });
  await new Promise<void>((resolve) => {
    server = inner.listen(0, "127.0.0.1", () => resolve());
  });
  const addr = server.address();
  if (!addr || typeof addr === "string") throw new Error("no local port");
  base = `http://127.0.0.1:${addr.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

describe("assertPublicUrl (SSRF guard)", () => {
  it.each([
    "http://127.0.0.1/",
    "http://10.0.0.1/",
    "http://192.168.1.1/",
    "http://169.254.169.254/", // cloud metadata
    "http://[::1]/",
    "file:///etc/passwd",
    "ftp://example.com/x",
    "http://user:pass@example.com/",
    "not a url",
  ])("rejects %s", async (raw) => {
    await expect(assertPublicUrl(raw)).rejects.toThrow();
  });

  it("allows loopback only with the test-only flag", async () => {
    const url = await assertPublicUrl(`${base}/page`, true);
    expect(url.hostname).toBe("127.0.0.1");
  });
});

describe("fetchUrl helper (local server)", () => {
  it("follows redirects and returns bodies", async () => {
    const res = await fetchUrl(`${base}/old`, { allowPrivate: true });
    expect(res.status).toBe(200);
    expect(res.finalUrl).toBe(`${base}/page`);
    expect(res.redirects).toHaveLength(1);
    expect(res.body.toString()).toContain("Local Page");
  });

  it("rejects redirect loops", async () => {
    await expect(fetchUrl(`${base}/loop`, { allowPrivate: true, maxRedirects: 2 })).rejects.toThrow(
      "Too many redirects.",
    );
  });

  it("enforces the byte cap", async () => {
    await expect(fetchUrl(`${base}/big`, { allowPrivate: true, maxBytes: 10 })).rejects.toThrow(
      "too large",
    );
  });
});

describe("POST /tools/url/* (no network)", () => {
  it("status rejects private targets", async () => {
    const res = await request(app)
      .post("/url/status")
      .send({ url: `${base}/page` });
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("VALIDATION_ERROR");
  });

  it("metadata rejects non-URL bodies", async () => {
    const res = await request(app).post("/url/metadata").send({ url: "notaurl" });
    expect(res.status).toBe(400);
  });

  it("dns rejects malformed domains and IP literals stay out of ssl", async () => {
    const badDns = await request(app).post("/url/dns").send({ domain: "not a domain!" });
    expect(badDns.status).toBe(400);
    const badSsl = await request(app).post("/url/ssl").send({ domain: "1.2.3.4" });
    expect(badSsl.status).toBe(400);
    expect(badSsl.body.error.code).toBe("VALIDATION_ERROR");
  });
});
