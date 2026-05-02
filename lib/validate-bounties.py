"""
Validates every entry in platform-programs.yml and independent-programs.yml
against lib/schema.json.

Usage:
    python lib/validate-bounties.py
"""

import json
import logging
import os
import sys

import jsonschema
import yaml

logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO").upper(),
    format="[%(levelname)s] %(message)s",
    stream=sys.stderr,
)
log = logging.getLogger("validate-bounties")

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SCHEMA_PATH = os.path.join(SCRIPT_DIR, "schema.json")
DATA_PATH = os.path.join(SCRIPT_DIR, "..", "platform-programs.yml")
INDEPENDENT_PATH = os.path.join(SCRIPT_DIR, "..", "independent-programs.yml")


def validate_file(file_path, schema):
    """Validate all entries in a YAML file against the schema, and confirm
    they are sorted alphabetically by company (case-insensitive) — the
    submission script relies on this for its insertion logic.
    Returns (total, error_count)."""
    if not os.path.exists(file_path):
        return 0, 0

    with open(file_path) as f:
        data = yaml.safe_load(f)

    label = os.path.basename(file_path)
    if not isinstance(data, dict) or not isinstance(data.get("companies"), list):
        log.error("%s: missing or non-list 'companies' key", label)
        return 0, 1

    entries = data["companies"]
    errors = 0
    log.debug("Validating %s (%d entries)", label, len(entries))

    for i, entry in enumerate(entries):
        try:
            jsonschema.validate(entry, schema)
        except jsonschema.ValidationError as e:
            name = entry.get("company", "?")
            log.error("%s entry %d (%s): %s", label, i, name, e.message)
            errors += 1

    names = [e.get("company", "") for e in entries]
    for i in range(1, len(names)):
        if names[i].lower() < names[i - 1].lower():
            log.error("%s: out of order at index %d: %r should precede %r",
                      label, i, names[i], names[i - 1])
            errors += 1

    seen = {}
    for i, name in enumerate(names):
        key = name.lower()
        if key in seen:
            log.error("%s: duplicate company %r at indices %d and %d",
                      label, name, seen[key], i)
            errors += 1
        else:
            seen[key] = i

    return len(entries), errors


if __name__ == "__main__":
    with open(SCHEMA_PATH) as f:
        schema = json.load(f)

    total = 0
    errors = 0

    for path in [DATA_PATH, INDEPENDENT_PATH]:
        t, e = validate_file(path, schema)
        label = os.path.basename(path)
        print(f"Validated {label}: {t} entries, {e} error(s).")
        total += t
        errors += e

    print(f"Total: {total} entries, {errors} error(s).")
    sys.exit(1 if errors else 0)
