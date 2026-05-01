import type { GitHubLookupSource, ContactInfo } from "@lib/lookup/types";
import { githubFetch } from "@lib/lookup/github-fetch";

interface GitHubUser {
  login: string;
  name: string | null;
  email: string | null;
  blog: string | null;
  bio: string | null;
  company: string | null;
  location: string | null;
  avatar_url: string;
  twitter_username: string | null;
  type: string;
  html_url: string;
  public_repos: number;
  followers: number;
  created_at: string;
}

interface SocialAccount {
  provider: string;
  url: string;
}

export const author: GitHubLookupSource = {
  name: "github-author",
  tier: 1,
  async execute(ctx, signal) {
    const [userRes, socialsRes] = await Promise.all([
      githubFetch(`/users/${ctx.owner}`, signal),
      githubFetch(`/users/${ctx.owner}/social_accounts`, signal),
    ]);
    if (!userRes) return null;

    const u = (await userRes.json()) as GitHubUser;
    const contacts: ContactInfo[] = [];

    if (u.email && !u.email.includes("noreply")) {
      contacts.push({
        type: "email",
        value: u.email,
        label: `${u.type === "Organization" ? "Org" : "Owner"} email`,
      });
    }

    if (u.blog) {
      const blog = u.blog.startsWith("http") ? u.blog : `https://${u.blog}`;
      try {
        const scheme = new URL(blog).protocol;
        if (scheme === "http:" || scheme === "https:") {
          contacts.push({ type: "url", value: blog, label: "Owner website" });
        }
      } catch {
        /* invalid URL - skip */
      }
    }

    const socials: Record<string, string> = {};
    if (u.twitter_username) socials.twitter = u.twitter_username;

    if (socialsRes) {
      const accounts = (await socialsRes.json()) as SocialAccount[];
      if (Array.isArray(accounts)) {
        for (const a of accounts) {
          if (a.provider && a.url) socials[a.provider] = a.url;
        }
      }
    }

    const metadata: Record<string, unknown> = {
      login: u.login,
      type: u.type,
      profileUrl: u.html_url,
      avatarUrl: u.avatar_url,
    };
    if (u.name) metadata.name = u.name;
    if (u.bio) metadata.bio = u.bio;
    if (u.company) metadata.company = u.company;
    if (u.location) metadata.location = u.location;
    if (u.public_repos) metadata.repos = u.public_repos;
    if (u.followers) metadata.followers = u.followers;
    if (u.created_at) metadata.joined = u.created_at;
    if (Object.keys(socials).length > 0) metadata.socials = socials;

    const hasExtraInfo =
      contacts.length > 0 ||
      metadata.name ||
      metadata.bio ||
      metadata.company ||
      Object.keys(socials).length > 0;
    if (!hasExtraInfo) return null;

    return {
      source: "github-author",
      tier: 1,
      contacts,
      url: u.html_url,
      metadata,
    };
  },
};
