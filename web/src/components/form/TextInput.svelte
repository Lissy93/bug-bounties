<script lang="ts">
  export let id: string;
  export let value: string = "";
  export let type: "text" | "url" | "email" | "number" = "text";
  export let placeholder: string = "";
  export let maxLength: number | undefined = undefined;
  export let required: boolean = false;
</script>

<input
  {id}
  name={id}
  {type}
  {placeholder}
  {required}
  maxlength={maxLength}
  bind:value
  on:input
  on:change
  on:blur
/>

<style>
  input {
    width: 100%;
    padding: 0.55rem 0.75rem;
    background: var(--background-darker);
    border: 1px solid var(--border);
    border-radius: var(--curve);
    color: var(--foreground);
    font-size: 0.9rem;
    font-family: inherit;
    transition: var(--transition);
  }
  input::placeholder {
    color: var(--muted);
  }
  input:focus {
    outline: none;
    border-color: var(--primary-muted);
  }
</style>
