import type { APIRoute } from "astro";
import { log } from "@lib/log";
import { resolveRepo } from "@lib/lookup/resolve-repo";
import { runFullGitHubLookup } from "@lib/lookup/run-github-lookup";
import { hasGitHubToken } from "@lib/lookup/github-fetch";
import {
  json,
  error,
  OPTIONS,
  ALL,
  getClientIp,
  enforceRateLimit,
} from "@lib/lookup/api-helpers";

export const prerender = false;
export { OPTIONS, ALL };

export const GET: APIRoute = async ({ url, request }) => {
  const limited = enforceRateLimit(getClientIp(request));
  if (limited) return limited;

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
