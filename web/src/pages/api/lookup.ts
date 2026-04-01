import type { APIRoute } from "astro";
import { resolveDomain } from "../../lib/lookup/resolve-domain";
import { runLookup } from "../../lib/lookup/runner";
import { checkRateLimit } from "../../lib/lookup/rate-limit";
import type { LookupSource } from "../../lib/lookup/types";
import {
  securityTxt,
  bountyDb,
  discloseIo,
  githubSecurity,
  platformCheck,
  csaf,
  dnsSecurity,
  httpHeaders,
  rdap,
  dmarc,
  rfc2142,
  sslCert,
  homepage,
  dnsSoa,
  commonPages,
  dnsTxt,
  robotsHumans,
} from "../../lib/lookup/sources";

export const prerender = false;

const tier1: LookupSource[] = [
  securityTxt,
  bountyDb,
  discloseIo,
  githubSecurity,
  platformCheck,
  csaf,
  dnsSecurity,
  httpHeaders,
];

const tier2: LookupSource[] = [
  rdap,
  dmarc,
  rfc2142,
  sslCert,
  homepage,
  dnsSoa,
  commonPages,
  dnsTxt,
  robotsHumans,
];

const json = (body: unknown, status = 200, headers?: Record<string, string>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control":
        status === 200 ? "public, max-age=86400, s-maxage=86400" : "no-store",
      "Access-Control-Allow-Origin": "*",
      ...headers,
    },
  });

const error = (
  status: number,
  message: string,
  headers?: Record<string, string>,
) => json({ error: message, status }, status, headers);

export const OPTIONS: APIRoute = () =>
  new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "86400",
    },
  });

export const ALL: APIRoute = () =>
  error(405, "Method not allowed", { Allow: "GET, OPTIONS" });

export const GET: APIRoute = async ({ url, request }) => {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";

  const limit = checkRateLimit(ip);
  if (!limit.ok)
    return error(429, limit.message, {
      "Retry-After": String(limit.retryAfter),
    });

  const input = url.searchParams.get("url");
  if (!input) return error(400, "Missing 'url' query parameter");

  let ctx;
  try {
    ctx = resolveDomain(input);
  } catch (err) {
    return error(400, err instanceof Error ? err.message : "Invalid input");
  }

  try {
    return json(await runLookup(ctx, tier1, tier2));
  } catch (err) {
    console.error("[lookup] Unhandled error:", err);
    return error(500, "Internal server error");
  }
};
