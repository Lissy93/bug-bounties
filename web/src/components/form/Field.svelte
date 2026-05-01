<script lang="ts">
  export let id: string;
  export let label: string;
  export let description: string = "";
  export let required: boolean = false;
  export let error: string = "";
</script>

<div class="field" class:has-error={!!error}>
  <label for={id}>
    <span class="label-text">{label}</span>
    {#if required}<span class="req" aria-label="required">*</span>{/if}
  </label>
  {#if description}<p class="description">{description}</p>{/if}
  <slot />
  {#if error}<p class="error" role="alert">{error}</p>{/if}
</div>

<style>
  .field {
    display: flex;
    flex-direction: column;
    gap: 0.35rem;
    margin-bottom: 1rem;
  }
  label {
    font-size: 0.85rem;
    color: var(--foreground);
    font-weight: 500;
  }
  .req {
    color: var(--accent);
    margin-left: 0.15rem;
  }
  .description {
    margin: 0;
    font-size: 0.78rem;
    color: var(--muted);
    line-height: 1.4;
  }
  .error {
    margin: 0;
    font-size: 0.78rem;
    color: var(--danger);
  }
  .has-error :global(input),
  .has-error :global(textarea),
  .has-error :global(select) {
    border-color: var(--danger);
  }
</style>
