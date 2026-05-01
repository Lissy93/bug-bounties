<script lang="ts">
  import { createEventDispatcher } from "svelte";
  import { Plus, X } from "lucide-svelte";
  import { SCOPE_TYPES, type ScopeRow } from "@lib/submit/schema";

  export let value: ScopeRow[] = [];

  const dispatch = createEventDispatcher<{ change: ScopeRow[] }>();

  function notify() {
    dispatch("change", value);
  }
  function addRow() {
    value = [...value, { target: "", type: "web" }];
    notify();
  }
  function removeRow(i: number) {
    value = value.filter((_, idx) => idx !== i);
    notify();
  }
</script>

<div class="scope">
  {#each value as row, i (i)}
    <div class="row">
      <input
        type="text"
        placeholder="*.example.com"
        bind:value={row.target}
        on:input={notify}
        aria-label="Scope target"
      />
      <select bind:value={row.type} on:change={notify} aria-label="Asset type">
        {#each SCOPE_TYPES as t (t)}
          <option value={t}>{t}</option>
        {/each}
      </select>
      <button
        type="button"
        class="remove"
        on:click={() => removeRow(i)}
        aria-label="Remove scope row"
      >
        <X size={16} />
      </button>
    </div>
  {/each}
  <button type="button" class="add" on:click={addRow}>
    <Plus size={14} />
    <span>Add scope target</span>
  </button>
</div>

<style>
  .scope {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }
  .row {
    display: grid;
    grid-template-columns: 1fr 9rem auto;
    gap: 0.4rem;
  }
  input,
  select {
    padding: 0.45rem 0.6rem;
    background: var(--background-darker);
    border: 1px solid var(--border);
    border-radius: var(--curve);
    color: var(--foreground);
    font-size: 0.85rem;
    font-family: inherit;
    transition: var(--transition);
  }
  input:focus,
  select:focus {
    outline: none;
    border-color: var(--primary-muted);
  }
  select {
    appearance: none;
    padding-right: 1.75rem;
    background-image:
      linear-gradient(45deg, transparent 50%, var(--muted) 50%),
      linear-gradient(135deg, var(--muted) 50%, transparent 50%);
    background-position:
      calc(100% - 0.85rem) 0.95rem,
      calc(100% - 0.55rem) 0.95rem;
    background-size:
      0.3rem 0.3rem,
      0.3rem 0.3rem;
    background-repeat: no-repeat;
  }
  option {
    background: var(--background);
    color: var(--foreground);
  }
  .remove {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--muted);
    border-radius: var(--curve);
    cursor: pointer;
    padding: 0 0.5rem;
    transition: var(--transition);
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .remove:hover {
    color: var(--danger);
    border-color: var(--danger);
  }
  .add {
    align-self: flex-start;
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    padding: 0.4rem 0.75rem;
    background: transparent;
    border: 1px dashed var(--border);
    border-radius: var(--curve);
    color: var(--muted);
    font-size: 0.8rem;
    font-family: inherit;
    cursor: pointer;
    transition: var(--transition);
  }
  .add:hover {
    color: var(--primary);
    border-color: var(--primary-muted);
  }
  @media (max-width: 600px) {
    .row {
      grid-template-columns: 1fr 7rem auto;
    }
  }
</style>
