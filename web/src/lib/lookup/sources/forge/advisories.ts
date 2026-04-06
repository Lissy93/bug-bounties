import type { ForgeLookupSource } from "../../types";
import { safeFetch, buildResult } from "../../util";

export const forgeAdvisories: ForgeLookupSource = {
  name: "forge-advisories",
  tier: 1,
  async execute(ctx, signal) {
    if (ctx.host !== "gitlab") return null;

    const proj = encodeURIComponent(ctx.projectPath);

    const [projRes, vulnRes] = await Promise.all([
      safeFetch(`${ctx.apiBase}/projects/${proj}`, signal),
      safeFetch(
        `${ctx.apiBase}/projects/${proj}/vulnerability_findings?per_page=1`,
        signal,
      ),
    ]);
    if (!projRes) return null;

    const data = (await projRes.json()) as { issues_enabled?: boolean };
    const hasVulnApi = vulnRes !== null;

    if (!hasVulnApi && !data.issues_enabled) return null;

    const reportUrl = `${ctx.fullUrl}/-/security/vulnerability_report`;
    const metadata: Record<string, unknown> = {};
    if (data.issues_enabled) metadata.issuesEnabled = true;
    if (hasVulnApi) metadata.vulnerabilityReporting = true;

    return buildResult(
      "forge-advisories",
      1,
      hasVulnApi
        ? [
            {
              type: "url",
              value: reportUrl,
              label: "GitLab vulnerability report",
            },
          ]
        : [],
      reportUrl,
      metadata,
    );
  },
};
