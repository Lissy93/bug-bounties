---
layout: "@layouts/MarkdownLayout.astro"
title: "CVSS Scoring for Bounty Hunters: How Severity Ratings Affect Payouts"
description: "How CVSS actually works, how programs use (and misuse) it to set payouts, and how to score your findings accurately to avoid disputes."
date: "2026-04-07"
---

Most bounty hunters learn CVSS the hard way: they submit a finding, score it as High, and the program downgrades it to Medium. The payout drops by half. No one explains why.

CVSS is not a payout calculator. It is a framework for communicating the severity of a vulnerability in a standardized way. But programs treat it like a payout calculator anyway, and the mismatch between what CVSS measures and what programs pay for causes more disputes than almost anything else in bug bounty.

This guide will not teach you to memorize every CVSS metric. Instead, I want to focus on the parts that actually affect your bounties, where CVSS 4.0 changed things, and how to handle the inevitable disagreements.

## What CVSS actually measures

CVSS assigns a numeric score from 0.0 to 10.0 to a vulnerability based on its characteristics. The score maps to a qualitative rating:

| Score | Rating |
|-------|--------|
| 9.0 - 10.0 | Critical |
| 7.0 - 8.9 | High |
| 4.0 - 6.9 | Medium |
| 0.1 - 3.9 | Low |
| 0.0 | None |

The score comes from a set of metrics that describe how the vulnerability works and what damage it can cause. In CVSS 3.1, there were three metric groups: Base, Temporal, and Environmental. CVSS 4.0 replaced those with four groups: Base, Threat, Environmental, and Supplemental.

Here is the thing most hunters miss: almost every CVSS score you see is a Base score only. Temporal/Threat and Environmental metrics are rarely filled in. This matters because the Base score is designed to represent the worst reasonable case, not the typical case for a specific target. When a program says your CVSS 8.1 is really a Medium in their environment, they might actually have a point.

## CVSS 4.0 - what changed and why it matters

