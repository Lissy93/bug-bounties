import { log } from "@lib/log";
import { runPackageLookup, runLookup } from "./runner";
import { resolveDomain } from "./resolve-domain";
import { runFullGitHubLookup } from "./run-github-lookup";
import { runFullForgeLookup } from "./run-forge-lookup";
import { resolveForgeFromUrl } from "./resolve-forge-repo";
import { pkgTier1, pkgTier2, pkgSkipT2Only } from "./package-tiers";
import { webTier1, webTier2 } from "./website-tiers";
import type { ResolvedPackage, LookupResponse } from "./types";

const GITHUB_RE = /github\.com\/([^/\s]+)\/([^/\s#?.]+)/;

const SKIP_HOMEPAGE_HOSTS = new Set([
  "github.com",
  "gitlab.com",
  "codeberg.org",
  "crates.io",
  "npmjs.com",
  "pypi.org",
  "docs.rs",
  "readthedocs.io",
  "readthedocs.org",
]);

function isUsableHomepage(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return !SKIP_HOMEPAGE_HOSTS.has(host);
  } catch {
    return false;
  }
}

function mergeResponse(target: LookupResponse, source: LookupResponse): void {
  target.results.push(...source.results);
  target.errors.push(...source.errors);
  target.summary.push(...source.summary);
}

/** Extract repository and homepage URLs from source result metadata. */
function extractLinksFromResults(data: LookupResponse): {
  repository: string | null;
  homepage: string | null;
} {
  let repository: string | null = null;
  let homepage: string | null = null;

  for (const r of data.results) {
    const meta = r.metadata as Record<string, unknown> | undefined;
    if (!meta) continue;
    if (!repository && meta.repository) {
      repository = String(meta.repository)
        .replace(/^git\+/, "")
        .replace(/\.git$/, "");
    }
    if (!homepage && meta.homepage) homepage = String(meta.homepage);
    if (repository && homepage) break;
  }

  return { repository, homepage };
}

export async function runFullPackageLookup(
  ctx: ResolvedPackage,
  deep = false,
): Promise<LookupResponse> {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 20_000);

  try {
    const data = await runPackageLookup(
      ctx,
      pkgTier1,
      pkgTier2,
      pkgSkipT2Only,
      deep,
    );

    const { repository, homepage } = extractLinksFromResults(data);

    /* Run the linked repository through the appropriate lookup pipeline */
    if (repository) {
      try {
        const ghMatch = repository.match(GITHUB_RE);
        if (ghMatch) {
          mergeResponse(
            data,
            await runFullGitHubLookup(
              ghMatch[1],
              ghMatch[2].replace(/\.git$/, ""),
              deep,
            ),
          );
        } else {
          const forgeCtx = resolveForgeFromUrl(repository);
          if (forgeCtx) {
            mergeResponse(data, await runFullForgeLookup(forgeCtx, deep));
          }
        }
      } catch (err) {
        log.warn("package-lookup", `Repo lookup failed for ${repository}`, err);
      }
    }

    /* Run website lookup against the homepage if it's not a repo host */
    if (homepage && isUsableHomepage(homepage)) {
      try {
        const domainCtx = resolveDomain(homepage);
        mergeResponse(
          data,
          await runLookup(domainCtx, webTier1, webTier2, deep),
        );
      } catch (err) {
        log.warn(
          "package-lookup",
          `Homepage lookup failed for ${homepage}`,
          err,
        );
      }
    }

    return data;
  } finally {
    clearTimeout(timer);
  }
}
