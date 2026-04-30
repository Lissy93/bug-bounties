---
layout: "@layouts/MarkdownLayout.astro"
title: "Bug Bounty Toolkit: Essential Tools and How to Set Them Up"
description: "The actual tools working bounty hunters use daily, with setup instructions and configuration tips - not just a list of names."
date: "2026-04-07"
---

Every "top 50 bug bounty tools" list has the same problem: it gives you names without context. You install 30 things, configure none of them, and end up with a cluttered home directory and no workflow. I have wasted entire weekends on that cycle. This guide is different. It covers the tools that actually matter, how to configure them for bounty work specifically, and where to stop adding complexity.

If you have not picked a program yet, start with [choosing your first bug bounty program](/learn/choosing-your-first-bug-bounty-program) before building out your toolkit. The tools you need depend on the target.

## The minimal starter kit

You can find real bugs with three things: an intercepting proxy, a properly configured browser, and a terminal. That is not an exaggeration. I found my first paid bounty with just Burp Suite Community and Firefox. Everything else is optimization.

Here is the minimum:

- **Burp Suite Community Edition** - your intercepting proxy. Free, and sufficient for most web testing.
- **Firefox** with a dedicated testing profile - separate from your daily browser.
- **A terminal** with basic command-line comfort.

If you want to spend money on exactly one thing, Burp Suite Professional is the right choice. But do not buy it until you have found at least a few bugs with Community. You need to understand what the free version cannot do before the paid version makes sense.

## Configuring Burp Suite for bounty work

Installing Burp is the easy part. The default configuration wastes your time in several ways that are worth fixing immediately.

### Scope control

The first thing I do on any new target is set the scope. Target > Scope settings > Add the in-scope domains. Then go to Proxy > HTTP history and set the filter to show only in-scope items. This alone saves you from drowning in noise from CDNs, analytics, and third-party scripts.

### Useful project options

Under Project options > HTTP, disable "Follow redirections" in the default settings. You want to see redirects as they happen, not chase them automatically. Many access control bugs live in redirect behavior.

Turn on response highlighting for interesting strings. Go to Proxy > Options > Match and Replace, and add rules that flag things like:

```
Type: Response body
Match: (api[_-]?key|secret|token|password)
Replace: [HIGHLIGHTED] $1
Regex: true
```

### Burp extensions worth installing

Open the BApp Store (Extender > BApp Store) and install these:

- **Autorize** - replays requests with a lower-privilege session. If you are testing access control (and you should be), this saves enormous time.
- **Logger++** - better logging than the built-in HTTP history. Filterable, searchable, exportable.
- **Param Miner** - finds hidden parameters. Slow, but has found me real bugs.
- **Hackvertor** - encoding/decoding Swiss army knife. Faster than doing it manually.

Skip the extensions that duplicate built-in functionality. You do not need a separate JSON beautifier, Burp already does that.

