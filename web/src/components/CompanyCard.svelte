<script lang="ts">
  import { Shield, Wallet, Bug, TrendingUp } from "lucide-svelte";
  import FaviconImage from "./FaviconImage.svelte";
  import RewardBadges from "./RewardBadges.svelte";
  import BookmarkButton from "./BookmarkButton.svelte";
  import Chip from "./Chip.svelte";
  import { tips } from "../lib/tooltips";
  import { formatPayout } from "../lib/format";
  import { formatRankBadge } from "../lib/tranco-format";
  import type { ListProgram } from "../types/Company";

  export let program: ListProgram;
  export let trancoRank: number | undefined = undefined;
  export let kevCount: number | undefined = undefined;

  $: payout = formatPayout(
    program.min_payout,
    program.max_payout,
    program.currency,
  );
  $: rankLabel = trancoRank != null ? formatRankBadge(trancoRank) : "";
</script>

<li class="card">
  <BookmarkButton slug={program.slug} companyName={program.company} />
  <a href={`/${program.slug}`} class="card-link">
    <FaviconImage
      url={program.url}
      alt={program.company}
      size="3rem"
      slug={program.slug}
      domains={program.domains}
    />
    <div class="content">
      <p class="name">
        <span class="company-text">{program.company}</span>
      </p>
      <div class="meta">
        <RewardBadges rewards={program.rewards || []} />
        {#if program.safe_harbor}
          <Chip
            color="var(--success)"
            tooltip={program.safe_harbor === "full"
              ? tips.safeHarborFull
              : tips.safeHarborPartial}
            size="sm"
            filled
          >
            <Shield size={12} />{program.safe_harbor === "full"
              ? "Full"
              : "Partial"} Safe Harbor
          </Chip>
        {/if}
        {#if payout}
          <Chip color="var(--primary)" tooltip={tips.payout} size="sm" filled>
            <Wallet size={12} />{payout}
          </Chip>
        {/if}
        {#if kevCount}
          <Chip
            color="var(--danger)"
            tooltip={tips.kevSection}
            size="sm"
            filled
          >
            <Bug size={12} />{kevCount}
            {kevCount === 1 ? "CVE" : "CVEs"}
          </Chip>
        {/if}
        {#if rankLabel}
          <Chip color="var(--cyan)" tooltip={tips.trancoRank} size="sm" filled>
            <TrendingUp size={10} /><span class="rank-text">{rankLabel}</span>
          </Chip>
        {/if}
      </div>
    </div>
  </a>
</li>

<style>
  .card {
    position: relative;
    border: 2px solid transparent;
    color: var(--foreground);
    border-radius: var(--curve);
    transition: var(--transition);
    box-shadow: var(--shadow);
    background: var(--background-lighter);
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
  .card:hover :global(.bookmark-btn:not(.bookmarked)) {
    opacity: 1;
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
  .name :global(.has-tooltip) {
    display: flex;
  }
  .rank-text {
    font-weight: 600;
    font-size: 0.6rem;
  }
  .meta {
    display: flex;
    gap: 0.35rem;
    align-items: center;
    flex-wrap: wrap;
    margin-top: 0.25rem;
  }
</style>
