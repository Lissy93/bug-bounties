---
layout: "@layouts/MarkdownLayout.astro"
title: "Recon Methodology for Bug Bounties: Finding Attack Surface Others Miss"
description: "A structured reconnaissance workflow for bounty programs, covering subdomain enumeration, technology fingerprinting, and hidden endpoint discovery."
date: "2026-04-07"
---

Most bug bounty hunters spend their time on the same five subdomains everyone else already tested. The ones earning consistently have better recon, not better exploits. Recon is how you find the forgotten staging server, the undocumented API, the admin panel exposed on a non-standard port. But recon also has a failure mode: spending so long mapping the surface that you never actually test anything.

This article walks through a layered recon process. Each layer has diminishing returns. I will tell you when to stop.

## The recon mindset

Before running any tools, understand what you are actually trying to do. You want to answer two questions:

1. What assets does this target expose to the internet?
2. Which of those assets are likely to have vulnerabilities?

That is it. Every recon technique exists to answer one of those two questions. If a technique is not helping you answer either, you are wasting time.

If you have not picked a program yet, start with [choosing your first bug bounty program](/learn/choosing-your-first-bug-bounty-program). The scope definition will shape your entire recon approach.

## Layer 1: passive recon

Passive recon means gathering information without sending any traffic to the target. You are reading public records, search engine results, and third-party databases. This is safe, legal, and often more productive than people expect.

### DNS and subdomain discovery

