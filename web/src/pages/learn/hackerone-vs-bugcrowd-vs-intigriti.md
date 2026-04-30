---
layout: "@layouts/MarkdownLayout.astro"
title: "HackerOne vs. Bugcrowd vs. Intigriti: Platform Differences That Matter"
description: "A practical comparison of the three major bounty platforms - triage processes, payout mechanics, reputation systems, and which works best for different hunting styles."
date: "2026-04-07"
---

Most platform comparisons give you a feature matrix and call it a day. Three columns, some checkmarks, a vague conclusion that "it depends." That is not useful when you are trying to decide where to invest hundreds of hours of your time.

I have hunted on all three major platforms and the differences that actually matter are not the ones that show up in marketing pages. They are the things you discover after your tenth report: how fast triage moves, what happens when you disagree with a severity rating, how the reputation algorithm rewards or punishes you, and whether the payment system works without friction. Those are the differences I want to cover here.

## How triage actually works

Triage is where your experience as a hunter is made or broken. You spend hours finding a bug, write a careful report, hit submit, and then wait. What happens next varies dramatically across platforms.

### HackerOne

HackerOne uses a hybrid model. Some programs run their own triage internally, meaning the company's security team reads your report directly. Others use HackerOne's managed triage service, where HackerOne employees review reports before passing them to the company.

Managed triage is generally faster for initial response. HackerOne publishes response metrics on each program page, and managed programs often hit first response within 1-3 days. The downside is that the triager is not the company's engineer. They are evaluating your report against a rubric. If your finding is novel or requires deep context about the application's business logic, a managed triager might underrate it or ask you to re-demonstrate impact in ways that feel redundant.

