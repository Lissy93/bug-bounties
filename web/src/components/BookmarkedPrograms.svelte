<script lang="ts">
  import { slide } from "svelte/transition";
  import { bookmarks } from "../lib/bookmarks";
  import CompanyCard from "./CompanyCard.svelte";
  import type { ListProgram } from "../types/Company";

  export let programs: ListProgram[] = [];
  export let trancoRanks: Record<string, number> = {};
  export let kevCounts: Record<string, number> = {};

  $: saved = programs.filter((p) => $bookmarks.has(p.slug));
</script>

{#if saved.length > 0}
  <section class="saved-section" transition:slide={{ duration: 250 }}>
    <h2 class="saved-heading">
      Saved Programs <span class="saved-count">{saved.length}</span>
    </h2>
    <ul class="saved-list">
      {#each saved as program (program.slug)}
        <CompanyCard
          {program}
          trancoRank={trancoRanks[program.slug]}
          kevCount={kevCounts[program.slug]}
        />
      {/each}
    </ul>
  </section>
{/if}

<style>
  .saved-section {
    width: var(--content-width, 90%);
    margin: 2rem auto 3.5rem auto;
  }
  .saved-heading {
    font-size: 1.1rem;
    color: var(--primary, #fdc500);
    margin: 0 0 0.75rem;
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .saved-count {
    font-size: 0.8rem;
    background: color-mix(in srgb, var(--primary) 15%, transparent);
    color: var(--primary);
    padding: 0.1rem 0.5rem;
    border-radius: 999px;
  }
  .saved-list {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 1rem;
    list-style: none;
    padding: 0;
    margin: 0;
  }
</style>