Start with [subfinder](https://github.com/projectdiscovery/subfinder). It queries dozens of passive sources - certificate transparency logs, DNS datasets, search engines - and aggregates the results.

```bash
subfinder -d example.com -o subs.txt
```

This gives you a list of subdomains the target has exposed at some point. Some will be dead. Some will be internal names that leaked into CT logs. All of them are worth recording.

Certificate Transparency is one of the best passive sources. Every publicly trusted TLS certificate gets logged to append-only [CT logs](https://certificate.transparency.dev/), and you can search them. Sites like crt.sh let you query these logs directly:

```bash
curl -s "https://crt.sh/?q=%25.example.com&output=json" | jq -r '.[].name_value' | sort -u
```

The `%25` is a URL-encoded wildcard. This catches subdomains across all certificates ever issued for the domain.

### Historical data

[waybackurls](https://github.com/tomnomnom/waybackurls) pulls URLs from the Wayback Machine. Old endpoints often still work, or reveal patterns the current site follows.

```bash
waybackurls example.com | sort -u > wayback.txt
```

Look through this output for:

- API endpoints (`/api/v1/`, `/api/v2/`, `/graphql`)
- Admin paths (`/admin`, `/manage`, `/dashboard`)
- File uploads or storage paths (`/uploads/`, `/files/`, `/s3/`)
- Old parameter names that hint at functionality

I have found valid bugs on endpoints that were "removed" from the UI but still responded on the server. Developers remove links more often than they remove routes.

### WHOIS and ASN lookup

Check who owns the IP ranges. Large companies often have their own ASN, and all IPs in that range are fair game if the scope says "*.example.com" or mentions the company broadly.

```bash
whois -h whois.radb.net -- '-i origin AS12345' | grep -Eo '([0-9.]+){4}/[0-9]+'
```

Replace `AS12345` with the target's actual ASN. You can find ASN numbers through sites like bgp.he.net or by running `whois` on their primary IP.

### security.txt and initial research

Before going deeper, check if the target publishes a `security.txt` file. You can use the [lookup tool](/lookup) on this site to quickly pull security contacts, bug bounty program links, and disclosure policies. This often saves you from testing assets that are explicitly out of scope.

### Search engine dorking

Google dorking still works. A few queries I run early:

```
site:example.com filetype:pdf
site:example.com inurl:admin
site:example.com intitle:"index of"
site:example.com ext:json OR ext:xml OR ext:yaml
"example.com" site:pastebin.com OR site:github.com
```

That last one catches leaked credentials, config files, and internal documentation that ended up in public repos or paste sites.

## Layer 2: active enumeration

Now you are sending traffic to the target. Make sure you are within scope and following the program's rules. Some programs prohibit port scanning or rate-limit testing. Read the policy.

### Resolving and probing subdomains

Not every subdomain from passive recon is alive. Filter down to the ones that actually respond:

```bash
cat subs.txt | httpx -silent -status-code -title -tech-detect -o alive.txt
```

[httpx](https://github.com/projectdiscovery/httpx) from ProjectDiscovery is the standard tool here. It probes each subdomain over HTTP and HTTPS, reports status codes, page titles, and detected technologies. The `-tech-detect` flag uses Wappalyzer signatures to identify frameworks, CMS platforms, and server software.

Pay attention to:

- Subdomains returning 401 or 403 (something is there, it is just protected)
- Subdomains with default pages (fresh installs often have misconfigurations)
- Subdomains running different tech stacks than the main site (these get less attention from other hunters)
- Anything with "staging", "dev", "test", "uat", or "internal" in the name

### Port scanning

If the program allows it, scan beyond ports 80 and 443:

```bash
nmap -sS -T4 --top-ports 1000 -oG ports.txt TARGET_IP
```

Or for a faster approach across many hosts:

```bash
masscan -p1-65535 TARGET_IP --rate=1000 -oG masscan.txt
```

Non-standard ports are where you find debugging interfaces, database management panels, and services that were never meant to be public. I once found a Redis instance on port 6379 with no authentication on a target's staging server. That was a critical finding.

### Technology fingerprinting

Knowing what stack a target runs narrows your attack surface. If it is a Rails app, you check for mass assignment and IDOR patterns. If it is a Node/Express app, you look for prototype pollution and SSRF. PHP apps have their own class of issues.

Beyond what httpx reports, check:

- Response headers (`X-Powered-By`, `Server`, `X-AspNet-Version`)
- Cookie names (`JSESSIONID` = Java, `PHPSESSID` = PHP, `connect.sid` = Node)
- HTML comments and meta generators
- JavaScript framework fingerprints in page source
- Error pages (trigger a 404 or 500 and see what the default error template reveals)

For a deeper look at tools for this phase, see [bug bounty toolkit setup](/learn/bug-bounty-toolkit-setup).

## Layer 3: content discovery

This is where you find the stuff that is not linked anywhere. Hidden endpoints, old admin panels, backup files, debug routes.

### Directory brute-forcing

Use `ffuf` or `feroxbuster` with a good wordlist:

```bash
ffuf -u https://target.example.com/FUZZ -w /usr/share/seclists/Discovery/Web-Content/raft-medium-directories.txt -mc 200,301,302,403 -o ffuf-results.json
```

Wordlist choice matters more than tool choice. SecLists has several good ones. For API paths specifically:

```bash
ffuf -u https://api.example.com/FUZZ -w /usr/share/seclists/Discovery/Web-Content/api/api-endpoints.txt -mc 200,301,302,403,405
```

Note the `405` status code. "Method Not Allowed" means the path exists but you used the wrong HTTP verb. Try POST, PUT, DELETE, PATCH.

### JavaScript file analysis

Modern web apps ship their routing, API calls, and sometimes secrets directly to the browser in JavaScript bundles. This is one of the most underused recon techniques.

```bash
# Extract JS file URLs from a page
cat wayback.txt | grep -E '\.js(\?|$)' | sort -u > js-files.txt

# Download them
cat js-files.txt | xargs -I{} wget -q {}

# Search for interesting strings
grep -rE '(api_key|apikey|secret|password|token|endpoint|/api/)' *.js
```

You can also use tools like `LinkFinder` to extract endpoints from JS files automatically:

```bash
python3 linkfinder.py -i https://target.example.com/app.js -o cli
```

I have found hardcoded API keys, internal hostnames, and hidden admin endpoints just by reading minified JavaScript. It takes patience, but the payoff can be significant.

Things to look for in JS files:

- API routes and base URLs
- AWS S3 bucket names or other cloud resource identifiers
- Hardcoded tokens or keys
- Comments with developer notes
- Feature flags that reveal unreleased functionality
- WebSocket endpoints

### Parameter discovery

Once you find endpoints, you need to know what parameters they accept. Tools like `Arjun` automate this:

```bash
arjun -u https://target.example.com/api/search -m GET POST
```

You can also mine parameters from historical data:

```bash
cat wayback.txt | grep "example.com" | unfurl --unique keys
```

## Knowing when to stop

Here is where most new hunters go wrong. Recon feels productive. You are finding things, building lists, running scans. But recon is not the goal. Finding vulnerabilities is the goal.

I use a simple rule: if the last hour of recon did not reveal any new, testable attack surface, stop and start testing what you have.

Each recon layer has diminishing returns:

| Layer | Typical time | Expected new findings |
|-------|-------------|----------------------|
| Passive recon | 1-2 hours | 60-80% of total attack surface |
| Active enumeration | 1-3 hours | 15-25% more |
| Content discovery | 2-4 hours | 5-10% more |
| Deep JS analysis, parameter mining | 2+ hours | 1-5% more |

After passive recon and basic active enumeration, you probably have enough to start testing. Run content discovery in the background while you manually explore the application.

The hunters I know who earn the most spend maybe 30% of their time on recon and 70% on actually testing. The hunters who earn nothing spend 90% on recon and never submit a report.

## Organizing your output

Recon produces a lot of data. If you cannot find it later, it was pointless.

### File structure

I keep a directory per target:

```
targets/
  example.com/
    subs.txt          # all discovered subdomains
    alive.txt         # subdomains that respond
    wayback.txt       # historical URLs
    ports.txt         # port scan results
    js-files/         # downloaded JS bundles
    ffuf/             # directory brute-force output
    notes.md          # manual observations
```

### Tagging interesting finds

In `notes.md`, I tag things by what I want to test:

```markdown
## High priority
- staging.example.com - runs older version, has debug headers
- api.example.com/v1/ - returns detailed error messages
- admin.example.com - 403 but worth trying auth bypasses

## Medium priority
- uploads.example.com - S3 bucket, check ACLs
- old.example.com - legacy app, might have known CVEs

## Low priority
- blog.example.com - WordPress, probably patched
- docs.example.com - static site, limited attack surface
```

### Automation

If you test multiple programs, automate the boring parts. A simple bash script that runs subfinder, httpx, and waybackurls saves 20 minutes per target:

```bash
#!/bin/bash
TARGET=$1
mkdir -p "targets/$TARGET"

subfinder -d "$TARGET" -silent -o "targets/$TARGET/subs.txt"
cat "targets/$TARGET/subs.txt" | httpx -silent -status-code -title -o "targets/$TARGET/alive.txt"
waybackurls "$TARGET" | sort -u > "targets/$TARGET/wayback.txt"

echo "Recon complete for $TARGET"
echo "Alive hosts: $(wc -l < targets/$TARGET/alive.txt)"
echo "Wayback URLs: $(wc -l < targets/$TARGET/wayback.txt)"
```

Run it, review the output, then spend your time on manual testing where human judgment actually matters.

## Where recon leads

Recon is not a separate phase that ends before testing begins. You will loop back to it constantly. While testing an endpoint, you notice a new subdomain in a response header. While reading JavaScript, you find an API path you missed. Recon and testing feed each other.

The specific vulnerabilities you hunt depend on what you find:

- Found API endpoints? Read about [API security testing](/learn/api-security-testing-for-bug-bounties)
- Found user input reflected in pages? Look into [finding XSS vulnerabilities](/learn/finding-xss-vulnerabilities-in-bug-bounties)
- Found open source components? Try [reading the source for vulnerabilities](/learn/reading-source-code-for-vulnerabilities)
- Found anything interesting? Learn about [information disclosure](https://portswigger.net/web-security/information-disclosure) patterns

The point of recon is to give you better targets than everyone else. Do it well, do it fast, and then go find bugs.