CVSS 4.0 launched in November 2023 and the [full specification](https://www.first.org/cvss/v4-0/) is worth reading at least once. The key changes for hunters:

**Attack Requirements (AT)** is a new Base metric. In 3.1, Attack Complexity (AC) tried to capture both the technical complexity of the attack and whether the attacker needed specific conditions (like a race condition or a particular configuration). CVSS 4.0 splits these into two separate metrics. AC now covers only the technical difficulty, while AT covers environmental conditions the attacker cannot control. This distinction matters when you are scoring something like a race condition on a specific server configuration.

**The Threat metric group** replaced the old Temporal group. It has a single metric: Exploit Maturity. The old Temporal metrics for Remediation Level and Report Confidence are gone. In practice, this means that if a public exploit exists for your finding, the Threat metric can bump the score. If you are reporting a novel bug class with no known exploits, the default "Not Defined" applies and has no effect.

**The Supplemental metric group** is new and includes metrics like Safety, Automatable, Recovery, and Provider Urgency. These do not affect the numeric score. They are metadata that helps organizations prioritize. You will probably never need to fill these in for a bounty report, but knowing they exist helps when a program references them.

**Scoring granularity improved.** CVSS 3.1 had a problem where many different vulnerability profiles collapsed into the same score. A stored XSS and a complex SSRF might both land at 6.1. CVSS 4.0 spreads scores out more evenly, so two genuinely different vulnerabilities are less likely to get the same number.

The [CVSS 4.0 calculator](https://www.first.org/cvss/calculator/4.0) from FIRST is the authoritative tool. Use it. Do not rely on third-party calculators that might be outdated.

## Walking through a real scoring example

Let's score an IDOR vulnerability. You have found that changing the `user_id` parameter in `GET /api/v2/users/{user_id}/payment-methods` returns another user's saved credit card details (masked number, expiry, billing address). Authentication is required but any authenticated user can access any other user's data.

Here is how I would score this in CVSS 4.0:

**Attack Vector (AV): Network.** The attack happens over HTTP. Straightforward.

**Attack Complexity (AC): Low.** There is no special technique needed. You just change an ID in the URL.

**Attack Requirements (AT): None.** No specific configuration or environmental condition is needed. The endpoint is always vulnerable.

**Privileges Required (PR): Low.** You need a valid authenticated session, but any normal user account works.

**User Interaction (UI): None.** The victim does not need to do anything.

**Confidentiality (VC): High.** You are accessing sensitive financial data belonging to other users. I would argue this is High rather than Low because payment information is PII with direct financial implications.

**Integrity (VI): None.** You are only reading data, not modifying it.

**Availability (VA): None.** The attack does not affect availability.

**Subsequent system Confidentiality (SC): None.** The vulnerable component does not cascade into other systems.

**Subsequent system Integrity (SI): None.**

**Subsequent system Availability (SA): None.**

The resulting vector string: `CVSS:4.0/AV:N/AC:L/AT:N/PR:L/UI:N/VC:H/VI:N/VA:N/SC:N/SI:N/SA:N`

Plug that into the calculator and you get an 7.1 - High.

Now here is where it gets interesting. A program with a custom severity scale might look at this and say "the card numbers are masked, so the actual data exposure is limited." They might bump Confidentiality down to Low and suddenly you are at a Medium. Is that fair? It depends. Masked card numbers plus billing addresses plus expiry dates might still be enough for social engineering or identity theft. This is where your report's impact section does the heavy lifting. If you can articulate why the exposed data is dangerous even when partially masked, you have a stronger case for keeping the High rating.

For more on writing that impact section well, see [writing your first report](/learn/writing-your-first-report).

## Why programs disagree with your severity

I have seen programs override hunter-submitted CVSS scores for a few recurring reasons:

**Environmental context you do not have.** The endpoint you found might sit behind a WAF that blocks the attack in production even though it worked in staging. Or the affected user population might be tiny. Programs factor in context that you, as an external tester, cannot see.

**Business impact does not match technical severity.** A SQL injection on a blog comment system is technically severe but the business impact might be low if the database contains only public data. Programs often adjust severity based on what is actually at risk, not what the vulnerability class theoretically allows.

**Scope disagreements.** If you chain two Medium findings together to achieve a High-severity outcome, some programs will pay for two Mediums instead of one High. Others will pay for the chain. This varies by platform and program. Ask before you invest time in elaborate chains.

**Downgrade to save money.** This happens. Some programs systematically underrate findings to pay less. You will learn to recognize these programs over time. Check their reputation on platform forums and in hunter communities before investing serious time.

**You actually overscored it.** I have done this myself. When you have spent eight hours finding something, every vulnerability feels Critical. Step away, come back in a day, and rescore with fresh eyes. You might agree with a lower rating.

## Platform-specific severity scales vs. raw CVSS

HackerOne, Bugcrowd, Intigriti, and other platforms each have their own relationship with CVSS.

[HackerOne's severity system](https://docs.hackerone.com/organizations/severity/) lets programs choose between a CVSS-based scale and a custom rating scale. When a program uses CVSS, HackerOne maps the numeric score to their four-tier system (Critical, High, Medium, Low). But here is the catch: the program sets its own payout ranges per tier, and they can override the CVSS-derived severity at triage time.

Bugcrowd uses their Vulnerability Rating Taxonomy (VRT), which pre-assigns severity levels to common vulnerability types. If you find a reflected XSS, the VRT already has an opinion about its severity regardless of what CVSS says. The VRT score is the starting point and triagers adjust from there based on impact.

Intigriti uses CVSS directly but their triagers can adjust the score based on actual impact.

The practical takeaway: always check how a specific program defines severity tiers before you submit. Look for their policy page, previous disclosures, or a published payout table. Scoring your finding in a vacuum and expecting the platform to agree is a recipe for disappointment.

## When to argue your score and when to let it go

You submitted a finding scored at High. The program downgrades it to Medium. What now?

**Argue when you have evidence the program missed something.** If their downgrade rationale ignores a realistic attack scenario, write it up. Be specific. "This is High because of X, Y, and Z" works better than "I disagree with your assessment." Reference the CVSS specification directly if a metric was clearly miscategorized. Link to the [NVD's CVSS documentation](https://nvd.nist.gov/vuln-metrics/cvss) if it helps.

**Argue when the downgrade contradicts the program's own policy.** If their published severity table says IDOR with PII exposure is High, and they rated yours as Medium, point that out politely. Screenshot their policy if you need to.

**Let it go when the gap is one sub-tier and the payout difference is small.** Fighting over $50 damages your relationship with the program and wastes time you could spend finding the next bug. If a program consistently rates your 7.1 as a 6.8 and pays accordingly, that is noise in the system. Move on.

**Let it go when the program has legitimate environmental context.** If they explain that the affected system is internal-only, or that the data is already public, or that they have a compensating control, accept it. You do not have full visibility into their environment.

**Escalate through the platform when the downgrade seems dishonest.** Every major platform has a mediation process. Use it when a program gives no rationale for a downgrade, ignores your evidence, or takes weeks to respond. Keep your messages professional and factual. Mediators side with whoever has better documentation.

For a broader discussion on handling disputes, see [handling duplicates, rejections, and disputes](/learn/handling-duplicates-rejections-and-disputes).

## Tips for scoring accurately from the start

Score your finding before you write the report, not after. When you score after writing a detailed impact section, you tend to inflate because you have just spent twenty minutes convincing yourself how bad it is.

Use the official FIRST calculator every time. Do not eyeball it. I have been doing this for years and I still get surprised by how a single metric change moves the score.

Learn the difference between Confidentiality impact on the vulnerable component (VC) and on subsequent systems (SC). If you find an SSRF that reads internal metadata, VC might be Low (the SSRF endpoint itself reveals little) but SC could be High (you can reach the cloud metadata service and steal credentials). Getting this right can swing your score by two or three points.

When you find [XSS vulnerabilities](/learn/finding-xss-vulnerabilities-in-bug-bounties), remember that the difference between reflected and stored matters for scoring. Reflected XSS requires user interaction (UI:Active in CVSS 4.0), stored does not (UI:None or UI:Passive depending on the trigger). That single metric often separates Medium from High.

Similarly, [IDOR and access control issues](/learn/idor-and-broken-access-control-hunting) vary wildly in severity depending on what data or actions are exposed. Reading public profile data is different from modifying someone's account settings.

If a program uses CVSS 3.1 and you scored with 4.0, or vice versa, convert. The scores are not interchangeable. A 7.5 in 4.0 does not mean the same thing as a 7.5 in 3.1 because the formulas and metric definitions differ.

## The gap between theory and practice

CVSS was designed for vulnerability management inside organizations, not for bug bounty payouts. When FIRST published the specification, they were thinking about IT teams prioritizing patches, not about hunters negotiating payments. That mismatch explains most of the friction.

Programs use CVSS because it is the closest thing to a standard, not because it perfectly captures the business risk of every finding. The best hunters I know treat CVSS as the starting point of a conversation, not the final word. They score accurately, explain their reasoning in the impact section, and accept that the program's environmental context might legitimately shift the number.

Your CVSS score gets your foot in the door. Your impact description is what actually sets the payout. Spend your time on that.
