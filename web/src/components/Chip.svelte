<script lang="ts">
  import Tooltip from './Tooltip.svelte';

  export let color: string = 'var(--muted)';
  export let tooltip: string = '';
  export let size: 'sm' | 'md' = 'md';
  export let pill: boolean = false;
  export let interactive: boolean = false;
  export let active: boolean = false;
  export let filled: boolean = false;
</script>

{#if interactive}
  <Tooltip text={tooltip}>
    <button
      class="chip {size}"
      class:pill
      class:active
      style="--chip-color: {color}"
      aria-pressed={active}
      on:click
    ><slot /></button>
  </Tooltip>
{:else}
  <Tooltip text={tooltip}>
    <span
      class="chip {size}"
      class:pill
      class:filled
      style="--chip-color: {color}"
    ><slot /></span>
  </Tooltip>
{/if}

<style>
  .chip {
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
    color: var(--chip-color);
    background: var(--background-darker);
    border-radius: var(--curve);
    border: none;
    white-space: nowrap;
    font-weight: inherit;
    font-family: inherit;
    line-height: 1;
  }
  .sm {
    font-size: 0.7rem;
    padding: 0.1rem 0.4rem;
  }
  .md {
    font-size: 0.8rem;
    padding: 0.2rem 0.5rem;
  }
  .pill {
    border-radius: 999px;
  }
  .filled {
    background: color-mix(in srgb, var(--chip-color) 15%, transparent);
  }

  /* Interactive (button) styles */
  button.chip {
    padding: 0.3rem 0.75rem;
    font-size: 0.85rem;
    border: 1px solid var(--muted);
    color: var(--muted);
    background: transparent;
    cursor: pointer;
    transition: var(--transition);
  }
  button.chip:hover {
    border-color: var(--chip-color);
    color: var(--chip-color);
  }
  button.chip.active {
    border-color: var(--chip-color);
    color: var(--chip-color);
    background: color-mix(in srgb, var(--chip-color) 12%, transparent);
  }
</style>
