<script lang="ts">
  import {
    ExternalLink,
    FileCode2,
    Copy,
    Check,
    AlertCircle,
    Send,
    Loader2,
    PartyPopper,
  } from "lucide-svelte";
  import {
    FIELD_GROUPS,
    emptyValues,
    type FieldDef,
    type ScopeRow,
  } from "@lib/submit/schema";
  import { validate, type Errors } from "@lib/submit/validate";
  import {
    buildIssueUrl,
    buildYaml,
    buildIssueBody,
  } from "@lib/submit/serialize";
  import Section from "./form/Section.svelte";
  import Field from "./form/Field.svelte";
  import TextInput from "./form/TextInput.svelte";
  import TextArea from "./form/TextArea.svelte";
  import Select from "./form/Select.svelte";
  import Checkboxes from "./form/Checkboxes.svelte";
  import ScopeInput from "./form/ScopeInput.svelte";

  interface GitGostSuccess {
    issue_url: string;
    number?: number;
    issue_reply_token?: string;
    user_token?: string;
  }
  interface GitGostError {
    error: string;
  }

  let values = emptyValues();
  let confirmed = false;
  let touched = false;
  let copied: "yaml" | "body" | "url" | null = null;
  let copyTimer: ReturnType<typeof setTimeout> | null = null;

  // gitGost submission state
  let gitGostState: "idle" | "submitting" | "success" | "error" = "idle";
  let gitGostResult: GitGostSuccess | null = null;
  let gitGostError = "";

  $: errors = touched ? validate(values, confirmed) : ({} as Errors);
  $: hasErrors = Object.keys(errors).length > 0;
  $: company = typeof values.company === "string" ? values.company.trim() : "";
  $: yamlOutput = buildYaml(values);
  $: issueUrl = buildIssueUrl(values);

  function attemptValidate() {
    touched = true;
    return Object.keys(validate(values, confirmed)).length === 0;
  }

  function openIssue() {
    if (!attemptValidate()) {
      scrollToFirstError();
      return;
    }
    window.open(issueUrl, "_blank", "noopener,noreferrer");
  }

  async function submitViaGitGost() {
    if (!attemptValidate()) {
      scrollToFirstError();
      return;
    }
    gitGostState = "submitting";
    gitGostError = "";
    gitGostResult = null;

    const title = `[Program]: ${company}`;
    const body = buildIssueBody(values);

    try {
      const res = await fetch("/api/submit-anonymous.json", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, body }),
      });
      const data = (await res.json()) as GitGostSuccess | GitGostError;

      if (!res.ok || "error" in data) {
        gitGostState = "error";
        gitGostError =
          ("error" in data && data.error) ||
          `gitGost returned HTTP ${res.status}`;
        return;
      }

      gitGostResult = data;
      gitGostState = "success";
    } catch {
      gitGostState = "error";
      gitGostError =
        "Network error. Check your connection or try the GitHub option above.";
    }
  }

  function scrollToFirstError() {
    const firstId = Object.keys(errors).find((k) => k !== "_confirm");
    if (!firstId) return;
    const el = document.getElementById(firstId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus({ preventScroll: true });
    }
  }

  async function copy(text: string, kind: typeof copied) {
    try {
      await navigator.clipboard.writeText(text);
      copied = kind;
      if (copyTimer) clearTimeout(copyTimer);
      copyTimer = setTimeout(() => (copied = null), 1800);
    } catch {
      copied = null;
    }
  }

  function fieldValue<T = string>(id: string): T {
    return values[id] as unknown as T;
  }

  function setField(id: string, v: string | string[] | ScopeRow[]) {
    values = { ...values, [id]: v };
  }

  function eventValue(e: Event): string {
    const target = e.target as
      | HTMLInputElement
      | HTMLTextAreaElement
      | HTMLSelectElement
      | null;
    return target?.value ?? "";
  }
</script>

