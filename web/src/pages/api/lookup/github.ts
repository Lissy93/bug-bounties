import type { APIRoute } from "astro";
import { log } from "../../../lib/log";
import { resolveRepo } from "../../../lib/lookup/resolve-repo";
import { runFullGitHubLookup } from "../../../lib/lookup/run-github-lookup";
import { hasGitHubToken } from "../../../lib/lookup/github-fetch";
import { checkRateLimit } from "../../../lib/lookup/rate-limit";

export const prerender = false;

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

  if (!hasGitHubToken()) {
    return error(
      401,
      "GitHub API token not configured. GitHub lookups are unavailable.",
    );
  }

  const input = url.searchParams.get("repo");
  if (!input) return error(400, "Missing 'repo' query parameter");

  let ctx;
  try {
    ctx = resolveRepo(input);
  } catch (err) {
    return error(400, err instanceof Error ? err.message : "Invalid input");
  }

  log.info("github-lookup", `Lookup: ${ctx.slug}`);

  try {
    const deep = url.searchParams.get("deep") === "true";
    return json(await runFullGitHubLookup(ctx.owner, ctx.repo, deep));
  } catch (err) {
    log.error("github-lookup", "Unhandled error", err);
    return error(500, "Internal server error");
  }
};
