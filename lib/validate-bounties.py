"""
Validates every entry in platform-programs.yml and independent-programs.yml
against lib/schema.json.

Usage:
    python lib/validate-bounties.py
"""

import json
import os
import sys

import jsonschema
import yaml

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
SCHEMA_PATH = os.path.join(SCRIPT_DIR, "schema.json")
DATA_PATH = os.path.join(SCRIPT_DIR, "..", "platform-programs.yml")
INDEPENDENT_PATH = os.path.join(SCRIPT_DIR, "..", "independent-programs.yml")


def validate_file(file_path, schema):
    """Validate all entries in a YAML file against the schema.
    Returns (total, error_count)."""
    if not os.path.exists(file_path):
        return 0, 0

    with open(file_path) as f:
        data = yaml.safe_load(f)

    entries = data.get("companies", [])
    errors = 0

    for i, entry in enumerate(entries):
        try:
            jsonschema.validate(entry, schema)
        except jsonschema.ValidationError as e:
            name = entry.get("company", "?")
            print(f"{os.path.basename(file_path)} entry {i} ({name}): {e.message}", file=sys.stderr)
            errors += 1

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
