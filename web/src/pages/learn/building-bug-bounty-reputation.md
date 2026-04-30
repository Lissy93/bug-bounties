---
layout: "@layouts/MarkdownLayout.astro"
title: "Building Your Bug Bounty Reputation: From Unknown to Invited"
description: "How platform reputation systems work, how to get private invitations, and how to build a public profile that opens doors - based on how top hunters actually did it."
date: "2026-04-07"
---

Nobody starts with private invitations. Every hunter on HackerOne's top 100 list - collectively responsible for over $31.8M in earnings - began with zero reputation and public programs. The difference between hunters who stay stuck on public programs and those who get invited to high-paying privates comes down to understanding how reputation systems actually work, then gaming them intentionally.

I want to break down the specific mechanics behind platform reputation, private invitations, and public presence. Not motivational advice. Numbers and algorithms.

## How HackerOne reputation works

HackerOne tracks three metrics: Signal, Impact, and Reputation. They sound similar but measure different things.

**Signal** is your noise-to-quality ratio. It starts at 7.0 and moves based on report outcomes. A resolved report adds positive signal. An informative or not applicable report drags it down. Duplicates are roughly neutral - they lower signal slightly but not catastrophically. HackerOne [documents the specifics](https://docs.hackerone.com/hackers/manage-account/reputation/) in their researcher guide.

**Impact** measures the average severity of your resolved reports. If you only submit low-severity findings like missing headers, your impact stays low even with perfect signal. A hunter who finds three critical RCEs will have a much higher impact score than someone with fifty resolved lows.

**Reputation** is the composite number most people focus on. Each resolved report adds reputation points scaled by severity. Critical and high severity reports add more than mediums and lows. Importantly, reputation never goes below zero, but it can stall. Getting reports marked as Not Applicable costs you reputation points. Getting reports marked as Informative costs fewer, but it still hurts.

The practical takeaway: submitting marginal findings hurts you twice. It lowers your signal and wastes time you could spend on higher-impact bugs. If you are unsure whether something is a real vulnerability, spend another hour verifying before you submit. Your signal score will thank you.

### What actually moves the numbers

I have watched people obsess over reputation points while ignoring the only thing that matters: resolved reports at high severity. Here is roughly how the math works on HackerOne:

- A resolved Critical report: +50 reputation
- A resolved High: +40 reputation
- A resolved Medium: +25 reputation
- A resolved Low: +10 reputation
- N/A report: -10 reputation
- Informative: -5 reputation
- Duplicate: 0 to +2 reputation (depending on timing)

These numbers are approximate since HackerOne does not publish exact values. But I have tracked my own scores closely enough to be confident in the ranges.

## How Bugcrowd Kudos works

Bugcrowd uses a different system called [Kudos](https://docs.bugcrowd.com/researchers/getting-started-with-bugcrowd/kudos-and-rankings/). Instead of a single reputation number, you accumulate kudos points that determine your ranking tier.

Kudos points come from accepted submissions, scaled by priority level (P1 through P5). P1 findings generate the most kudos. Your ranking is relative to other researchers on the platform, which means the bar moves constantly.

Bugcrowd also factors in accuracy. Repeated invalid or out-of-scope submissions lower your accuracy rate, which affects program eligibility. A 90% accuracy rate with moderate volume will position you better than high volume with 60% accuracy.

One difference from HackerOne: Bugcrowd puts more weight on consistency over time. A researcher who submits quality findings every month ranks higher than someone who submits a burst of reports and disappears. The algorithm rewards sustained activity.

## The private invitation algorithm

This is what everyone wants to know. How do private invitations actually get triggered?

On HackerOne, programs set minimum requirements for the researchers they want to invite. These typically include:

- Minimum reputation score (often 100+, sometimes 500+)
- Minimum signal (usually 1.0 or higher, many programs want 5.0+)
- Report count thresholds
- Sometimes specific skill tags or vulnerability type history

HackerOne's invitation engine matches these criteria against the researcher pool and sends invitations. Programs with higher minimum bounties tend to set stricter thresholds. A program paying $10,000 for criticals is not inviting hunters with a signal of 0.5 and three resolved reports.

The less obvious factor is recency. Active hunters get more invitations than dormant ones. If you have not submitted a report in three months, you drop down the invitation queue even if your lifetime stats are strong. The system favors researchers who are currently hunting.

On Bugcrowd, the invitation process is more curated. Program owners can browse researcher profiles and hand-pick who they invite. Your accuracy rate, priority distribution (how many P1s vs P4s), and target history all factor in. Having experience with the program's specific technology stack helps.

### Getting your first invitations faster

Your first 10-20 resolved reports on public programs determine the trajectory of your entire platform career. Here is what I recommend:

Pick programs with fast triage times. Some public programs take weeks to respond. Others triage within 48 hours. The faster you get resolutions, the faster your reputation grows. Check the program's average response times listed on their profile page.

Focus on medium and high severity findings, not lows. Three resolved mediums build reputation faster than ten resolved lows, and they signal to the invitation algorithm that you find meaningful bugs.

Avoid submitting anything you are not confident about. Every N/A or Informative result is a setback. If your first five reports are all resolved, you will look far better than if three of your first ten were rejected. Early signal scores have outsized influence because the sample size is small.

Target programs that other hunters overlook. The flashy tech company programs attract thousands of researchers. Smaller programs with fewer hunters mean less competition and faster triage, since the security team is not buried under 200 reports a week.

## Public disclosure as a reputation tool

Most platforms let you request public disclosure after a report is resolved. On HackerOne, the process works like this: you request disclosure, the program has 30 days to agree or it goes public automatically (unless they request more time).

Published reports on HackerOne's Hacktivity feed are visible to other researchers, program managers, and recruiters. A well-written disclosed report does several things at once. It demonstrates your technical skill, shows you can communicate clearly, and gives program managers a reason to invite you.

I think many hunters underuse this. If you have a nicely written report for a medium or high severity finding, request disclosure. The company gets good PR for being transparent, and you get a public portfolio piece.

Some things to consider before disclosing:

- Remove any information that could enable exploitation if the fix is incomplete
- Make sure your reproduction steps and impact description are polished
- Include your remediation suggestions - this shows maturity
- Wait until the fix is fully deployed, not just patched in staging

For more on writing reports that double as good disclosures, see [writing your first report](/learn/writing-your-first-report) and [writing bug bounty writeups that get noticed](/learn/writing-bug-bounty-writeups-that-get-noticed).

## Live hacking events

Live hacking events are one of the fastest ways to boost reputation and earnings simultaneously. HackerOne runs h1-events and Bugcrowd hosts LevelUp and similar competitions. These are invite-only, in-person or virtual events where selected researchers hack a target over 1-3 days.

### How to qualify

Qualification criteria vary by event, but common factors include:

- Top reputation on the specific program being targeted
- Consistent recent activity (last 60-90 days)
- High signal and impact scores
- Previous event performance if you have attended before

Your first event invitation will likely come after 6-12 months of consistent, high-quality submissions. Some events also run qualification CTFs or challenges beforehand.

### What to expect

Live events are intense. You are hacking alongside people who do this full-time, often against expanded scope that is not available in the regular program. Bounties at events are frequently multiplied - 2x or even 5x the standard payout.

The real value is not just the money. Events let you meet program security teams face-to-face, build relationships with other researchers, and learn techniques by watching how others approach the same target. Many hunters say their biggest skill jumps happened at live events.

One practical tip: prepare before the event. Study the target's technology stack, set up your tooling, and have a prioritized list of areas to test. Researchers who show up with a plan outperform those who start reconnaissance on day one.

## Building a public presence beyond platforms

Platform reputation gets you invitations. Public reputation gets you everything else - consulting work, conference speaking slots, job offers, and influence in the security community.

### Blogging and writeups

A technical blog with detailed vulnerability writeups is the single most effective reputation builder outside of platforms. You do not need to publish weekly. One thorough writeup per month, covering your methodology and thought process, builds credibility fast. See [writing bug bounty writeups that get noticed](/learn/writing-bug-bounty-writeups-that-get-noticed) for specifics on format and promotion.

Host your blog on a domain you control. Medium is fine for reach, but having your own site signals permanence. Many top hunters run simple static sites that cost nothing to host.

### Twitter/X and social presence

The bug bounty community is active on Twitter/X. Sharing findings, commenting on others' work, and participating in discussions makes you visible to program managers who are deciding who to invite.

I would avoid hot takes and drama. The researchers who build lasting reputations share knowledge generously - tool recommendations, methodology tips, interesting attack surfaces they have noticed. Being helpful gets you further than being controversial.

### Conference talks

Speaking at security conferences is a tier above blogging. BSides events have low barriers to entry and are a great starting point. From there, DEF CON, Black Hat, and regional conferences become accessible once you have a track record.

A talk does not need to be about a zero-day. "Here is how I found 50 IDORs in a single target" is a perfectly good talk that teaches the audience something practical. For background on the bug classes that make good talk material, check the guides on [IDOR and broken access control hunting](/learn/idor-and-broken-access-control-hunting) and [API security testing](/learn/api-security-testing-for-bug-bounties).

### Connecting it all together

The hunters who earn the most tend to have a flywheel going: they find bugs on platforms, disclose them publicly, write about the methodology, share it on social media, speak about it at conferences, and that visibility gets them invited to more private programs. Each piece feeds the others.

You do not need all of these running at once from day one. Start with platform reputation. Add disclosure and writeups after your first few months. Layer in social presence and speaking over the following year. The [choosing your first bug bounty program](/learn/choosing-your-first-bug-bounty-program) and [platform comparison](/learn/hackerone-vs-bugcrowd-vs-intigriti) guides can help you decide where to start.

## A realistic timeline

Here is roughly what to expect if you are hunting part-time (10-15 hours per week):

- **Months 1-2**: First resolved reports on public programs. Signal and reputation start building. Learn what gets accepted vs rejected.
- **Months 3-4**: Reputation crosses 100+. First private program invitations trickle in. Signal stabilizes above 1.0 if you have been selective about submissions.
- **Months 5-8**: Consistent private program access. First public disclosures. Possibly first blog posts about your findings.
- **Months 9-12**: Reputation above 500. Regular private invitations. Possibly first live event invitation if your stats are strong.
- **Year 2+**: Established reputation. Multiple private programs. Conference talk material from accumulated findings.

This timeline compresses dramatically if you hunt full-time or have prior security experience. But even starting from zero, a year of focused effort with attention to reputation mechanics puts you in a strong position.

The key insight is that reputation is not just a vanity metric. It is the access control system that determines which programs you can hack and how much you can earn. Treat it strategically from day one, and the compounding effects will surprise you.
