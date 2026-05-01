<script lang="ts">
  import { ChevronDown } from "lucide-svelte";

  export let title: string;
  export let hint: string = "";
  export let open: boolean = false;
  export let badge: string = "";
</script>

<details class="section" {open}>
  <summary>
    <ChevronDown size={16} class="chevron" />
    <span class="title">{title}</span>
    {#if badge}<span class="badge">{badge}</span>{/if}
    {#if hint}<span class="hint">{hint}</span>{/if}
  </summary>
  <div class="body">
    <slot />
  </div>
</details>

<style>
  .section {
    background: var(--background-lighter);
    border: 1px solid var(--border);
    border-radius: var(--curve);
    margin-bottom: 0.75rem;
    overflow: hidden;
  }
  summary {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.85rem 1rem;
    cursor: pointer;
    list-style: none;
    transition: var(--transition);
    font-family: "Wallpoet", sans-serif;
  }
  summary::-webkit-details-marker {
    display: none;
  }
  summary:hover {
    background: var(--background-darker);
  }
  summary :global(.chevron) {
    transition: transform 0.2s ease;
    color: var(--primary);
    flex-shrink: 0;
  }
  .section[open] summary :global(.chevron) {
    transform: rotate(180deg);
  }
  .title {
    color: var(--primary);
    font-size: 1rem;
  }
  .hint {
    color: var(--muted);
    font-size: 0.8rem;
    font-family: "Roboto", sans-serif;
    margin-left: auto;
    text-align: right;
  }
  .badge {
    background: var(--accent);
    color: var(--background);
    font-size: 0.65rem;
    font-family: "Roboto", sans-serif;
    padding: 0.1rem 0.4rem;
    border-radius: 999px;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .body {
    padding: 1rem 1rem 0.25rem;
    border-top: 1px solid var(--border);
  }
  @media (max-width: 600px) {
    .hint {
      display: none;
    }
  }
</style>
