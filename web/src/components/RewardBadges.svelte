<script lang="ts">
  import { DollarSign, Gift, Award } from "lucide-svelte";
  import Chip from "./Chip.svelte";
  import { tips } from "@lib/tooltips";
  import type { Reward } from "@app-types/Company";

  export let rewards: Reward[] = [];
</script>

{#if rewards && rewards.length > 0}
  <span class="rewards">
    {#each rewards as reward (reward)}
      {#if reward === "*bounty"}
        <Chip color="var(--success)" tooltip={tips.bounty} size="sm" filled>
          <DollarSign size={12} />Bounty
        </Chip>
      {/if}
      {#if reward === "*swag"}
        <Chip color="var(--info)" tooltip={tips.swag} size="sm" filled>
          <Gift size={12} />Swag
        </Chip>
      {/if}
      {#if reward === "*recognition"}
        <Chip color="var(--accent)" tooltip={tips.recognition} size="sm" filled>
          <Award size={12} />Recognition
        </Chip>
      {/if}
    {/each}
  </span>
{/if}

<style>
  .rewards {
    display: flex;
    gap: 0.35rem;
    flex-wrap: wrap;
  }
</style>
