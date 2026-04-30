---
layout: "@layouts/MarkdownLayout.astro"
title: "Writing Bug Bounty Writeups That Get Noticed"
description: "How to turn disclosed findings into published writeups that build your reputation, attract private invitations, and help the community learn."
date: "2026-04-07"
---

A report gets you paid. A writeup gets you known.

Most hunters stop at the report. They find a vulnerability, submit it, collect the bounty, move on. That is leaving value on the table. The best hunters in this industry - James Kettle, Sam Curry, Orange Tsai, Corben Leo - built their reputations not just by finding bugs but by writing about them publicly after disclosure. Their writeups brought them conference invitations, private program access, job offers, and recognition that compounded over years.

This article is not about [writing reports for triagers](/learn/writing-your-first-report). That is a different skill for a different audience. This is about what comes after: turning a disclosed finding into a published writeup that people actually want to read.

## Reports and writeups solve different problems

A report is a technical document for one audience: the security team that needs to fix the bug. It needs to be precise, reproducible, and structured. The triager reading it has context about the application and wants to get to the reproduction steps fast.

A writeup is a narrative for thousands of readers. Most of them have never seen the target application. Many are learning. Some are experienced hunters looking for new techniques. Your writeup needs to teach, not just document.

The biggest mistake I see in published writeups is people pasting their original report and calling it an article. That does not work. The report was written for someone who already understands the application. The writeup audience does not.

## A structure that works

After reading hundreds of writeups and publishing my own, I have settled on a structure that consistently holds attention.

### Start with the hook

Your first paragraph determines whether anyone reads the rest. Do not start with "I was testing example.com and found an XSS." Start with why the reader should care.

Good hooks include:

- The impact or payout: "This single SSRF chain earned $25,000 and gave me access to internal AWS metadata across three regions."
- A surprising technique: "I found a way to bypass their WAF by encoding payloads in a format their parser did not recognize."
- A relatable frustration: "I spent four days on this target with nothing to show for it. Then I noticed a single redirect that changed everything."

The hook is not clickbait. It is a promise to the reader about what they will learn.

### Provide context the reader needs

Explain enough about the target and attack surface that someone unfamiliar with it can follow along. You do not need to reveal the full scope of your recon, but the reader needs to understand the environment.

What technology stack was involved? What did the application do? What part of the attack surface caught your attention and why? This section usually takes two to four paragraphs.

James Kettle's [PortSwigger research posts](https://portswigger.net/research) are excellent examples of this. His HTTP desync work, which earned over $200K in bounties through discoveries at CDN and proxy layers, always begins by explaining the protocol-level behavior before showing the exploit. Readers who have never thought about Transfer-Encoding ambiguity can still follow along because he builds the context first.

### Walk through the technical details

This is the core of the writeup and where most of the word count should go. Walk through your process step by step. Include the dead ends. Include the moments where you were wrong.

Show your actual HTTP requests and responses. Use code blocks. Annotate them. If you sent a crafted request, show the request and then explain what each part does and why.

```
POST /api/v1/user/settings HTTP/1.1
Host: app.example.com
Content-Type: application/json
Authorization: Bearer <token_for_user_A>

{"user_id": "12345", "email": "attacker@evil.com"}
```

In a report you might just show this and say "change the user_id parameter to another user's ID." In a writeup, explain the thought process. Why did you try this? What made you suspect the API was not validating ownership? What did the response look like compared to a legitimate request?

The best writeups read like detective stories. The reader follows your reasoning, not just your keystrokes.

### Show what failed

This is something most writeups skip, and it is the part I find most valuable when I read other people's work. What did you try that did not work? What rabbit holes did you go down?

When Sam Curry published his writeups on automotive API vulnerabilities, he included the approaches that failed before landing on the one that worked. This makes the writeup dramatically more useful for someone trying to apply similar techniques to a different target. It also makes you more credible. If everything you tried worked perfectly the first time, readers will assume you are leaving things out.

### End with takeaways

Close with what the reader should take away. Not a summary of what you wrote - they just read it. Instead, give them something actionable.

What pattern should they look for in their own testing? What class of application is likely vulnerable to this? What tools or techniques were most useful? If you could give one piece of advice to someone hunting for this same bug class, what would it be?

## Getting permission to publish

You cannot write a public writeup about an undisclosed vulnerability. Full stop. Publishing details before the vendor has fixed the issue is irresponsible, potentially illegal, and will get you banned from platforms.

Here is how the process works in practice:

1. Submit your report through the normal channel
2. Wait for the fix to be deployed
3. Request disclosure through the platform or directly with the vendor
4. Get explicit written permission before publishing

On HackerOne, you can request disclosure directly on the report. Some programs have automatic disclosure after a set period (usually 180 days). Others require manual approval. Check the program's disclosure policy before you assume anything.

On Bugcrowd, disclosure permissions vary by program. Some allow it, some do not. Read the brief carefully.

If the program does not have a formal disclosure process, email the security team directly. Something like: "The vulnerability in report #12345 has been resolved. I would like to publish a technical writeup about the finding. Can you confirm you are comfortable with this?"