<form class="submit-form" on:submit|preventDefault={openIssue} novalidate>
  <p class="intro">
    Use the form below to add an independent bug bounty or responsible
    disclosure program to the directory. Only the company name and program URL
    are required, but more detail helps researchers know what they're walking
    into.
  </p>

  {#each FIELD_GROUPS as group (group.id)}
    <Section
      title={group.title}
      hint={group.hint ?? ""}
      open={group.defaultOpen ?? false}
      badge={group.fields.some((f) => f.required) ? "required" : ""}
    >
      <div class="grid">
        {#each group.fields as field (field.id)}
          {@const error = errors[field.id] ?? ""}
          {@const fld = field as FieldDef}
          <div
            class={fld.type === "textarea" ||
            fld.type === "list" ||
            fld.type === "scope" ||
            fld.type === "checkboxes"
              ? "full"
              : ""}
          >
            <Field
              id={fld.id}
              label={fld.label}
              description={fld.description ?? ""}
              required={fld.required ?? false}
              {error}
            >
              {#if fld.type === "textarea"}
                <TextArea
                  id={fld.id}
                  value={fieldValue(fld.id)}
                  on:input={(e: Event) => setField(fld.id, eventValue(e))}
                  placeholder={fld.placeholder ?? ""}
                  maxLength={fld.maxLength}
                  rows={4}
                />
              {:else if fld.type === "list"}
                <TextArea
                  id={fld.id}
                  value={fieldValue(fld.id)}
                  on:input={(e: Event) => setField(fld.id, eventValue(e))}
                  placeholder={fld.placeholder ?? ""}
                  rows={3}
                />
              {:else if fld.type === "select"}
                <Select
                  id={fld.id}
                  value={fieldValue(fld.id)}
                  options={fld.options ?? []}
                  on:change={(e: Event) => setField(fld.id, eventValue(e))}
                />
              {:else if fld.type === "boolean"}
                <Select
                  id={fld.id}
                  value={fieldValue(fld.id)}
                  options={["true", "false"]}
                  on:change={(e: Event) => setField(fld.id, eventValue(e))}
                />
              {:else if fld.type === "checkboxes"}
                <Checkboxes
                  id={fld.id}
                  value={fieldValue<string[]>(fld.id) ?? []}
                  options={fld.options ?? []}
                  on:change={(e: CustomEvent<string[]>) =>
                    setField(fld.id, e.detail)}
                />
              {:else if fld.type === "scope"}
                <ScopeInput
                  value={fieldValue<ScopeRow[]>(fld.id) ?? []}
                  on:change={(e: CustomEvent<ScopeRow[]>) =>
                    setField(fld.id, e.detail)}
                />
              {:else if fld.type === "number"}
                <TextInput
                  id={fld.id}
                  type="number"
                  value={fieldValue(fld.id)}
                  placeholder={fld.placeholder ?? ""}
                  on:input={(e: Event) => setField(fld.id, eventValue(e))}
                />
              {:else}
                <TextInput
                  id={fld.id}
                  type={fld.type === "url" ? "url" : "text"}
                  value={fieldValue(fld.id)}
                  placeholder={fld.placeholder ?? ""}
                  required={fld.required}
                  maxLength={fld.maxLength}
                  on:input={(e: Event) => setField(fld.id, eventValue(e))}
                />
              {/if}
            </Field>
          </div>
        {/each}
      </div>
    </Section>
  {/each}

  <label class="confirm">
    <input type="checkbox" bind:checked={confirmed} />
    <span>
      I confirm the information is accurate and only includes publicly
      documented program details.
    </span>
  </label>
  {#if touched && errors._confirm}
    <p class="confirm-error" role="alert">{errors._confirm}</p>
  {/if}

  {#if touched && hasErrors}
    <div class="banner" role="alert">
      <AlertCircle size={16} />
      <span
        >Fix the highlighted fields, then pick a submission method below.</span
      >
    </div>
  {/if}

  <h2>Submit your program</h2>
  <p class="submit-hint">
    Pick the option that works best for you. All three end up in the same place:
    a pull request adding {company || "your program"} to
    <code>independent-programs.yml</code>.
  </p>

  <div class="actions">
    <button type="button" class="primary" on:click={openIssue}>
      <ExternalLink size={16} />
      <span>Open prefilled GitHub issue</span>
    </button>
    <button
      type="button"
      class="secondary"
      on:click={submitViaGitGost}
      disabled={gitGostState === "submitting" || gitGostState === "success"}
    >
      {#if gitGostState === "submitting"}
        <Loader2 size={16} class="spin" />
        <span>Submitting...</span>
      {:else if gitGostState === "success"}
        <Check size={16} />
        <span>Submitted</span>
      {:else}
        <Send size={16} />
        <span>Submit anonymously via gitGost</span>
      {/if}
    </button>
    <button
      type="button"
      class="secondary"
      on:click={() => copy(yamlOutput, "yaml")}
    >
      {#if copied === "yaml"}
        <Check size={16} />
        <span>Copied!</span>
      {:else}
        <FileCode2 size={16} />
        <span>Copy YAML for manual PR</span>
      {/if}
    </button>
  </div>

  {#if gitGostState === "success" && gitGostResult}
    <div class="result success" role="status">
      <PartyPopper size={20} />
      <div class="result-body">
        <strong>Issue created anonymously.</strong>
        <p>
          Your submission landed at
          <a
            href={gitGostResult.issue_url}
            target="_blank"
            rel="noopener noreferrer">issue #{gitGostResult.number ?? "?"}</a
          >. The
          <code>process-submission</code>
          workflow will pick it up shortly and open a pull request for review.
        </p>
        <a
          class="result-link"
          href={gitGostResult.issue_url}
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink size={14} />
          <span>View on GitHub</span>
        </a>
      </div>
    </div>
  {:else if gitGostState === "error"}
    <div class="result error" role="alert">
      <AlertCircle size={20} />
      <div class="result-body">
        <strong>Couldn't submit via gitGost.</strong>
        <p>{gitGostError}</p>
        <p class="result-hint">
          You can still use "Open prefilled GitHub issue" or copy the YAML and
          open a PR manually.
        </p>
      </div>
    </div>
  {/if}

  <details class="preview">
    <summary>Preview YAML output</summary>
    <div class="preview-body">
      <p class="preview-hint">
        Add this entry into
        <a
          href="https://github.com/Lissy93/bug-bounties/blob/main/independent-programs.yml"
          target="_blank"
          rel="noopener noreferrer"
        >
          <code>independent-programs.yml</code>
        </a>
        in alphabetical order by company name, then open a pull request.
      </p>
      <div class="code-wrap">
        <button
          type="button"
          class="copy-btn"
          on:click={() => copy(yamlOutput, "yaml")}
          aria-label="Copy YAML"
        >
          {#if copied === "yaml"}<Check size={14} />{:else}<Copy
              size={14}
            />{/if}
        </button>
        <pre><code>{yamlOutput}</code></pre>
      </div>
    </div>
  </details>

  <details class="preview">
    <summary>Preview issue body</summary>
    <div class="preview-body">
      <p class="preview-hint">
        This is the raw text that gets posted to the GitHub issue. Useful if
        you'd rather paste it manually.
      </p>
      <div class="code-wrap">
        <button
          type="button"
          class="copy-btn"
          on:click={() => copy(buildIssueBody(values), "body")}
          aria-label="Copy issue body"
        >
          {#if copied === "body"}<Check size={14} />{:else}<Copy
              size={14}
            />{/if}
        </button>
        <pre><code>{buildIssueBody(values)}</code></pre>
      </div>
    </div>
  </details>
</form>

<style>
  .submit-form {
    width: var(--content-width);
    max-width: 900px;
    margin: 1.5rem auto 3rem;
    color: var(--foreground);
  }
  .intro {
    margin: 0 0 1.25rem;
    color: var(--muted);
    font-size: 0.95rem;
    line-height: 1.55;
  }
  .grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0 1rem;
  }
  .grid .full {
    grid-column: 1 / -1;
  }
  @media (max-width: 600px) {
    .grid {
      grid-template-columns: 1fr;
    }
  }

  .confirm {
    display: flex;
    align-items: flex-start;
    gap: 0.6rem;
    margin: 1.25rem 0 0.5rem;
    padding: 0.85rem 1rem;
    background: var(--background-lighter);
    border: 1px solid var(--border);
    border-radius: var(--curve);
    cursor: pointer;
    font-size: 0.85rem;
    line-height: 1.5;
  }
  .confirm input {
    accent-color: var(--primary);
    margin-top: 0.2rem;
    flex-shrink: 0;
  }
  .confirm-error {
    margin: 0 0 0.5rem;
    font-size: 0.8rem;
    color: var(--danger);
  }

  .banner {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.75rem 1rem;
    margin: 1rem 0;
    background: color-mix(in srgb, var(--danger) 15%, transparent);
    border: 1px solid var(--danger);
    border-radius: var(--curve);
    color: var(--danger);
    font-size: 0.85rem;
  }

  h2 {
    margin: 1.75rem 0 0.5rem;
    color: var(--primary);
    font-size: 1.4rem;
  }
  .submit-hint {
    margin: 0 0 1rem;
    color: var(--muted);
    font-size: 0.9rem;
    line-height: 1.5;
    code {
      background: var(--background-darker);
      padding: 0.1rem 0.35rem;
      border-radius: var(--curve);
      font-size: 0.85em;
    }
  }
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 0.6rem;
  }
  .actions button {
    display: inline-flex;
    align-items: center;
    gap: 0.4rem;
    padding: 0.6rem 1rem;
    border-radius: var(--curve);
    font-family: inherit;
    font-size: 0.9rem;
    font-weight: 500;
    cursor: pointer;
    transition: var(--transition);
    border: 1px solid var(--border);
  }
  .actions .primary {
    background: var(--primary);
    color: var(--background);
    border-color: var(--primary);
    font-weight: 600;
  }
  .actions .primary:hover {
    filter: brightness(1.1);
  }
  .actions .secondary {
    background: var(--background-lighter);
    color: var(--foreground);
  }
  .actions .secondary:hover:not(:disabled) {
    border-color: var(--primary-muted);
    color: var(--primary);
  }
  .actions button:disabled {
    cursor: not-allowed;
    opacity: 0.7;
  }
  .actions :global(.spin) {
    animation: spin 1s linear infinite;
  }
  @keyframes spin {
    to {
      transform: rotate(360deg);
    }
  }

  .result {
    display: flex;
    align-items: flex-start;
    gap: 0.75rem;
    margin: 1rem 0 0;
    padding: 1rem;
    border-radius: var(--curve);
    border: 1px solid;
    line-height: 1.5;
    font-size: 0.9rem;
  }
  .result.success {
    background: color-mix(in srgb, var(--success) 12%, transparent);
    border-color: var(--success);
    color: var(--foreground);
  }
  .result.success :global(svg) {
    color: var(--success);
    flex-shrink: 0;
    margin-top: 0.15rem;
  }
  .result.error {
    background: color-mix(in srgb, var(--danger) 12%, transparent);
    border-color: var(--danger);
    color: var(--foreground);
  }
  .result.error :global(svg) {
    color: var(--danger);
    flex-shrink: 0;
    margin-top: 0.15rem;
  }
  .result-body {
    flex: 1;
    min-width: 0;
  }
  .result-body p {
    margin: 0.35rem 0 0;
    color: var(--muted);
    font-size: 0.85rem;
    code {
      background: var(--background-darker);
      padding: 0.05rem 0.35rem;
      border-radius: var(--curve);
      font-size: 0.85em;
    }
    a {
      color: var(--primary);
    }
  }
  .result-hint {
    font-size: 0.8rem;
  }
  .result-link {
    display: inline-flex;
    align-items: center;
    gap: 0.3rem;
    margin-top: 0.6rem;
    padding: 0.35rem 0.7rem;
    background: var(--background-lighter);
    color: var(--primary);
    border: 1px solid var(--primary-muted);
    border-radius: var(--curve);
    font-size: 0.8rem;
    text-decoration: none;
    transition: var(--transition);
  }
  .result-link:hover {
    background: var(--primary);
    color: var(--background);
  }

  .preview {
    margin-top: 1.25rem;
    background: var(--background-lighter);
    border: 1px solid var(--border);
    border-radius: var(--curve);
    overflow: hidden;
  }
  .preview summary {
    cursor: pointer;
    padding: 0.75rem 1rem;
    color: var(--primary);
    font-size: 0.9rem;
    list-style: none;
  }
  .preview summary::-webkit-details-marker {
    display: none;
  }
  .preview summary::before {
    content: "▸ ";
    display: inline-block;
    transition: transform 0.2s ease;
  }
  .preview[open] summary::before {
    transform: rotate(90deg);
  }
  .preview-body {
    padding: 0 1rem 1rem;
    border-top: 1px solid var(--border);
  }
  .preview-hint {
    margin: 0.75rem 0;
    color: var(--muted);
    font-size: 0.82rem;
    line-height: 1.5;
    code {
      font-size: 0.85em;
    }
    a {
      color: var(--primary);
    }
  }
  .code-wrap {
    position: relative;
    background: var(--background);
    border-radius: var(--curve);
    border: 1px solid var(--border);
  }
  .code-wrap pre {
    margin: 0;
    padding: 0.75rem 0.85rem;
    overflow-x: auto;
    font-size: 0.78rem;
    line-height: 1.5;
    color: var(--foreground);
  }
  .copy-btn {
    position: absolute;
    top: 0.4rem;
    right: 0.4rem;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    padding: 0.35rem;
    background: var(--background-lighter);
    color: var(--muted);
    border: 1px solid var(--border);
    border-radius: var(--curve);
    cursor: pointer;
    transition: var(--transition);
  }
  .copy-btn:hover {
    color: var(--primary);
    border-color: var(--primary-muted);
  }
</style>
