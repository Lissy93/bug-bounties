"""
Parses a GitHub issue body from the add.yml issue template, validates it
against lib/schema.json, and inserts a new entry into independent-programs.yml.

Outputs results via $GITHUB_OUTPUT for the workflow to act on.
"""

import json
import os
import re
import sys

import jsonschema
import yaml

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SCHEMA_PATH = os.path.join(SCRIPT_DIR, "schema.json")
PROGRAMS_PATH = os.path.join(SCRIPT_DIR, "..", "independent-programs.yml")

# Map issue template labels to field IDs
LABEL_MAP = {
    "Company": "company",
    "Program URL": "url",
    "Contact": "contact",
    "Rewards": "rewards",
    "Program type": "program_type",
    "Status": "status",
    "Description": "description",
    "Domains": "domains",
    "Structured scope": "scope",
    "Out of scope": "out_of_scope",
    "Minimum payout": "min_payout",
    "Maximum payout": "max_payout",
    "Currency": "currency",
    "Payout - critical": "payout_critical",
    "Payout - high": "payout_high",
    "Payout - medium": "payout_medium",
    "Payout - low": "payout_low",
    "Testing policy URL": "testing_policy_url",
    "Excluded methods": "excluded_methods",
    "Requires account": "requires_account",
    "Safe harbor": "safe_harbor",
    "Allows disclosure": "allows_disclosure",
    "Disclosure timeline days": "disclosure_timeline_days",
    "Response SLA days": "response_sla_days",
    "Legal terms URL": "legal_terms_url",
    "Hall of fame URL": "hall_of_fame_url",
    "Swag details": "swag_details",
    "Reporting URL": "reporting_url",
    "PGP key URL": "pgp_key",
    "Preferred languages": "preferred_languages",
    "Standards": "standards",
    "Confirmation": "confirmations",
}

# Desired key order for YAML output (matches existing entries)
KEY_ORDER = [
    "company", "url", "contact", "rewards", "program_type", "status",
    "safe_harbor", "allows_disclosure", "preferred_languages", "pgp_key",
    "description", "excluded_methods", "scope", "out_of_scope", "domains",
    "min_payout", "max_payout", "currency", "payout_table",
    "response_sla_days", "disclosure_timeline_days", "testing_policy_url",
    "legal_terms_url", "hall_of_fame_url", "reporting_url", "swag_details",
    "standards", "requires_account",
]

CHECKBOX_FIELDS = {"rewards", "excluded_methods"}
DROPDOWN_FIELDS = {"program_type", "status", "safe_harbor"}
BOOL_DROPDOWN_FIELDS = {"requires_account", "allows_disclosure"}
NUMERIC_FIELDS = {"min_payout", "max_payout", "disclosure_timeline_days", "response_sla_days"}
PAYOUT_FIELDS = ("payout_critical", "payout_high", "payout_medium", "payout_low")
TEXTAREA_LIST_FIELDS = {"domains", "out_of_scope", "standards"}

NO_RESPONSE = "_No response_"

CODE_FENCE_RE = re.compile(r"^```[A-Za-z0-9_-]*\s*$")

# Match `### <known label>` at start of a line, only for labels we recognize.
# Anchored at line start with $ to avoid matching `### Some other heading`
# that a user typed inside a textarea field.
_KNOWN_LABELS_PATTERN = "|".join(re.escape(label) for label in LABEL_MAP.keys())
SECTION_RE = re.compile(
    rf"^### ({_KNOWN_LABELS_PATTERN})[ \t]*$",
    re.MULTILINE,
)

# Markdown-escaped heading prefix used by the web form to defang user-typed
# `### Foo` inside textareas (so the parser can't be tricked into splitting
# on it). We restore the original `### ` after parsing so the stored YAML
# preserves the user's intent.
ESCAPED_HEADING_PREFIX = "\\### "


def parse_issue_body(body):
    """Extract {field_id: raw_value} by locating known section headings.

    Only `### <label>` headings whose label is in LABEL_MAP are treated as
    section boundaries. This means a user can safely include `### Anything`
    inside a textarea: unknown headings stay part of the value, and known
    headings are defanged client-side via ESCAPED_HEADING_PREFIX.
    """
    parsed = {}
    matches = list(SECTION_RE.finditer(body))
    for i, match in enumerate(matches):
        label = match.group(1)
        value_start = match.end()
        value_end = matches[i + 1].start() if i + 1 < len(matches) else len(body)
        value = body[value_start:value_end].strip()
        # Restore any client-side escapes so the user sees what they typed
        value = value.replace(ESCAPED_HEADING_PREFIX, "### ")
        field_id = LABEL_MAP[label]
        if value and value not in (NO_RESPONSE, "None"):
            parsed[field_id] = value
    return parsed


