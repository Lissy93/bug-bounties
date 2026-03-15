<script lang="ts">
  import { Bookmark } from "lucide-svelte";
  import { bookmarks } from "../lib/bookmarks";
  import CompanyCard from "./CompanyCard.svelte";
  import type { ListProgram } from "../types/Company";

  export let programs: ListProgram[] = [];
  export let trancoRanks: Record<string, number> = {};
  export let kevCounts: Record<string, number> = {};

  $: saved = programs.filter((p) => $bookmarks.has(p.slug));
</script>

{#if saved.length > 0}
  <p class="count">
    {saved.length} saved {saved.length === 1 ? "program" : "programs"}
  </p>
  <ul class="program-list">
    {#each saved as program (program.slug)}
      <CompanyCard
        {program}
        trancoRank={trancoRanks[program.slug]}
        kevCount={kevCounts[program.slug]}
      />
    {/each}
  </ul>
{:else}
  <div class="empty">
    <Bookmark size={48} />
    <p>No saved programs yet</p>
    <p class="hint">
      Click the bookmark icon on any program card to save it here for quick
      access.
    </p>
    <a href="/" class="back-link">Browse programs</a>
  </div>
{/if}

<style>
  .count {
    width: var(--content-width, 90%);
    margin: 0 auto 0.75rem;
    color: var(--muted, #ffffff60);
    font-size: 0.9rem;
  }
  .program-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
    list-style: none;
    padding: 0;
    margin: 0 auto;
    width: var(--content-width, 90%);
  }
  .empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    width: var(--content-width, 90%);
    max-width: 400px;
    margin: 2rem auto;
    padding: 2rem;
    color: var(--muted, #ffffff60);
    text-align: center;
    background: var(--background-lighter);
    border-radius: var(--curve, 4px);
    box-shadow: var(--shadow);
  }
  .empty p {
    margin: 0;
  }
  .empty p:first-of-type {
    font-size: 1.2rem;
    color: var(--primary);
  }
  .hint {
    font-size: 0.9rem;
    line-height: 1.5;
  }
  .back-link {
    margin-top: 0.5rem;
    color: var(--primary);
    text-decoration: none;
    border: 1px solid var(--primary);
    padding: 0.4rem 1rem;
    border-radius: var(--curve, 4px);
    transition: var(--transition);
  }
  .back-link:hover {
    background: var(--primary);
    color: var(--background);
  }
</style>
