"""
Fetches bug bounty program data from public sources, normalizes,
deduplicates, validates, and merges into bounties.yml.

Usage:
    python lib/populate-bounties.py [--dry-run] [--verbose] [--output PATH]
                                    [--skip-source NAME] [--stats]
"""

# Imports
import argparse, json, logging, os, re, sys
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urlparse

import jsonschema, requests, yaml
from rapidfuzz import fuzz

# Constants
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
BOUNTIES_PATH = os.path.join(SCRIPT_DIR, "..", "bounties.yml")
SCHEMA_PATH = os.path.join(SCRIPT_DIR, "schema.json")

GITHUB_RAW = "https://raw.githubusercontent.com"
SOURCES = {
    "hackerone":        f"{GITHUB_RAW}/arkadiyt/bounty-targets-data/main/data/hackerone_data.json",
    "bugcrowd":         f"{GITHUB_RAW}/arkadiyt/bounty-targets-data/main/data/bugcrowd_data.json",
    "intigriti":        f"{GITHUB_RAW}/arkadiyt/bounty-targets-data/main/data/intigriti_data.json",
    "yeswehack":        f"{GITHUB_RAW}/arkadiyt/bounty-targets-data/main/data/yeswehack_data.json",
    "federacy":         f"{GITHUB_RAW}/arkadiyt/bounty-targets-data/main/data/federacy_data.json",
    "disclose":         f"{GITHUB_RAW}/disclose/diodb/master/program-list.json",
    "projectdiscovery": f"{GITHUB_RAW}/projectdiscovery/public-bugbounty-programs/main/chaos-bugbounty-list.json",
    "trickest":         f"{GITHUB_RAW}/trickest/inventory/main/targets.json",
}

PLATFORM_DOMAINS = {
    "hackerone.com", "bugcrowd.com", "intigriti.com", "yeswehack.com",
    "federacy.com", "synack.com", "cobalt.io", "yogosha.com",
}

TWO_PART_TLDS = {
    "co.uk", "com.au", "co.nz", "co.jp", "co.kr", "co.in", "co.za",
    "com.br", "com.cn", "com.mx", "com.tr", "com.sg", "com.hk",
    "org.uk", "net.au", "ac.uk", "gov.uk",
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
    "rewards", "min_payout", "max_payout", "currency",
    "safe_harbor", "allows_disclosure", "managed",
    "response_time", "bounty_time", "resolution_time", "response_efficiency",
    "launch_date", "confidentiality_level",
    "domains",
    "pgp_key", "securitytxt_url", "preferred_languages", "hiring",
    "program", "notes", "sources",
]

# Field categories for merge logic
_STR_FIELDS = [
    "safe_harbor", "currency", "handle", "launch_date",
    "pgp_key", "preferred_languages", "securitytxt_url",
    "confidentiality_level",
]
_BOOL_FIELDS = ["allows_disclosure", "managed", "hiring"]
_NUM_FIELDS = ["response_time", "bounty_time", "resolution_time",
               "response_efficiency"]

