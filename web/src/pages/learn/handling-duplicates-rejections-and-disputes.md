---
layout: "@layouts/MarkdownLayout.astro"
title: "Handling Duplicates, Rejections, and Disputes in Bug Bounties"
description: "What to do when your report is marked duplicate, rejected as not applicable, or lowballed on severity - with specific strategies for each platform's mediation process."
date: "2026-04-07"
---

Most of bug bounty hunting is not finding vulnerabilities. It is dealing with what happens after you submit them. If you have been hunting for any length of time, you know the feeling: you spend hours researching a target, write a solid report, submit it, and then get a one-line response that says "Duplicate" or "Not Applicable." It stings every time.

I want to be upfront about the numbers. When you are starting out, expect 50-80% of your reports to be duplicated or rejected. Even experienced hunters with years of platform history see 20-40% of reports go nowhere. This is normal. The question is not how to avoid it entirely, but how to handle it well.

## Duplicates

### How to reduce them before submitting

You cannot eliminate duplicates. Someone else may have submitted the same bug five minutes before you did, and you will never know. But you can cut down on obvious ones.

Check the program's disclosure history first. On HackerOne, look at the program's Hacktivity page for resolved reports. On Bugcrowd, check the Hall of Fame and any published write-ups. If the program has been running for years, common issues like missing rate limiting or self-XSS have almost certainly been reported already.

Search for CVEs and public advisories related to the target's tech stack. If the application runs WordPress with a known plugin vulnerability, someone else has already reported it.

Look at the report volume. Programs that receive hundreds of reports per month have high duplicate rates by nature. A newer or less popular program gives you better odds of finding something original.

Test deeper. Surface-level bugs on login pages and public-facing forms get reported constantly. The further you go into authenticated functionality, admin panels, API endpoints, and business logic, the less competition you face.

### What to do when you get a duplicate

First, do not argue unless you have evidence that your report was first. The timestamp on the platform is what matters, and you can see your own submission time.

If the duplicate was submitted months before yours, take the lesson and move on. If it was submitted the same day or week, that is just bad luck. It happens.

What you should do:

- **Ask if you can see the original report** - some programs and platforms allow this after the original is resolved. Reading how someone else found the same bug teaches you about their methodology.
- **Note the target area** - if a specific feature attracts duplicate reports, it means many hunters are looking there. Shift your focus elsewhere on the same program.
- **Check if your report adds new impact** - sometimes your duplicate actually demonstrates a worse attack scenario than the original. Politely mention this. The triager may upgrade the original report's severity based on your input, and some programs reward that.

One thing I see new hunters do is rage-quit a program after getting duplicated. That is the wrong move. The fact that you found a real vulnerability means you understand the target. Keep going. Your next find on the same program will likely be something others missed.

## Rejections

Rejections hurt more than duplicates because they feel personal. Someone looked at your work and said it does not count. But most rejections are not about the quality of your research. They are about scope, risk acceptance, or miscommunication.

### Common reasons for rejection

**Out of scope.** You tested a subdomain or feature that the program explicitly excludes. This one is entirely on you. Read the scope document carefully before testing, and re-read it before submitting. Programs update their scope regularly.

**Accepted risk.** The company knows about the issue and has decided not to fix it. This is common with informational findings like missing security headers, verbose error messages, or theoretical attacks that require unlikely preconditions. Companies make risk decisions based on their own threat model, and disagreeing with that model does not make your report valid.

**Not a vulnerability.** Sometimes what looks like a security issue is actually intended behavior. An API that returns user email addresses might seem like information disclosure, but if those emails are already displayed in the public UI, there is no additional risk.

**Insufficient impact.** Your proof of concept does not demonstrate real harm. A reflected XSS that only fires in an outdated browser, or a CSRF that changes a non-sensitive setting, may not meet the program's bar.

**Poor report quality.** The triager could not understand or reproduce the issue. This is the most fixable reason for rejection. See our guide on [writing your first report](/learn/writing-your-first-report) for the fundamentals.

### How to respond constructively

Wait at least a few hours before responding. Your first reaction will probably be defensive, and defensive comments never help.

When you do respond, be specific. If the triager misunderstood your report, clarify the exact point of confusion. If they could not reproduce the issue, provide more detailed steps or a video walkthrough. If they disagree on impact, present additional attack scenarios with evidence.

Do not:

- Copy-paste OWASP definitions at the triager. They know what XSS is.
- Threaten to disclose publicly. This violates every platform's terms and burns your reputation permanently.
- Tag the program's CISO on Twitter. I have seen hunters do this. It never ends well.
- Submit the same report again with minor changes. Platforms track this and it counts against you.

Sometimes the correct response is "Thank you for reviewing, I understand the decision." Not every hill is worth fighting on. Learning to tell the difference between a wrong rejection and a fair one is a skill that takes time to develop.

## Severity disputes

This is where things get interesting, because severity directly determines your payout. A bug rated as Medium instead of High can mean the difference between $500 and $2,000. You should absolutely push back when you believe a severity rating is wrong, but you need to do it with evidence.

### Building your case

