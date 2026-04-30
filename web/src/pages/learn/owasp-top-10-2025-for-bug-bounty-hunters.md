---
layout: "@layouts/MarkdownLayout.astro"
title: "OWASP Top 10 2025 for Bug Bounty Hunters: What Changed and Where to Hunt"
description: "A bounty hunter's interpretation of the OWASP Top 10 2025 - what moved, what is new, and how each category translates into actual findings you can report."
date: "2026-04-07"
---

The [OWASP Top 10](https://owasp.org/Top10/) got its first update in four years. If you are a bug bounty hunter who has been chasing the same vulnerability classes since 2021, this revision matters. Not because it invents new bug types - you have been finding these bugs all along - but because it tells you where the industry's attention is shifting. Programs that align their scope with OWASP categories will start prioritizing differently. Triagers will reference these categories in their severity assessments. Understanding what moved and why gives you an edge.

I will be blunt about something. Most "OWASP Top 10 guide" articles just restate the official descriptions and call it a day. That is not useful for hunters. What I want to do here is map each category to specific things you can test for, estimate what these findings typically pay, and flag the categories that are underexplored relative to their impact.

## What changed from 2021 to 2025

The 2025 revision analyzed 589 CWEs mapped across hundreds of thousands of applications, up from roughly 400 CWEs in 2021. That larger dataset changed the ranking significantly. Here is the comparison:

| Rank | OWASP 2021 | OWASP 2025 | Change |
|------|------------|------------|--------|
| 1 | Broken Access Control | Broken Access Control (now includes SSRF) | SSRF merged in |
| 2 | Cryptographic Failures | Security Misconfiguration | Jumped from #5 |
| 3 | Injection | Supply Chain Failures | **New entry** |
| 4 | Insecure Design | Cryptographic Failures | Dropped from #2 |
| 5 | Security Misconfiguration | Injection | Dropped from #3 |
| 6 | Vulnerable and Outdated Components | Improper Input Validation | New to top 10 |
| 7 | Identification and Authentication Failures | Server-Side Request Forgery | Moved from #10 |
| 8 | Software and Data Integrity Failures | Identity and Authentication Failures | Dropped from #7 |
| 9 | Security Logging and Monitoring Failures | Insecure Design | Dropped from #4 |
| 10 | Server-Side Request Forgery | Mishandling Exceptional Conditions | **New entry** |

Three things jump out. First, Supply Chain Failures debuted at #3 with the highest exploit/impact scores of any category. Second, Security Misconfiguration climbed from #5 to #2. Third, SSRF was consolidated into the Broken Access Control category but also appears separately at #7 because the data supported both placements. The old "Vulnerable and Outdated Components" was absorbed into Supply Chain Failures, and "Security Logging and Monitoring Failures" dropped off entirely.

For hunters, the practical takeaway is this: if you have been ignoring supply chain bugs and security misconfigurations in favor of injection and XSS, you are swimming against the current.

## A01: Broken access control (now with SSRF)

Broken Access Control held #1 for the second consecutive cycle. No surprise. I have written about this at length in the [IDOR and Broken Access Control hunting guide](/learn/idor-and-broken-access-control-hunting), but the 2025 revision adds something important: SSRF is now formally part of this category.

The reasoning is that SSRF is fundamentally an access control problem. The server makes a request on the attacker's behalf to a resource the attacker should not be able to reach. That is the same pattern as IDOR, just at the network layer instead of the application layer.

### What this means for hunting

Your SSRF findings now fall under the single most important OWASP category. That should help when arguing severity with triagers. If a program says "we prioritize OWASP Top 10 findings," SSRF is no longer a borderline #10 item. It is part of #1.

Practical targets for this combined category:

- **IDOR on every API endpoint**: Two accounts, swap tokens, check every object reference. Still the most reliable way to earn consistent bounties.
- **Horizontal and vertical privilege escalation**: Can a regular user access admin endpoints? Can a user in org A see org B's data?
- **SSRF via URL parameters**: Any feature that fetches external content - webhooks, URL previews, PDF generators, image proxies, import-from-URL features. Check the [SSRF hunting guide](/learn/server-side-request-forgery-ssrf-hunting) for methodology.
- **Path traversal in file operations**: Download and upload endpoints that use user-supplied paths.

Typical payouts: $150-$500 for simple IDOR on non-sensitive data, $1,000-$5,000 for IDOR exposing PII or financial data, $3,000-$15,000+ for SSRF with internal network access or cloud metadata exposure.

## A02: Security misconfiguration

This jumped three spots from #5 to #2. The data showed an increase in both incidence rate and severity. I think this reflects two trends: cloud infrastructure is more complex than ever, and default configurations are getting worse rather than better.

For hunters, misconfigurations are low-hanging fruit that many researchers walk past. They are not glamorous. Finding an open S3 bucket does not require the same technical depth as chaining an XSS into account takeover. But programs pay for them, and you can find them faster than almost any other bug class.

### Where to look

- **Cloud storage buckets**: S3, GCS, Azure Blob Storage. Try common naming patterns: `company-backups`, `company-staging`, `company-uploads`. Tools like `cloud_enum` automate this.
- **Exposed admin interfaces**: Kubernetes dashboards, Jenkins, Grafana, phpMyAdmin, Elasticsearch, Kibana. Shodan and Censys are your friends here.
- **Default credentials**: More common than you would expect. Routers, IoT management panels, staging environments, internal tools exposed to the internet.
- **Verbose error messages**: Stack traces, database connection strings, internal IP addresses, software version numbers in HTTP headers.
- **CORS misconfiguration**: Overly permissive `Access-Control-Allow-Origin` headers, especially wildcard with credentials.
- **Missing security headers**: Less often paid as standalone findings, but `Strict-Transport-Security`, `Content-Security-Policy`, and `X-Frame-Options` gaps sometimes qualify depending on the program.
- **Directory listing enabled**: Still shockingly common on staging and development subdomains.

The [OWASP Web Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/) has an entire chapter on configuration testing. I recommend working through it systematically rather than relying on scanner output. Read the [security misconfiguration hunting guide](/learn/security-misconfiguration-hunting-guide) for a deeper walkthrough.

Typical payouts: $100-$300 for information disclosure via misconfiguration, $500-$2,000 for exposed admin panels, $2,000-$10,000 for cloud storage buckets with sensitive data.

## A03: Supply chain failures

This is the biggest story of the 2025 revision. Supply Chain Failures is a brand-new category that debuted at #3, absorbing the old "Vulnerable and Outdated Components" (2021 A06) and expanding far beyond it. It carries the highest exploit/impact scores of any category in the dataset.

I wrote a full guide on this topic: [Supply Chain Vulnerabilities: The New #3 on OWASP Top 10](/learn/supply-chain-security-vulnerabilities). The short version is that dependency confusion, typosquatting, CI/CD pipeline attacks, and compromised build tooling are all in scope. Alex Birsan earned over $130,000 from dependency confusion alone, and the attack surface has only grown since his 2021 research.

### High-value techniques

- **Dependency confusion**: Find internal package names via source maps, public repos, error messages. Register the name on the public registry with a benign callback. Many programs pay $5,000-$20,000 for confirmed dependency confusion.
- **Typosquatting detection**: Check if the target's dependencies have close-name variants on public registries that could be malicious.
- **CI/CD pipeline review**: If the program has public GitHub Actions workflows, review them for injection via `${{ github.event.issue.title }}` or similar untrusted input in run steps.
- **Outdated components with known CVEs**: The least exciting but most common finding. Run the target's JavaScript through `retire.js` or check response headers for outdated server versions. Payouts are lower ($50-$300) unless the CVE is actively exploitable and you demonstrate impact.

This category is underexplored by most hunters. If you develop expertise here, you face less competition for higher-value findings.

## A04: Cryptographic failures

Dropped from #2 to #4 but still significant. This covers weak encryption, missing encryption, and improper certificate validation.

What to hunt:

- **Sensitive data in cleartext**: Passwords, tokens, or PII transmitted over HTTP or stored unencrypted. Check API responses for fields that should be masked or absent.
- **Weak TLS configurations**: SSLv3, TLS 1.0/1.1 still enabled, weak cipher suites. Tools like `testssl.sh` or SSL Labs automate this.
- **Hardcoded secrets**: API keys, database credentials, encryption keys in client-side code or public repositories. This overlaps with recon - [your toolkit](/learn/bug-bounty-toolkit-setup) should include secret scanning.
- **Weak hashing algorithms**: MD5 or SHA1 for passwords. You rarely see the server-side implementation, but sometimes password reset tokens or session identifiers reveal the algorithm.

Typical payouts: $200-$1,000 for weak TLS or missing encryption, $500-$5,000 for exposed secrets depending on access level, $1,000-$10,000 for token prediction or crypto bypass leading to account takeover.

## A05: Injection

Injection dropped from #3 to #5. That does not mean injection bugs are going away. It means other categories grew faster in incidence and impact. SQL injection, OS command injection, LDAP injection, and template injection are all still here. XSS is classified under injection in OWASP's taxonomy.

For bounty hunters, injection remains a staple. I have a dedicated guide on [finding XSS vulnerabilities](/learn/finding-xss-vulnerabilities-in-bug-bounties). The key shift is that modern frameworks handle basic reflected XSS well, so the high-value injection findings tend to be:

- **Stored XSS** in rich text editors, markdown renderers, SVG uploads, or email rendering
- **Server-side template injection (SSTI)** in applications using Jinja2, Twig, Freemarker, or similar
- **SQL injection** in search, filtering, and sorting parameters, especially in legacy endpoints
- **NoSQL injection** in MongoDB queries, particularly via JSON body parameters
- **Command injection** in features that interact with the filesystem or call external tools

Typical payouts: $150-$1,000 for reflected XSS, $500-$3,000 for stored XSS, $2,000-$15,000 for SQLi or command injection with demonstrated impact.

## A06: Improper input validation

This is a restructured entry that consolidates various input validation failures that previously sat across multiple categories. It covers buffer overflows, integer overflows, and input that bypasses business logic.

For web application bounty hunters, the most relevant subset is business logic bypass. Can you submit a negative quantity on an e-commerce checkout? Can you bypass file upload restrictions by changing the `Content-Type` header or using double extensions? Can you bypass rate limiting by altering request parameters?

These findings often require understanding the application's business logic rather than running automated tools. That is exactly why they are underreported. Spend time understanding what the application does before you start attacking it.

## A07: Server-side request forgery

SSRF appears here in addition to being merged into A01. The 2025 data showed that SSRF had enough incidence and impact to warrant its own position while also being logically grouped with access control. Think of this as OWASP acknowledging that SSRF is both a category unto itself and a manifestation of broken access control.

Everything from the [SSRF hunting guide](/learn/server-side-request-forgery-ssrf-hunting) still applies. Key targets: webhook URLs, PDF generators, image fetchers, URL preview features, file import from URL, and any endpoint that takes a URL as input. Test for access to cloud metadata endpoints (`169.254.169.254`), internal services, and localhost ports.

## A08: Identity and authentication failures

Dropped from #7 to #8 but still a productive hunting ground. This covers weak passwords, broken session management, credential stuffing vulnerabilities, and missing multi-factor authentication.

High-value findings in this category:

- **Account takeover via password reset flaws**: Predictable tokens, token reuse, no expiration, host header injection in reset emails
- **Session fixation or session not invalidated after password change**
- **OAuth and OIDC misconfigurations**: Open redirect in OAuth flows, missing state parameter, token leakage via referrer
- **Username enumeration**: Differing responses for valid vs. invalid usernames on login and registration

See the [authentication vulnerabilities guide](/learn/hunting-authentication-vulnerabilities) for detailed methodology. Typical payouts: $500-$3,000 for authentication bypasses, $3,000-$15,000 for account takeover chains.

## A09: Insecure design

This category dropped from #4 to #9 but remains conceptually important. It covers fundamental design flaws that cannot be fixed by correct implementation - things like missing rate limiting on SMS verification codes, business logic that allows price manipulation, or trust boundaries that assume client-side validation is sufficient.

Insecure design findings are hard to automate. They require you to think about what the application should prevent and then test whether it actually does. I find these bugs by asking "what would happen if someone used this feature in a way the developer did not intend?" and then trying exactly that.

## A10: Mishandling exceptional conditions

This is the second new entry, appearing at #10. It covers how applications behave when something unexpected happens - unhandled exceptions, improper error handling, fail-open logic, and race conditions.

### Where to hunt

- **Race conditions**: Send concurrent requests to transfer money, redeem a coupon, or accept a friend request. Tools like Turbo Intruder or custom async scripts help. Race condition bounties have increased sharply since web frameworks made other bug classes harder to find.
- **Error-triggered information disclosure**: Force errors by sending malformed input, oversized payloads, unexpected content types, or invalid encoding. Check whether the error response reveals stack traces, internal paths, database queries, or API keys.
- **Fail-open authentication**: What happens when the authentication service is slow or unreachable? Some implementations grant access by default, which is a critical finding.
- **Resource exhaustion**: Can you cause a denial-of-service by triggering expensive operations? Regex denial of service (ReDoS), zip bombs in file upload, or billion-laughs attacks in XML parsing.

Typical payouts: $300-$1,000 for information disclosure via errors, $1,000-$5,000 for race conditions with financial impact, $2,000-$10,000 for fail-open authentication.

## The LLM angle

If you are hunting on programs that expose AI-powered features, OWASP also published the [Top 10 for LLM Applications 2025](https://genai.owasp.org/). That list covers prompt injection, insecure output handling, training data poisoning, and other AI-specific vulnerabilities. There is real overlap with the main OWASP Top 10 - prompt injection is a form of injection (A05), and many LLM vulnerabilities stem from improper input validation (A06).

I wrote about this in the [AI and LLM security testing guide](/learn/ai-llm-security-testing-for-bounties). The short version: if a target has a chatbot, an AI-powered search feature, or any LLM integration, test it. This is one of the least competitive areas in bounty hunting right now because most hunters do not know how to test AI features systematically.

## Prioritizing your time

If I had to rank these categories by return on time invested for an intermediate bounty hunter, I would order them like this:

1. **Broken Access Control (A01)** - highest volume of findings, consistent payouts, testable on every application
2. **Supply Chain Failures (A03)** - low competition, high payouts, requires recon skills you should already have
3. **Security Misconfiguration (A02)** - fast to test, scales well across targets, good for building reputation
4. **Injection (A05)** - competitive but still productive, especially SSTI and stored XSS
5. **Authentication Failures (A08)** - account takeover chains pay extremely well when you find them

The remaining categories are worth testing when the opportunity presents itself, but I would not build my entire hunting strategy around them.

## What to do with this

The OWASP Top 10 is a prioritization tool, not a checklist. You do not need to test every category on every target. But understanding which categories matter most helps you allocate time.

Here is my concrete suggestion. Take the next program you hunt on and spend one session focused exclusively on A02 (Security Misconfiguration) and A03 (Supply Chain Failures). These are the two categories that moved most aggressively upward in 2025, and they are the two categories where most hunters spend the least time. If you find nothing, you have at least expanded your testing methodology. If you find something, you are ahead of the curve.

The OWASP dataset is public. The [Web Security Testing Guide](https://owasp.org/www-project-web-security-testing-guide/) provides test cases for every category. And the resources in the [learn section](/learn) of this site cover the hands-on techniques for each vulnerability class. Use them.
