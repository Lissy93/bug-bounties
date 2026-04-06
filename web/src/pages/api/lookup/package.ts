import type { APIRoute } from "astro";
import { log } from "../../../lib/log";
import { resolvePackage } from "../../../lib/lookup/resolve-package";
import { runFullPackageLookup } from "../../../lib/lookup/run-package-lookup";
import type { PackageRegistry } from "../../../lib/lookup/types";
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

const VALID_REGISTRIES = new Set<PackageRegistry>(["npm", "pypi", "crates"]);

export const GET: APIRoute = async ({ url, request }) => {
  const limited = enforceRateLimit(getClientIp(request));
  if (limited) return limited;

  const name = url.searchParams.get("name");
  const registry = url.searchParams.get("registry") as PackageRegistry | null;

  if (!name) return error(400, "Missing 'name' query parameter");
  if (!registry || !VALID_REGISTRIES.has(registry))
    return error(
      400,
      "Missing or invalid 'registry' parameter (npm, pypi, crates)",
    );

  let ctx;
  try {
    ctx = resolvePackage(name, registry);
  } catch (err) {
    return error(400, err instanceof Error ? err.message : "Invalid input");
  }

  log.info("package-lookup", `Lookup: ${ctx.slug}`);

  try {
    const deep = url.searchParams.get("deep") === "true";
    return json(await runFullPackageLookup(ctx, deep));
  } catch (err) {
    log.error("package-lookup", "Unhandled error", err);
    return error(500, "Internal server error");
  }
};
