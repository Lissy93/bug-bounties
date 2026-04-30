---
layout: "@layouts/MarkdownLayout.astro"
title: "How to Choose Your First Bug Bounty Program"
description: "A practical framework for picking a program that matches your skill level, with criteria that actually matter and common traps to avoid."
date: "2026-04-07"
---

The conventional advice is to start with a big name. Pick Google, Facebook, or Apple, they say, because those programs are "well-run" and have clear scope. I think this is bad advice for beginners, and I will explain why.

Your first program choice matters more than your first tool, your first methodology, or your first target type. Pick the wrong program and you will spend three months finding duplicates, getting ghosted by triagers, or testing against assets that are hardened beyond your current ability. Pick the right one and you might land your first valid finding within weeks.

## The competition problem

Think about the math. A program like Google VRP has tens of thousands of active researchers testing it at any given time. Every low-hanging fruit was picked years ago. The remaining bugs require deep expertise in Chrome internals, Android kernel code, or GCP infrastructure. That is not where a beginner should start.

Compare that with a mid-size SaaS company that launched its program six months ago on [Bugcrowd](https://www.bugcrowd.com/hackers/programs/) or [HackerOne](https://docs.hackerone.com/hackers/find-and-participate-in-programs/). It might have 50-200 active researchers. The web app was built by a small engineering team. There are IDOR bugs, broken access controls, and missing rate limits waiting to be found by someone willing to map out the application properly.

I have seen researchers spend a full year on top-tier programs with zero accepted reports, then switch to a smaller program and find three valid issues in their first month. The skill did not change. The odds did.

## The evaluation checklist

When I look at a new program, I evaluate it on six things. Not all carry equal weight, but skipping any of them has burned me before.

### 1. Response time

Check the program's average time to first response and time to bounty. On HackerOne, this is visible on the program page. On Bugcrowd, look at the response efficiency metrics.

If the average first response is over 30 days, think carefully. Slow triage means slow feedback, and as a beginner you need fast feedback to learn. Programs with a first response under 7 days are ideal. Under 14 is acceptable.

### 2. Scope size and type

A program with five subdomains and a mobile app gives you more surface area than one with a single API endpoint. But scope that is too large can also be overwhelming.

For your first program, look for:

- At least one web application (not just an API)
- Multiple subdomains or user-facing features
- Wildcard domains are a bonus, they often hide forgotten assets

Avoid programs that are API-only with no documentation, hardware-only, or limited to a single static marketing site.

### 3. Payout history and ranges

A program that lists "$100 - $10,000" but has only ever paid $100 is telling you something. Check disclosed reports to see what actually gets paid for what severity.

On HackerOne, filter disclosed reports by the program. On Bugcrowd, check the "Hall of Fame" or "Kudos" sections. If you cannot find any disclosed reports and the program has been running for over a year, that is a yellow flag. Either they do not disclose, or nobody is finding anything, or findings get quietly resolved without credit.

For your first bounty, the dollar amount does not matter as much as the validation. A $150 payout for a real IDOR is worth more to your career than zero payouts chasing a $50,000 RCE you are not ready to find.

### 4. Safe harbor language

This one is non-negotiable. Read the program's legal terms. You want explicit safe harbor language that says they will not pursue legal action against researchers acting in good faith within the program's rules.

Programs without safe harbor exist. Some are even on major platforms. Skip them. You do not want your first experience in bug bounty to involve a legal threat because you accidentally tested a staging server that was not explicitly in scope.

### 5. Excluded vulnerability types

Some programs exclude entire classes of bugs. Common exclusions:

- Self-XSS
- CSRF on logout
- Missing security headers without demonstrated impact
- Rate limiting issues
- SPF/DKIM/DMARC misconfiguration

That is fine. But if a program excludes "all XSS," "all injection types," or "anything found via automated scanning," you are going to have a hard time as a beginner. Those are the bug classes you are most likely to find first.

### 6. Communication quality

Look at how the program responds to disclosed reports. Are the comments professional? Do they explain their triage decisions? Do they ask clarifying questions or just stamp "Informative" on everything?

A program that communicates well will teach you more than one that does not. You are not just looking for money here. You are building skills through the feedback loop.

## The decision matrix

Here is how I would score a program on a quick pass. Rate each factor from 1-5 and add them up.

| Factor | 1 (worst) | 5 (best) |
|--------|-----------|----------|
| Response time | 30+ days | Under 5 days |
| Scope size | Single endpoint | Wildcard + multiple apps |
| Payout evidence | No disclosed reports | Many disclosed with fair payouts |
| Safe harbor | No mention | Explicit, detailed language |
| Vuln exclusions | Most common classes excluded | Minimal exclusions |
| Communication | Dismissive or silent | Constructive and responsive |

A score of 20+ means the program is worth your time. Between 15-19, proceed with caution. Below 15, keep looking unless you have a specific reason to invest.

You can use the [program directory](/) to search across 2,000+ programs and filter by platform, then cross-reference what you find using the [lookup tool](/lookup) to research specific targets.

## Small programs vs. big names

Here is what actually happens when a beginner picks a top-tier program:

1. You spend days reading scope and policy documents
2. You start testing the main web app
3. You find something that looks like a bug
4. You write a report (see the [report writing guide](/learn/writing-your-first-report))
5. Three weeks later, it comes back as a duplicate, reported 18 months ago
6. You repeat this cycle until you give up or burn out

With a smaller program:

1. You spend an hour reading the scope
2. You map the application and notice it has 40+ API endpoints
3. You find a broken access control on endpoint 12
4. You write a report
5. Five days later, you get a "triaged" status and a $300 bounty
6. You immediately start looking for the next one

The second path builds momentum. It teaches you what valid findings look like, how triage works, and how to communicate with security teams. Those lessons transfer to bigger programs later.

## Reading between the lines of program policies

Program policies tell you more than the literal text if you know what to look for.

**"We may choose not to award a bounty for issues we are already aware of"** - This is standard language. But if the program has very few disclosures and includes this line, they might be using it as an escape hatch to avoid paying for valid findings.

**"Testing must not impact other users"** - Reasonable. But if the program has no staging environment and the scope is a production app with real users, they are putting the burden of safe testing entirely on you. Make sure you understand what "impact" means to them before you start.

**"We reserve the right to modify this policy at any time"** - Everyone includes this. But check the revision history if available. Programs that frequently narrow scope or reduce payouts after launch are not great partners.

**"Bounties are awarded at our discretion"** - Again, standard. But discretion without any disclosed reports to show how that discretion works in practice is a risk. You might do everything right and still get nothing.

## Red flags that waste your time

I have learned these the hard way. If you see any of these, move on.

**No response after 30 days on multiple reports.** One slow response is a fluke. A pattern means the program is understaffed or does not care. Your time is better spent elsewhere.

**Scope changes after your submission.** If you report a bug on an asset that was in scope, and they remove it from scope retroactively to avoid paying, that program is not operating in good faith.

**"Informative" without explanation.** Triagers who close reports as informative without telling you why are not giving you anything to learn from. Good programs explain their reasoning.

**Mandatory NDA before you can even see the scope.** Some private programs require this and it is fine. But if a public program asks you to sign an NDA just to view their policy page, something is off.

**Bounty table that seems too good to be true.** A startup with 20 employees offering $50,000 for a critical bug when they have $2M in funding probably cannot sustain those payouts. Check whether anyone has actually received those top-tier amounts.

## Where to actually start

Here is my concrete recommendation:

1. Go to the [program directory](/) and filter for programs on your preferred platform (not sure which? read the [platform comparison](/learn/hackerone-vs-bugcrowd-vs-intigriti))
2. Find 3-5 programs with web app scope that have been running for 6-18 months
3. Score each one using the matrix above
4. Pick the highest-scoring one
5. Spend one full day just mapping the application before you test anything
6. Make sure your [toolkit is set up](/learn/bug-bounty-toolkit-setup) before you begin

Do not pick ten programs and bounce between them. Focus on one. Learn it deeply. Understand how the application works, what frameworks it uses, where the data flows. Depth beats breadth at every skill level, but especially when you are starting out.

## When to move on

Stay with a program as long as you are finding things or learning. If you have spent 40+ hours on a single program without finding anything, and you have genuinely tested (not just run a scanner and walked away), it might be time to try a different target.

But be honest with yourself about the effort. "I ran Nuclei and got no results" is not 40 hours of testing. Manually walking through every feature, testing every input, checking every API endpoint, reading JavaScript source - that is testing. Most beginners quit before they have actually done the work.

Your first accepted report will probably not be glamorous. It might be a missing access control on an admin endpoint, or a stored XSS in a profile field, or an IDOR that leaks email addresses. That is fine. Every experienced researcher started with something small. The goal right now is to prove to yourself that you can find real bugs in real software, and to do that you need a program that gives you a fair chance.

Pick one. Go deep. Get your first bounty. Then pick a harder one.