When you disagree with a triage decision, HackerOne has a mediation process. You can request mediation after the program has responded, and a HackerOne staff member reviews the dispute. I have found this process to be reasonably fair, but slow. Expect 1-3 weeks for a mediation outcome. The [HackerOne docs](https://docs.hackerone.com/) describe the process in detail, but the real-world timelines often stretch beyond what is documented.

### Bugcrowd

Bugcrowd takes a different approach. All reports go through Bugcrowd's own triage team first. This means every submission is reviewed by a Bugcrowd application security engineer before the program owner ever sees it. Bugcrowd calls this their "CrowdMatch" triage, and it is one of the platform's defining features.

The advantage is consistency. Bugcrowd triagers follow the [Bugcrowd Vulnerability Rating Taxonomy](https://docs.bugcrowd.com/), which is a public document that maps vulnerability types to priority levels. If you find a P2 IDOR, you can look up exactly how it should be rated before you submit. This reduces arguments about severity.

The disadvantage is that it adds a layer between you and the program. If a Bugcrowd triager marks your report as a duplicate or out of scope, you need to appeal through Bugcrowd's system. The triager might not have the full context of the application. I have had cases where a Bugcrowd triager closed a report as "not applicable" because they could not reproduce it in a test account that lacked the right permissions. It took a week of back-and-forth to get it reopened.

### Intigriti

Intigriti, the European-headquartered platform, also uses managed triage but with smaller, more specialized teams. Because Intigriti runs fewer programs than HackerOne or Bugcrowd, the triagers tend to develop deeper familiarity with specific programs over time. I have noticed that Intigriti triagers are more likely to ask thoughtful follow-up questions rather than just requesting a video proof of concept for everything.

Intigriti's triage SLA targets are published in their [knowledge base](https://kb.intigriti.com/). First response typically lands within 3 business days for managed programs. The platform is smaller, which means the triage queue is shorter, which means your report gets human eyes on it faster. For hunters frustrated with week-long waits on other platforms, this is a real advantage.

## Reputation systems and what they actually measure

Your reputation score determines which programs invite you, which reports get prioritized, and in some cases whether your submissions are taken seriously at all. Each platform calculates reputation differently, and understanding the algorithm changes how you should behave.

### HackerOne reputation

HackerOne uses a point-based system. You gain reputation for valid reports, with more points for higher severity. You lose reputation for reports marked as "Not Applicable" or "Spam." Reports closed as "Informative" give you zero points but do not subtract any either.

The key detail most hunters miss: the reputation hit from an N/A is significant. A single N/A can cost you what two or three medium-severity valid reports would earn. This creates a strong incentive to only submit reports you are confident about. That is by design, and it works. But it also means that borderline findings - the kind where you have a real bug but the impact is debatable - become risky to submit. Many experienced hunters sit on edge cases rather than risk the reputation penalty.

HackerOne's Signal percentile is separate from raw reputation. Signal compares your valid-to-invalid ratio against other hunters. A high Signal means you can get into private programs more easily. It is possible to have high raw reputation but mediocre Signal if you submit a lot of low-confidence reports.

### Bugcrowd reputation

Bugcrowd's system is less transparent. Your accuracy, the severity of your findings, and your activity level all feed into a score, but the exact weights are not public. Bugcrowd does publish trust levels (from Newcomer up through MVP and Champion), and these levels unlock access to higher-tier private programs.

What I can tell you from experience is that Bugcrowd's system is more forgiving of occasional misses than HackerOne's. A N/A on Bugcrowd stings less. The trade-off is that climbing the ranks takes longer because the system seems to weight consistency over time rather than a few big wins.

### Intigriti reputation

Intigriti uses a leaderboard system with seasonal and all-time rankings. Your position is based on accepted bounties, severity, and activity within a rolling window. The seasonal resets mean that a new hunter can climb the rankings faster than on platforms where established hunters have years of accumulated reputation.

I like this approach. It rewards current activity rather than historical accumulation. A hunter who was active three years ago but has not submitted anything recently will slide down the rankings, opening space for newer researchers. On HackerOne, high-reputation hunters from 2018 still sit near the top of leaderboards even if they have been inactive for years.

## Payout mechanics

Money matters. How you get paid, how fast, and what the minimums are can affect your platform choice, especially if you are not based in the US.

### HackerOne

HackerOne offers payouts via PayPal, bank transfer, and Bitcoin. The minimum payout threshold is $100 for most methods. Processing time is typically 1-7 business days after the bounty is awarded by the program, though I have seen it take up to two weeks during busy periods.

HackerOne paid out over $81 million in bounties in a recent 12-month period. The volume means their payment infrastructure is well-tested. Problems are rare. When they do happen, support is responsive about payment issues specifically - they know that messing with people's money erodes trust fast.

One detail worth knowing: some programs on HackerOne pay through the platform, while others handle payments directly. If a program pays directly, you are at the mercy of the company's accounts payable process, which can be much slower.

### Bugcrowd

Bugcrowd pays through their platform via PayPal, Payoneer, or bank transfer. The minimum is $100. Bugcrowd also offers the option to donate bounties to charity directly through the platform if you prefer.

Payment processing on Bugcrowd runs weekly in batches. So even after a bounty is awarded, you might wait until the next payment cycle. This is a minor annoyance but worth knowing if you are budgeting around expected income.

### Intigriti

Intigriti pays via bank transfer (SEPA for European hunters, international wire for others) and PayPal. The minimum payout is EUR 50, which is lower than the other platforms. For hunters in Europe, the SEPA transfers are fast, often arriving within 1-2 business days.

Intigriti handles all payments through the platform. There is no "direct payment" option where you deal with the company. I appreciate this because it means the platform is always the intermediary, which gives you leverage if there is a dispute about payment.

## Program discovery and invitations

How you find programs and how programs find you differs meaningfully across platforms.

### HackerOne

HackerOne has the largest program directory. You can browse public programs without an account. Private programs are invitation-only, and invitations are driven by your reputation, Signal, and the types of vulnerabilities you have previously found.

The invitation system is where HackerOne's reputation mechanics really bite. If your Signal drops, invitations dry up. If you maintain a high Signal, you will regularly receive invitations to well-paying private programs that have far less competition than public ones. The delta between public and private program earnings is enormous. Most top hunters on HackerOne earn the majority of their income from private programs.

### Bugcrowd

Bugcrowd also has public and private programs. Their invitation system considers your trust level, skill tags, and geographic location. Some programs specifically request hunters from certain regions for compliance reasons.

Bugcrowd's "Brief" system is worth mentioning. When you are invited to a private program, you receive a brief that outlines exactly what the program is looking for. These briefs are often more detailed than what you see on public program pages, sometimes specifying particular features they want tested or vulnerability classes they are concerned about. This focus helps you prioritize your time.

### Intigriti

Intigriti has a smaller program pool, concentrated in European companies. If you are interested in testing European fintech, healthcare, or government-adjacent applications, Intigriti often has programs you will not find elsewhere.

Their invitation system is straightforward. Perform well on public programs and you get invited to private ones. The smaller platform size means the community is tighter. I have noticed that program managers on Intigriti are more likely to engage directly with hunters in program comments, which creates something closer to a working relationship than the transactional dynamic on larger platforms.

## Handling disputes and duplicates

Every hunter eventually faces a report that gets closed as a duplicate, downgraded in severity, or rejected outright. How each platform handles these situations reveals a lot about its priorities. I wrote more about this in [handling duplicates, rejections, and disputes](/learn/handling-duplicates-rejections-and-disputes), but here is the platform-specific summary.

HackerOne's mediation process is formalized. You request it, a staff member reviews both sides, and they make a binding decision. It is slow but at least it exists as a real process.

Bugcrowd's appeals go through their triage team. Since Bugcrowd triagers made the original decision, you are essentially asking them to reconsider. This can feel like arguing with the referee, but in practice the appeals team is separate from initial triage and does overturn decisions when warranted.

Intigriti's smaller scale works in its favor here. Disputes tend to get resolved through direct communication between the triager, the hunter, and the program. Less formal process, but faster resolution. I have had Intigriti disputes resolved in 48 hours that would have taken weeks on another platform.

## Beyond the big three

Two other platforms deserve mention.

[Immunefi](https://immunefi.com/) dominates the Web3 and blockchain space. If you hunt smart contract vulnerabilities, Immunefi is not optional. The bounties are often dramatically higher than traditional platforms - six and seven figures for critical findings in DeFi protocols. The trade-off is that the skill floor is higher. You need to read Solidity or Rust, understand DeFi mechanics, and be comfortable with blockchain tooling. But for hunters who have those skills, the [economics are hard to ignore](/learn/bug-bounty-economics-what-hunters-actually-earn).

[YesWeHack](https://www.yeswehack.com/) is a European platform growing steadily, particularly in France and the broader EU. They have won several government contracts and run bug bounty programs for public-sector organizations. If you are building a career in European security, having YesWeHack on your profile adds credibility. Their triage quality is solid and improving.

## Which platform fits which hunting style

After years on all three platforms, here is my honest read.

If you are a volume hunter who submits many reports across many programs, HackerOne gives you the largest target pool and the most opportunities. But protect your Signal. Submit confidently or not at all.

If you prefer depth over breadth and like to spend weeks embedded in a single application, Bugcrowd's brief system and consistent triage taxonomy will serve you well. You will know exactly what is expected and how your findings will be rated.

If you are based in Europe, value faster triage, or want to build relationships with program teams rather than just submit into a queue, Intigriti is worth prioritizing. The lower payout minimum also helps if you are just starting out and want to see money in your account sooner.

If you are hunting smart contracts, go to Immunefi. There is no second choice for Web3.

Most experienced hunters do not pick one platform exclusively. They maintain profiles on two or three and allocate time based on which programs are interesting at any given moment. That is probably the right approach long-term. But if you are just starting, pick one platform, build reputation there, and expand later. Splitting your early efforts across platforms means slow reputation growth everywhere and invitations to private programs nowhere.

You can [search across programs on all platforms](/), including filtering by platform, on the Bug Bounties homepage. If you are still deciding where to start, read [choosing your first bug bounty program](/learn/choosing-your-first-bug-bounty-program) first, then come back here to pick your platform. And once you are on a platform, your reputation is everything - I covered that in [building bug bounty reputation](/learn/building-bug-bounty-reputation).
