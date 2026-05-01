import type {
  LookupSource,
  ResolvedDomain,
  ContactInfo,
} from "@lib/lookup/types";
import { EMAIL_RE, safeFetch } from "@lib/lookup/util";

const SEC_URL_RE =
  /https?:\/\/[^\s)>\]"']+(?:security|vulnerabilit|report|bounty|hackerone|bugcrowd)[^\s)>\]"']*/gi;

function cleanMarkdown(s: string): string {
  return s.replace(/\]\(.*$/, "").replace(/[)>\]"']+$/, "");
}

export const githubSecurity: LookupSource = {
  name: "github-security",
  tier: 1,
  async execute(ctx: ResolvedDomain, signal: AbortSignal) {
    const guesses = new Set([ctx.companyHint, ctx.baseDomain.split(".")[0]]);
    for (const org of guesses) {
      if (!org || org.length < 2) continue;
      for (const branch of ["main", "master"]) {
        const url = `https://raw.githubusercontent.com/${org}/.github/${branch}/SECURITY.md`;
        const res = await safeFetch(url, signal);
        if (!res) continue;
        const text = await res.text();
        if (text.length > 500_000) continue;

        const contacts: ContactInfo[] = [
          ...[...new Set(text.match(EMAIL_RE) || [])]
            .filter((e) => !e.includes("example.") && !e.includes("noreply"))
            .map((e) => ({
              type: "email" as const,
              value: e,
              label: "GitHub SECURITY.md",
            })),
          ...[...new Set(text.match(SEC_URL_RE) || [])]
            .map((u) => cleanMarkdown(u))
            .filter((u) => u.includes("://"))
            .map((u) => ({
              type: "url" as const,
              value: u,
              label: "GitHub SECURITY.md link",
            })),
        ];
        if (contacts.length)
          return {
            source: "github-security",
            tier: 1,
            contacts,
            url,
            metadata: { org },
          };
      }
    }
    return null;
  },
};
