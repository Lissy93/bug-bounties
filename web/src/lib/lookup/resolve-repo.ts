const VALID_NAME = /^[a-zA-Z0-9._-]+$/;

const GITHUB_RE = /github\.com[/:]([^/\s]+)\/([^/\s#?.]+)/;

export function resolveRepo(input: string): {
  owner: string;
  repo: string;
  slug: string;
  fullUrl: string;
} {
  const trimmed = input.trim().replace(/\.git$/, "");
  if (!trimmed) throw new Error("Missing repository identifier");

  let owner = "";
  let repo = "";

  const m = trimmed.match(GITHUB_RE);
  if (m) {
    owner = m[1];
    repo = m[2];
  } else if (/^[^/\s]+\/[^/\s]+$/.test(trimmed)) {
    [owner, repo] = trimmed.split("/");
  } else {
    throw new Error(
      "Invalid GitHub repository. Expected owner/repo or a GitHub URL.",
    );
  }

  if (!owner || !repo) {
    throw new Error("Could not extract owner and repo from input.");
  }

  if (!VALID_NAME.test(owner) || !VALID_NAME.test(repo)) {
    throw new Error("Invalid characters in owner or repo name.");
  }

  const slug = `${owner}/${repo}`;
  return { owner, repo, slug, fullUrl: `https://github.com/${slug}` };
}
