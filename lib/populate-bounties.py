"""
Fetches bug bounty program data from public sources, normalizes,
deduplicates, validates, and merges into bounties.yml.

Usage:
    python lib/populate-bounties.py [--dry-run] [--verbose] [--output PATH]
                                    [--skip-source NAME] [--stats]
"""

from __future__ import annotations

import argparse
import ipaddress
import json
import logging
import os
import re
import sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from urllib.parse import urlparse

import jsonschema
import requests
import tldextract
import yaml
from rapidfuzz import fuzz

SCRIPT_DIR = Path(__file__).resolve().parent
BOUNTIES_PATH = SCRIPT_DIR / ".." / "platform-programs.yml"
INDEPENDENT_PATH = SCRIPT_DIR / ".." / "independent-programs.yml"
SCHEMA_PATH = SCRIPT_DIR / "schema.json"

GITHUB_RAW = "https://raw.githubusercontent.com"
SOURCES = {
    "hackerone":        f"{GITHUB_RAW}/arkadiyt/bounty-targets-data/main/data/hackerone_data.json",
    "bugcrowd":         f"{GITHUB_RAW}/arkadiyt/bounty-targets-data/main/data/bugcrowd_data.json",
    "intigriti":        f"{GITHUB_RAW}/arkadiyt/bounty-targets-data/main/data/intigriti_data.json",
    "yeswehack":        f"{GITHUB_RAW}/arkadiyt/bounty-targets-data/main/data/yeswehack_data.json",
    "federacy":         f"{GITHUB_RAW}/arkadiyt/bounty-targets-data/main/data/federacy_data.json",
    "disclose":         f"{GITHUB_RAW}/disclose/diodb/master/program-list.json",
    "projectdiscovery": f"{GITHUB_RAW}/projectdiscovery/public-bugbounty-programs/main/chaos-bugbounty-list.json",
    "immunefi":         f"{GITHUB_RAW}/pratraut/Immunefi-Bug-Bounty-Programs-Snapshots/main/projects.json",
}

PLATFORM_DOMAINS = {
    "hackerone.com", "bugcrowd.com", "intigriti.com", "yeswehack.com",
    "federacy.com", "synack.com", "cobalt.io", "yogosha.com", "immunefi.com",
}

NAME_SUFFIXES = re.compile(
    r"\s*\b(bug\s*bounty\s*(program)?|vulnerability\s*disclosure\s*(program|policy)?|"
    r"vdp|bbp|inc\.?|llc\.?|ltd\.?|corp\.?|gmbh|s\.?a\.?|b\.?v\.?|"
    r"co\.?|limited|corporation|incorporated)\s*$",
    re.IGNORECASE,
)
PAREN_RE = re.compile(r"\s*\([^)]*\)\s*")

FIELD_ORDER = [
    "company", "url", "handle", "contact",
    "rewards",
]

DEFAULT_HEADER = """\

# List of valid reward types (feel free to add more)
reward1: '&bounty Bounty'
reward2: '&swag Swag'
reward3: '&recognition Hall of Fame'

# This is the list of companies that have a bug bounty program
# New additions should be inserted in alphabetical order, based on company name
# The format is as follows:
# - company: Company Name
#   url: https://www.company.com/bug-bounty
#   contact: mailto:security@company
#   rewards:
#   - '*bounty'
#   - '*swag'
#   - '*recognition'

companies:
"""

LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=LOG_LEVEL, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

SESSION = requests.Session()
SESSION.headers["User-Agent"] = "populate-bounties/1.0 (github.com/lissy93/bounties)"


def normalize_name(name: str) -> str:
    """Normalize a company name for dedup comparison."""
    n = name.lower().strip()
    prev = None
    while prev != n:
        prev = n
        n = PAREN_RE.sub(" ", n)
    for _ in range(3):
        n = NAME_SUFFIXES.sub("", n).strip()
    return re.sub(r"\s+", " ", n).strip()


