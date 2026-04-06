import { log } from "../log";
import { runAppLookup, runLookup } from "./runner";
import { resolveDomain } from "./resolve-domain";
import { appTier1, appTier2, appSkipT2Only } from "./app-tiers";
import { webTier1, webTier2 } from "./website-tiers";
import type { ResolvedApp, LookupResponse } from "./types";

const SKIP_HOSTS = new Set([
  "play.google.com",
  "apps.apple.com",
  "itunes.apple.com",
  "developer.apple.com",
  "developer.android.com",
]);

/** Extract developer website from source result metadata. */
function extractDeveloperWebsite(data: LookupResponse): string | null {
  for (const r of data.results) {
    const meta = r.metadata as Record<string, unknown> | undefined;
    if (meta?.developerWebsite) return String(meta.developerWebsite);
  }
  return null;
}

function isUsableSite(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return !SKIP_HOSTS.has(host);
  } catch {
    return false;
  }
}

export async function runFullAppLookup(
  ctx: ResolvedApp,
  deep = false,
): Promise<LookupResponse> {
  const timer = setTimeout(() => {}, 15_000);

  try {
    const data = await runAppLookup(
      ctx,
      appTier1,
      appTier2,
      appSkipT2Only,
      deep,
    );

    const devSite = extractDeveloperWebsite(data);
    if (devSite && isUsableSite(devSite)) {
      try {
        const domainCtx = resolveDomain(devSite);
        const webData = await runLookup(domainCtx, webTier1, webTier2, deep);
        data.results.push(...webData.results);
        data.errors.push(...webData.errors);
        data.summary.push(...webData.summary);
      } catch (err) {
        log.warn(
          "app-lookup",
          `Developer website lookup failed for ${devSite}`,
          err,
        );
      }
    }

    return data;
  } finally {
    clearTimeout(timer);
  }
}
