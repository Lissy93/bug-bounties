<script lang="ts">
  import { Search } from "lucide-svelte";
  import LookupLoading from "./results/LookupLoading.svelte";

  export let compact: boolean = false;
  export let bare: boolean = false;

  let input = "";
  let error = "";
  let loading = false;
  let loadingDomain = "";
  let loadingType: "website" | "github" | "package" | "forge" | "app" =
    "website";

  const GITHUB_RE = /github\.com[/:]([^/\s]+)\/([^/\s#?.]+)/;
  const GITLAB_RE = /gitlab\.com\/(.+?)(?:\.git)?(?:[#?].*)?$/;
  const CODEBERG_RE = /codeberg\.org\/([^/\s]+)\/([^/\s#?.]+)/;
  const NPM_RE = /npmjs\.com\/package\/(@?[^/\s#?]+(?:\/[^/\s#?]+)?)/;
  const PYPI_RE = /pypi\.org\/project\/([^/\s#?]+)/;
  const CRATES_RE = /crates\.io\/crates\/([^/\s#?]+)/;
  const PLAY_RE =
    /play\.google\.com\/store\/apps\/details\?.*id=([a-zA-Z0-9._]+)/;
  const APPSTORE_RE = /apps\.apple\.com\/.+\/app\/.+\/id(\d+)/;
  const REVERSE_DOMAIN_RE = /^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*){2,}$/i;

  function nav(path: string, domain: string, type: typeof loadingType) {
    error = "";
    loading = true;
    loadingType = type;
    loadingDomain = domain;
    window.location.href = path;
  }

  function handleSubmit() {
    const trimmed = input.trim();
    if (!trimmed) {
      error = "Please enter a domain, URL, repo, package name, or app ID.";
      return;
    }

    /* 1. GitHub repo */
    const gh = trimmed.match(GITHUB_RE);
    if (gh) {
      const owner = gh[1];
      const repo = gh[2].replace(/\.git$/, "");
      return nav(
        `/lookup/github/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
        `${owner}/${repo}`,
        "github",
      );
    }

    /* 2. GitLab repo */
    const gl = trimmed.match(GITLAB_RE);
    if (gl) {
      const path = gl[1].replace(/\/$/, "");
      return nav(`/lookup/gitlab/${encodeURIComponent(path)}`, path, "forge");
    }

    /* 3. Codeberg repo */
    const cb = trimmed.match(CODEBERG_RE);
    if (cb) {
      const owner = cb[1];
      const repo = cb[2].replace(/\.git$/, "");
      return nav(
        `/lookup/codeberg/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`,
        `${owner}/${repo}`,
        "forge",
      );
    }

    /* 4. npm package URL */
    const npm = trimmed.match(NPM_RE);
    if (npm) {
      return nav(
        `/lookup/package/npm/${encodeURIComponent(npm[1])}`,
        npm[1],
        "package",
      );
    }

    /* 5. PyPI package URL */
    const pypi = trimmed.match(PYPI_RE);
    if (pypi) {
      return nav(
        `/lookup/package/pypi/${encodeURIComponent(pypi[1])}`,
        pypi[1],
        "package",
      );
    }

    /* 6. crates.io URL */
    const crate = trimmed.match(CRATES_RE);
    if (crate) {
      return nav(
        `/lookup/package/crates/${encodeURIComponent(crate[1])}`,
        crate[1],
        "package",
      );
    }

    /* 7. Play Store URL */
    const play = trimmed.match(PLAY_RE);
    if (play) {
      return nav(
        `/lookup/app/play/${encodeURIComponent(play[1])}`,
        play[1],
        "app",
      );
    }

    /* 8. App Store URL */
    const apple = trimmed.match(APPSTORE_RE);
    if (apple) {
      return nav(
        `/lookup/app/appstore/${encodeURIComponent(apple[1])}`,
        apple[1],
        "app",
      );
    }

    /* 9. Reverse-domain app ID (e.g. com.whatsapp) */
    if (REVERSE_DOMAIN_RE.test(trimmed) && !trimmed.includes("/")) {
      return nav(
        `/lookup/app/play/${encodeURIComponent(trimmed)}`,
        trimmed,
        "app",
      );
    }

    /* 10. Domain (fallback) */
    let domain = trimmed;
    try {
      if (domain.includes("://")) {
        domain = new URL(domain).hostname;
      } else if (domain.includes("/")) {
        domain = domain.split("/")[0];
      }
    } catch {
      error = "Invalid URL format.";
      return;
    }

    domain = domain.replace(/^www\./, "").toLowerCase();

    if (!domain.includes(".") || /\s/.test(domain)) {
      error = "Please enter a valid domain (e.g. example.com).";
      return;
    }

    nav(`/lookup/${encodeURIComponent(domain)}`, domain, "website");
  }
</script>

<div class="lookup-search" class:compact class:bare>
  {#if !compact && !bare}
    <h2>Look Up Security Contacts</h2>
    <p class="subtitle">
      Enter a domain or URL to discover security contacts, disclosure policies,
      and bug bounty programs.
    </p>
  {/if}
  <form on:submit|preventDefault={handleSubmit} class="search-form">
    <div class="input-wrap">
      <Search size={16} />
      <input
        type="text"
        bind:value={input}
        placeholder="Enter a domain, repo URL, package name, or app ID"
        aria-label="Domain, repo URL, package name, or app ID to look up"
      />
    </div>
    <button type="submit">Lookup</button>
  </form>
  {#if error}
    <p class="error" role="alert">{error}</p>
  {/if}
</div>

<LookupLoading visible={loading} domain={loadingDomain} type={loadingType} />

<style>
  .lookup-search {
    margin: 1.5rem auto;
    max-width: 640px;
  }
  .lookup-search:not(.compact):not(.bare) {
    text-align: center;
    padding: 2rem 1.5rem;
    background: var(--background-lighter);
    border-radius: var(--curve);
  }
  .compact {
    max-width: 100%;
    padding: 1rem 0;
  }
  .bare {
    max-width: 100%;
    margin: 0;
  }
  h2 {
    margin: 0 0 0.5rem;
    font-size: 1.3rem;
    color: var(--primary);
  }
  .subtitle {
    margin: 0 0 1.25rem;
    font-size: 0.9rem;
    color: var(--muted);
  }
  .search-form {
    display: flex;
    gap: 0.5rem;
  }
  .input-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 0.75rem;
    background: var(--background-lighter);
    border: 1px solid var(--border);
    border-radius: var(--curve);
    color: var(--muted);
    transition: var(--transition);
  }
  .compact .input-wrap {
    background: var(--background-darker);
  }
  .input-wrap:focus-within {
    border-color: var(--primary-muted);
  }
  input {
    flex: 1;
    background: none;
    border: none;
    outline: none;
    color: var(--foreground);
    font-size: 0.9rem;
    font-family: inherit;
  }
  input::placeholder {
    color: var(--muted);
  }
  button {
    padding: 0.5rem 1.25rem;
    background: var(--primary);
    color: var(--background);
    border: none;
    border-radius: var(--curve);
    font-size: 0.9rem;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: var(--transition);
    white-space: nowrap;
  }
  button:hover {
    opacity: 0.9;
  }
  .error {
    margin: 0.5rem 0 0;
    font-size: 0.85rem;
    color: var(--danger);
  }
  @media (max-width: 600px) {
    .search-form {
      flex-direction: column;
    }
  }
</style>