DEFAULT_HEADER = """\

# List of valid reward types (feel free to add moe)
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

# Configure logging
LOG_LEVEL = os.environ.get("LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=LOG_LEVEL, format="%(levelname)s: %(message)s")
logger = logging.getLogger(__name__)

SESSION = requests.Session()
SESSION.headers["User-Agent"] = "populate-bounties/1.0 (github.com/lissy93/bounties)"


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def normalize_name(name):
    """Normalize a company name for dedup comparison."""
    n = PAREN_RE.sub(" ", name.lower().strip())
    for _ in range(3):
        n = NAME_SUFFIXES.sub("", n).strip()
    return re.sub(r"\s+", " ", n).strip()


def extract_domain(url):
    """Pull the registrable domain from a URL (strips subdomains)."""
    try:
        host = urlparse(url).hostname or ""
    except Exception:
        return ""
    parts = host.lower().rstrip(".").split(".")
    if len(parts) < 2:
        return host
    last_two = ".".join(parts[-2:])
    if last_two in TWO_PART_TLDS and len(parts) >= 3:
        return ".".join(parts[-3:])
    return last_two


def safe_float(val, default=0):
    if isinstance(val, dict):
        val = val.get("value", default)
    try:
        return float(val or default)
    except (TypeError, ValueError):
        return default


def domains_from_targets(targets):
    """Extract domain names from in-scope target entries."""
    domains = set()
    for t in (targets or {}).get("in_scope", []):
        raw = (t.get("asset_identifier") or t.get("target")
               or t.get("endpoint") or t.get("uri") or "")
        if "://" in raw:
            d = extract_domain(raw)
        else:
            d = raw.lstrip("*.").split("/")[0].lower().strip()
        if d and "." in d:
            domains.add(d)
    return sorted(domains)


def make_entry(company, url, source=None, **extra):
    """Build a normalized bounty entry dict, skipping empty values."""
    entry = {"company": company.strip(), "url": url.strip()}
    for k, v in extra.items():
        if v is None or v == "" or v == []:
            continue
        entry[k] = v.strip() if isinstance(v, str) else v
    entry.setdefault("rewards", [])
    if source:
        entry["sources"] = [source]
    return entry


def read_file(path):
    try:
        with open(path) as f:
            logger.info(f"Reading file: {path}")
            return f.read()
    except FileNotFoundError:
        logger.error(f"File not found: {path}")
        sys.exit(1)


def write_file(path, content):
    with open(path, "w") as f:
        logger.info(f"Writing to: {path}")
        f.write(content)


# ---------------------------------------------------------------------------
# Fetch
# ---------------------------------------------------------------------------


def fetch_source(name, url):
    """Fetch JSON from a single source. Returns (name, data | None)."""
    try:
        resp = SESSION.get(url, timeout=30)
        resp.raise_for_status()
        return name, resp.json()
    except Exception as e:
        logger.warning(f"Failed to fetch {name}: {e}")
        return name, None


def fetch_all(skip=None):
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
                count = len(data) if isinstance(data, list) else 0
                logger.info(f"Fetched {name} ({count} entries)")
    return results


# ---------------------------------------------------------------------------
# Normalize — one function per source
# ---------------------------------------------------------------------------


def _get(p, key, fallback=""):
    """Grab a string field from a dict, stripped and safe."""
    return (p.get(key) or fallback).strip()


def normalize_hackerone(data):
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
        extra = dict(
            contact=platform_url, rewards=rewards,
            handle=_get(p, "handle"),
            managed=p.get("managed_program"),
            domains=domains_from_targets(p.get("targets")),
        )
        # Response metrics — only include when present
        for src, dst in [("average_time_to_first_program_response", "response_time"),
                         ("average_time_to_bounty_awarded", "bounty_time"),
                         ("average_time_to_report_resolved", "resolution_time"),
                         ("response_efficiency_percentage", "response_efficiency")]:
            if p.get(src) is not None:
                extra[dst] = p[src]
        entries.append(make_entry(name, url, source="hackerone", **extra))
    return entries


def normalize_bugcrowd(data):
    entries = []
    for p in data:
        name, url = _get(p, "name"), _get(p, "url")
        if not name or not url:
            continue
        if url.startswith("/"):
            url = "https://bugcrowd.com" + url
        rewards, max_payout = [], None
        mp = safe_float(p.get("max_payout"))
        if mp > 0:
            rewards.append("*bounty")
            max_payout = mp
        entries.append(make_entry(
            name, url, source="bugcrowd",
            contact=url, rewards=rewards, max_payout=max_payout,
            allows_disclosure=p.get("allows_disclosure"),
            managed=p.get("managed_by_bugcrowd"),
            safe_harbor=_get(p, "safe_harbor"),
            domains=domains_from_targets(p.get("targets")),
        ))
    return entries


def normalize_intigriti(data):
    entries = []
    for p in data:
        if p.get("status") != "open":
            continue
        name, url = _get(p, "name"), _get(p, "url")
        if not name or not url:
            continue
        if url.startswith("/"):
            url = "https://app.intigriti.com" + url
        rewards, min_payout, max_payout = [], None, None
        mx, mn = safe_float(p.get("max_bounty")), safe_float(p.get("min_bounty"))
        if mx > 0:
            rewards.append("*bounty")
            max_payout = mx
        if mn > 0:
            min_payout = mn
        # Extract currency from bounty objects
        currency = None
        for bkey in ("max_bounty", "min_bounty"):
            bobj = p.get(bkey)
            if isinstance(bobj, dict) and bobj.get("currency"):
                currency = bobj["currency"]
                break
        entries.append(make_entry(
            name, url, source="intigriti",
            contact=url, rewards=rewards,
            min_payout=min_payout, max_payout=max_payout, currency=currency,
            handle=_get(p, "handle") or _get(p, "company_handle"),
            confidentiality_level=_get(p, "confidentiality_level"),
            domains=domains_from_targets(p.get("targets")),
        ))
    return entries


def normalize_yeswehack(data):
    entries = []
    for p in data:
        if p.get("disabled"):
            continue
        name = _get(p, "name")
        slug = _get(p, "slug") or _get(p, "id")
        if not name or not slug:
            continue
        url = f"https://yeswehack.com/programs/{slug}"
        rewards, min_payout, max_payout = [], None, None
        mx, mn = safe_float(p.get("max_bounty")), safe_float(p.get("min_bounty"))
        if mx > 0:
            rewards.append("*bounty")
            max_payout = mx
        if mn > 0:
            min_payout = mn
        entries.append(make_entry(
            name, url, source="yeswehack",
            contact=url, rewards=rewards,
            min_payout=min_payout, max_payout=max_payout,
            managed=p.get("managed"),
            domains=domains_from_targets(p.get("targets")),
        ))
    return entries


def normalize_federacy(data):
    entries = []
    for p in data:
        name, url = _get(p, "name"), _get(p, "url")
        if not name or not url:
            continue
        rewards = ["*bounty"] if p.get("offers_awards") else []
        entries.append(make_entry(
            name, url, source="federacy",
            contact=url, rewards=rewards,
            domains=domains_from_targets(p.get("targets")),
        ))
    return entries


def normalize_disclose(data):
    entries = []
    programs = data if isinstance(data, list) else data.get(
        "program_list", data.get("programs", []))
    for p in programs:
        if p.get("policy_url_status") == "dead":
            continue
        name, url = _get(p, "program_name"), _get(p, "policy_url")
        if not name or not url:
            continue
        # Prefer email contact, fall back to URL
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
            name, url, source="disclose",
            contact=contact, rewards=rewards,
            safe_harbor=_get(p, "safe_harbor"),
            launch_date=_get(p, "launch_date"),
            pgp_key=_get(p, "pgp_key"),
            preferred_languages=_get(p, "preferred_languages"),
            securitytxt_url=_get(p, "securitytxt_url"),
            hiring=bool(_get(p, "hiring")) or None,
        ))
    return entries


def normalize_projectdiscovery(data):
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
            name, url, source="projectdiscovery",
            contact=url, rewards=rewards,
            domains=p.get("domains", []),
        ))
    return entries


def normalize_trickest(data):
    entries = []
    programs = data if isinstance(data, list) else data.get("targets", [])
    for p in programs:
        name, url = _get(p, "name"), _get(p, "url")
        if not name or not url:
            continue
        entries.append(make_entry(
            name, url, source="trickest",
            contact=url, rewards=[],
            domains=p.get("domains", []),
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
    "trickest": normalize_trickest,
}


def normalize_all(raw_data):
    """Run all source normalizers, return a flat list."""
    all_entries = []
    for name, data in raw_data.items():
        fn = NORMALIZERS.get(name)
        if not fn:
            logger.warning(f"No normalizer for {name}")
            continue
        entries = fn(data)
        logger.info(f"Normalized {name}: {len(entries)} entries")
        all_entries.extend(entries)
    return all_entries


# ---------------------------------------------------------------------------
# Deduplicate — 3-pass: exact name → domain → fuzzy
# ---------------------------------------------------------------------------


def _merge_group(group):
    """Merge a group of duplicate entries into one."""
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

    # List fields: union and sort
    for key in ("rewards", "sources", "domains"):
        items = {v for e in group for v in e.get(key, [])}
        if items:
            merged[key] = sorted(items)

    # Payouts: min of mins, max of maxes
    min_pays = [e["min_payout"] for e in group if "min_payout" in e]
    max_pays = [e["max_payout"] for e in group if "max_payout" in e]
    if min_pays:
        merged["min_payout"] = min(min_pays)
    if max_pays:
        merged["max_payout"] = max(max_pays)

    # String fields: first non-empty wins
    for key in _STR_FIELDS:
        for e in group:
            if e.get(key):
                merged[key] = e[key]
                break

    # Bool fields: True if any source says True
    for key in _BOOL_FIELDS:
        vals = [e[key] for e in group if key in e]
        if vals:
            merged[key] = any(vals)

    # Numeric fields: first available wins
    for key in _NUM_FIELDS:
        for e in group:
            if key in e:
                merged[key] = e[key]
                break

    return merged


def deduplicate(entries):
    """Three-pass dedup: exact name → domain → fuzzy."""
    entries = sorted(entries, key=lambda e: e["company"].lower())

    # Pass 1: exact normalized name
    by_name = {}
    for e in entries:
        by_name.setdefault(normalize_name(e["company"]), []).append(e)
    pass1 = [_merge_group(g) for _, g in sorted(by_name.items())]

    # Pass 2: group by domain (skip platform domains)
    by_domain = {}
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
    used = set()
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

    logger.info(f"Deduplicated {len(entries)} → {len(final)} entries")
    return final


# ---------------------------------------------------------------------------
# Validate
# ---------------------------------------------------------------------------


def validate_entries(entries, schema_path):
    """Validate entries against schema, drop invalid ones."""
    schema = json.loads(read_file(schema_path))
    valid = []
    for e in entries:
        try:
            jsonschema.validate(e, schema)
            valid.append(e)
        except jsonschema.ValidationError as err:
            logger.debug(f"Dropping invalid: {e.get('company', '?')}: {err.message}")
    dropped = len(entries) - len(valid)
    if dropped:
        logger.info(f"Validation dropped {dropped} entries")
    return valid


# ---------------------------------------------------------------------------
# Merge with existing bounties.yml
# ---------------------------------------------------------------------------


def enrich_entry(existing, incoming):
    """Enrich an existing entry with incoming data (existing values win)."""
    # String fields: only fill gaps
    for key in ("contact", *_STR_FIELDS):
        if key not in existing and incoming.get(key):
            existing[key] = incoming[key]

    # List fields: union
    for key in ("rewards", "sources", "domains"):
        items = set(existing.get(key) or [])
        items.update(incoming.get(key, []))
        if items:
            existing[key] = sorted(items)
        elif key == "rewards":
            existing[key] = []

    # Numeric fields: only fill gaps
    for key in ("min_payout", "max_payout", *_NUM_FIELDS):
        if key not in existing and key in incoming:
            existing[key] = incoming[key]

    # Bool fields: only fill gaps
    for key in _BOOL_FIELDS:
        if key not in existing and key in incoming:
            existing[key] = incoming[key]


def load_existing(path):
    """Load bounties.yml. Returns (header_lines, entries)."""
    if not os.path.exists(path):
        return [], []
    raw = read_file(path)

    # Grab everything up to and including the `companies:` line
    header_lines = []
    for i, line in enumerate(raw.split("\n")):
        if line.strip().startswith("companies:"):
            header_lines = raw.split("\n")[:i + 1]
            break

    try:
        data = yaml.safe_load(raw)
        return header_lines, (data.get("companies", []) if data else [])
    except Exception as e:
        logger.warning(f"Failed to parse existing YAML: {e}")
        return header_lines, []


def merge_entries(existing, incoming):
    """Merge incoming into existing. Existing data always wins. Returns (merged, new_count)."""
    by_name, by_domain = {}, {}
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


# ---------------------------------------------------------------------------
# YAML output
# ---------------------------------------------------------------------------


class OrderedDumper(yaml.SafeDumper):
    pass


def _dict_representer(dumper, data):
    pairs = [(k, data[k]) for k in FIELD_ORDER if k in data]
    pairs += [(k, data[k]) for k in data if k not in FIELD_ORDER]
    return dumper.represent_mapping("tag:yaml.org,2002:map", pairs)


OrderedDumper.add_representer(dict, _dict_representer)


def prepare_entry(entry):
    """Ensure every entry has contact + rewards, and clean up float values."""
    out = dict(entry)
    out.setdefault("contact", "")
    out.setdefault("rewards", [])
    for key in ("min_payout", "max_payout", *_NUM_FIELDS):
        if key in out and isinstance(out[key], float) and out[key] == int(out[key]):
            out[key] = int(out[key])
    return out


def write_bounties(entries, output_path, header_lines=None):
    """Write sorted entries to YAML with the original file header."""
    entries = sorted(entries, key=lambda e: e["company"].lower())
    header = ("\n".join(header_lines) + "\n") if header_lines else DEFAULT_HEADER
    body = yaml.dump(
        [prepare_entry(e) for e in entries],
        Dumper=OrderedDumper, default_flow_style=False,
        allow_unicode=True, sort_keys=False, width=200,
    )
    write_file(output_path, header + body)
    logger.info(f"Wrote {len(entries)} entries to {output_path}")


# ---------------------------------------------------------------------------
# CLI + main
# ---------------------------------------------------------------------------


def print_stats(raw_data, normalized, deduplicated, merged_count, new_count):
    norm_counts = {}
    for e in normalized:
        for s in e.get("sources", []):
            norm_counts[s] = norm_counts.get(s, 0) + 1

    print("\n--- Source Statistics ---")
    print(f"{'Source':<20} {'Fetched':>10} {'Normalized':>12}")
    print("-" * 44)
    for name in sorted(SOURCES):
        raw = raw_data.get(name)
        fetched = len(raw) if isinstance(raw, list) else 0
        print(f"{name:<20} {fetched:>10} {norm_counts.get(name, 0):>12}")
    print("-" * 44)
    total = sum(len(v) if isinstance(v, list) else 0 for v in raw_data.values())
    print(f"{'Total':<20} {total:>10} {len(normalized):>12}")
    print(f"\nAfter dedup: {len(deduplicated)}")
    print(f"Merged total: {merged_count}")
    print(f"New entries added: {new_count}")


def main():
    parser = argparse.ArgumentParser(
        description="Populate bounties.yml from public bug bounty sources")
    parser.add_argument("--dry-run", action="store_true",
                        help="Print stats without writing")
    parser.add_argument("--verbose", action="store_true",
                        help="Enable debug logging")
    parser.add_argument("--output", default=BOUNTIES_PATH,
                        help="Output path (default: bounties.yml)")
    parser.add_argument("--skip-source", action="append", default=[],
                        dest="skip_sources",
                        help="Skip a source by name (repeatable)")
    parser.add_argument("--stats", action="store_true",
                        help="Print per-source statistics")
    args = parser.parse_args()

    if args.verbose:
        logging.getLogger().setLevel(logging.DEBUG)

    # Fetch + normalize + deduplicate
    raw_data = fetch_all(skip=args.skip_sources)
    if not raw_data:
        logger.error("No sources fetched, aborting")
        sys.exit(1)

    normalized = normalize_all(raw_data)
    deduplicated = validate_entries(deduplicate(normalized), SCHEMA_PATH)

    # Merge with existing file
    header_lines, existing = load_existing(args.output)
    merged, new_count = merge_entries(existing, deduplicated)
    merged = validate_entries(merged, SCHEMA_PATH)

    if args.stats:
        print_stats(raw_data, normalized, deduplicated, len(merged), new_count)
    if args.dry_run:
        print(f"\nDry run: would write {len(merged)} entries to {args.output}")
        return

    write_bounties(merged, args.output, header_lines or None)
    print(f"Done: {len(merged)} entries written ({new_count} new)")


if __name__ == "__main__":
    main()
