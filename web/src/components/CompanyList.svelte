<script lang="ts">
	import type { Companies } from '../types/Company';
	import Company from './Company.svelte';
  export let companies: Companies = [];
</script>

{#if companies.length > 0}
  <ul class="company-list">
    {#each companies as company}
			<Company {company} />
    {/each}
  </ul>
{:else}
  <p>No companies to display.</p>
{/if}

<style lang="scss">
	.company-list {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 1rem;
		list-style: none;
		padding: 0;
		margin: 0 auto;
		width: 90vw;
	}
</style>