def extract_domain(url: str) -> str:
    """Pull the registrable domain from a URL."""
    try:
        host = urlparse(url).hostname or ""
    except Exception:
        return ""
    try:
        ipaddress.ip_address(host)
        return host
    except ValueError:
        pass
    ext = tldextract.extract(host)
    if ext.domain and ext.suffix:
        return f"{ext.domain}.{ext.suffix}"
    return host


def safe_float(val: object, default: float = 0) -> float:
    """Safely convert a value (or dict with 'value' key) to float."""
    if isinstance(val, dict):
        val = val.get("value", default)
    try:
        return float(val or default)
    except (TypeError, ValueError):
        return default


def make_entry(company: str, url: str, **extra: object) -> dict[str, object]:
    """Build a normalized bounty entry dict, skipping empty values."""
    entry: dict[str, object] = {"company": company.strip(), "url": url.strip()}
    for k, v in extra.items():
        if v is None or v == "" or v == []:
            continue
        entry[k] = v.strip() if isinstance(v, str) else v
    entry.setdefault("rewards", [])
    return entry


def read_file(path: str | Path) -> str:
    """Read a file and return its contents."""
    try:
        with open(path) as f:
            return f.read()
    except FileNotFoundError:
        logger.error(f"File not found: {path}")
        sys.exit(1)


def write_file(path: str | Path, content: str) -> None:
    """Write content to a file."""
    try:
        with open(path, "w") as f:
            f.write(content)
    except OSError as e:
        logger.error(f"Failed to write {path}: {e}")
        sys.exit(1)


def _count_raw(data: list | dict) -> int:
    """Count entries in raw source data, handling both list and dict shapes."""
    if isinstance(data, list):
        return len(data)
    if isinstance(data, dict):
        for key in ("programs", "targets", "program_list"):
            if isinstance(data.get(key), list):
                return len(data[key])
    return 0


def fetch_source(name: str, url: str) -> tuple[str, list | dict | None]:
    """Fetch JSON from a single source. Returns (name, data | None)."""
    try:
        resp = SESSION.get(url, timeout=30)
        resp.raise_for_status()
        return name, resp.json()
    except Exception as e:
        logger.warning(f"Failed to fetch {name}: {e}")
        return name, None


def fetch_all(skip: list[str] | None = None) -> dict[str, list | dict]:
    """Fetch all sources in parallel, returns {name: data}."""
    skip = set(skip or [])
    results = {}
    with ThreadPoolExecutor(max_workers=8) as pool:
        futures = {
            pool.submit(fetch_source, name, url): name
            for name, url in SOURCES.items() if name not in skip
        }
        for future in as_completed(futures):
            name, data = future.result()
            if data is not None:
                results[name] = data
                logger.debug(f"Fetched {name} ({_count_raw(data)} entries)")
    return results


def _get(p: dict, key: str, fallback: str = "") -> str:
    """Grab a string field from a dict, stripped and safe."""
    val = p.get(key)
    return str(val if val is not None else fallback).strip()


def normalize_hackerone(data: list[dict]) -> list[dict]:
    """Normalize HackerOne program data."""
    entries = []
    for p in data:
        if p.get("submission_state") != "open":
            continue
        name = _get(p, "name")
        website = _get(p, "website")
        platform_url = _get(p, "url")
        url = website if website.startswith("http") else platform_url
        if not name or not url:
            continue
        rewards = []
        if p.get("offers_bounties"):
            rewards.append("*bounty")
        if p.get("offers_swag"):
            rewards.append("*swag")
        entries.append(make_entry(
            name, url,
            contact=platform_url, rewards=rewards,
            handle=_get(p, "handle"),
        ))
    return entries


def normalize_bugcrowd(data: list[dict]) -> list[dict]:
    """Normalize Bugcrowd program data."""
    entries = []
    for p in data:
        name, url = _get(p, "name"), _get(p, "url")
        if not name or not url:
            continue
        if url.startswith("/"):
            url = "https://bugcrowd.com" + url
        rewards = []
        if safe_float(p.get("max_payout")) > 0:
            rewards.append("*bounty")
        entries.append(make_entry(
            name, url,
            contact=url, rewards=rewards,
        ))
    return entries


