<script lang="ts">
  export let text: string = '';
</script>

{#if text}
  <span class="has-tooltip" data-tooltip={text}><slot /></span>
{:else}
  <slot />
{/if}

<style>
  .has-tooltip {
    position: relative;
    cursor: help;
  }
  .has-tooltip:has(button) {
    cursor: pointer;
  }
  .has-tooltip::after {
    content: attr(data-tooltip);
    position: absolute;
    bottom: calc(100% + 6px);
    left: 50%;
    transform: translateX(-50%);
    background: var(--background, #0c121a);
    color: var(--foreground, #fff);
    font-size: 0.75rem;
    font-family: 'Roboto', sans-serif;
    font-weight: normal;
    line-height: 1.4;
    padding: 0.35rem 0.6rem;
    border-radius: var(--curve, 4px);
    border: 1px solid var(--border, #ffffff15);
    white-space: normal;
    width: max-content;
    max-width: 220px;
    text-align: center;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.15s ease-in-out;
    z-index: 100;
  }
  .has-tooltip:hover::after,
  .has-tooltip:focus-visible::after {
    opacity: 1;
    transition-delay: 0.4s;
  }
</style>
