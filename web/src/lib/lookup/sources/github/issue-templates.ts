import type { GitHubLookupSource, ContactInfo } from "../../types";
import { EMAIL_RE, safeFetch } from "../../util";
import { githubFetch, fetchRepoMeta } from "../../github-fetch";

interface ContentEntry {
  name: string;
  download_url: string | null;
  type: string;
}

export const issueTemplates: GitHubLookupSource = {
  name: "github-issue-templates",
  tier: 2,
  async execute(ctx, signal) {
    const contacts: ContactInfo[] = [];
    const found: Record<string, boolean> = {};
    const meta = await fetchRepoMeta(ctx.owner, ctx.repo, signal);
    const branch = meta?.defaultBranch ?? "main";

    /* Check SECURITY_CONTACTS */
    const scUrl = `https://raw.githubusercontent.com/${ctx.slug}/${branch}/.github/SECURITY_CONTACTS`;
    const scRes = await safeFetch(scUrl, signal);
    if (scRes) {
      const text = await scRes.text();
      const emails = [...new Set(text.match(EMAIL_RE) || [])].filter(
        (e) => !e.includes("noreply") && !e.includes("example."),
      );
      for (const e of emails) {
        contacts.push({ type: "email", value: e, label: "SECURITY_CONTACTS" });
      }
      /* Also extract GitHub usernames (lines that are just a username) */
      found.securityContacts = true;
    }

    /* Check issue templates for security-related ones */
    const dirRes = await githubFetch(
      `/repos/${ctx.owner}/${ctx.repo}/contents/.github/ISSUE_TEMPLATE`,
      signal,
    );
    if (dirRes) {
      const entries = (await dirRes.json()) as ContentEntry[];
      if (Array.isArray(entries)) {
        const secTemplates = entries.filter(
          (e) => e.type === "file" && /security|vulnerabilit/i.test(e.name),
        );
        for (const tmpl of secTemplates.slice(0, 2)) {
          if (!tmpl.download_url) continue;
          const res = await safeFetch(tmpl.download_url, signal);
          if (!res) continue;
          const text = await res.text();
          const emails = [...new Set(text.match(EMAIL_RE) || [])].filter(
            (e) => !e.includes("noreply") && !e.includes("example."),
          );
          for (const e of emails) {
            contacts.push({
              type: "email",
              value: e,
              label: `Issue template: ${tmpl.name}`,
            });
          }
          found.securityTemplate = true;
        }
        if (secTemplates.length > 0 && !found.securityTemplate) {
          found.securityTemplate = true;
        }
      }
    }

    if (!contacts.length && !Object.keys(found).length) return null;

    return {
      source: "github-issue-templates",
      tier: 2,
      contacts,
      url: found.securityTemplate
        ? `${ctx.fullUrl}/issues/new/choose`
        : undefined,
      metadata: found,
    };
  },
};
