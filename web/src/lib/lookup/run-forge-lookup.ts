import { log } from "../log";
import { runForgeLookup, runLookup } from "./runner";
import { resolveDomain } from "./resolve-domain";
import { forgeTier1, forgeTier2, forgeSkipT2Only } from "./forge-tiers";
import { webTier1, webTier2 } from "./website-tiers";
import type { ResolvedForgeRepo, LookupResponse } from "./types";
import { safeFetch } from "./util";

const SKIP_HOSTS = new Set([
  "gitlab.com",
  "codeberg.org",
  "github.com",
  "docs.rs",
  "readthedocs.io",
  "readthedocs.org",
]);

function isUsableHomepage(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return !SKIP_HOSTS.has(host) && !host.endsWith(".github.io");
  } catch {
    return false;
  }
}

async function fetchCodebergWebsite(
  ctx: ResolvedForgeRepo,
  signal: AbortSignal,
): Promise<string | null> {
  if (ctx.host !== "codeberg") return null;
  const res = await safeFetch(
    `${ctx.apiBase}/repos/${ctx.owner}/${ctx.repo}`,
    signal,
  );
  if (!res) return null;
  const data = (await res.json()) as { website?: string };
  return data.website && isUsableHomepage(data.website) ? data.website : null;
}

export async function runFullForgeLookup(
  ctx: ResolvedForgeRepo,
  deep = false,
): Promise<LookupResponse> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 15_000);

  try {
    const [data, hp] = await Promise.all([
      runForgeLookup(ctx, forgeTier1, forgeTier2, forgeSkipT2Only, deep),
      fetchCodebergWebsite(ctx, ac.signal),
    ]);

    if (hp) {
      try {
        const domainCtx = resolveDomain(hp);
        const webData = await runLookup(domainCtx, webTier1, webTier2, deep);
        data.results.push(...webData.results);
        data.errors.push(...webData.errors);
        data.summary.push(...webData.summary);
      } catch (err) {
        log.warn("forge-lookup", `Homepage lookup failed for ${hp}`, err);
      }
    }

    return data;
  } finally {
    clearTimeout(timer);
  }
}
