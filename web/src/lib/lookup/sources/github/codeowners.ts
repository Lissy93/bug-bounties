import type { GitHubLookupSource, ContactInfo } from "../../types";
import { EMAIL_RE, URL_RE, safeFetch } from "../../util";
import { fetchRepoMeta } from "../../github-fetch";

export const codeowners: GitHubLookupSource = {
  name: "github-codeowners",
  tier: 2,
  async execute(ctx, signal) {
    const meta = await fetchRepoMeta(ctx.owner, ctx.repo, signal);
    const branch = meta?.defaultBranch ?? "main";
    const base = `https://raw.githubusercontent.com/${ctx.slug}/${branch}`;

    const contacts: ContactInfo[] = [];
    const found: Record<string, boolean> = {};

    /* Check CODEOWNERS */
    for (const path of [
      "CODEOWNERS",
      ".github/CODEOWNERS",
      "docs/CODEOWNERS",
    ]) {
      const res = await safeFetch(`${base}/${path}`, signal);
      if (!res) continue;
      const text = await res.text();
      const emails = [...new Set(text.match(EMAIL_RE) || [])].filter(
        (e) => !e.includes("noreply") && !e.includes("example."),
      );
      for (const e of emails) {
        contacts.push({ type: "email", value: e, label: "CODEOWNERS" });
      }
      found.codeowners = true;
      break;
    }

    /* Check CONTRIBUTING.md */
    for (const path of ["CONTRIBUTING.md", ".github/CONTRIBUTING.md"]) {
      const res = await safeFetch(`${base}/${path}`, signal);
      if (!res) continue;
      const text = await res.text();
      if (text.length > 500_000) continue;

      const emails = [...new Set(text.match(EMAIL_RE) || [])].filter(
        (e) => !e.includes("noreply") && !e.includes("example."),
      );
      const urls = [...new Set(text.match(URL_RE) || [])].filter(
        (u) =>
          /security|vulnerabilit|report|bounty/i.test(u) && u.includes("://"),
      );

      for (const e of emails) {
        contacts.push({ type: "email", value: e, label: "CONTRIBUTING.md" });
      }
      for (const u of urls) {
        contacts.push({ type: "url", value: u, label: "CONTRIBUTING.md link" });
      }
      found.contributing = true;
      break;
    }

    if (!contacts.length) return null;

    return {
      source: "github-codeowners",
      tier: 2,
      contacts,
      metadata: found,
    };
  },
};
