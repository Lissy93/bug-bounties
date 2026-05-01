<script lang="ts">
  export let id: string;
  export let value: string = "";
  export let options: string[] = [];
  export let placeholder: string = "Choose...";
</script>

<select {id} name={id} bind:value on:change on:blur>
  <option value="">{placeholder}</option>
  {#each options as opt (opt)}
    <option value={opt}>{opt}</option>
  {/each}
</select>

<style>
  select {
    width: 100%;
    padding: 0.55rem 0.75rem;
    background: var(--background-darker);
    border: 1px solid var(--border);
    border-radius: var(--curve);
    color: var(--foreground);
    font-size: 0.9rem;
    font-family: inherit;
    transition: var(--transition);
    appearance: none;
    background-image:
      linear-gradient(45deg, transparent 50%, var(--muted) 50%),
      linear-gradient(135deg, var(--muted) 50%, transparent 50%);
    background-position:
      calc(100% - 1rem) 1rem,
      calc(100% - 0.65rem) 1rem;
    background-size:
      0.35rem 0.35rem,
      0.35rem 0.35rem;
    background-repeat: no-repeat;
    padding-right: 2rem;
  }
  select:focus {
    outline: none;
    border-color: var(--primary-muted);
  }
  option {
    background: var(--background);
    color: var(--foreground);
  }
</style>
