import type { GitHubLookupSource, ContactInfo } from "../../types";
import { EMAIL_RE, safeFetch } from "../../util";
import { fetchRepoMeta } from "../../github-fetch";

const SEC_URL_RE =
  /https?:\/\/[^\s)>\]"']+(?:security|vulnerabilit|report|bounty|hackerone|bugcrowd)[^\s)>\]"']*/gi;

function cleanMarkdown(s: string): string {
  return s.replace(/\]\(.*$/, "").replace(/[)>\]"']+$/, "");
}

const PATHS = ["SECURITY.md", ".github/SECURITY.md", "docs/SECURITY.md"];

export const securityMd: GitHubLookupSource = {
  name: "github-security-md",
  tier: 1,
  async execute(ctx, signal) {
    const meta = await fetchRepoMeta(ctx.owner, ctx.repo, signal);
    const branch = meta?.defaultBranch ?? "main";

    for (const path of PATHS) {
      const rawUrl = `https://raw.githubusercontent.com/${ctx.slug}/${branch}/${path}`;
      const res = await safeFetch(rawUrl, signal);
      if (!res) continue;
      const text = await res.text();
      if (text.length > 500_000) continue;

      const fileUrl = `${ctx.fullUrl}/blob/${branch}/${path}`;

      const contacts: ContactInfo[] = [
        ...[...new Set(text.match(EMAIL_RE) || [])]
          .filter((e) => !e.includes("example.") && !e.includes("noreply"))
          .map((e) => ({
            type: "email" as const,
            value: e,
            label: "SECURITY.md",
          })),
        ...[...new Set(text.match(SEC_URL_RE) || [])]
          .map((u) => cleanMarkdown(u))
          .filter((u) => u.includes("://"))
          .map((u) => ({
            type: "url" as const,
            value: u,
            label: "SECURITY.md link",
          })),
      ];

      /* Always include the file URL as a contact - the SECURITY.md itself
         is a security policy document worth linking to. */
      contacts.push({
        type: "url",
        value: fileUrl,
        label: "Security policy",
      });

      return {
        source: "github-security-md",
        tier: 1,
        contacts,
        url: fileUrl,
        metadata: { file: path },
      };
    }
    return null;
  },
};