def parse_checkboxes(raw):
    """Parse checkbox lines, return list of checked values."""
    checked = []
    for line in raw.splitlines():
        match = re.match(r"^- \[([xX])\]\s*(.+)$", line.strip())
        if match:
            checked.append(match.group(2).strip())
    return checked


def parse_scope(raw):
    """Parse scope textarea into list of {target, type} dicts."""
    items = []
    for line in raw.splitlines():
        line = line.strip()
        if "|" not in line:
            continue
        parts = line.split("|", 1)
        target = parts[0].strip()
        asset_type = parts[1].strip()
        if target and asset_type:
            items.append({"target": target, "type": asset_type})
    return items


def parse_textarea_list(raw):
    """Split textarea on newlines, filter empty and markdown code fences."""
    result = []
    for line in raw.splitlines():
        stripped = line.strip()
        if not stripped or CODE_FENCE_RE.match(stripped):
            continue
        result.append(stripped)
    return result


def normalize_url(value):
    """Add https:// to URLs missing a protocol, mailto: to email addresses."""
    value = value.strip()
    if not value:
        return value
    if re.match(r"^https?://", value) or value.startswith("mailto:"):
        return value
    if re.match(r"^[a-z][a-z0-9+.-]*:", value, re.IGNORECASE):
        return ""
    if "@" in value:
        return f"mailto:{value}"
    return f"https://{value}"


def try_int(value):
    """Convert to int if numeric, else return None."""
    if not value:
        return None
    value = re.sub(r"[,$\s]", "", value)
    try:
        return int(value)
    except (ValueError, TypeError):
        return None


def build_entry(parsed):
    """Convert parsed fields into a program entry dict."""
    entry = {}

    URL_FIELDS = {"url", "contact", "pgp_key", "testing_policy_url",
                   "legal_terms_url", "hall_of_fame_url", "reporting_url"}

    # Simple strings
    for field in ("company", "url", "contact", "preferred_languages",
                  "description", "pgp_key", "testing_policy_url",
                  "legal_terms_url", "hall_of_fame_url", "reporting_url",
                  "swag_details", "currency"):
        if field in parsed:
            value = parsed[field].strip()
            if field in URL_FIELDS:
                entry[field] = normalize_url(value)
            elif field == "currency":
                # ISO currency codes are conventionally uppercase
                entry[field] = value.upper()
            else:
                entry[field] = value

    # Checkboxes
    for field in CHECKBOX_FIELDS:
        if field in parsed:
            values = parse_checkboxes(parsed[field])
            if values:
                entry[field] = values

    # Dropdowns (use as-is)
    for field in DROPDOWN_FIELDS:
        if field in parsed:
            entry[field] = parsed[field].strip()

    # Boolean dropdowns
    for field in BOOL_DROPDOWN_FIELDS:
        if field in parsed:
            val = parsed[field].strip().lower()
            if val in ("true", "false"):
                entry[field] = val == "true"

    # Numeric fields
    for field in NUMERIC_FIELDS:
        if field in parsed:
            val = try_int(parsed[field].strip())
            if val is not None:
                entry[field] = val

    # Textarea lists
    for field in TEXTAREA_LIST_FIELDS:
        if field in parsed:
            values = parse_textarea_list(parsed[field])
            if values:
                entry[field] = values

    # Scope
    if "scope" in parsed:
        items = parse_scope(parsed["scope"])
        if items:
            entry["scope"] = items

    # Payout table
    payout_table = {}
    for field in PAYOUT_FIELDS:
        if field in parsed:
            severity = field.replace("payout_", "")
            val = try_int(parsed[field].strip())
            if val is not None:
                payout_table[severity] = val
    if payout_table:
        entry["payout_table"] = payout_table

    # Reorder keys to match existing entries
    ordered = {}
    for key in KEY_ORDER:
        if key in entry:
            ordered[key] = entry[key]
    # Include any remaining keys not in KEY_ORDER
    for key in entry:
        if key not in ordered:
            ordered[key] = entry[key]

    return ordered


def slugify(name):
    """Create a URL-safe slug from a company name."""
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    return slug.strip("-")


class QuotedStr(str):
    """String subclass to force single-quoting in YAML output."""
    pass


def quoted_str_representer(dumper, data):
    return dumper.represent_scalar("tag:yaml.org,2002:str", data, style="'")


