import type { APIRoute } from "astro";
import { log } from "../../../lib/log";
import { resolveForgeFromUrl } from "../../../lib/lookup/resolve-forge-repo";
import { runFullForgeLookup } from "../../../lib/lookup/run-forge-lookup";
import {
  json,
  error,
  OPTIONS,
  ALL,
  getClientIp,
  enforceRateLimit,
} from "../../../lib/lookup/api-helpers";

export const prerender = false;
export { OPTIONS, ALL };

export const GET: APIRoute = async ({ url, request }) => {
  const limited = enforceRateLimit(getClientIp(request));
  if (limited) return limited;

  const input = url.searchParams.get("repo");
  if (!input) return error(400, "Missing 'repo' query parameter");

  const ctx = resolveForgeFromUrl(input);
  if (!ctx) {
    return error(
      400,
      "Invalid repository URL. Expected a GitLab or Codeberg URL (e.g. gitlab.com/owner/repo).",
    );
  }

  log.info("forge-lookup", `Lookup: ${ctx.slug}`);

  try {
    const deep = url.searchParams.get("deep") === "true";
    return json(await runFullForgeLookup(ctx, deep));
  } catch (err) {
    log.error("forge-lookup", "Unhandled error", err);
    return error(500, "Internal server error");
  }
};
