import type { APIRoute } from "astro";
import { log } from "@lib/log";
import { resolveApp } from "@lib/lookup/resolve-app";
import { runFullAppLookup } from "@lib/lookup/run-app-lookup";
import type { AppStore } from "@lib/lookup/types";
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

  const id = url.searchParams.get("id");
  if (!id) return error(400, "Missing 'id' query parameter");

  const store = (url.searchParams.get("store") as AppStore | null) || "play";
  if (store !== "play" && store !== "appstore") {
    return error(400, "Invalid 'store' parameter (play, appstore)");
  }

  let ctx;
  try {
    ctx = resolveApp(id, store);
  } catch (err) {
    return error(400, err instanceof Error ? err.message : "Invalid input");
  }

  log.info("app-lookup", `Lookup: ${ctx.slug}`);

  try {
    const deep = url.searchParams.get("deep") === "true";
    return json(await runFullAppLookup(ctx, deep));
  } catch (err) {
    log.error("app-lookup", "Unhandled error", err);
    return error(500, "Internal server error");
  }
};
