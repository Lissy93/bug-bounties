"""
Parses a GitHub issue body from the remove.yml issue template, looks up the
company in independent-programs.yml and platform-programs.yml, and either
removes it or explains why it can't be removed here.

Outputs results via $GITHUB_OUTPUT for the workflow to act on.
"""

import os
import re
import sys
from urllib.parse import urlparse

import yaml


SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
INDEPENDENT_PATH = os.path.join(SCRIPT_DIR, "..", "independent-programs.yml")
PLATFORM_PATH = os.path.join(SCRIPT_DIR, "..", "platform-programs.yml")

PLATFORM_SOURCES = {
    "hackerone.com": "HackerOne",
    "bugcrowd.com": "Bugcrowd",
    "intigriti.com": "Intigriti",
    "yeswehack.com": "YesWeHack",
    "immunefi.com": "Immunefi",
}

NO_RESPONSE = "_No response_"

LABEL_MAP = {
    "Program name": "company",
    "Removal reason": "reason",
}


class QuotedStr(str):
    """String subclass to force single-quoting in YAML output."""
    pass


def quoted_str_representer(dumper, data):
    return dumper.represent_scalar("tag:yaml.org,2002:str", data, style="'")


yaml.add_representer(QuotedStr, quoted_str_representer)


def prepare_for_yaml(obj):
    """Recursively wrap *-prefixed strings as QuotedStr."""
    if isinstance(obj, list):
        return [prepare_for_yaml(item) for item in obj]
    if isinstance(obj, dict):
        return {k: prepare_for_yaml(v) for k, v in obj.items()}
    if isinstance(obj, str) and obj.startswith("*"):
        return QuotedStr(obj)
    return obj


def slugify(name):
    """Create a URL-safe slug from a company name."""
    slug = name.lower().strip()
    slug = re.sub(r"[^a-z0-9]+", "-", slug)
    return slug.strip("-")


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


def normalize_name(name):
    """Normalize a name for fuzzy matching: lowercase, strip non-alphanumeric."""
    return re.sub(r"[^a-z0-9]", "", name.lower())


def parse_issue_body(body):
    """Split issue body on ### headings into {field_id: raw_value} dict."""
    sections = re.split(r"^### ", body, flags=re.MULTILINE)
    parsed = {}
    for section in sections:
        if not section.strip():
            continue
        lines = section.split("\n", 1)
        label = lines[0].strip()
        value = lines[1].strip() if len(lines) > 1 else ""
        field_id = LABEL_MAP.get(label)
        if field_id and value and value not in (NO_RESPONSE, "None"):
            parsed[field_id] = value
    return parsed


def find_in_programs(companies, target_normalized):
    """Find a company entry by normalized name. Returns (index, entry) or (None, None)."""
    for i, entry in enumerate(companies):
        name = entry.get("company", "")
        if normalize_name(name) == target_normalized:
            return i, entry
    return None, None


def detect_platform(url):
    """Check if a URL belongs to a known bug bounty platform."""
    if not url:
        return None
    hostname = urlparse(url).hostname or ""
    for domain, platform in PLATFORM_SOURCES.items():
        if hostname == domain or hostname.endswith("." + domain):
            return platform
    return None


def main():
    issue_body = os.environ.get("ISSUE_BODY", "")
    issue_number = os.environ.get("ISSUE_NUMBER", "0")
    issue_author = os.environ.get("ISSUE_AUTHOR", "unknown")

    company_input = ""
    reason = ""

    try:
        parsed = parse_issue_body(issue_body)

        company_input = parsed.get("company", "").strip()
        reason = parsed.get("reason", "").strip()

        if not company_input:
            set_output("result", "error")
            set_output("company", "")
            set_output("comment",
                       f"Hey @{issue_author},\nThanks for your request. "
                       f"This has been triaged for review by @Lissy93, "
                       f"who will respond to you shortly.")
            return

        target_normalized = normalize_name(company_input)

        # Search independent programs first
        with open(INDEPENDENT_PATH) as f:
            independent_data = yaml.safe_load(f)
        independent_companies = independent_data.get("companies", [])

        idx, matched_entry = find_in_programs(independent_companies, target_normalized)

        if idx is not None:
            company_display = matched_entry["company"]

            # Remove the entry
            independent_companies.pop(idx)

            # Read the header comment
            with open(INDEPENDENT_PATH) as f:
                raw_lines = f.readlines()
            header = ""
            for line in raw_lines:
                if line.strip() == "companies:":
                    break
                header += line

            # Write back
            output_data = {"companies": prepare_for_yaml(independent_companies)}
            yaml_body = yaml.dump(
                output_data,
                sort_keys=False,
                default_flow_style=False,
                allow_unicode=True,
                width=1000,
            )
            with open(INDEPENDENT_PATH, "w") as f:
                f.write(header)
                f.write(yaml_body)

            slug = slugify(company_display)
            branch = f"remove/{slug}-{issue_number}"

            reason_line = reason or "No reason provided"

            pr_body = (
                f"## Remove Program: {company_display}\n\n"
                f"Closes #{issue_number}\n\n"
                f"**Reason:** {reason_line}\n\n"
                f"@{issue_author} - please review changes, "
                f"so we can get this merged! 🎉"
            )

            set_output("result", "removed")
            set_output("company", company_display)
            set_output("branch", branch)
            set_output("pr_body", pr_body)
            return

        # Search platform programs
        with open(PLATFORM_PATH) as f:
            platform_data = yaml.safe_load(f)
        platform_companies = platform_data.get("companies", [])

        _, platform_entry = find_in_programs(platform_companies, target_normalized)

        if platform_entry is not None:
            company_display = platform_entry["company"]
            program_url = platform_entry.get("url", "")
            source = detect_platform(program_url)

            if source:
                comment = (
                    f"Hey @{issue_author},\n"
                    f"Looks like {company_display} is being auto-fetched from "
                    f"{source}, so you will need to submit this ticket to that "
                    f"repo instead."
                )
            else:
                comment = (
                    f"Hey @{issue_author},\n"
                    f"{company_display} is actually being auto-fetched from "
                    f"upstream, and so it will be automatically removed once "
                    f"their program is ended."
                )

            set_output("result", "platform")
            set_output("company", company_display)
            set_output("comment", comment)
            return

        # Not found anywhere
        set_output("result", "not_found")
        set_output("company", company_input)
        set_output("comment",
                    f"Hey @{issue_author},\n"
                    f"Thanks for your ticket. But we couldn't seem to find "
                    f"\"{company_input}\" in our source files. Are you sure "
                    f"you copied it exactly?")

    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        set_output("result", "error")
        set_output("company", company_input)
        set_output("comment",
                    f"Hey @{issue_author},\n"
                    f"Thanks for your request. This has been triaged for review "
                    f"by @Lissy93, who will respond to you shortly.")


if __name__ == "__main__":
    main()
