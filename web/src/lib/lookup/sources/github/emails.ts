import type { GitHubLookupSource, ContactInfo } from "../../types";
import { githubFetch } from "../../github-fetch";

interface Commit {
  commit: {
    author: { email: string | null };
    committer: { email: string | null };
  };
}

const SKIP = [
  "noreply@github.com",
  "noreply",
  "example.com",
  "users.noreply.github.com",
];

function isUsable(email: string): boolean {
  const lower = email.toLowerCase();
  return SKIP.every((s) => !lower.includes(s)) && lower.includes("@");
}

export const commitEmails: GitHubLookupSource = {
  name: "github-commit-emails",
  tier: 2,
  async execute(ctx, signal) {
    const res = await githubFetch(
      `/repos/${ctx.owner}/${ctx.repo}/commits?per_page=100`,
      signal,
    );
    if (!res) return null;

    const commits = (await res.json()) as Commit[];
    if (!Array.isArray(commits)) return null;

    const freq = new Map<string, number>();
    for (const c of commits) {
      for (const email of [c.commit.author?.email, c.commit.committer?.email]) {
        if (email && isUsable(email)) {
          freq.set(email, (freq.get(email) || 0) + 1);
        }
      }
    }

    if (freq.size === 0) return null;

    const sorted = [...freq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

    const contacts: ContactInfo[] = sorted.map(([email, count]) => ({
      type: "email",
      value: email,
      label: `${count} commit${count !== 1 ? "s" : ""}`,
    }));

    return {
      source: "github-commit-emails",
      tier: 2,
      contacts,
      url: `${ctx.fullUrl}/commits`,
    };
  },
};
