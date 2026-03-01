<script lang="ts">
  import { resolveLogoDomain } from '../lib/domain';

  export let url: string;
  export let alt: string = '';
  export let size: string = '3rem';
  export let slug: string = '';
  export let domains: string[] | undefined = undefined;

  const LOGO_DEV_KEY = 'pk_CUjqJFL5SrKJlq9E70blQA';

  let hostname = '';
  try {
    hostname = new URL(url).hostname;
  } catch {
    hostname = '';
  }

  const resolvedDomain = resolveLogoDomain({ url, domains } as any);

  // Build the ordered fallback chain
  type Tier = { src: string };
  const tiers: Tier[] = [];

  // Tier 1: Google S2 at 128px (resolved domain) - free, high-res
  if (resolvedDomain) {
    tiers.push({ src: `https://www.google.com/s2/favicons?domain=${resolvedDomain}&sz=128` });
  }

  // Tier 2: favicon.im (resolved domain) - free fallback
  if (resolvedDomain) {
    tiers.push({ src: `https://favicon.im/${resolvedDomain}` });
  }

  // Tier 3: Logo.dev by domain (resolved domain) - uses API quota
  if (resolvedDomain) {
    tiers.push({ src: `https://img.logo.dev/${resolvedDomain}?token=${LOGO_DEV_KEY}&size=128` });
  }

  // Tier 4: Logo.dev by name (slug, for platform URLs without domains) - uses API quota
  if (!resolvedDomain && slug) {
    tiers.push({ src: `https://img.logo.dev/${slug}.com?token=${LOGO_DEV_KEY}&size=128` });
  }

  let tierIndex = 0;
  let src = tiers.length > 0 ? tiers[0].src : '';

  function advance() {
    tierIndex++;
    if (tierIndex < tiers.length) {
      src = tiers[tierIndex].src;
    } else {
      src = '';
    }
  }

  function handleError() {
    advance();
  }

  function handleLoad(e: Event) {
    const img = e.target as HTMLImageElement;
    // Google S2 returns a tiny default globe (16x16) for unknown domains.
    // Treat that as a failure and try the next tier.
    if (img.naturalWidth <= 16 && img.naturalHeight <= 16 && tierIndex === 0) {
      advance();
    }
  }

  $: initial = alt ? alt.charAt(0).toUpperCase() : '?';
</script>

{#if src}
  <img
    {alt}
    src={src}
    width={size}
    height={size}
    loading="lazy"
    class="favicon"
    style="width: {size}; height: {size};"
    on:error={handleError}
    on:load={handleLoad}
  />
{:else}
  <span class="placeholder" style="width: {size}; height: {size}; font-size: calc({size} / 2);">
    {initial}
  </span>
{/if}

<style>
  .favicon {
    border-radius: var(--curve, 4px);
    object-fit: contain;
  }
  .placeholder {
    border-radius: var(--curve, 4px);
    background: var(--primary-muted, #FDC50087);
    color: var(--background, #0c121a);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-weight: bold;
    flex-shrink: 0;
  }
</style>