def normalize_intigriti(data: list[dict]) -> list[dict]:
    """Normalize Intigriti program data."""
    entries = []
    for p in data:
        if p.get("status") != "open":
            continue
        name, url = _get(p, "name"), _get(p, "url")
        if not name or not url:
            continue
        if url.startswith("/"):
            url = "https://app.intigriti.com" + url
        rewards = []
        if safe_float(p.get("max_bounty")) > 0:
            rewards.append("*bounty")
        entries.append(make_entry(
            name, url,
            contact=url, rewards=rewards,
            handle=_get(p, "handle") or _get(p, "company_handle"),
        ))
    return entries


def normalize_yeswehack(data: list[dict]) -> list[dict]:
    """Normalize YesWeHack program data."""
    entries = []
    for p in data:
        if p.get("disabled"):
            continue
        name = _get(p, "name")
        slug = _get(p, "slug") or _get(p, "id")
        if not name or not slug:
            continue
        url = f"https://yeswehack.com/programs/{slug}"
        rewards = []
        if safe_float(p.get("max_bounty")) > 0:
            rewards.append("*bounty")
        entries.append(make_entry(
            name, url,
            contact=url, rewards=rewards,
        ))
    return entries


def normalize_federacy(data: list[dict]) -> list[dict]:
    """Normalize Federacy program data."""
    entries = []
    for p in data:
        name, url = _get(p, "name"), _get(p, "url")
        if not name or not url:
            continue
        rewards = ["*bounty"] if p.get("offers_awards") else []
        entries.append(make_entry(
            name, url,
            contact=url, rewards=rewards,
        ))
    return entries


def normalize_disclose(data: list | dict) -> list[dict]:
    """Normalize Disclose.io program data."""
    entries = []
    programs = data if isinstance(data, list) else data.get(
        "program_list", data.get("programs", []))
    for p in programs:
        if p.get("policy_url_status") == "dead":
            continue
        name, url = _get(p, "program_name"), _get(p, "policy_url")
        if not name or not url:
            continue
        email = _get(p, "contact_email")
        contact_url = _get(p, "contact_url")
        if email and "@" in email:
            contact = email if email.startswith("mailto:") else f"mailto:{email}"
        else:
            contact = contact_url
        rewards = []
        for field, reward in [("offers_bounty", "*bounty"),
                              ("offers_swag", "*swag"),
                              ("hall_of_fame", "*recognition")]:
            if str(p.get(field, "")).lower() == "yes":
                rewards.append(reward)
        entries.append(make_entry(
            name, url,
            contact=contact, rewards=rewards,
        ))
    return entries


def normalize_projectdiscovery(data: list | dict) -> list[dict]:
    """Normalize ProjectDiscovery program data."""
    entries = []
    programs = data if isinstance(data, list) else data.get("programs", [])
    for p in programs:
        name, url = _get(p, "name"), _get(p, "url")
        if not name or not url:
            continue
        rewards = []
        if p.get("bounty"):
            rewards.append("*bounty")
        if p.get("swag"):
            rewards.append("*swag")
        entries.append(make_entry(
            name, url,
            contact=url, rewards=rewards,
        ))
    return entries


def normalize_immunefi(data: list[dict]) -> list[dict]:
    """Normalize Immunefi program data."""
    entries = []
    for p in data:
        if p.get("endDate"):
            continue
        name = _get(p, "project")
        slug = _get(p, "id")
        if not name or not slug:
            continue
        url = f"https://immunefi.com/bug-bounty/{slug}/"
        rewards = []
        if safe_float(p.get("maximum_reward")) > 0:
            rewards.append("*bounty")
        entries.append(make_entry(
            name, url,
            contact=url, rewards=rewards,
        ))
    return entries


