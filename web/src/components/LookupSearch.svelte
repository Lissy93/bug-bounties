<script lang="ts">
  import { Search } from "lucide-svelte";
  import LookupLoading from "./results/LookupLoading.svelte";

  export let compact: boolean = false;
  export let bare: boolean = false;

  let input = "";
  let error = "";
  let loading = false;
  let loadingDomain = "";
  let loadingType: "website" | "github" = "website";

  const GITHUB_RE = /github\.com[/:]([^/\s]+)\/([^/\s#?.]+)/;

  function parseGitHub(raw: string): { owner: string; repo: string } | null {
    const m = raw.match(GITHUB_RE);
    if (!m) return null;
    return { owner: m[1], repo: m[2].replace(/\.git$/, "") };
  }

  function handleSubmit() {
    const trimmed = input.trim();
    if (!trimmed) {
      error = "Please enter a domain, URL, or GitHub repo.";
      return;
    }

    /* Check for GitHub repo URL first */
    const gh = parseGitHub(trimmed);
    if (gh) {
      error = "";
      loading = true;
      loadingType = "github";
      loadingDomain = `${gh.owner}/${gh.repo}`;
      window.location.href = `/lookup/github/${encodeURIComponent(gh.owner)}/${encodeURIComponent(gh.repo)}`;
      return;
    }

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

    error = "";
    loading = true;
    loadingType = "website";
    loadingDomain = domain;
    window.location.href = `/lookup/${encodeURIComponent(domain)}`;
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
        placeholder="Enter any domain or GitHub URL"
        aria-label="Domain, URL, or GitHub repo to look up"
      />
    </div>
    <button type="submit">Lookup</button>
  </form>
  {#if error}
    <p class="error" role="alert">{error}</p>
  {/if}
</div>

{#if loading}
  <LookupLoading domain={loadingDomain} type={loadingType} />
{/if}

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
