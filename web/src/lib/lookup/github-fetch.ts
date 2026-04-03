import { log } from "../log";
import { UA } from "./util";

const API = "https://api.github.com";

function getToken(): string | undefined {
  /* Astro server-side: import.meta.env, Node fallback: process.env */
  try {
    return (
      (import.meta as unknown as { env: Record<string, string> }).env
        .GITHUB_TOKEN || process.env.GITHUB_TOKEN
    );
  } catch {
    return process.env.GITHUB_TOKEN;
  }
}

export function hasGitHubToken(): boolean {
  return !!getToken();
}

export async function githubFetch(
  path: string,
  signal: AbortSignal,
): Promise<Response | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const res = await fetch(`${API}${path}`, {
      signal,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "User-Agent": UA,
      },
    });
    if (res.ok) return res;
    if (res.status === 429) {
      log.warn("github", `Rate limited for ${path}`);
    } else if (res.status === 401 || res.status === 403) {
      log.warn("github", `Auth issue (${res.status}) for ${path}`);
    }
    return null;
  } catch {
    return null;
  }
}

const SKIP_HOMEPAGE_HOSTS = new Set([
  "github.com",
  "github.io",
  "githubusercontent.com",
  "docs.rs",
  "readthedocs.io",
  "readthedocs.org",
  "crates.io",
  "npmjs.com",
  "pypi.org",
  "rubygems.org",
  "pkg.go.dev",
]);

function isUsableHomepage(url: string): boolean {
  try {
    const host = new URL(url).hostname.toLowerCase();
    return !SKIP_HOMEPAGE_HOSTS.has(host) && !host.endsWith(".github.io");
  } catch {
    return false;
  }
}

export async function getRepoHomepage(
  owner: string,
  repo: string,
  signal: AbortSignal,
): Promise<string | null> {
  const meta = await fetchRepoMeta(owner, repo, signal);
  const hp = meta?.homepage;
  if (!hp || !isUsableHomepage(hp)) return null;
  return hp;
}

interface RepoMeta {
  defaultBranch: string;
  homepage: string | null;
  description: string | null;
}

const metaCache = new Map<string, RepoMeta | null>();

export async function fetchRepoMeta(
  owner: string,
  repo: string,
  signal: AbortSignal,
): Promise<RepoMeta | null> {
  const key = `${owner}/${repo}`;
  if (metaCache.has(key)) return metaCache.get(key)!;

  const res = await githubFetch(`/repos/${owner}/${repo}`, signal);
  if (!res) {
    metaCache.set(key, null);
    return null;
  }
  const data = (await res.json()) as Record<string, unknown>;
  const meta: RepoMeta = {
    defaultBranch: String(data.default_branch || "main"),
    homepage: data.homepage ? String(data.homepage) : null,
    description: data.description ? String(data.description) : null,
  };
  metaCache.set(key, meta);
  return meta;
}
