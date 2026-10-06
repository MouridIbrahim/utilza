import { Router } from "express";
import { z } from "zod";
import { Resolver } from "node:dns/promises";
import { connect } from "node:tls";
import { validate } from "../../../middleware/validation.middleware.js";
import { asyncHandler, sendSuccess } from "../../../utils/handler.js";
import { badRequest } from "../../../utils/errors.js";
import { analyticsLimiter } from "../../../middleware/rate-limit.middleware.js";
import { fetchUrl, assertPublicUrl } from "../../../lib/safe-fetch.js";

const urlBody = z.object({ url: z.string().min(1).max(2000) });

function metaContent(html: string, attr: string, name: string): string | null {
  const re = new RegExp(`<meta\\s+[^>]*${attr}\\s*=\\s*["']${name}["'][^>]*>`, "i");
  const tag = re.exec(html)?.[0] ?? null;
  if (!tag) return null;
  return (
    /content\s*=\s*"([^"]*)"/i.exec(tag)?.[1] ?? /content\s*=\s*'([^']*)'/i.exec(tag)?.[1] ?? null
  );
}

function titleOf(html: string): string | null {
  const match = /<title[^>]*>([\s\S]{1,300})<\/title>/i.exec(html);
  return match?.[1]?.trim().slice(0, 300) ?? null;
}

function first<T>(promise: Promise<T>): Promise<T | null> {
  return promise.then(
    (v) => v,
    () => null,
  );
}

export const urlStatusRouter = Router();
urlStatusRouter.post(
  "/",
  analyticsLimiter,
  validate({ body: urlBody }),
  asyncHandler(async (req, res) => {
    const { url } = req.body as { url: string };
    const fetched = await fetchUrl(url);
    sendSuccess(res, {
      url,
      ok: fetched.status >= 200 && fetched.status < 400,
      status: fetched.status,
      finalUrl: fetched.finalUrl,
      redirects: fetched.redirects,
      contentType: fetched.contentType,
      size: fetched.body.length,
    });
  }),
);

export const urlMetadataRouter = Router();
urlMetadataRouter.post(
  "/",
  analyticsLimiter,
  validate({ body: urlBody }),
  asyncHandler(async (req, res) => {
    const { url } = req.body as { url: string };
    const fetched = await fetchUrl(url);
    if (!fetched.contentType?.includes("text/html"))
      throw badRequest("URL did not return an HTML page.");
    const html = fetched.body.toString("utf8").slice(0, 200_000);
    sendSuccess(res, {
      url: fetched.finalUrl,
      title: titleOf(html),
      description: metaContent(html, "name", "description"),
      openGraph: {
        title: metaContent(html, "property", "og:title"),
        description: metaContent(html, "property", "og:description"),
        image: metaContent(html, "property", "og:image"),
      },
    });
  }),
);

const domainBody = z.object({
  domain: z
    .string()
    .min(1)
    .max(253)
    .regex(/^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)*$/i, "Invalid domain."),
});

export const dnsRouter = Router();
dnsRouter.post(
  "/",
  analyticsLimiter,
  validate({ body: domainBody }),
  asyncHandler(async (req, res) => {
    const { domain } = req.body as { domain: string };
    const resolver = new Resolver({ timeout: 8000 });
    const [a, aaaa, mx, txt, ns] = await Promise.all([
      first(resolver.resolve4(domain)),
      first(resolver.resolve6(domain)),
      first(resolver.resolveMx(domain)),
      first(resolver.resolveTxt(domain)),
      first(resolver.resolveNs(domain)),
    ]);
    sendSuccess(res, { domain, a, aaaa, mx, txt, ns });
  }),
);

const sslBody = z.object({
  domain: z
    .string()
    .min(1)
    .max(253)
    .regex(/^(?!-)[a-z0-9-]+(\.[a-z0-9-]+)*$/i, "Invalid domain."),
});

export const sslRouter = Router();
sslRouter.post(
  "/",
  analyticsLimiter,
  validate({ body: sslBody }),
  asyncHandler(async (req, res) => {
    const { domain } = req.body as { domain: string };
    // Port fixed at 443: variable ports would turn this into a port scanner.
    // IP literals rejected above; the DNS guard below refuses hostnames
    // resolving to private IPs, so internal hosts cannot be probed.
    if (/^\d+\.\d+\.\d+\.\d+$/.test(domain) || domain.includes(":"))
      throw badRequest("Domain names only (no IP literals).");
    // Same DNS guard as fetch paths: refuse domains resolving to private IPs
    // so this cannot probe internal hosts.
    await assertPublicUrl(`https://${domain}/`);
    const cert = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const socket = connect(
        { host: domain, port: 443, servername: domain, timeout: 10_000, rejectUnauthorized: false },
        () => {
          try {
            resolve(socket.getPeerCertificate(true) as unknown as Record<string, unknown>);
          } catch (err) {
            reject(err);
          } finally {
            socket.end();
          }
        },
      );
      socket.on("error", reject);
      socket.setTimeout(10_000, () => {
        socket.destroy(new Error("TLS probe timed out."));
      });
    }).catch(() => {
      throw badRequest("Could not establish TLS to the domain.");
    });
    if (!cert || Object.keys(cert).length === 0) throw badRequest("No certificate presented.");
    const validTo =
      typeof cert["valid_to"] === "string" ? Date.parse(cert["valid_to"] as string) : NaN;
    sendSuccess(res, {
      domain,
      subject: cert["subject"] ?? null,
      issuer: cert["issuer"] ?? null,
      validFrom: cert["valid_from"] ?? null,
      validTo: cert["valid_to"] ?? null,
      daysLeft: Number.isNaN(validTo)
        ? null
        : Math.floor((validTo - Date.now()) / (24 * 3600 * 1000)),
      fingerprint256: cert["fingerprint256"] ?? null,
    });
  }),
);
