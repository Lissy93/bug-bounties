<script lang="ts">
  import type { BountyProgram } from '../types/Company';
  import CompanyCard from './CompanyCard.svelte';

  export let programs: BountyProgram[] = [];
  export let trancoRanks: Record<string, number> = {};

  let searchTerm = '';
  let filterBounty = false;
  let filterRecognition = false;
  let filterSwag = false;
  let filterSafeHarbor = false;
  let filterManaged = false;
  let filterHasPayout = false;
  let filterTop1k = false;
  let sortBy: 'recommended' | 'name' | 'payout-desc' | 'popularity' = 'recommended';

  const completeness = (p: BountyProgram) =>
    Object.values(p).filter(v => v != null && v !== '' && !(Array.isArray(v) && !v.length)).length;

  $: hasActiveFilters =
    searchTerm !== '' ||
    filterBounty ||
    filterRecognition ||
    filterSwag ||
    filterSafeHarbor ||
    filterManaged ||
    filterHasPayout ||
    filterTop1k;

  $: filtered = programs.filter((p) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchesCompany = p.company.toLowerCase().includes(term);
      const matchesHandle = p.handle?.toLowerCase().includes(term) ?? false;
      if (!matchesCompany && !matchesHandle) return false;
    }
    if (filterBounty && !(p.rewards?.includes('*bounty'))) return false;
    if (filterRecognition && !(p.rewards?.includes('*recognition'))) return false;
    if (filterSwag && !(p.rewards?.includes('*swag'))) return false;
    if (filterSafeHarbor && !(p.safe_harbor === 'full' || p.safe_harbor === 'partial')) return false;
    if (filterManaged && !p.managed) return false;
    if (filterHasPayout && p.max_payout == null) return false;
    if (filterTop1k && (trancoRanks[p.slug] == null || trancoRanks[p.slug] > 1000)) return false;
    return true;
  });

  $: sorted = (() => {
    if (sortBy === 'name') return filtered;
    if (sortBy === 'recommended') {
      const scores = new Map(filtered.map(p => [p, completeness(p)]));
      return [...filtered].sort((a, b) => scores.get(b)! - scores.get(a)!);
    }
    if (sortBy === 'popularity') {
      return [...filtered].sort((a, b) => {
        const aRank = trancoRanks[a.slug] ?? Infinity;
        const bRank = trancoRanks[b.slug] ?? Infinity;
        return aRank - bRank;
      });
    }
    return [...filtered].sort((a, b) => {
      const aVal = a.max_payout ?? -Infinity;
      const bVal = b.max_payout ?? -Infinity;
      return bVal - aVal;
    });
  })();

  function clearAll() {
    searchTerm = '';
    filterBounty = false;
    filterRecognition = false;
    filterSwag = false;
    filterSafeHarbor = false;
    filterManaged = false;
    filterHasPayout = false;
    filterTop1k = false;
    sortBy = 'recommended';
  }
</script>