NORMALIZERS = {
    "hackerone": normalize_hackerone,
    "bugcrowd": normalize_bugcrowd,
    "intigriti": normalize_intigriti,
    "yeswehack": normalize_yeswehack,
    "federacy": normalize_federacy,
    "disclose": normalize_disclose,
    "projectdiscovery": normalize_projectdiscovery,
    "immunefi": normalize_immunefi,
}


def normalize_all(raw_data: dict[str, list | dict]) -> tuple[list[dict], dict[str, int]]:
    """Run all source normalizers, return entries and per-source counts."""
    all_entries = []
    counts = {}
    for name, data in raw_data.items():
        fn = NORMALIZERS.get(name)
        if not fn:
            logger.warning(f"No normalizer for {name}")
            continue
        entries = fn(data)
        counts[name] = len(entries)
        logger.debug(f"Normalized {name}: {len(entries)} entries")
        all_entries.extend(entries)
    return all_entries, counts


def _merge_group(group: list[dict]) -> dict:
    """Merge a group of duplicate entries into one (core fields only)."""
    best = min(group, key=lambda e: len(e["company"]))
    merged = {"company": best["company"], "url": best["url"]}

    # Prefer a non-platform URL
    for e in group:
        d = extract_domain(e["url"])
        if d and d not in PLATFORM_DOMAINS:
            merged["url"] = e["url"]
            break

    # Prefer mailto: contact, then non-platform, then whatever
    contacts = [e.get("contact", "") for e in group if e.get("contact")]
    mailto = [c for c in contacts if c.startswith("mailto:")]
    if mailto:
        merged["contact"] = mailto[0]
    elif contacts:
        non_plat = [c for c in contacts
                    if extract_domain(c) not in PLATFORM_DOMAINS]
        merged["contact"] = non_plat[0] if non_plat else contacts[0]

    # Handle: first non-empty wins
    for e in group:
        if e.get("handle"):
            merged["handle"] = e["handle"]
            break

    # Rewards: union
    rewards = {v for e in group for v in e.get("rewards", [])}
    if rewards:
        merged["rewards"] = sorted(rewards)

    return merged


def deduplicate(entries: list[dict]) -> list[dict]:
    """Three-pass dedup: exact name -> domain -> fuzzy."""
    entries = sorted(entries, key=lambda e: e["company"].lower())

    # Pass 1: exact normalized name
    by_name: dict[str, list[dict]] = {}
    for e in entries:
        by_name.setdefault(normalize_name(e["company"]), []).append(e)
    pass1 = [_merge_group(g) for _, g in sorted(by_name.items())]

    # Pass 2: group by domain (skip platform domains)
    by_domain: dict[str, list[dict]] = {}
    ungrouped = []
    for e in pass1:
        d = extract_domain(e["url"])
        if d and d not in PLATFORM_DOMAINS:
            by_domain.setdefault(d, []).append(e)
        else:
            ungrouped.append(e)
    pass2 = [_merge_group(g) for _, g in sorted(by_domain.items())]
    pass2.extend(ungrouped)

    # Pass 3: fuzzy name match
    pass2.sort(key=lambda e: e["company"].lower())
    used: set[int] = set()
    final = []
    for i, e in enumerate(pass2):
        if i in used:
            continue
        group = [e]
        name_i = normalize_name(e["company"])
        for j in range(i + 1, len(pass2)):
            if j in used:
                continue
            if fuzz.token_sort_ratio(name_i, normalize_name(pass2[j]["company"])) >= 85:
                group.append(pass2[j])
                used.add(j)
        used.add(i)
        final.append(_merge_group(group))

    logger.debug(f"Deduplicated {len(entries)} -> {len(final)} entries")
    return final


def validate_entries(entries: list[dict], schema: dict) -> list[dict]:
    """Validate entries against schema, drop invalid ones."""
    valid = []
    for e in entries:
        try:
            jsonschema.validate(e, schema)
            valid.append(e)
        except jsonschema.ValidationError as err:
            logger.debug(f"Dropping invalid: {e.get('company', '?')}: {err.message}")
    dropped = len(entries) - len(valid)
    if dropped:
        logger.debug(f"Validation dropped {dropped} entries")
    return valid


