import yaml from "js-yaml";
import {
  FIELD_GROUPS,
  KEY_ORDER,
  PAYOUT_FIELDS,
  type FieldDef,
  type FormValues,
  type ScopeRow,
} from "./schema";

const REPO_URL = "https://github.com/Lissy93/bug-bounties";
const ISSUE_NEW_URL = `${REPO_URL}/issues/new`;

const ALL_FIELDS: FieldDef[] = FIELD_GROUPS.flatMap((g) => g.fields);

function normalizeContact(value: string): string {
  const v = value.trim();
  if (!v) return v;
  if (/^https?:\/\//i.test(v) || /^mailto:/i.test(v)) return v;
  if (v.includes("@")) return `mailto:${v}`;
  return `https://${v}`;
}

function normalizeUrl(value: string): string {
  const v = value.trim();
  if (!v) return v;
  if (/^https?:\/\//i.test(v) || /^mailto:/i.test(v)) return v;
  return `https://${v}`;
}

function splitLines(value: string): string[] {
  return value
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
}

function toInt(value: string): number | null {
  const v = value.trim();
  if (!v) return null;
  const n = Number(v.replace(/[,$\s]/g, ""));
  return Number.isFinite(n) ? n : null;
}

const URL_FIELDS = new Set([
  "url",
  "pgp_key",
  "testing_policy_url",
  "legal_terms_url",
  "hall_of_fame_url",
  "reporting_url",
]);

const NUMERIC_FIELDS = new Set([
  "min_payout",
  "max_payout",
  "disclosure_timeline_days",
  "response_sla_days",
]);

const STRING_FIELDS = [
  "company",
  "url",
  "contact",
  "preferred_languages",
  "description",
  "pgp_key",
  "testing_policy_url",
  "legal_terms_url",
  "hall_of_fame_url",
  "reporting_url",
  "swag_details",
  "currency",
];

const TEXTAREA_LISTS = new Set(["domains", "out_of_scope", "standards"]);

// Convert form values to a typed entry, ordered like the Python output.
export function buildEntry(values: FormValues): Record<string, unknown> {
  const entry: Record<string, unknown> = {};

  for (const id of STRING_FIELDS) {
    const v = values[id];
    if (typeof v === "string" && v.trim()) {
      const trimmed = v.trim();
      if (id === "contact") entry[id] = normalizeContact(trimmed);
      else if (URL_FIELDS.has(id)) entry[id] = normalizeUrl(trimmed);
      else if (id === "currency") entry[id] = trimmed.toUpperCase();
      else entry[id] = trimmed;
    }
  }

  for (const id of ["rewards", "excluded_methods"]) {
    const v = values[id];
    if (Array.isArray(v) && v.length > 0) entry[id] = [...v];
  }

  for (const id of ["program_type", "status", "safe_harbor"]) {
    const v = values[id];
    if (typeof v === "string" && v.trim()) entry[id] = v.trim();
  }

  for (const id of ["allows_disclosure", "requires_account"]) {
    const v = values[id];
    if (typeof v === "string" && (v === "true" || v === "false")) {
      entry[id] = v === "true";
    }
  }

  for (const id of NUMERIC_FIELDS) {
    const v = values[id];
    if (typeof v === "string") {
      const n = toInt(v);
      if (n !== null) entry[id] = n;
    }
  }

  for (const id of TEXTAREA_LISTS) {
    const v = values[id];
    if (typeof v === "string") {
      const lines = splitLines(v);
      if (lines.length > 0) entry[id] = lines;
    }
  }

  const scope = values.scope;
  if (Array.isArray(scope)) {
    const rows = (scope as ScopeRow[])
      .map((r) => ({ target: r.target.trim(), type: r.type.trim() }))
      .filter((r) => r.target && r.type);
    if (rows.length > 0) entry.scope = rows;
  }

  const payoutTable: Record<string, number> = {};
  for (const id of PAYOUT_FIELDS) {
    const v = values[id];
    if (typeof v === "string") {
      const n = toInt(v);
      if (n !== null) payoutTable[id.replace("payout_", "")] = n;
    }
  }
  if (Object.keys(payoutTable).length > 0) entry.payout_table = payoutTable;

  const ordered: Record<string, unknown> = {};
  for (const key of KEY_ORDER) {
    if (key in entry) ordered[key] = entry[key];
  }
  for (const key of Object.keys(entry)) {
    if (!(key in ordered)) ordered[key] = entry[key];
  }
  return ordered;
}

// Render a single entry as YAML, matching the style in independent-programs.yml.
export function buildYaml(values: FormValues): string {
  const entry = buildEntry(values);
  const dumped = yaml.dump([entry], {
    sortKeys: false,
    lineWidth: -1,
    noRefs: true,
    indent: 2,
    noArrayIndent: true,
    quotingType: "'",
  });
  return dumped.trimEnd() + "\n";
}

// Defang `### ` at the start of any line in user content so it can't be
// misread as a section heading by the python parser. The matching unescape
// happens in lib/process-submission.py (ESCAPED_HEADING_PREFIX).
function escapeHeadings(value: string): string {
  return value.replace(/^### /gm, "\\### ");
}

// Serialize the form so it parses cleanly via lib/process-submission.py.
// Mirrors the GitHub issue-form body format: ### <Label>\n\n<value>\n\n
export function buildIssueBody(values: FormValues): string {
  const parts: string[] = [];

  const append = (label: string, value: string) => {
    const safe = value ? escapeHeadings(value) : "_No response_";
    parts.push(`### ${label}\n\n${safe}`);
  };

  for (const field of ALL_FIELDS) {
    const v = values[field.id];

    if (field.type === "checkboxes") {
      const opts = field.options ?? [];
      const list = Array.isArray(v)
        ? (v as unknown[]).filter((x): x is string => typeof x === "string")
        : [];
      const checked = new Set(list);
      const lines = opts.map(
        (opt) => `- [${checked.has(opt) ? "X" : " "}] ${opt}`,
      );
      append(field.label, lines.join("\n"));
      continue;
    }

    if (field.type === "scope") {
      const rows = Array.isArray(v) ? (v as ScopeRow[]) : [];
      const lines = rows
        .filter((r) => r.target.trim() && r.type.trim())
        .map((r) => `${r.target.trim()} | ${r.type.trim()}`);
      append(field.label, lines.join("\n"));
      continue;
    }

    if (field.type === "boolean") {
      append(field.label, typeof v === "string" ? v : "");
      continue;
    }

    append(field.label, typeof v === "string" ? v.trim() : "");
  }

  parts.push(
    "### Confirmation\n\n- [X] I confirm the information is accurate and I have included only publicly documented program details.",
  );

  return parts.join("\n\n") + "\n";
}

// Build a "new issue" URL with the full formatted body prefilled.
//
// We deliberately skip the `template=add.yml` path: GitHub Issue Forms only
// reliably prefill text inputs via URL params (dropdowns/checkboxes are not
// officially supported), so the form would arrive partially populated. By
// posting against a plain issue with `body=...` instead, every field arrives
// already filled in. The `process-submission.py` workflow runs off the body's
// `### <Label>` headings, not the template, so parsing still works as long as
// the `program-submission` label is applied via `&labels=`.
export function buildIssueUrl(values: FormValues): string {
  const params = new URLSearchParams();
  params.set("labels", "program-submission");

  const company =
    typeof values.company === "string" ? values.company.trim() : "";
  params.set("title", company ? `[Program]: ${company}` : "[Program]: ");

  params.set("body", buildIssueBody(values));

  return `${ISSUE_NEW_URL}?${params.toString()}`;
}

export const COMPANY_INSERT_NOTE =
  "Insert this entry into independent-programs.yml in alphabetical order by company name, then open a pull request.";
