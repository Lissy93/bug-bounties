import type { ForgeLookupSource, ContactInfo } from "../../types";
import { safeFetch, SKIP_EMAIL_RE, buildResult } from "../../util";

interface Commit {
  author_email?: string;
  author_name?: string;
  committer_email?: string;
  commit?: {
    author?: { email?: string; name?: string };
    committer?: { email?: string };
  };
}

export const forgeCommitEmails: ForgeLookupSource = {
  name: "forge-commit-emails",
  tier: 2,
  async execute(ctx, signal) {
    const apiUrl =
      ctx.host === "gitlab"
        ? `${ctx.apiBase}/projects/${encodeURIComponent(ctx.projectPath)}/repository/commits?per_page=50`
        : `${ctx.apiBase}/repos/${ctx.owner}/${ctx.repo}/commits?limit=50`;

    const res = await safeFetch(apiUrl, signal);
    if (!res) return null;

    const commits = (await res.json()) as Commit[];
    if (!Array.isArray(commits)) return null;

    const freq = new Map<string, { count: number; name?: string }>();

    for (const c of commits) {
      const authorEmail = c.author_email || c.commit?.author?.email;
      const committerEmail = c.committer_email || c.commit?.committer?.email;
      const authorName = c.author_name || c.commit?.author?.name;

      for (const email of [authorEmail, committerEmail]) {
        if (!email || SKIP_EMAIL_RE.test(email)) continue;
        const existing = freq.get(email);
        if (existing) existing.count++;
        else freq.set(email, { count: 1, name: authorName });
      }
    }

    if (freq.size === 0) return null;

    const top = [...freq.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5);

    const contacts: ContactInfo[] = top.map(([email, info]) => ({
      type: "email" as const,
      value: email,
      label: info.name
        ? `${info.name} (${info.count} commits)`
        : `${info.count} commits`,
    }));

    return buildResult(
      "forge-commit-emails",
      2,
      contacts,
      `${ctx.fullUrl}/-/commits`,
    );
  },
};
