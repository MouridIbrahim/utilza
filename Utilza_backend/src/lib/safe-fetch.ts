import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { badRequest } from "../utils/errors.js";

// SSRF guard for all server-side URL fetching (06 §31, TASK-117).
// Blocks non-http(s) schemes, private/loopback/link-local resolved IPs
// (DNS checked per request incl. every redirect hop), oversized bodies
// and slow servers. Known limit: no TOCTOU pinning (resolve→connect race);
// acceptable for metadata/status tools, revisit before payment webhooks.
export interface FetchLimits {
  maxBytes?: number;
  timeoutMs?: number;
  maxRedirects?: number;
  allowPrivate?: boolean; // tests only — never true in routes
}

export interface FetchedUrl {
  status: number;
  finalUrl: string;
  redirects: Array<{ status: number; location: string }>;
  contentType: string | null;
  body: Buffer;
}

const DEFAULTS = { maxBytes: 1024 * 1024, timeoutMs: 10_000, maxRedirects: 5 };

function isPublicIp(ip: string): boolean {
  if (isIP(ip) === 0) return false;
  const v4 = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(ip);
  if (v4) {
    const [, a, b] = v4.map(Number) as [unknown, number, number, number, number];
    if (a === 10) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 127) return false;
    if (a === 0) return false;
    if (a >= 224) return false; // multicast + reserved
    if (a === 169 && b === 254) return false; // link-local (cloud metadata!)
    return true;
  }
  const lower = ip.toLowerCase();
  if (lower === "::1") return false;
  if (lower.startsWith("fe80:") || lower.startsWith("fec0:") || lower.startsWith("fc00:"))
    return false;
  if (lower.startsWith("ff")) return false;
  if (lower === "::" || lower === "::ffff:0:0") return false;
  if (lower.startsWith("::ffff:")) {
    const mapped = lower.slice("::ffff:".length);
    if (mapped.includes(".")) return isPublicIp(mapped);
    return false;
  }
  return true;
}

export async function assertPublicUrl(raw: string, allowPrivate = false): Promise<URL> {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw badRequest("Invalid URL.");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:")
    throw badRequest("Only http(s) URLs are allowed.");
  if (url.username || url.password) throw badRequest("URLs with credentials are not allowed.");
  if (allowPrivate) return url;
  let addresses;
  try {
    addresses = await lookup(url.hostname, { all: true });
  } catch {
    throw badRequest("Domain does not resolve.");
  }
  if (addresses.length === 0 || addresses.some((a) => !isPublicIp(a.address)))
    throw badRequest("URL resolves to a private address.");
  return url;
}

export async function fetchUrl(raw: string, limits: FetchLimits = {}): Promise<FetchedUrl> {
  const { maxBytes, timeoutMs, maxRedirects } = { ...DEFAULTS, ...limits };
  const allowPrivate = limits.allowPrivate ?? false;
  let current = (await assertPublicUrl(raw, allowPrivate)).toString();
  const redirects: FetchedUrl["redirects"] = [];
  for (let hop = 0; hop <= (maxRedirects ?? 5); hop += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let res: Response;
    try {
      res = await fetch(current, {
        redirect: "manual",
        signal: controller.signal,
        headers: { "user-agent": "EverydayTools/1.0 (+url-checker)" },
      });
    } catch (err) {
      clearTimeout(timer);
      if ((err as Error).name === "AbortError") throw badRequest("Upstream timed out.");
      throw badRequest("Upstream fetch failed.");
    } finally {
      clearTimeout(timer);
    }
    if ([301, 302, 303, 307, 308].includes(res.status)) {
      if (hop >= (maxRedirects ?? 5)) throw badRequest("Too many redirects.");
      const location = res.headers.get("location");
      if (!location) throw badRequest("Redirect without a location.");
      redirects.push({ status: res.status, location });
      await res.arrayBuffer().catch(() => undefined);
      current = (
        await assertPublicUrl(new URL(location, current).toString(), allowPrivate)
      ).toString();
      continue;
    }
    const contentType = res.headers.get("content-type");
    const chunks: Buffer[] = [];
    let size = 0;
    try {
      const reader = res.body?.getReader();
      if (!reader) throw badRequest("Upstream returned no body.");
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > (maxBytes ?? DEFAULTS.maxBytes)) {
          await reader.cancel().catch(() => undefined);
          throw badRequest("Upstream response too large.");
        }
        chunks.push(Buffer.from(value));
      }
    } catch (err) {
      if (typeof (err as { status?: unknown }).status === "number") throw err;
      throw badRequest("Upstream fetch failed.");
    }
    return {
      status: res.status,
      finalUrl: current,
      redirects,
      contentType,
      body: Buffer.concat(chunks),
    };
  }
  throw badRequest("Too many redirects.");
}
