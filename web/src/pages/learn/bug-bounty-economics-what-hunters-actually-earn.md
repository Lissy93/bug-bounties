---
layout: "@layouts/MarkdownLayout.astro"
title: "Bug Bounty Economics: What Hunters Actually Earn (With Real Data)"
description: "Median payouts by severity and platform, time-to-bounty benchmarks, and an honest look at the economics of full-time vs. part-time bounty hunting."
date: "2026-04-07"
---

Every year, platforms publish headline numbers. HackerOne paid out $81M in 12 months. Google paid $17M in 2025. Meta has paid $25M lifetime, with $4M going out in 2025 alone. These numbers are real, but they paint a misleading picture of what a typical hunter actually takes home.

I want to go through the real economics, using aggregate data instead of cherry-picked top earner stories. If you are considering bug bounty hunting as income - part-time or full-time - you need honest math, not hype.

## What platforms actually pay out

The big three platforms publish enough data to piece together the real picture. Here is what the aggregate numbers look like across major programs.

| Platform | Annual payouts (recent) | Lifetime payouts | Active programs |
|---|---|---|---|
| HackerOne | ~$81M (2024-2025) | $300M+ | 3,000+ |
| Bugcrowd | Not disclosed | $50M+ | 1,000+ |
| Google VRP | $17M (2025) | $59M+ | Internal |
| Meta | $4M (2025) | $25M+ | Internal |
| Microsoft | $16.6M (2024) | $60M+ | Internal |

These totals are spread across thousands of researchers. HackerOne reports over 50,000 researchers have earned at least one bounty. That $81M annual figure divided by 50,000 gives you $1,620 per earning researcher per year. Obviously this is a rough average and the distribution is wildly uneven, but it sets the baseline.

The top 100 all-time earners on HackerOne have collectively made about $31.8M. That means roughly 10% of all lifetime payouts went to the top 100 people out of tens of thousands. The power law is brutal.

## Median payouts by severity

Headlines love to quote the maximum bounty a program offers. A $100,000 critical bounty sounds incredible until you realize most findings are not criticals and most programs pay well below their stated maximum. Here are the median payouts I have seen across the major platforms, based on published data and researcher surveys.

| Severity | Median payout (HackerOne) | Median payout (Bugcrowd) | Google VRP range |
|---|---|---|---|
| Critical | $3,000 - $5,000 | $3,500 - $5,500 | $10,000 - $31,337 |
| High | $1,000 - $2,500 | $1,500 - $3,000 | $5,000 - $15,000 |
| Medium | $500 - $1,000 | $500 - $1,500 | $1,000 - $5,000 |
| Low | $100 - $300 | $150 - $500 | $100 - $1,000 |

A few things to note. Google's VRP pays significantly above market rate because their scope is enormous and the engineering quality makes bugs harder to find. Meta's payouts cluster in the medium-to-high range because most findings are access control or privacy issues rather than RCEs. The median is not the average - half of payouts for a given severity fall below these numbers.

Private programs generally pay 2x to 4x what comparable public programs pay for the same severity. This is a core reason why [building your reputation](/learn/building-bug-bounty-reputation) matters so much for earnings.

## The power law problem

Bug bounty earnings follow a power law distribution, not a normal curve. This is the single most important thing to understand about bounty economics.

A small percentage of hunters earn most of the money. The top 1% on HackerOne earn more than the bottom 90% combined. This is not a guess. The published leaderboard data makes it clear. Researchers ranked in the top 50 regularly report six-figure annual earnings. Researchers ranked 500-1000 might earn $5,000 to $20,000 per year. Researchers outside the top 2,000 often earn under $1,000 annually.

Why? Three compounding factors:

**Skill concentration.** Finding critical vulnerabilities requires deep technical knowledge that takes years to develop. A hunter who can chain together an SSRF with a cloud metadata leak to achieve RCE will earn more from a single report than many hunters earn in a year.

**Private program access.** Top hunters get invited to high-paying private programs, which have fewer participants, faster triage, and higher bounties. This creates a feedback loop - good earnings lead to better reputation, which leads to better invitations, which leads to better earnings. The [comparison between platforms](/learn/hackerone-vs-bugcrowd-vs-intigriti) matters less than getting into private programs on any of them.

**Speed and efficiency.** Experienced hunters have refined workflows. They know where to look, what patterns to grep for, and which program types match their skills. A senior hunter might spend four hours finding a high-severity bug that takes a newer researcher forty hours of recon to stumble onto.

Research from academic studies of bug bounty platforms found something interesting: when a program doubles its payout amounts, report submissions only increase by about 20%, but the number of critical findings triples. Higher bounties attract the experienced hunters who can actually find the serious bugs. The casual hunters barely respond to price signals.

## What most hunters actually earn

Here is the part nobody wants to write. Most people who try bug bounty hunting earn nothing. Zero dollars. Not in their first month, sometimes not in their first six months.

HackerOne's own data shows that of researchers who submit at least one report, roughly 40% never get a single bounty. Their reports are either duplicates, informative, not applicable, or the program simply does not pay for what they found. Learning to [handle duplicates and rejections](/learn/handling-duplicates-rejections-and-disputes) is part of the process.

For those who do earn, here is a rough distribution based on available platform data and researcher surveys:

| Earnings tier | Estimated % of active hunters | Typical profile |
|---|---|---|
| $0 per year | 35-45% | New researchers, casual participants |
| $1 - $1,000 | 20-25% | Occasional hunters, low-severity findings |
| $1,000 - $10,000 | 15-20% | Regular part-time hunters |
| $10,000 - $50,000 | 8-12% | Dedicated part-time or early full-time |
| $50,000 - $100,000 | 3-5% | Experienced full-time hunters |
| $100,000+ | 1-2% | Top-tier, private programs, live events |

