---
layout: "@layouts/MarkdownLayout.astro"
title: "security.txt: How to Use It as a Researcher (and Why 78% of Companies Still Don't Have One)"
description: "How RFC 9116 security.txt works, how to find and parse it for bounty hunting, and what to do when a target does not have one."
date: "2026-04-07"
---

Before you write a single line in Burp, before you fire up subfinder, the first thing you should check on any target is whether it has a `security.txt` file. It takes five seconds. It tells you exactly where to report vulnerabilities, whether the company has a formal disclosure policy, and often whether they run a bounty program at all. Yet most researchers skip this step entirely, and most companies have not bothered to create one.

That disconnect is worth understanding.

## What security.txt actually is

`security.txt` is a plain text file that lives at `/.well-known/security.txt` on a web server. It follows a machine-readable format defined in [RFC 9116](https://datatracker.ietf.org/doc/html/rfc9116), published in April 2022 by Edwin "EdOverflow" Foudil and Yakov Shafranovich. The idea is simple: give security researchers a standardized way to find reporting instructions instead of guessing at `security@company.com` or hunting through a corporate website for a buried "Responsible Disclosure" page.

The [securitytxt.org](https://securitytxt.org/) project maintains a generator and validator. [CISA actively promotes adoption](https://www.cisa.gov/news-events/news/securitytxt-simple-file-big-value) across US government agencies and critical infrastructure operators.

Here is what a real, well-constructed `security.txt` looks like:

```
# Our security policy
Contact: https://hackerone.com/example-corp
Contact: mailto:security@example.com
Expires: 2027-01-01T00:00:00.000Z
Encryption: https://example.com/.well-known/pgp-key.txt
Preferred-Languages: en, es
Policy: https://example.com/security-policy
Acknowledgments: https://example.com/hall-of-fame
Canonical: https://example.com/.well-known/security.txt
Hiring: https://example.com/careers/security
```

That is the entire format. No JSON. No XML. Just key-value pairs, one per line, with comments prefixed by `#`.

## The fields and what they tell you

Not every field carries the same weight for a researcher. Here is what I actually look for and why.

### Contact (required)

This is the only required field. It can be a URL (usually a bug bounty platform or a reporting form), a `mailto:` address, or a `tel:` phone number. A file can have multiple Contact entries, and the order indicates preference.

When you see a HackerOne or Bugcrowd URL here, you know the company runs a formal program. That alone is worth knowing. When you see just a `mailto:` address with no platform link, expect a slower and less structured process.

### Expires (required)

An ISO 8601 timestamp indicating when the file should no longer be considered valid. This field is required by RFC 9116, and it matters more than people think. If the expiry date has passed, the contact information might be stale. I have reported to dead email addresses because I did not check this field. Do not make the same mistake.

### Policy

A URL pointing to the company's vulnerability disclosure policy (VDP) or bounty program terms. This is where you find scope, exclusions, safe harbor language, and payout ranges. If you are evaluating whether to spend time on a target, this link is the fastest way to answer that question. For more on what to look for in those terms, see [choosing your first bug bounty program](/learn/choosing-your-first-bug-bounty-program).

### Encryption

A link to the organization's PGP public key for encrypting vulnerability reports. Not all companies provide this. If you are reporting something sensitive, like a data exposure or an authentication bypass that could be actively exploited, use it. If the finding is a low-severity UI issue, I would not bother with PGP.

### Acknowledgments

A URL to the company's hall of fame or acknowledgments page. This field is useful for gauging program maturity. If the page exists and lists researchers with dates, the company has been receiving and handling reports for a while. If the URL 404s, draw your own conclusions.

### Preferred-Languages

A comma-separated list of language codes. Mostly relevant for non-English-speaking organizations. If you are reporting to a Japanese company and the file says `Preferred-Languages: ja, en`, consider whether your report should lead with Japanese or English.

### Canonical

The definitive URL for the `security.txt` file itself. This exists to prevent spoofing. If you fetched the file from one URL but the Canonical field points somewhere else, verify at the canonical location.

### Hiring

A link to the company's security job openings. Not directly relevant to reporting, but if you are doing this professionally, it is worth a glance.

## Finding security.txt in practice

The file should be at `https://example.com/.well-known/security.txt`. The spec also allows `https://example.com/security.txt` as a legacy location, but `.well-known` is the canonical path per RFC 9116.

You can check manually with curl:

```bash
curl -sL https://example.com/.well-known/security.txt
```

The `-L` flag follows redirects, which matters because some sites redirect from HTTP to HTTPS or from the root domain to `www`.

For a faster approach, use the [lookup tool on this site](/lookup). Enter a domain and it will fetch and parse the `security.txt` file for you, pulling out the contact information, policy links, and expiry status. It also checks related sources like DNS records and platform profiles.

When testing multiple targets, you can script it:

```bash
while read domain; do
  echo "=== $domain ==="
  curl -sL -m 5 "https://$domain/.well-known/security.txt"
  echo
done < targets.txt
```

The `-m 5` sets a five-second timeout so you do not hang on unresponsive hosts.

## Using security.txt for bounty hunting

I think of `security.txt` as a triage filter. When I am deciding where to spend my time, the presence or absence of this file tells me a lot about a target.

A company with a complete `security.txt` that links to a HackerOne or Bugcrowd program, includes a policy URL, and has a valid expiry date is a company that takes vulnerability reports seriously. They have thought about the process. They have probably assigned someone to handle incoming reports. Your findings will be triaged by someone who knows what an IDOR is.

A company with a `security.txt` that only has a `mailto:` contact and no policy link is somewhere in the middle. They know `security.txt` exists, but they may not have a formal program. Reports might land in a shared inbox and sit for weeks.

A company with no `security.txt` at all could mean several things. They might have a bounty program listed on a platform but never set up the file. They might have no disclosure process whatsoever. You need to do more digging.

## When there is no security.txt

This happens more often than not. A 2025 study found that 78% of the top 50 IT companies by revenue had no `security.txt` file. If major tech companies cannot be bothered, smaller organizations are even less likely to have one.

When the file is missing, here is my process:

1. Check the [lookup tool](/lookup) anyway. It searches beyond just `security.txt`, checking for bounty program listings on major platforms.
2. Look for a `/security`, `/.well-known/security.txt`, or `/responsible-disclosure` page on the main website.
3. Search "[company name] bug bounty" or "[company name] vulnerability disclosure" in your search engine.
4. Check HackerOne's and Bugcrowd's program directories directly.
5. Look for a `security@` email address on the company's contact page or in their WHOIS records.

If none of that turns up anything, you are in uncharted territory. The company has no public process for receiving vulnerability reports. This does not mean you cannot report, but you need to be more careful. Read the [coordinated vulnerability disclosure guide](/learn/coordinated-vulnerability-disclosure-guide) and the [legal guide](/learn/bug-bounty-legal-guide-cfaa-and-beyond) before reaching out. Without a formal program or safe harbor language, you have fewer protections.

I generally avoid spending significant testing time on organizations with no disclosure process at all. The risk-reward ratio is poor. You do the work, find a real vulnerability, report it through whatever channel you can find, and then either get ignored, threatened, or thanked without compensation. Occasionally a company will be grateful and reward you informally, but you cannot count on that.

## The adoption problem

The 78% figure is striking, but it makes sense when you think about why companies do not adopt `security.txt`.

Some do not know it exists. Awareness has improved since CISA started promoting it in 2023, but plenty of engineering and security teams have never heard of RFC 9116. The standard is only four years old.

Some know about it but deprioritize it. Setting up `security.txt` is trivial from a technical standpoint. It is a text file. The actual challenge is organizational: someone has to decide who the Contact should be, write a disclosure policy, maintain the Expires field, and commit to actually responding to reports. For companies without a dedicated product security team, that commitment feels like opening a floodgate they are not staffed to handle.

Some are actively hostile to security research. They do not want researchers testing their products, and publishing a `security.txt` would feel like an invitation. This attitude is becoming less common as vulnerability disclosure norms mature, but it still exists.

The result is a fragmented situation where the companies most likely to have `security.txt` are the ones that already have mature security programs, and the companies that would benefit most from researcher reports are the hardest to reach.

## security.txt as a maturity signal

Over time I have started treating `security.txt` as a proxy for how an organization thinks about security. It is not a perfect proxy. Some well-run programs lack it. Some companies paste in a `security.txt` and then ignore everything sent to the contact address. But in aggregate, the correlation holds.

Here is the rough tier list I use:

- `security.txt` with platform link, policy, encryption key, valid expiry: this organization probably has a functioning triage process. Worth investing time.
- `security.txt` with just a contact email and expiry: they are aware of the standard and have some process. Medium confidence.
- No `security.txt` but a bounty program on a platform: they have a program but have not adopted the standard. Common and fine. The platform handles triage.
- No `security.txt` and no visible program: high risk of wasted effort. Proceed only if you have a strong reason.

This heuristic has saved me from spending time on targets that would never result in a meaningful interaction. I would rather find a medium-severity bug at a responsive company than a critical at one that will never respond.

## Getting started

If you want to start using `security.txt` in your workflow, the simplest next step is to make it part of your recon checklist. Before you map subdomains, before you scan ports, check `/.well-known/security.txt`. Use the [lookup tool](/lookup) to quickly check any domain.

The file takes ten seconds to read. The information it gives you, who to contact, what the rules are, whether the company is ready to receive reports, shapes every decision you make after that. For a deeper look at structuring your overall recon process, see the [recon methodology guide](/learn/bug-bounty-recon-methodology).

`security.txt` is one of those things that is boring and simple and quietly makes the entire vulnerability disclosure ecosystem work better. We just need more companies to actually use it.
