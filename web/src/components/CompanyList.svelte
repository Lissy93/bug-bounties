<script lang="ts">
  export let companies = [];
</script>

{#if companies.length > 0}
  <ul>
    {#each companies as company}
      <li>
        <strong>{company.company}</strong>
        <a href="{company.url}">Website</a>
        <p>Contact: {company.contact}</p>
        <p>Rewards: {company.rewards.join(', ')}</p>
      </li>
    {/each}
  </ul>
{:else}
  <p>No companies to display.</p>
{/if}
