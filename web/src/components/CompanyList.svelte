<script lang="ts">
	import { onMount } from 'svelte';
  import type { Companies } from '../types/Company';
  import Company from './Company.svelte';
  export let companies: Companies = [];
  
  let searchTerm = '';
  let filteredCompanies = companies;

  $: if (searchTerm) {
    filteredCompanies = companies.filter((company) =>
      company.company.toLowerCase().includes(searchTerm.toLowerCase())
    );
  } else {
    filteredCompanies = companies;
  }

  function clearSearch() {
    searchTerm = '';
  }

</script>

<div class="filters">
  <input
    type="text"
    placeholder="Filter companies..."
    bind:value={searchTerm}
  />
  {#if searchTerm}
    <button on:click={clearSearch}>Clear</button>
    <p>Showing {filteredCompanies.length} of {companies.length} results matching '{searchTerm}'</p>
  {/if}
</div>

{#if filteredCompanies.length > 0}
  <ul class="company-list">
    {#each filteredCompanies as company}
      <Company {company} />
    {/each}
  </ul>
{:else}
	<div class="nothing">
		<p>No companies to display</p>
	</div>
{/if}

<style lang="scss">
  .company-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1rem;
    list-style: none;
    padding: 0;
    margin: 0 auto;
    width: 90%;
  }

	.nothing {
		max-width: 90%;
		margin: 0 auto;
		color: var(--primary);
		font-size: 1.2rem;
		padding: 2rem 0;
		text-align: center;
		border-radius: 4px;
		box-shadow: 2px 2px 1px var(--background-darker);
		background: var(--background-lighter);
	}

  .filters {
    display: flex;
    align-items: center;
    margin: 1rem auto;
		width: 90%;
		flex-direction: row-reverse;
		gap: 1rem;

    input {
      padding: 0.5rem;
      font-size: 1rem;
      border: 1px solid var(--primary-lighter);
      border-radius: 4px;
			color: var(--foreground);
			background: var(--background-lighter);
			&:focus {
				outline: 1px solid var(--primary);
			}
    }

    button {
      padding: 0.25rem 0.5rem;
      font-size: 0.8rem;
      background-color: var(--primary);
      border-radius: 4px;
      cursor: pointer;
			border: none;
    }

    p {
      margin-top: 0.5rem;
      font-size: 0.9rem;
      color: var(--foreground);
			opacity: 0.6;
    }
  }
</style>