def enrich_entry(existing: dict, incoming: dict) -> None:
    """Enrich an existing entry with incoming data (existing values win).
    Only fills core fields - enrichment data is derived at build time."""
    # Contact: only fill gaps
    if not existing.get("contact") and incoming.get("contact"):
        existing["contact"] = incoming["contact"]

    # Handle: only fill gaps (needed for non-platform-URL matching)
    if "handle" not in existing and incoming.get("handle"):
        existing["handle"] = incoming["handle"]

    # Rewards: union
    items = set(existing.get("rewards") or [])
    items.update(incoming.get("rewards", []))
    if items:
        existing["rewards"] = sorted(items)
    else:
        existing["rewards"] = []


def load_existing(path: str | Path) -> tuple[list[str], list[dict]]:
    """Load bounties.yml. Returns (header_lines, entries)."""
    if not Path(path).exists():
        return [], []
    raw = read_file(path)
    lines = raw.split("\n")

    header_lines = []
    for i, line in enumerate(lines):
        if line.strip().startswith("companies:"):
            header_lines = lines[:i + 1]
            break

    try:
        data = yaml.safe_load(raw)
    except Exception as e:
        logger.warning(f"Failed to parse existing YAML: {e}")
        return header_lines, []

    if not isinstance(data, dict):
        return header_lines, []
    return header_lines, data.get("companies") or []


def merge_entries(existing: list[dict], incoming: list[dict]) -> tuple[list[dict], int]:
    """Merge incoming into existing. Existing data always wins. Returns (merged, new_count)."""
    by_name: dict[str, list[dict]] = {}
    by_domain: dict[str, list[dict]] = {}
    for e in existing:
        by_name.setdefault(normalize_name(e.get("company", "")), []).append(e)
        d = extract_domain(e.get("url", ""))
        if d and d not in PLATFORM_DOMAINS:
            by_domain.setdefault(d, []).append(e)

    new_entries = []
    for inc in incoming:
        matches = by_name.get(normalize_name(inc.get("company", "")))
        if not matches:
            d = extract_domain(inc.get("url", ""))
            if d and d not in PLATFORM_DOMAINS:
                matches = by_domain.get(d)
        if matches:
            for match in matches:
                enrich_entry(match, inc)
        else:
            new_entries.append(inc)

    return list(existing) + new_entries, len(new_entries)


class OrderedDumper(yaml.SafeDumper):
    pass


def _dict_representer(dumper: yaml.Dumper, data: dict) -> yaml.Node:
    pairs = [(k, data[k]) for k in FIELD_ORDER if k in data]
    return dumper.represent_mapping("tag:yaml.org,2002:map", pairs)


OrderedDumper.add_representer(dict, _dict_representer)


def prepare_entry(entry: dict) -> dict:
    """Strip to core fields only. Enrichment is derived at build time."""
    out = {k: entry[k] for k in FIELD_ORDER if k in entry}
    out.setdefault("contact", "")
    out.setdefault("rewards", [])
    return out


def write_bounties(entries: list[dict], output_path: str | Path,
                   header_lines: list[str] | None = None) -> None:
    """Write sorted entries to YAML with the original file header."""
    entries = sorted(entries, key=lambda e: e["company"].lower())
    header = ("\n".join(header_lines) + "\n") if header_lines else DEFAULT_HEADER
    body = yaml.dump(
        [prepare_entry(e) for e in entries],
        Dumper=OrderedDumper, default_flow_style=False,
        allow_unicode=True, sort_keys=False, width=200,
    )
    write_file(output_path, header + body)
    logger.debug(f"Wrote {len(entries)} entries to {output_path}")