<div class="toolbar">
  <div class="search-row">
    <input
      type="text"
      placeholder="Search programs..."
      aria-label="Search programs by name or handle"
      bind:value={searchTerm}
    />
    <select bind:value={sortBy} aria-label="Sort programs">
      <option value="recommended">Recommended</option>
      <option value="name">A - Z</option>
      <option value="payout-desc">Payout: high to low</option>
      <option value="popularity">Popularity</option>
    </select>
  </div>
  <div class="chip-row">
    <button
      class="chip" class:active={filterBounty}
      style="--chip-color: var(--success)"
      aria-pressed={filterBounty}
      on:click={() => filterBounty = !filterBounty}
    >Bounty</button>
    <button
      class="chip" class:active={filterRecognition}
      style="--chip-color: var(--accent)"
      aria-pressed={filterRecognition}
      on:click={() => filterRecognition = !filterRecognition}
    >Recognition</button>
    <button
      class="chip" class:active={filterSwag}
      style="--chip-color: var(--info)"
      aria-pressed={filterSwag}
      on:click={() => filterSwag = !filterSwag}
    >Swag</button>
    <button
      class="chip" class:active={filterSafeHarbor}
      style="--chip-color: var(--success)"
      aria-pressed={filterSafeHarbor}
      on:click={() => filterSafeHarbor = !filterSafeHarbor}
    >Safe Harbor</button>
    <button
      class="chip" class:active={filterManaged}
      style="--chip-color: var(--primary)"
      aria-pressed={filterManaged}
      on:click={() => filterManaged = !filterManaged}
    >Managed</button>
    <button
      class="chip" class:active={filterHasPayout}
      style="--chip-color: var(--primary)"
      aria-pressed={filterHasPayout}
      on:click={() => filterHasPayout = !filterHasPayout}
    >Has Payout</button>
    <button
      class="chip" class:active={filterTop1k}
      style="--chip-color: var(--accent)"
      aria-pressed={filterTop1k}
      on:click={() => filterTop1k = !filterTop1k}
    >Top 1K Sites</button>
    {#if hasActiveFilters}
      <span class="count">{sorted.length} of {programs.length}</span>
      <button class="clear" on:click={clearAll}>Clear all</button>
    {/if}
  </div>
</div>

{#if sorted.length > 0}
  <ul class="program-list">
    {#each sorted as program (program.slug)}
      <CompanyCard {program} trancoRank={trancoRanks[program.slug]} />
    {/each}
  </ul>
{:else}
  <div class="nothing">
    <p>No programs match your filters</p>
    <button class="clear" on:click={clearAll}>Clear all filters</button>
  </div>
{/if}

<style>
  .toolbar {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin: 1rem auto;
    width: var(--content-width, 90%);
  }
  .search-row {
    display: flex;
    gap: 0.5rem;
  }
  .search-row input {
    flex: 1;
    padding: 0.5rem 0.75rem;
    font-size: 1rem;
    border: 1px solid var(--primary-muted, #FDC50087);
    border-radius: var(--curve, 4px);
    color: var(--foreground);
    background: var(--background-lighter);
  }
  .search-row input:focus {
    outline: 1px solid var(--primary);
  }
  .search-row select {
    padding: 0.5rem 0.75rem;
    font-size: 0.9rem;
    border: 1px solid var(--primary-muted, #FDC50087);
    border-radius: var(--curve, 4px);
    color: var(--foreground);
    background: var(--background-lighter);
    cursor: pointer;
  }
  .chip-row {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    align-items: center;
  }
  .chip {
    padding: 0.3rem 0.75rem;
    font-size: 0.85rem;
    border: 1px solid var(--muted, #ffffff60);
    border-radius: 999px;
    color: var(--muted, #ffffff60);
    background: transparent;
    cursor: pointer;
    transition: var(--transition, 0.2s ease-in-out);
  }
  .chip:hover {
    border-color: var(--chip-color);
    color: var(--chip-color);
  }
  .chip.active {
    border-color: var(--chip-color);
    color: var(--chip-color);
    background: color-mix(in srgb, var(--chip-color) 12%, transparent);
  }
  .count {
    margin-left: auto;
    font-size: 0.85rem;
    color: var(--muted, #ffffff60);
  }
  .clear {
    padding: 0.25rem 0.6rem;
    font-size: 0.8rem;
    background: var(--primary);
    color: var(--background);
    border: none;
    border-radius: var(--curve, 4px);
    cursor: pointer;
  }
  .program-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1rem;
    list-style: none;
    padding: 0;
    margin: 0 auto;
    width: var(--content-width, 90%);
  }
  .nothing {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1rem;
    max-width: var(--content-width, 90%);
    margin: 0 auto;
    color: var(--primary);
    font-size: 1.2rem;
    padding: 2rem 0;
    text-align: center;
    border-radius: var(--curve, 4px);
    box-shadow: var(--shadow, 2px 2px 1px #00000082);
    background: var(--background-lighter);
  }
  @media (max-width: 600px) {
    .search-row {
      flex-direction: column;
    }
  }
</style>
