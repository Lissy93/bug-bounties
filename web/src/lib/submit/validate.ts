import {
  FIELD_GROUPS,
  PAYOUT_FIELDS,
  type FormValues,
  type ScopeRow,
} from "./schema";

const URL_RE = /^https?:\/\/.+/i;
const MAILTO_RE = /^mailto:.+@.+/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type Errors = Record<string, string>;

function isBlank(v: string | string[] | ScopeRow[] | undefined): boolean {
  if (v === undefined) return true;
  if (typeof v === "string") return v.trim() === "";
  return v.length === 0;
}

export function validate(values: FormValues, confirmed: boolean): Errors {
  const errors: Errors = {};

  for (const group of FIELD_GROUPS) {
    for (const field of group.fields) {
      const raw = values[field.id];
      const blank = isBlank(raw);

      if (field.required && blank) {
        errors[field.id] = `${field.label} is required.`;
        continue;
      }
      if (blank) continue;

      if (typeof raw === "string") {
        const value = raw.trim();
        if (field.maxLength && value.length > field.maxLength) {
          errors[field.id] = `Max ${field.maxLength} characters.`;
        } else if (field.type === "url" && !URL_RE.test(value)) {
          errors[field.id] = "Must start with http:// or https://";
        } else if (
          field.type === "contact" &&
          !URL_RE.test(value) &&
          !MAILTO_RE.test(value) &&
          !EMAIL_RE.test(value)
        ) {
          errors[field.id] = "Use an email address or a https://... URL.";
        } else if (field.type === "number" && !/^\d+$/.test(value)) {
          errors[field.id] = "Numbers only.";
        }
      }

      if (field.type === "scope" && Array.isArray(raw)) {
        const rows = raw as ScopeRow[];
        if (
          rows.some(
            (r) =>
              (r.target.trim() && !r.type.trim()) ||
              (!r.target.trim() && r.type.trim()),
          )
        ) {
          errors[field.id] = "Each scope row needs both a target and a type.";
        }
      }
    }
  }

  for (const id of PAYOUT_FIELDS) {
    const v = values[id];
    if (typeof v === "string" && v.trim() && !/^\d+$/.test(v.trim())) {
      errors[id] = "Numbers only.";
    }
  }

  if (!confirmed) {
    errors._confirm = "Please confirm the information is accurate.";
  }

  return errors;
}
