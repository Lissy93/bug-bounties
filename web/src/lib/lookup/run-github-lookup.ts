import { log } from "../log";
import { runGitHubLookup, runLookup } from "./runner";
import { getRepoHomepage } from "./github-fetch";
import { resolveDomain } from "./resolve-domain";
import { ghTier1, ghTier2, ghSkipT2Only } from "./github-tiers";
import { webTier1, webTier2 } from "./website-tiers";
import type { LookupResponse } from "./types";

/**
 * Runs the full GitHub lookup for a repo, including website checks
 * against the repo's homepage if one is set.
 */
export async function runFullGitHubLookup(
  owner: string,
  repo: string,
  deep = false,
): Promise<LookupResponse> {
  const ctx = {
    owner,
    repo,
    slug: `${owner}/${repo}`,
    fullUrl: `https://github.com/${owner}/${repo}`,
  };
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 15_000);

  try {
    const [data, hp] = await Promise.all([
      runGitHubLookup(ctx, ghTier1, ghTier2, ghSkipT2Only, deep),
      getRepoHomepage(owner, repo, ac.signal),
    ]);

    if (hp) {
      try {
        const domainCtx = resolveDomain(hp);
        const webData = await runLookup(domainCtx, webTier1, webTier2, deep);
        data.results.push(...webData.results);
        data.errors.push(...webData.errors);
        data.summary.push(...webData.summary);
      } catch (err) {
        log.warn("github-lookup", `Homepage lookup failed for ${hp}`, err);
      }
    }

    return data;
  } finally {
    clearTimeout(timer);
  }
}
