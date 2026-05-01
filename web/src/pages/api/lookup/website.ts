import type { APIRoute } from "astro";
import { log } from "@lib/log";
import { resolveDomain } from "@lib/lookup/resolve-domain";
import { runLookup } from "@lib/lookup/runner";
import { webTier1, webTier2 } from "@lib/lookup/website-tiers";
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

  const input = url.searchParams.get("url");
  if (!input) return error(400, "Missing 'url' query parameter");

  let ctx;
  try {
    ctx = resolveDomain(input);
  } catch (err) {
    return error(400, err instanceof Error ? err.message : "Invalid input");
  }

  log.info("lookup", `Lookup: ${ctx.domain}`);

  try {
    const deep = url.searchParams.get("deep") === "true";
    return json(await runLookup(ctx, webTier1, webTier2, deep));
  } catch (err) {
    log.error("lookup", "Unhandled error", err);
    return error(500, "Internal server error");
  }
};
