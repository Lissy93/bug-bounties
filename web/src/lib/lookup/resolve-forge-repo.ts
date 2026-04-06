import type { ForgeHost, ResolvedForgeRepo } from "./types";

const GITLAB_RE = /gitlab\.com\/(.+?)(?:\.git)?(?:[#?].*)?$/;
const CODEBERG_RE = /codeberg\.org\/([^/\s]+)\/([^/\s#?.]+)/;
const VALID_NAME = /^[a-zA-Z0-9._-]+$/;

const FORGE_CONFIG: Record<ForgeHost, { base: string; apiBase: string }> = {
  gitlab: {
    base: "https://gitlab.com",
    apiBase: "https://gitlab.com/api/v4",
  },
  codeberg: {
    base: "https://codeberg.org",
    apiBase: "https://codeberg.org/api/v1",
  },
};

export function resolveForgeFromUrl(input: string): ResolvedForgeRepo | null {
  const trimmed = input.trim();

  const gl = trimmed.match(GITLAB_RE);
  if (gl) {
    const path = gl[1].replace(/\/$/, "");
    const segments = path.split("/").filter(Boolean);
    if (segments.length < 2) return null;
    for (const s of segments) {
      if (!VALID_NAME.test(s)) return null;
    }
    const owner = segments.slice(0, -1).join("/");
    const repo = segments[segments.length - 1];
    return buildResolved("gitlab", owner, repo, path);
  }

  const cb = trimmed.match(CODEBERG_RE);
  if (cb) {
    const owner = cb[1];
    const repo = cb[2].replace(/\.git$/, "");
    if (!VALID_NAME.test(owner) || !VALID_NAME.test(repo)) return null;
    return buildResolved("codeberg", owner, repo, `${owner}/${repo}`);
  }

  return null;
}

export function resolveForgeRepo(
  input: string,
  host: ForgeHost,
): ResolvedForgeRepo {
  const trimmed = input.trim();
  if (!trimmed) throw new Error("Missing repository identifier");

  /* Try as URL first */
  const fromUrl = resolveForgeFromUrl(trimmed);
  if (fromUrl && fromUrl.host === host) return fromUrl;

  /* Try as owner/repo shorthand */
  const segments = trimmed.split("/").filter(Boolean);
  if (segments.length < 2) {
    throw new Error(
      `Invalid ${host} repository. Expected owner/repo or a ${host} URL.`,
    );
  }
  for (const s of segments) {
    if (!VALID_NAME.test(s)) {
      throw new Error("Invalid characters in owner or repo name.");
    }
  }
  const owner = segments.slice(0, -1).join("/");
  const repo = segments[segments.length - 1];
  return buildResolved(host, owner, repo, segments.join("/"));
}

function buildResolved(
  host: ForgeHost,
  owner: string,
  repo: string,
  projectPath: string,
): ResolvedForgeRepo {
  const cfg = FORGE_CONFIG[host];
  return {
    host,
    owner,
    repo,
    projectPath,
    slug: `${host}/${projectPath}`,
    fullUrl: `${cfg.base}/${projectPath}`,
    apiBase: cfg.apiBase,
  };
}