Start with the [CVSS v4.0 calculator](https://www.first.org/cvss/v4-0/). Work through every metric honestly. Do not inflate the attack complexity or scope to get a higher number. Triagers use the same calculator and will spot inflated scores immediately.

Document the realistic attack chain. What can an attacker actually do with this vulnerability? Who is affected? How many users? What data is exposed? Quantify the impact wherever possible.

Look for precedent. Search for similar vulnerabilities on the same platform's disclosed reports. If a comparable XSS on a different program was rated High, reference that report (with a link) in your argument. Precedent is persuasive.

If you have a working exploit, include it. A theoretical privilege escalation rated Medium becomes a demonstrated account takeover rated High when you can show it working end to end.

Consider the business context. A vulnerability in a payment processing endpoint is inherently more severe than the same technical issue in a blog comment system. Frame your impact description around what matters to the business, not what matters to the CVSS calculator.

For a deeper understanding of how scoring works and how to apply it effectively, read our [CVSS scoring guide for bounty hunters](/learn/understanding-cvss-scoring-for-bounty-hunters).

### When you are wrong about severity

Sometimes you genuinely are wrong. I have submitted reports where I was convinced the severity was High, only to learn that a mitigation I did not know about reduced the real-world impact to Low. Security teams have context about their own infrastructure that you do not have as an external tester. Accept it when they explain their reasoning, and file that knowledge away for next time.

## Platform mediation processes

Each major platform handles disputes differently. Knowing the process before you need it saves time and frustration.

### HackerOne

HackerOne offers mediation through their internal team. If you disagree with a program's decision, you can request mediation after the report has been closed for at least three days. The mediation team reviews the report independently and makes a binding decision.

Key points:

- Mediation is available for severity disputes, not-applicable decisions, and bounty amount disagreements
- The mediator can uphold the original decision, change the severity, or reopen the report
- You get one mediation request per report, so make it count
- Write a clear, concise summary of why you disagree, with specific technical evidence
- The process typically takes 1-2 weeks

HackerOne also has a [retesting program](https://docs.hackerone.com/hackers/manage-reports/retesting/) where you can verify that fixes are complete. This is a separate process from mediation but can strengthen your case if the original fix was incomplete.

### Bugcrowd

Bugcrowd uses an internal triage team that sits between you and the program. This means disputes are often resolved during initial triage rather than after. The Bugcrowd triage team assigns their own severity rating based on the [Vulnerability Rating Taxonomy](https://docs.bugcrowd.com/researchers/reporting-managing-submissions/submissions/), which sometimes differs from both your assessment and the program's preference.

If you disagree with the triage team's rating, you can comment on the submission with additional evidence. The triage team will re-evaluate. If you still disagree after that, you can escalate to Bugcrowd's support team, but in my experience the initial triage decision holds most of the time.

One advantage of Bugcrowd's model is that the triage team has seen thousands of similar reports and generally applies consistent ratings. The disadvantage is that you are arguing with a middleman who did not build the application.

### Intigriti

Intigriti's triage process is similar to Bugcrowd's in that they have an internal triage team. You can dispute decisions by commenting on the report with supporting evidence. Intigriti also offers a formal dispute resolution process for cases where the initial response does not resolve the disagreement.

Intigriti tends to be responsive to well-argued disputes, particularly when you can point to inconsistencies with how similar bugs were rated on the same program. Their triage team is smaller than Bugcrowd's, which can mean slower response times but more personalized attention.

For a broader comparison of how these platforms differ, see our [platform comparison guide](/learn/hackerone-vs-bugcrowd-vs-intigriti).

## Protecting your mental health

Nobody talks about this enough, so I will.

Bug bounty hunting has one of the worst feedback loops of any profession. You can spend an entire week researching a target and come away with nothing. You can find a genuine vulnerability and lose it to a duplicate. You can write a perfect report and have it rejected because the company decided the risk is acceptable. And when you do get paid, the payout might not reflect the hours you invested.

The rejection rate when starting out is brutal. I have spoken with hunters who submitted 20 reports before their first accepted finding. That is not failure. That is the learning curve.

Some things that help:

**Track your metrics honestly.** Keep a spreadsheet of every report you submit, the outcome, and what you learned. Over time, your acceptance rate will improve. Seeing the trend line go up matters more than any individual report.

**Diversify your programs.** Do not put all your effort into one program. If your only target rejects a report, it feels catastrophic. If one of your five targets rejects a report, it is a Tuesday.

**Set time boundaries.** Hunting from 9 PM to 3 AM every night because you feel like you need to make up for rejected reports is a path to burnout. Define your hours and stick to them.

**Connect with other hunters.** The bug bounty community on Twitter, Discord, and various forums is genuinely supportive. Other hunters understand the frustration in a way that non-hunters never will. Find your people.

**Remember that rejection is information, not judgment.** A rejected report tells you something about the program's priorities, the target's architecture, or your own methodology. Extract the lesson and move forward.

Building a sustainable career in bug bounties means treating yourself like an athlete in a long season. Individual losses do not define you. Your trajectory over months and years is what matters. For more on setting realistic expectations, read our guide on [what hunters actually earn](/learn/bug-bounty-economics-what-hunters-actually-earn) and our advice on [building your reputation](/learn/building-bug-bounty-reputation) over time.

## Summary

Duplicates, rejections, and severity disputes are not obstacles to bug bounty hunting. They are bug bounty hunting. The hunters who succeed long-term are not the ones who avoid rejection. They are the ones who process it quickly, learn from it, and keep submitting.

Check scope before you test. Research the target's history before you report. Build severity arguments on evidence, not feelings. Use platform mediation when it is warranted. And take care of yourself along the way.
