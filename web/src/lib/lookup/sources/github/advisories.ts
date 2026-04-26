import type { GitHubLookupSource } from "@lib/lookup/types";
import { githubFetch } from "@lib/lookup/github-fetch";

interface Advisory {
  ghsa_id: string;
  cve_id: string | null;
  html_url: string;
  summary: string;
  severity: string;
  published_at: string;
}

export const advisories: GitHubLookupSource = {
  name: "github-advisories",
  tier: 1,
  async execute(ctx, signal) {
    /* Check if private vulnerability reporting is enabled */
    let privateReporting = false;
    const pvrRes = await githubFetch(
      `/repos/${ctx.owner}/${ctx.repo}/private-vulnerability-reporting`,
      signal,
    );
    if (pvrRes) {
      const body = (await pvrRes.json()) as { enabled?: boolean };
      privateReporting = !!body.enabled;
    }

    /* Try repo-specific published advisories, then global DB */
    const repoRes = await githubFetch(
      `/repos/${ctx.owner}/${ctx.repo}/security-advisories?per_page=5&state=published`,
      signal,
    );
    let data: Advisory[] = [];
    if (repoRes) {
      const body = (await repoRes.json()) as Advisory[];
      if (Array.isArray(body)) data = body;
    }

    if (data.length === 0) {
      const globalRes = await githubFetch(
        `/advisories?affects=${encodeURIComponent(ctx.slug)}&per_page=5&sort=published&direction=desc`,
        signal,
      );
      if (globalRes) {
        const body = (await globalRes.json()) as Advisory[];
        if (Array.isArray(body)) data = body;
      }
    }

    if (!privateReporting && data.length === 0) return null;

    const metadata: Record<string, unknown> = { privateReporting };

    if (privateReporting) {
      metadata.reportUrl = `https://github.com/${ctx.slug}/security/advisories/new`;
    }

    if (data.length > 0) {
      const latest = data[0];
      metadata.advisoryCount = data.length;
      metadata.hasMoreThanFive = data.length >= 5;
      metadata.latestSummary = latest.summary;
      metadata.latestSeverity = latest.severity;
      metadata.latestCve = latest.cve_id;
      metadata.latestUrl = latest.html_url;
      metadata.latestDate = latest.published_at;
    }

    return {
      source: "github-advisories",
      tier: 1,
      contacts: privateReporting
        ? [
            {
              type: "url" as const,
              value: `https://github.com/${ctx.slug}/security/advisories/new`,
              label: "Report a vulnerability (private)",
            },
          ]
        : [],
      url: privateReporting
        ? `https://github.com/${ctx.slug}/security/advisories/new`
        : undefined,
      metadata,
    };
  },
};
