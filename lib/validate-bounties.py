"""
Validates every entry in bounties.yml against lib/schema.json.

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
DATA_PATH = os.path.join(SCRIPT_DIR, "..", "bounties.yml")

if __name__ == "__main__":
    with open(SCHEMA_PATH) as f:
        schema = json.load(f)
    with open(DATA_PATH) as f:
        data = yaml.safe_load(f)

    entries = data.get("companies", [])
    errors = 0

    for i, entry in enumerate(entries):
        try:
            jsonschema.validate(entry, schema)
        except jsonschema.ValidationError as e:
            name = entry.get("company", "?")
            print(f"Entry {i} ({name}): {e.message}", file=sys.stderr)
            errors += 1

    total = len(entries)
    print(f"Validated {total} entries, {errors} error(s).")
    sys.exit(1 if errors else 0)