For more on what to do once Burp is running, see the [Burp Suite documentation](https://portswigger.net/burp/documentation).

## Browser setup

Create a dedicated Firefox profile for testing:

```bash
firefox -CreateProfile "bounty"
firefox -P "bounty" --no-remote
```

The `--no-remote` flag prevents it from merging with your existing Firefox session.

### Extensions for the testing profile

- **FoxyProxy** - switches between Burp proxy and direct connection with one click. Configure it to send traffic to `127.0.0.1:8080` (Burp's default listener).
- **Wappalyzer** - identifies tech stacks. Knowing the target runs Laravel vs. Express changes your testing approach.
- **Cookie-Editor** - view and modify cookies without opening DevTools every time.
- **PenetrationTesting Kit** - quick access to encoding, hashing, and common payloads.

Do not install ad blockers or privacy extensions on your testing profile. They interfere with traffic interception and hide requests you need to see.

### The Burp CA certificate

You will get TLS errors until you install Burp's CA certificate. With Burp running and your proxy configured, visit `http://burpsuite` and download the certificate. Import it into Firefox's certificate store under Settings > Privacy & Security > Certificates > View Certificates > Authorities > Import.

## Recon tools that earn their setup time

Recon is where tooling makes the biggest difference. Manual recon on a large scope is just not viable. But you do not need every tool in the ProjectDiscovery ecosystem on day one.

For a deeper recon methodology, see [bug bounty recon methodology](/learn/bug-bounty-recon-methodology).

### subfinder - subdomain enumeration

[subfinder](https://github.com/projectdiscovery/subfinder) pulls subdomains from passive sources like certificate transparency logs, search engines, and DNS datasets.

```bash
go install -v github.com/projectdiscovery/subfinder/v2/cmd/subfinder@latest
```

Basic usage:

```bash
subfinder -d target.com -o subdomains.txt
```

The real power comes from configuring API keys. Create `~/.config/subfinder/provider-config.yaml`:

```yaml
censys:
  - ac_key:ac_secret
securitytrails:
  - your_api_key_here
shodan:
  - your_api_key_here
chaos:
  - your_api_key_here
```

Free tiers from Censys, SecurityTrails, and Shodan are enough. With API keys configured, subfinder typically finds 3-5x more subdomains than without them. That difference matters.

### httpx - probing live hosts

Found 2,000 subdomains? Most are dead. [httpx](https://github.com/projectdiscovery/httpx) tells you which ones are actually responding.

```bash
go install -v github.com/projectdiscovery/httpx/v2/cmd/httpx@latest
```

Pipe subfinder directly into httpx:

```bash
subfinder -d target.com -silent | httpx -silent -status-code -title -tech-detect -o live-hosts.txt
```

The `-tech-detect` flag identifies technologies on each host. This is useful for prioritizing - a forgotten Jenkins instance is more interesting than the marketing site.

### nuclei - vulnerability scanning

[nuclei](https://github.com/projectdiscovery/nuclei) runs template-based checks against your target list. It is not a "push button, get bounty" tool, but it catches low-hanging fruit that you would otherwise miss.

```bash
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest
nuclei -update-templates
```

Run it against your live hosts:

```bash
nuclei -l live-hosts.txt -severity medium,high,critical -o nuclei-results.txt
```

I skip `low` and `info` severity on the first pass. They generate too much noise. Once you have triaged the higher-severity findings, go back and look at the informational results for anything interesting.

A common mistake: running nuclei against a target and reporting whatever it finds without manual verification. Triagers see this constantly and it gets your reports closed as "not applicable." Always verify nuclei findings manually before reporting. See [writing your first report](/learn/writing-your-first-report) for how to structure what you find.

### The one-liner workflow

Here is how these three tools chain together for initial recon on a new target:

```bash
subfinder -d target.com -silent | httpx -silent -o live.txt && nuclei -l live.txt -severity medium,high,critical -o findings.txt
```

That single pipeline handles subdomain enumeration, liveness checking, and basic vulnerability scanning. Run it, go get coffee, come back to a starting point.

## OWASP ZAP as a free alternative

If you are not ready to pay for Burp Professional and find Community too limited, [OWASP ZAP](https://owasp.org/www-project-zap/) is a solid free alternative. It has an active scanner (which Burp Community lacks), decent scripting support, and a marketplace of add-ons.

ZAP's automated scanning is useful for finding issues like missing security headers or basic injection points. But I still recommend learning Burp, because most educational content, walkthroughs, and team workflows assume Burp. The skills transfer both ways, though.

## Organizing your workflow

Finding bugs is half the work. The other half is tracking what you tested, what you found, and having evidence ready when you write the report.

### Notes

Use whatever you will actually maintain. I use a directory structure like this:

```
~/bounties/
  program-name/
    scope.txt
    recon/
      subdomains.txt
      live-hosts.txt
      nuclei-results.txt
    findings/
      001-idor-user-api/
        notes.md
        request.txt
        response.txt
        screenshots/
    reports/
      001-idor-user-api.md
```

Each finding gets its own numbered directory. The number makes it easy to reference and keeps things sorted chronologically. Put raw HTTP requests and responses in text files, not just screenshots. Triagers want to reproduce your work, and copy-pasting from a text file is faster than retyping from a screenshot.

### Screenshots

Use a tool that lets you annotate. On Linux, Flameshot works well. On macOS, the built-in screenshot tool with markup is fine. On Windows, ShareX is the best option.

Always capture:

- The vulnerable request/response in Burp
- The browser showing the impact (if visible)
- Any relevant configuration or error messages

Name your screenshots descriptively. `idor-user-api-response.png` is better than `Screenshot 2026-04-07 143022.png`.

### Evidence for the report

When you find something worth reporting, immediately save the full request and response from Burp. Right-click > Save item. Do this before you keep testing, because it is easy to lose the exact request in your history.

For [XSS findings](/learn/finding-xss-vulnerabilities-in-bug-bounties), record a short screen capture showing the payload executing. For [API issues](/learn/api-security-testing-for-bug-bounties), save the curl commands that demonstrate the vulnerability.

## Free vs. paid: where money actually helps

Here is an honest breakdown of where spending money changes your results.

| Tool | Free tier | Paid tier | Worth paying? |
|------|-----------|-----------|---------------|
| Burp Suite | Community (no active scanner, rate-limited Intruder) | Professional ($449/year) - active scanner, fast Intruder, save/restore | Yes, after 3-6 months |
| subfinder | Works fine without API keys | API keys from free tiers of Censys, Shodan, etc. | Free tiers are enough |
| nuclei | Fully open source | N/A | Free |
| VPS for recon | N/A | $5-10/month DigitalOcean or Hetzner | Yes, for large-scope programs |
| Caido | Free tier with basic proxy | Pro with more features | Maybe, if you prefer it over Burp |

The biggest return on investment is a cheap VPS. Running recon from a cloud server with a fast connection is dramatically faster than running it from a home connection. A $5/month droplet handles subfinder, httpx, and nuclei perfectly.

Burp Professional is the second-best investment. The active scanner finds issues you would miss manually, and the unrestricted Intruder is useful for fuzzing parameters. But it is a waste of money if you have not learned to use Community effectively first.

Everything else, you can get by without. Premium Shodan, fancy wordlists, commercial scanners. These help at the margins, but the margins are not where beginners should focus.

## What you do not need (yet)

I want to be direct about tools that are frequently recommended but are not necessary when starting out:

- **Custom wordlists** - the defaults in SecLists are fine. Build custom lists after you understand what you are looking for.
- **Multiple proxy tools** - pick Burp or ZAP, learn it well. Running both just means you are proficient in neither.
- **Automated frameworks** that chain 15 tools together - if you do not understand what each tool does individually, you cannot interpret the output.
- **Expensive training platforms** - PortSwigger Web Security Academy is free and better than most paid courses.

## Putting it together

Here is the sequence I recommend:

1. Install Burp Suite Community. Configure scope, filters, and the CA certificate.
2. Set up a dedicated Firefox profile with FoxyProxy and Wappalyzer.
3. Pick a program from the [learn hub](/learn) resources and start manual testing.
4. After a few weeks of manual work, install subfinder, httpx, and nuclei.
5. Gradually build your workflow around what you actually use.

The temptation is to install everything up front and feel prepared. Resist it. Each tool should solve a problem you have already encountered. If you have not felt the pain of manual subdomain enumeration, you will not configure subfinder properly, and it will just be another unused binary in your `$GOPATH`.

Start small. Add tools when they solve real problems. That is the only toolkit advice that actually works.
