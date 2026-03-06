<script lang="ts">
  import { onDestroy } from 'svelte';
  import { DollarSign, Award, Gift, Shield, Settings, Wallet, TrendingUp, Bug } from 'lucide-svelte';
  import type { ListProgram } from '../types/Company';
  import CompanyCard from './CompanyCard.svelte';
  import Chip from './Chip.svelte';
  import { tips } from '../lib/tooltips';

  export let programs: ListProgram[] = [];
  export let trancoRanks: Record<string, number> = {};
  export let kevCounts: Record<string, number> = {};

  const PAGE_SIZE = 60;

  let searchInput = '';
  let searchTerm = '';
  let debounceTimer: ReturnType<typeof setTimeout>;
  let filterBounty = false;
  let filterRecognition = false;
  let filterSwag = false;
  let filterSafeHarbor = false;
  let filterManaged = false;
  let filterHasPayout = false;
  let filterTop1k = false;
  let filterHasKev = false;
  let sortBy: 'recommended' | 'name' | 'payout-desc' | 'popularity' | 'most-exploited' = 'recommended';
  let visibleCount = PAGE_SIZE;

  function onSearchInput() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => { searchTerm = searchInput; }, 250);
  }

  onDestroy(() => clearTimeout(debounceTimer));

  $: hasActiveFilters =
    searchInput !== '' ||
    filterBounty ||
    filterRecognition ||
    filterSwag ||
    filterSafeHarbor ||
    filterManaged ||
    filterHasPayout ||
    filterTop1k ||
    filterHasKev;

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
    if (filterHasKev && !kevCounts[p.slug]) return false;
    return true;
  });

  $: sorted = (() => {
    if (sortBy === 'name') return filtered;
    if (sortBy === 'recommended') {
      return [...filtered].sort((a, b) => b.completeness - a.completeness);
    }
    if (sortBy === 'popularity') {
      return [...filtered].sort((a, b) => {
        const aRank = trancoRanks[a.slug] ?? Infinity;
        const bRank = trancoRanks[b.slug] ?? Infinity;
        return aRank - bRank;
      });
    }
    if (sortBy === 'most-exploited') {
      return [...filtered].sort((a, b) => {
        const aKev = kevCounts[a.slug] ?? 0;
        const bKev = kevCounts[b.slug] ?? 0;
        return bKev - aKev;
      });
    }
    return [...filtered].sort((a, b) => {
      const aVal = a.max_payout ?? -Infinity;
      const bVal = b.max_payout ?? -Infinity;
      return bVal - aVal;
    });
  })();

  // Reset visible count when filters/sort change
  $: searchTerm, filterBounty, filterRecognition, filterSwag, filterSafeHarbor,
     filterManaged, filterHasPayout, filterTop1k, filterHasKev, sortBy,
     (visibleCount = PAGE_SIZE);

  function observeSentinel(node: HTMLElement) {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          visibleCount = Math.min(visibleCount + PAGE_SIZE, sorted.length);
        }
      },
      { rootMargin: '400px' }
    );
    observer.observe(node);
    return { destroy: () => observer.disconnect() };
  }

  function clearAll() {
    searchInput = '';
    searchTerm = '';
    clearTimeout(debounceTimer);
    filterBounty = false;
    filterRecognition = false;
    filterSwag = false;
    filterSafeHarbor = false;
    filterManaged = false;
    filterHasPayout = false;
    filterTop1k = false;
    filterHasKev = false;
    sortBy = 'recommended';
  }
</script>

<div class="toolbar">
  <div class="search-row">
    <input
      type="text"
      placeholder="Search programs..."
      aria-label="Search programs by name or handle"
      bind:value={searchInput}
      on:input={onSearchInput}
    />
    <select bind:value={sortBy} aria-label="Sort programs">
      <option value="recommended">Recommended</option>
      <option value="name">A - Z</option>
      <option value="payout-desc">Payout: high to low</option>
      <option value="popularity">Popularity</option>
      <option value="most-exploited">Most exploited</option>
    </select>
  </div>
  <div class="chip-row">
    <Chip interactive pill color="var(--success)" active={filterBounty} tooltip={tips.filterBounty} on:click={() => filterBounty = !filterBounty}>
      <DollarSign size={14} />Bounty
    </Chip>
    <Chip interactive pill color="var(--accent)" active={filterRecognition} tooltip={tips.filterRecognition} on:click={() => filterRecognition = !filterRecognition}>
      <Award size={14} />Recognition
    </Chip>
    <Chip interactive pill color="var(--info)" active={filterSwag} tooltip={tips.filterSwag} on:click={() => filterSwag = !filterSwag}>
      <Gift size={14} />Swag
    </Chip>
    <Chip interactive pill color="var(--success)" active={filterSafeHarbor} tooltip={tips.filterSafeHarbor} on:click={() => filterSafeHarbor = !filterSafeHarbor}>
      <Shield size={14} />Safe Harbor
    </Chip>
    <Chip interactive pill color="var(--primary)" active={filterManaged} tooltip={tips.filterManaged} on:click={() => filterManaged = !filterManaged}>
      <Settings size={14} />Managed
    </Chip>
    <Chip interactive pill color="var(--primary)" active={filterHasPayout} tooltip={tips.filterHasPayout} on:click={() => filterHasPayout = !filterHasPayout}>
      <Wallet size={14} />Has Payout
    </Chip>
    <Chip interactive pill color="var(--accent)" active={filterTop1k} tooltip={tips.filterTop1k} on:click={() => filterTop1k = !filterTop1k}>
      <TrendingUp size={14} />Top 1K Sites
    </Chip>
    <Chip interactive pill color="var(--danger)" active={filterHasKev} tooltip={tips.filterKev} on:click={() => filterHasKev = !filterHasKev}>
      <Bug size={14} />Known Exploits
    </Chip>
    {#if hasActiveFilters}
      <span class="count">{sorted.length} of {programs.length}</span>
      <button class="clear" on:click={clearAll}>Clear all</button>
    {/if}
  </div>
</div>

{#if sorted.length > 0}
  <ul class="program-list">
    {#each sorted.slice(0, visibleCount) as program (program.slug)}
      <CompanyCard {program} trancoRank={trancoRanks[program.slug]} kevCount={kevCounts[program.slug]} />
    {/each}
  </ul>
  {#if visibleCount < sorted.length}
    <div class="sentinel" use:observeSentinel></div>
  {/if}
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
  .sentinel {
    height: 1px;
  }
  @media (max-width: 600px) {
    .search-row {
      flex-direction: column;
    }
  }
</style>
