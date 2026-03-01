<script lang="ts">
  import Icon from './Icon.svelte';
  import Tooltip from './Tooltip.svelte';
  import { tips } from '../lib/tooltips';
  import type { Reward } from '../types/Company';

  export let rewards: Reward[] = [];
</script>

{#if rewards && rewards.length > 0}
  <span class="rewards">
    {#each rewards as reward}
      {#if reward === '*bounty'}
        <Tooltip text={tips.bounty}><span class="badge bounty"><Icon name="bounty" color="var(--success)" width="18" />Bounty</span></Tooltip>
      {/if}
      {#if reward === '*swag'}
        <Tooltip text={tips.swag}><span class="badge swag"><Icon name="swag" color="var(--info)" width="18" />Swag</span></Tooltip>
      {/if}
      {#if reward === '*recognition'}
        <Tooltip text={tips.recognition}><span class="badge recognition"><Icon name="recognition" color="var(--accent)" width="18" />Recognition</span></Tooltip>
      {/if}
    {/each}
  </span>
{/if}

<style>
  .rewards {
    display: flex;
    gap: 0.4rem;
    flex-wrap: wrap;
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.75rem;
    padding: 0.1rem 0.4rem;
    border-radius: var(--curve, 4px);
    background: var(--background-darker, #00000082);
  }
  .bounty { color: var(--success, #45f445); }
  .swag { color: var(--info, #53c5fd); }
  .recognition { color: var(--accent, #f4419e); }
</style>
