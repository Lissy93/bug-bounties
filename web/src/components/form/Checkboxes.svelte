<script lang="ts">
  import { createEventDispatcher } from "svelte";

  export let id: string;
  export let value: string[] = [];
  export let options: string[] = [];

  const dispatch = createEventDispatcher<{ change: string[] }>();

  function toggle(opt: string, checked: boolean) {
    const next = checked
      ? value.includes(opt)
        ? value
        : [...value, opt]
      : value.filter((v) => v !== opt);
    value = next;
    dispatch("change", next);
  }
</script>

<div class="checkboxes" role="group" aria-labelledby={`${id}-label`}>
  {#each options as opt (opt)}
    <label class="check">
      <input
        type="checkbox"
        checked={value.includes(opt)}
        on:change={(e) => toggle(opt, e.currentTarget.checked)}
      />
      <span>{opt}</span>
    </label>
  {/each}
</div>

<style>
  .checkboxes {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
  }
  .check {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.4rem 0.75rem;
    background: var(--background-darker);
    border: 1px solid var(--border);
    border-radius: var(--curve);
    font-size: 0.85rem;
    cursor: pointer;
    transition: var(--transition);
    user-select: none;
  }
  .check:hover {
    border-color: var(--primary-muted);
  }
  .check:has(input:checked) {
    border-color: var(--primary);
    color: var(--primary);
    background: color-mix(in srgb, var(--primary) 10%, transparent);
  }
  input {
    accent-color: var(--primary);
    margin: 0;
  }
</style>