def print_stats(raw_data: dict[str, list | dict], norm_counts: dict[str, int],
                deduplicated: list[dict], merged_count: int, new_count: int) -> None:
    """Print a formatted summary of the population run."""
    print("\nBug Bounty Program Population Summary")
    print("=" * 42)
    print(f"{'Source':<20} {'Fetched':>8}   {'Normalized':>10}")
    print(f"{'------':<20} {'-------':>8}   {'----------':>10}")
    for name in sorted(SOURCES):
        raw = raw_data.get(name)
        fetched = _count_raw(raw) if raw is not None else 0
        print(f"{name:<20} {fetched:>8}   {norm_counts.get(name, 0):>10}")
    print(f"{'------':<20} {'-------':>8}   {'----------':>10}")
    total = sum(_count_raw(v) for v in raw_data.values())
    total_norm = sum(norm_counts.values())
    print(f"{'Total':<20} {total:>8}   {total_norm:>10}")
    print()
    print(f"Deduplicated:   {len(deduplicated)}")
    print(f"Merged total:   {merged_count}")
    print(f"New entries:    {new_count}")


def main() -> None:
    """CLI entry point for populating bounties.yml."""
    parser = argparse.ArgumentParser(
        description="Populate bounties.yml from public bug bounty sources")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print stats without writing")
    parser.add_argument("--verbose", action="store_true",
                        help="Enable debug logging")
    parser.add_argument("--output", default=str(BOUNTIES_PATH),
                        help="Output path (default: bounties.yml)")
    parser.add_argument("--skip-source", action="append", default=[],
                        dest="skip_sources",
                        help="Skip a source by name (repeatable)")
    parser.add_argument("--stats", action="store_true",
                        help="Print per-source statistics")
    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    try:
        schema = json.loads(read_file(SCHEMA_PATH))
    except json.JSONDecodeError as e:
        logger.error(f"Invalid schema JSON: {e}")
        sys.exit(1)

    # Fetch + normalize + deduplicate
    planned_sources = [n for n in SOURCES if n not in set(args.skip_sources)]
    logger.info("Fetching %d sources (skip=%s)",
                len(planned_sources), args.skip_sources or "none")
    raw_data = fetch_all(skip=args.skip_sources)
    if not raw_data:
        logger.error("No sources fetched, aborting")
        sys.exit(1)
    logger.info("Fetched %d/%d sources successfully",
                len(raw_data), len(planned_sources))

    normalized, norm_counts = normalize_all(raw_data)
    deduplicated = validate_entries(deduplicate(normalized), schema)
    logger.info("Normalized %d entries; deduplicated to %d",
                len(normalized), len(deduplicated))

    # Merge with existing file
    header_lines, existing = load_existing(args.output)

    # Load independent programs for cross-dedup (prevent duplicates)
    independent_entries = []
    if Path(INDEPENDENT_PATH).exists():
        try:
            ind_raw = read_file(INDEPENDENT_PATH)
            ind_data = yaml.safe_load(ind_raw)
            if isinstance(ind_data, dict):
                independent_entries = ind_data.get("companies") or []
                logger.debug(f"Loaded {len(independent_entries)} independent entries for cross-dedup")
        except Exception as e:
            logger.warning(f"Failed to load independent programs: {e}")

    # Add independent entries to lookup indexes so merge_entries skips them
    all_existing = list(existing) + independent_entries
    merged, new_count = merge_entries(all_existing, deduplicated)
    # Remove independent entries from the merged output (they stay in their own file)
    independent_names = {normalize_name(e.get("company", "")) for e in independent_entries}
    merged = [e for e in merged if normalize_name(e.get("company", "")) not in independent_names]
    merged = validate_entries(merged, schema)
    logger.info("Merged: %d total (%d new)", len(merged), new_count)

    if args.stats:
        print_stats(raw_data, norm_counts, deduplicated, len(merged), new_count)
    if args.dry_run:
        print(f"\nDry run: would write {len(merged)} entries to {args.output}")
        return

    write_bounties(merged, args.output, header_lines or None)
    print(f"Done: {len(merged)} entries written ({new_count} new)")


if __name__ == "__main__":
    main()