def str_representer(dumper, data):
    style = "|" if "\n" in data else None
    return dumper.represent_scalar("tag:yaml.org,2002:str", data, style=style)


yaml.add_representer(QuotedStr, quoted_str_representer)
yaml.add_representer(str, str_representer)


def prepare_for_yaml(obj):
    """Recursively wrap *-prefixed strings as QuotedStr."""
    if isinstance(obj, list):
        return [prepare_for_yaml(item) for item in obj]
    if isinstance(obj, dict):
        return {k: prepare_for_yaml(v) for k, v in obj.items()}
    if isinstance(obj, str) and obj.startswith("*"):
        return QuotedStr(obj)
    return obj


def add_blank_lines_between_entries(yaml_body):
    """Insert a blank line before each top-level '- company:' for readability."""
    return re.sub(r"^- company:", "\n- company:", yaml_body, flags=re.MULTILINE)


def set_output(name, value):
    """Write a key=value pair to $GITHUB_OUTPUT."""
    output_file = os.environ.get("GITHUB_OUTPUT")
    if not output_file:
        print(f"[OUTPUT] {name}={value}", file=sys.stderr)
        return
    with open(output_file, "a") as f:
        if "\n" in str(value):
            delimiter = f"ghadelim_{os.urandom(8).hex()}"
            f.write(f"{name}<<{delimiter}\n{value}\n{delimiter}\n")
        else:
            f.write(f"{name}={value}\n")


def main():
    issue_body = os.environ.get("ISSUE_BODY", "")
    issue_number = os.environ.get("ISSUE_NUMBER", "0")
    issue_author = os.environ.get("ISSUE_AUTHOR", "unknown")

    # Parse the issue body
    parsed = parse_issue_body(issue_body)
    entry = build_entry(parsed)

    # Validate against schema
    with open(SCHEMA_PATH) as f:
        schema = json.load(f)

    try:
        jsonschema.validate(entry, schema)
    except jsonschema.ValidationError as e:
        # Build a path like `payout_table.critical` for nested fields so the
        # contributor can tell which input was rejected.
        path = ".".join(str(p) for p in e.absolute_path) or "(root)"
        set_output("valid", "false")
        set_output(
            "error_message",
            f"Schema validation error at `{path}`: {e.message}",
        )
        return

    # Check for duplicate company names
    with open(PROGRAMS_PATH) as f:
        data = yaml.safe_load(f)
    existing = data.get("companies", [])

    company_lower = entry["company"].lower()
    for existing_entry in existing:
        if existing_entry.get("company", "").lower() == company_lower:
            set_output("valid", "false")
            set_output("error_message",
                       f"Duplicate company name: '{entry['company']}' already exists.")
            return

    # Find alphabetical insertion point
    insert_idx = 0
    for i, existing_entry in enumerate(existing):
        if existing_entry.get("company", "").lower() < company_lower:
            insert_idx = i + 1
        else:
            break

    existing.insert(insert_idx, entry)

    # Read the header comment (lines before 'companies:')
    with open(PROGRAMS_PATH) as f:
        raw_lines = f.readlines()
    header = ""
    for line in raw_lines:
        if line.strip() == "companies:":
            break
        header += line

    # Write the updated file
    output_data = {"companies": prepare_for_yaml(existing)}
    yaml_body = yaml.dump(
        output_data,
        sort_keys=False,
        default_flow_style=False,
        allow_unicode=True,
        width=1000,
    )
    yaml_body = add_blank_lines_between_entries(yaml_body)
    with open(PROGRAMS_PATH, "w") as f:
        f.write(header)
        f.write(yaml_body)

    # Set outputs
    slug = slugify(entry["company"])
    branch = f"program/{slug}-{issue_number}" if slug else f"program/{issue_number}"
    company = entry["company"]

    rewards_str = ", ".join(entry.get("rewards", [])) or "N/A"
    program_type = entry.get("program_type", "N/A")
    status = entry.get("status", "N/A")

    pr_body = (
        f"## New Program: {company}\n\n"
        f"Closes #{issue_number}\n\n"
        f"| Field | Value |\n"
        f"|---|---|\n"
        f"| URL | {entry.get('url', 'N/A')} |\n"
        f"| Type | {program_type} |\n"
        f"| Status | {status} |\n"
        f"| Rewards | {rewards_str} |\n\n"
        f"Thanks @{issue_author} for this submission 🎉\nPlease review changes, so we can get this merged"
    )

    set_output("valid", "true")
    set_output("branch", branch)
    set_output("company", company)
    set_output("pr_body", pr_body)


if __name__ == "__main__":
    main()