Most security teams say yes, especially if you offer to let them review it first. Some will ask you to wait a specific period after the fix. Respect that.

For more on the disclosure process itself, see [the coordinated vulnerability disclosure guide](/learn/coordinated-vulnerability-disclosure-guide).

### Handling sensitive details

Even with permission, be thoughtful about what you include. Redact session tokens, API keys, personal data, and anything that could identify specific users. Replace real domain names if the program asks you to, though many programs prefer you use the real name since it builds their security credibility.

Never include details that would let someone exploit a related but unfixed issue. If the bug you found suggests a broader pattern that might still exist elsewhere in the application, keep that part vague.

## Where to publish

You have several options, and the right one depends on your goals.

### Personal blog

I think this is the best long-term choice. You own the content, control the presentation, and build SEO equity on your own domain. Every writeup you publish makes your site more discoverable for security-related searches, which feeds your reputation over time.

You do not need anything fancy. A static site with markdown rendering works fine. Hugo, Astro, Jekyll, or even just HTML files. What matters is that you publish consistently and that the content is good.

### HackerOne Hacktivity

When a report is disclosed on HackerOne, it appears on [Hacktivity](https://hackerone.com/hacktivity), their public feed of disclosed reports. This gets eyeballs because other hunters browse Hacktivity regularly. The downside is that Hacktivity shows your original report, not a polished writeup. Consider publishing the Hacktivity disclosure and then writing a longer companion piece on your own blog with more context and narrative.

### Medium and similar platforms

Medium has a large security readership and good discoverability. The tradeoff is that you are building on someone else's platform. If Medium changes their paywall rules or algorithm, your traffic can disappear overnight. I use Medium as a syndication channel, not a primary home.

### Conference talks

If your finding is novel enough, turn it into a talk submission. DEF CON, Black Hat, BSides events, and regional security conferences all accept submissions from independent researchers. A talk based on a writeup gives you a different kind of visibility and credibility. It is more work, but the reputation payoff is larger.

James Kettle's HTTP desync research started as blog posts on PortSwigger's research site and became DEF CON and Black Hat presentations. That progression from writeup to talk to industry-wide awareness is the gold standard.

## How writeups compound

The real value of writeups is not any single post. It is the compound effect over time.

Your first writeup will get a handful of readers. Your fifth might get shared on Twitter. Your tenth might get cited in someone else's conference talk. Each one adds to a body of work that establishes what you know and how you think.

Here is what I have seen happen for hunters who publish consistently:

**Private program invitations increase.** Program managers read writeups. When they see a well-written analysis of a bug class that is relevant to their application, they invite that researcher. I know multiple hunters who trace their first high-paying private invitation to a specific writeup that a program manager read.

**Recruiters reach out.** Security teams at companies hire people who can find and clearly explain vulnerabilities. A library of published writeups is a better portfolio than any resume bullet point.

**Speaking opportunities appear.** Conference organizers look for researchers with published work. If you have a track record of clear, interesting writeups, you are a safer bet for a talk slot than someone with no public presence.

**Other hunters collaborate with you.** Publishing your work signals that you are serious and generous with knowledge. This leads to collaboration on targets, shared reconnaissance, and access to techniques you would not find alone.

For more on this, see [building your bug bounty reputation](/learn/building-bug-bounty-reputation).

## Common mistakes to avoid

**Writing for experts only.** Your writeup will reach people at every skill level. Define acronyms on first use. Explain the vulnerability class briefly before diving into the specific instance. You can be technical without being exclusionary.

**Burying the interesting part.** If the novel technique is in step seven of a twelve-step process, restructure. Lead with what makes this writeup different from every other XSS post on the internet.

**No visuals.** Screenshots, diagrams, and annotated request/response pairs make complex chains much easier to follow. If your exploit involves multiple steps across different services, draw a flow diagram.

**Inconsistent publishing.** One writeup per year does not build momentum. You do not need to publish weekly, but aim for at least one per quarter if you are actively hunting. Not every finding deserves a writeup, but more of them do than you think.

**Skipping the "why I looked here" step.** Readers want to know your targeting rationale. "I was testing the API" is not enough. "I noticed the API used sequential integer IDs and did not include any ownership validation in the authorization header, which is a pattern I have seen lead to IDOR in similar applications" teaches them something they can apply tomorrow.

## Getting started

Pick a finding you have already disclosed. Something you are proud of, where the technical details are interesting enough to teach someone something. Open a blank document and write the hook first. If you cannot write a compelling opening paragraph, either the finding is not writeup-worthy or you need to think harder about what makes it interesting.

Then fill in the structure: context, technical walkthrough, failures, takeaways. Get it reviewed by a friend or fellow hunter before publishing. Ask them specifically: "Is there a point where you got confused or lost interest?" Fix those sections.

Publish it. Share it. Write the next one.

The hunters who built the biggest reputations in this industry did it by sharing what they learned. Your reports pay the bills. Your writeups build the career. If you are only doing the first part, you are working harder than you need to for less than you deserve.

For ideas on what targets to hunt for your first writeup-worthy finding, check out [choosing your first bug bounty program](/learn/choosing-your-first-bug-bounty-program).