These numbers are approximations built from HackerOne annual reports, [Bugcrowd's Inside the Platform](https://www.bugcrowd.com/resources/reports/inside-the-platform/) data, and researcher community surveys. They are directionally accurate even if the exact percentages shift year to year.

## Full-time vs. part-time: the honest math

I think full-time bug bounty hunting is a viable career for a specific type of person with specific circumstances. It is not viable for most people, and I will explain why.

### The full-time case

Assume a skilled full-time hunter averages 40 hours per week. Based on published data from hunters who share their numbers, a reasonable range for someone in the top 5-10% is $50,000 to $150,000 per year. That works out to $24 to $72 per hour before taxes.

But that is the good scenario. Here is what eats into it:

- **Income volatility.** You might earn $15,000 one month and $800 the next. There is no salary floor. A dry spell of duplicates and low-severity findings can last weeks.
- **No benefits.** No health insurance, no retirement matching, no paid time off. In the US, add roughly 30% to your required earnings to match an equivalent salaried position. If you need $80,000 in take-home to cover your expenses, you need to earn about $104,000 in bounties before [taxes](/learn/bug-bounty-income-and-taxes).
- **Platform dependency.** Your income depends on programs staying active, platforms staying online, and triage teams processing your reports. I have seen programs go quiet for months, leaving pending reports in limbo.
- **Burnout.** Every hour not hunting is an hour not earning. Taking a vacation means zero income for that period. The psychological pressure of self-employment hits different when your paycheck depends on finding bugs.

### The part-time case

Part-time bounty hunting avoids most of these downsides. With a stable day job covering your baseline expenses, bounty income becomes a supplement. The math changes completely.

Ten hours per week of focused hunting, assuming you have built up enough skill to find medium and high severity bugs regularly, might yield $500 to $2,000 per month. That is $6,000 to $24,000 per year on top of your salary. For someone already working in security, the skills overlap is significant - you are getting paid to practice and improve.

Part-time hunting also lets you be selective. You can skip programs with low payouts, avoid scope areas that bore you, and walk away from a frustrating target without financial pressure. You hunt better when you are not desperate.

My honest recommendation: start part-time. Build skills and reputation for at least a year before even considering full-time. The hunters who succeed full-time almost always had a long part-time runway first.

## Maximizing your earnings

If you want to push toward the higher end of these ranges, the strategies are straightforward even if they take time to execute.

### Specialize deeply

Generalists find more bugs across categories, but specialists find higher-severity bugs in their niche. A hunter who spends six months mastering [SSRF](/learn/server-side-request-forgery-ssrf-hunting) will earn more per hour than one who surface-skims ten vulnerability classes. The most lucrative specializations right now:

- Cloud misconfigurations and metadata exploitation
- OAuth and [authentication](/learn/hunting-authentication-vulnerabilities) implementation flaws
- [API security](/learn/api-security-testing-for-bug-bounties) (especially GraphQL)
- [Mobile application](/learn/mobile-app-security-testing-for-bounties) testing (less competition)
- [AI/LLM security](/learn/ai-llm-security-testing-for-bounties) (emerging, fast-growing bounties)

### Target private programs

Private programs pay more, have fewer participants, and often have larger scope. Getting invited requires reputation, which requires consistent quality on public programs. It is a grind, but the economics make it worth it. The average bounty on private programs is roughly 2.5x the average on comparable public programs.

[Choosing the right programs](/learn/choosing-your-first-bug-bounty-program) in the early stages sets the trajectory for your entire earning career.

### Attend live hacking events

HackerOne's H1 events and Bugcrowd's LevelUp events are where the biggest single-day payouts happen. Top performers at live events have earned $50,000+ in a single weekend. These events also build relationships with program teams, which can lead to ongoing private invitations and consulting opportunities.

Getting invited to live events requires strong platform standing, but the ROI is extraordinary if you can get a seat.

### Write better reports

This sounds obvious but it directly affects your income. A well-written report with clear reproduction steps, impact analysis, and remediation suggestions gets triaged faster, rated at higher severity, and sometimes awarded above the standard bounty. A vague report with a one-line description often gets downgraded or rejected. Learn to [write strong reports](/learn/writing-your-first-report) from the start.

Programs have told me that a clear, professional report can be the difference between a medium and a high severity rating when the finding is borderline. That gap could be $500 vs $2,000.

## The bottom line

Bug bounty hunting can be genuinely lucrative, but only for a minority of participants. The economics reward deep skill, patience, and strategic program selection. The median outcome is far more modest than the headlines suggest.

If you are getting into this with realistic expectations - knowing that your first months will likely pay nothing, that earnings are volatile, and that the big money requires years of skill building - you will make better decisions. You will invest in learning instead of spray-and-praying reports. You will build reputation deliberately instead of chasing every program.

The hunters who earn $100,000+ per year did not get there by following tutorials. They got there by spending thousands of hours reading code, understanding systems at a deep level, and developing instincts that no guide can fully teach. The money is real. The path to it is longer and harder than anyone selling a bug bounty course will tell you.

Start with the [HackerOne annual report](https://www.hackerone.com/resources/reporting/annual-security-report), browse [Google's VRP rules](https://bughunters.google.com/about/rules), and look at what [Bugcrowd publishes](https://www.bugcrowd.com/resources/reports/inside-the-platform/) about their platform. The data is out there. Make your decisions based on it, not on someone's screenshot of a single big payout.
