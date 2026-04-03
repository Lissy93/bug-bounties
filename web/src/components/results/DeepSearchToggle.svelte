<script lang="ts">
  import { BrainCircuit } from "lucide-svelte";
  import Tooltip from "../Tooltip.svelte";
  import LookupLoading from "./LookupLoading.svelte";

  export let domain: string = "";
  export let type: "website" | "github" = "website";

  let loading = false;

  function handleClick() {
    loading = true;
    const url = new URL(window.location.href);
    url.searchParams.set("deep", "true");
    window.location.href = url.toString();
  }
</script>

<Tooltip
  text="Run a deep scan, across all possible sources, to find additional contacts"
>
  <button class="deep-toggle" on:click={handleClick} type="button">
    <BrainCircuit size={14} />
    Search deeper
  </button>
</Tooltip>

{#if loading}
  <LookupLoading {domain} {type} />
{/if}

<style>
  .deep-toggle {
    display: inline-flex;
    align-items: center;
    gap: 0.35rem;
    padding: 0.3rem 0.65rem;
    background: var(--background-lighter);
    border: 1px solid var(--border);
    border-radius: var(--curve);
    color: var(--muted);
    font-size: 0.75rem;
    font-family: inherit;
    cursor: pointer;
    transition: var(--transition);
    white-space: nowrap;
    &:hover {
      color: var(--foreground);
      border-color: var(--primary-muted);
    }
  }
</style>
