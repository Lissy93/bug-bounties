<script lang="ts">
  export let id: string;
  export let value: string = "";
  export let placeholder: string = "";
  export let maxLength: number | undefined = undefined;
  export let rows: number = 4;
</script>

<textarea
  {id}
  name={id}
  {placeholder}
  {rows}
  maxlength={maxLength}
  bind:value
  on:input
  on:change
  on:blur
></textarea>

<style>
  textarea {
    width: 100%;
    padding: 0.55rem 0.75rem;
    background: var(--background-darker);
    border: 1px solid var(--border);
    border-radius: var(--curve);
    color: var(--foreground);
    font-size: 0.9rem;
    font-family: inherit;
    line-height: 1.5;
    resize: vertical;
    transition: var(--transition);
  }
  textarea::placeholder {
    color: var(--muted);
    white-space: pre-line;
  }
  textarea:focus {
    outline: none;
    border-color: var(--primary-muted);
  }
</style>
