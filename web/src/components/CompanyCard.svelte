<script lang="ts">
  import FaviconImage from './FaviconImage.svelte';
  import RewardBadges from './RewardBadges.svelte';
  import Tooltip from './Tooltip.svelte';
  import { tips } from '../lib/tooltips';
  import { formatPayout } from '../lib/format';
  import { formatRankLabel } from '../lib/tranco-format';
  import type { ListProgram } from '../types/Company';

  export let program: ListProgram;
  export let trancoRank: number | undefined = undefined;
  export let kevCount: number | undefined = undefined;

  $: payout = formatPayout(program.min_payout, program.max_payout, program.currency);
  $: rankLabel = trancoRank != null ? formatRankLabel(trancoRank) : '';
</script>

<li class="card">
  <a href={`/${program.slug}`} class="card-link">
    <FaviconImage url={program.url} alt={program.company} size="3rem"
      slug={program.slug} domains={program.domains} />
    <div class="content">
      <p class="name">
        <span class="company-text">{program.company}</span>
        {#if rankLabel}
          <Tooltip text={tips.trancoRank}>
            <span class="rank-indicator">{rankLabel}</span>
          </Tooltip>
        {/if}
      </p>
      <div class="meta">
        <RewardBadges rewards={program.rewards || []} />
        {#if program.safe_harbor}
          <Tooltip text={program.safe_harbor === 'full' ? tips.safeHarborFull : tips.safeHarborPartial}>
            <span class="safe-harbor">
              {program.safe_harbor === 'full' ? 'Full' : 'Partial'} Safe Harbor
            </span>
          </Tooltip>
        {/if}
        {#if payout}
          <Tooltip text={tips.payout}><span class="payout">{payout}</span></Tooltip>
        {/if}
        {#if kevCount}
          <Tooltip text={tips.kevSection}>
            <span class="kev-indicator">{kevCount} {kevCount === 1 ? 'CVE' : 'CVEs'}</span>
          </Tooltip>
        {/if}
      </div>
    </div>
  </a>
</li>

<style>
  .card {
    border: 2px solid transparent;
    color: var(--foreground);
    border-radius: var(--curve, 4px);
    transition: var(--transition, 0.2s ease-in-out);
    box-shadow: var(--shadow, 2px 2px 1px #00000082);
    background: var(--background-lighter, #ffffff08);
    content-visibility: auto;
    contain-intrinsic-size: 0 80px;
  }
  .card:hover {
    border-color: var(--primary);
    box-shadow: 3px 3px 2px var(--background-darker);
    transform: scale(1.02);
    content-visibility: visible;
    contain: none;
    overflow: visible;
  }
  .card-link {
    display: flex;
    gap: 1rem;
    align-items: center;
    padding: 0.5rem 1rem;
    text-decoration: none;
    color: inherit;
  }
  .content {
    flex: 1;
    min-width: 0;
  }
  .name {
    margin: 0;
    color: var(--primary);
    font-size: 1.1rem;
    white-space: nowrap;
    display: flex;
    align-items: center;
    gap: 0.5rem;
    justify-content: space-between;
  }
  .company-text {
    overflow: hidden;
    text-overflow: ellipsis;
    min-width: 0;
  }
  .name :global(.has-tooltip) { display: flex; }
  .rank-indicator {
    font-size: 0.6rem;
    padding: 0.05rem 0.3rem;
    border-radius: var(--curve, 4px);
    /*background: var(--accent);
    color: var(--background);*/
    opacity: 0.8;
    color: var(--accent);
    background: var(--border);
    font-weight: 600;
    white-space: nowrap;
    flex-shrink: 0;
  }
  .meta {
    display: flex;
    gap: 0.5rem;
    align-items: center;
    flex-wrap: wrap;
    margin-top: 0.25rem;
  }
  .safe-harbor {
    font-size: 0.7rem;
    padding: 0.1rem 0.4rem;
    border-radius: var(--curve, 4px);
    background: var(--background-darker);
    color: var(--success);
  }
  .payout {
    font-size: 0.7rem;
    padding: 0.1rem 0.4rem;
    border-radius: var(--curve, 4px);
    background: var(--background-darker);
    color: var(--muted);
  }
  .kev-indicator {
    font-size: 0.7rem;
    padding: 0.1rem 0.4rem;
    border-radius: var(--curve, 4px);
    background: color-mix(in srgb, var(--danger, #ef4444) 15%, transparent);
    color: var(--danger, #ef4444);
    font-weight: 600;
  }
</style>
