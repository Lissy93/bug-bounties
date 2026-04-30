---
layout: "@layouts/MarkdownLayout.astro"
title: "Writing Your First Bug Bounty Report"
description: "Step-by-step guide to writing a clear, effective vulnerability report that gets triaged quickly."
date: "2026-04-01"
---

Your first vulnerability report is the most important one. Not because of what you found, but because it sets the tone for how triagers perceive your work. A clear, well-structured report gets resolved faster and builds your reputation.

## Before you write anything

Make sure the issue is real. Reproduce it at least twice. Confirm it is in scope. Check the program's past disclosures or public reports to see if it has already been reported.

> A duplicate report is not wasted effort if it taught you something, but it is avoidable with five minutes of research.

## Structure your report

Every good report answers five questions:

1. **What** is the vulnerability?
2. **Where** does it exist?
3. **How** can someone reproduce it?
4. **Why** does it matter?
5. **How severe** is it?

### Title

Write a title that a triager can understand without reading the full report.

- Bad: "XSS bug"
- Good: "Stored XSS via profile bio field allows session hijacking on app.example.com"

### Description

Explain the vulnerability in 2-3 sentences. Name the affected endpoint, parameter, or component. Mention the root cause if you know it.

### Steps to reproduce

Number every step. Be specific enough that someone unfamiliar with the target can follow along:

1. Log in to `https://app.example.com` with any user account
2. Navigate to Settings > Profile
3. In the "Bio" field, enter: `<img src=x onerror=alert(document.cookie)>`
4. Click Save
5. Visit your public profile at `https://app.example.com/u/yourname`
6. Observe the JavaScript alert containing your session cookie

### Impact

Describe what an attacker could realistically do. Avoid hypotheticals that require unlikely conditions.

### Severity

Use the program's severity scale if they have one. Otherwise, reference CVSS:

| Severity | CVSS Score | Example |
|----------|-----------|---------|
| Critical | 9.0 - 10.0 | Remote code execution, auth bypass |
| High | 7.0 - 8.9 | Stored XSS, privilege escalation |
| Medium | 4.0 - 6.9 | CSRF, information disclosure |
| Low | 0.1 - 3.9 | Missing headers, verbose errors |

### Proof of Concept

Include the minimum needed to prove the issue:

- Screenshots with annotations
- HTTP requests/responses (use `curl` or Burp)
- A short script if the reproduction is complex

```
curl -X POST https://app.example.com/api/profile \
  -H "Cookie: session=YOUR_SESSION" \
  -d 'bio=<img src=x onerror=alert(document.cookie)>'
```

## Common mistakes to avoid

- **Vague descriptions** - "I found an XSS" without specifying where or how
- **Missing reproduction steps** - if the triager cannot reproduce it, the report stalls
- **Over-inflated severity** - claiming Critical for a self-XSS damages your credibility
- **Testing out of scope** - always verify the asset is listed in the program's scope
- **Aggressive tone** - professionalism gets better results than pressure

## After you submit

Be patient. Most programs have SLAs (e.g. 5 business days for initial response). If you have not heard back after two weeks, send a polite follow-up.

If the report is marked as a duplicate, ask when the original was filed. This helps you gauge whether you are finding issues quickly enough. If it is rejected, ask for specifics - sometimes a clearer explanation or additional evidence changes the outcome.

---

Writing good reports is a skill that improves with practice. Focus on clarity, completeness, and professionalism, and the results will follow.
