// Field definitions for the /submit form.
// IDs and labels mirror .github/ISSUE_TEMPLATE/add.yml so the produced
// issue body parses cleanly via lib/process-submission.py.

export type FieldType =
  | "text"
  | "url"
  | "contact"
  | "number"
  | "textarea"
  | "list"
  | "scope"
  | "select"
  | "boolean"
  | "checkboxes";

export interface FieldDef {
  id: string;
  label: string;
  type: FieldType;
  required?: boolean;
  description?: string;
  placeholder?: string;
  options?: string[];
  maxLength?: number;
}

export interface FieldGroup {
  id: string;
  title: string;
  hint?: string;
  defaultOpen?: boolean;
  fields: FieldDef[];
}

export const FIELD_GROUPS: FieldGroup[] = [
  {
    id: "essentials",
    title: "Essentials",
    hint: "The basics. Only company and program URL are required.",
    defaultOpen: true,
    fields: [
      {
        id: "company",
        label: "Company",
        type: "text",
        required: true,
        placeholder: "Acme Corp",
        description: "Display name of the company that runs the program.",
      },
      {
        id: "url",
        label: "Program URL",
        type: "url",
        required: true,
        placeholder: "https://example.com/security",
        description: "Canonical program or security page URL.",
      },
      {
        id: "contact",
        label: "Contact",
        type: "contact",
        placeholder: "security@example.com or https://...",
        description: "Email or URL for reaching the security team.",
      },
      {
        id: "description",
        label: "Description",
        type: "textarea",
        maxLength: 500,
        placeholder: "Short description of the program scope and rules.",
        description: "Up to 500 characters.",
      },
    ],
  },
  {
    id: "program",
    title: "Program details",
    defaultOpen: true,
    fields: [
      {
        id: "rewards",
        label: "Rewards",
        type: "checkboxes",
        options: ["*bounty", "*recognition", "*swag"],
        description: "Tick everything the program offers.",
      },
      {
        id: "program_type",
        label: "Program type",
        type: "select",
        options: ["bounty", "vdp", "hybrid"],
      },
      {
        id: "status",
        label: "Status",
        type: "select",
        options: ["active", "paused"],
      },
      {
        id: "safe_harbor",
        label: "Safe harbor",
        type: "select",
        options: ["full", "partial"],
      },
      {
        id: "allows_disclosure",
        label: "Allows disclosure",
        type: "boolean",
      },
    ],
  },
  {
    id: "scope",
    title: "Scope",
    hint: "Where researchers can and can't test.",
    fields: [
      {
        id: "domains",
        label: "Domains",
        type: "list",
        placeholder: "*.example.com\napi.example.com",
        description: "In-scope domains, one per line.",
      },
      {
        id: "scope",
        label: "Structured scope",
        type: "scope",
        description: "Targets with asset type. Pick a type for each row.",
      },
      {
        id: "out_of_scope",
        label: "Out of scope",
        type: "list",
        placeholder: "Third-party services\nStaging environments",
        description: "Excluded targets or categories, one per line.",
      },
      {
        id: "excluded_methods",
        label: "Excluded methods",
        type: "checkboxes",
        options: [
          "dos",
          "social_engineering",
          "phishing",
          "physical_access",
          "automated_scanning",
        ],
      },
      {
        id: "requires_account",
        label: "Requires account",
        type: "boolean",
        description: "Does testing need an account on the target?",
      },
    ],
  },
  {
    id: "payouts",
    title: "Payouts",
    hint: "Numbers only. Leave any blank if the program doesn't publish them.",
    fields: [
      {
        id: "min_payout",
        label: "Minimum payout",
        type: "number",
        placeholder: "100",
      },
      {
        id: "max_payout",
        label: "Maximum payout",
        type: "number",
        placeholder: "10000",
      },
      {
        id: "currency",
        label: "Currency",
        type: "text",
        placeholder: "USD",
        description: "ISO currency code.",
      },
      {
        id: "payout_critical",
        label: "Payout - critical",
        type: "number",
        placeholder: "10000",
      },
      {
        id: "payout_high",
        label: "Payout - high",
        type: "number",
        placeholder: "5000",
      },
      {
        id: "payout_medium",
        label: "Payout - medium",
        type: "number",
        placeholder: "1000",
      },
      {
        id: "payout_low",
        label: "Payout - low",
        type: "number",
        placeholder: "100",
      },
      {
        id: "swag_details",
        label: "Swag details",
        type: "text",
        maxLength: 200,
        placeholder: "T-shirt and stickers for valid reports",
      },
    ],
  },
  {
    id: "policy",
    title: "Disclosure & policy",
    fields: [
      {
        id: "testing_policy_url",
        label: "Testing policy URL",
        type: "url",
        placeholder: "https://example.com/security/rules",
      },
      {
        id: "response_sla_days",
        label: "Response SLA days",
        type: "number",
        placeholder: "3",
      },
      {
        id: "disclosure_timeline_days",
        label: "Disclosure timeline days",
        type: "number",
        placeholder: "90",
      },
      {
        id: "legal_terms_url",
        label: "Legal terms URL",
        type: "url",
        placeholder: "https://example.com/security/terms",
      },
      {
        id: "hall_of_fame_url",
        label: "Hall of fame URL",
        type: "url",
        placeholder: "https://example.com/security/thanks",
      },
      {
        id: "reporting_url",
        label: "Reporting URL",
        type: "url",
        placeholder: "https://example.com/security/report",
        description: "Submission endpoint, if different from program URL.",
      },
    ],
  },
  {
    id: "extras",
    title: "Other",
    fields: [
      {
        id: "pgp_key",
        label: "PGP key URL",
        type: "url",
        placeholder: "https://example.com/.well-known/pgp-key.txt",
      },
      {
        id: "preferred_languages",
        label: "Preferred languages",
        type: "text",
        placeholder: "English",
      },
      {
        id: "standards",
        label: "Standards",
        type: "list",
        placeholder: "ISO 29147\ndisclose.io",
        description: "One standard per line.",
      },
    ],
  },
];

// Output key order mirrors lib/process-submission.py KEY_ORDER.
export const KEY_ORDER = [
  "company",
  "url",
  "contact",
  "rewards",
  "program_type",
  "status",
  "safe_harbor",
  "allows_disclosure",
  "preferred_languages",
  "pgp_key",
  "description",
  "excluded_methods",
  "scope",
  "out_of_scope",
  "domains",
  "min_payout",
  "max_payout",
  "currency",
  "payout_table",
  "response_sla_days",
  "disclosure_timeline_days",
  "testing_policy_url",
  "legal_terms_url",
  "hall_of_fame_url",
  "reporting_url",
  "swag_details",
  "standards",
  "requires_account",
] as const;

export const PAYOUT_FIELDS = [
  "payout_critical",
  "payout_high",
  "payout_medium",
  "payout_low",
] as const;

export type FormValues = Record<string, string | string[] | ScopeRow[]>;

export interface ScopeRow {
  target: string;
  type: string;
}

export const SCOPE_TYPES = [
  "web",
  "mobile",
  "api",
  "hardware",
  "iot",
  "network",
  "cloud",
  "desktop",
  "other",
];

export function emptyValues(): FormValues {
  const out: FormValues = {};
  for (const group of FIELD_GROUPS) {
    for (const field of group.fields) {
      if (field.type === "checkboxes") out[field.id] = [];
      else if (field.type === "scope") out[field.id] = [] as ScopeRow[];
      else out[field.id] = "";
    }
  }
  return out;
}
