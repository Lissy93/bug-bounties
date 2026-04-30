---
layout: "@layouts/MarkdownLayout.astro"
title: "Bug Bounty Legal Guide: CFAA, Safe Harbor, and What Actually Protects You"
description: "The real legal landscape for security researchers - why the DOJ policy is weaker than you think, what safe harbor clauses actually cover, and how laws differ across jurisdictions."
date: "2026-04-07"
---

**I am not a lawyer. This is not legal advice. If you are facing legal action or are unsure about the legality of specific research, consult an attorney who specializes in computer crime law.** With that out of the way, I think most bug bounty hunters have a dangerously incomplete understanding of the laws that govern their work. This article is my attempt to fix that.

The standard advice is "read the program policy and check your local laws." That is technically correct and practically useless. The legal situation for security researchers is messy, inconsistent across jurisdictions, and changing fast. Understanding what actually protects you - and what does not - matters more than any single vulnerability you will ever find.

## The CFAA: what it actually says

The [Computer Fraud and Abuse Act](https://www.law.cornell.edu/uscode/text/18/1030) (18 U.S.C. Section 1030) is the primary federal statute governing unauthorized computer access in the United States. Passed in 1986, it was written to prosecute hackers breaking into government and financial systems. It has been amended multiple times since, and its scope has expanded well beyond what Congress originally intended.

The key prohibition is in Section 1030(a)(2): it is a federal crime to "intentionally access a computer without authorization, or exceed authorized access" to obtain information. Section 1030(a)(5) covers knowingly causing damage to a protected computer. The penalties range from misdemeanors to felonies with up to 20 years imprisonment, depending on the subsection and whether it is a repeat offense.

The critical phrase is "without authorization." The statute does not define it. For decades, courts interpreted it in wildly different ways. Some held that violating a website's terms of service constituted unauthorized access. Others said you needed to bypass a technical barrier. This ambiguity is what made the CFAA so dangerous for security researchers.

### Van Buren v. United States (2021)

The Supreme Court's decision in [Van Buren v. United States](https://www.supremecourt.gov/opinions/20pdf/19-783_k53l.pdf) (593 U.S. 374) narrowed the CFAA significantly. The Court held that "exceeds authorized access" means accessing areas of a computer you were not entitled to access at all, not using permitted access for an improper purpose. A police officer who looked up license plates in a database he was authorized to use, but did so for personal reasons, did not violate the CFAA.

This was a win for researchers. Before Van Buren, a prosecutor could argue that testing a web application for vulnerabilities "exceeded authorized access" because the terms of service did not allow it. That argument is weaker now.

But Van Buren did not solve everything. It addressed "exceeds authorized access" but said less about "without authorization." If you have no account on a system and find a way in, Van Buren does not help you. The decision also does not prevent civil suits under the CFAA, which have a lower burden of proof.

### The DOJ's 2022 charging policy

In May 2022, the Department of Justice [announced a revised policy](https://www.justice.gov/opa/pr/department-justice-announces-new-policy-charging-cases-under-computer-fraud-and-abuse-act) for charging CFAA cases. The policy states that "good-faith security research should not be charged" and explicitly mentions testing, investigation, and correction of security flaws as protected activity, provided the research is done in a way designed to avoid harm.

This sounds great. I have seen it cited as if it is a shield. It is not, and here is why.

The DOJ policy is internal agency guidance. It tells federal prosecutors how to exercise their discretion. It does not change the law. It does not bind courts. It does not prevent a future administration from issuing different guidance. It does not apply to state prosecutors bringing charges under state computer crime statutes. And it provides zero protection against civil lawsuits.

Think about what "rescindable at any time" means in practice. A new Attorney General could revoke this policy on day one. There is no rulemaking process, no notice-and-comment period, no Congressional approval needed. The policy exists at the pleasure of whoever runs the DOJ.

I want to be clear: the 2022 policy is better than nothing. Federal prosecution of good-faith researchers was always rare, and the policy makes it rarer. But treating it as a legal shield is a mistake.

## State CFAA variants

Every U.S. state has its own computer crime statute, and many are broader than the federal CFAA. Georgia's Computer Systems Protection Act (O.C.G.A. Section 16-9-93) criminalizes computer trespass and has been interpreted aggressively. California Penal Code Section 502 covers unauthorized access to computer systems and carries both criminal penalties and a civil cause of action.

State prosecutors are not bound by DOJ guidance. A county district attorney in Texas is not going to check the DOJ's internal policy before deciding whether to charge you. If you trigger an incident response at a company headquartered in a state with an aggressive computer crime law, state charges are a real possibility.

The practical takeaway: knowing the federal CFAA is not enough. If you are testing a target, you should be aware of both the state where the company is incorporated and the state where the servers are located. These are separate jurisdictional questions with potentially different answers.

## Safe harbor clauses: reading the fine print

Bug bounty programs advertise "safe harbor" protections. The quality of these clauses varies enormously. Some are meaningful legal commitments. Others are marketing language that promises nothing.

### What good safe harbor looks like

A strong safe harbor clause does three things:

1. **Authorization** - it explicitly states that research conducted within the program's scope constitutes "authorized" access under the CFAA and equivalent state laws. This directly addresses the statutory language.
2. **Covenant not to sue** - the company commits to not bringing civil claims against researchers who follow the program rules.
3. **Non-referral** - the company agrees not to refer researchers to law enforcement or support prosecution for in-scope research.

HackerOne's [Gold Standard Safe Harbor](https://hackerone.com/disclosure-guidelines) language covers all three. When a program adopts it, you have a contractual commitment from the company. That is real protection, assuming you stay within scope.

### What weak safe harbor looks like

Watch out for these patterns:

- "We will not take legal action against researchers who..." followed by conditions so narrow that normal testing would violate them. If the scope says you can only test `app.example.com` but the authentication system is on `auth.example.com`, you have a problem.
- Language that says the company "will not unreasonably pursue" legal action. "Unreasonably" is doing a lot of work in that sentence, and the company gets to define what is reasonable.
- Safe harbor that protects you from the company but says nothing about third parties. If you find a vulnerability in a third-party integration, the program operator's safe harbor does not bind the third party.
- Policies that reference safe harbor but include a clause allowing the company to revoke authorization retroactively if they decide your research was harmful.

Read the actual policy text. Do not rely on the summary on the program's landing page.

### Safe harbor does not override criminal law

Even the best safe harbor clause is a contractual agreement between you and the company. It cannot override criminal statutes. If a prosecutor decides your research was criminal, the company's authorization is evidence in your favor, but it is not an automatic defense. A company can authorize you to test their system and a prosecutor can still argue that your methods were criminal.

This almost never happens with legitimate bug bounty research. But "almost never" and "cannot" are different things.

## International laws

If you test targets outside the United States, or if you are based outside the United States, different laws apply. Here is what matters in the jurisdictions where most researchers and targets operate.

### United Kingdom - Computer Misuse Act 1990

The [Computer Misuse Act](https://www.legislation.gov.uk/ukpga/1990/18/contents) (CMA) has three main offenses. Section 1 criminalizes unauthorized access to computer material. Section 2 covers unauthorized access with intent to commit further offenses. Section 3 covers unauthorized modification of computer material.

The CMA has no good-faith security research exception. None. The UK's National Cyber Security Centre (NCSC) has published guidance encouraging coordinated disclosure, but this does not change the statute. A researcher who accesses a system without authorization can be prosecuted regardless of intent.

The CMA is overdue for reform. The UK government acknowledged this in 2021 and consulted on potential changes, including a statutory defense for legitimate security research. As of early 2026, no legislation has passed. The CyberUp Campaign has been lobbying for amendments, but the law remains unchanged.

If you are a UK-based researcher, this matters. Testing a target that does not have a bug bounty program is technically a CMA offense, full stop. The Crown Prosecution Service is unlikely to pursue cases involving good-faith research, but "unlikely to prosecute" is a different level of comfort than "not a crime."

### European Union - NIS2 Directive

The EU's NIS2 Directive (Directive 2022/2555), which member states were required to transpose into national law by October 2024, includes provisions relevant to security researchers. Article 26 requires member states to adopt coordinated vulnerability disclosure policies and encourages the creation of national CVD frameworks.

NIS2 does not create a pan-European safe harbor for researchers. What it does is push member states to build frameworks that accommodate legitimate research. The implementation varies by country.

### Netherlands

The Netherlands is the model for how governments should handle security research. The Dutch National Cyber Security Centre (NCSC) published a [responsible disclosure guideline](https://english.ncsc.nl/publications/publications/2019/juni/01/coordinated-vulnerability-disclosure-the-guideline) that effectively creates a framework for researchers. If you follow the guideline - report promptly, do not access more data than necessary, do not modify systems, give the vendor reasonable time to fix - prosecutors will generally not pursue charges.

This is not a formal statutory defense, but it is embedded in prosecutorial guidelines and has been tested in practice. The Dutch approach works because it is specific about what researchers should and should not do, rather than relying on vague "good faith" language.

### Australia

Australia's Criminal Code Act 1995 (Part 10.7) criminalizes unauthorized access, modification, and impairment of electronic communications. Like the UK's CMA, there is no statutory exception for security research.

The Australian Signals Directorate (ASD) has been more receptive to coordinated disclosure in recent years, but the legal framework has not caught up. Australian researchers face similar risks to UK researchers when testing without explicit authorization.

## Researchers who faced consequences

Legal risk for bug bounty hunters is not theoretical. People have been arrested, sued, and prosecuted.

**Justin Shafer (2018)** - a dental industry security researcher who discovered that a dental software company's FTP server was publicly accessible without authentication. He reported it. The company responded by getting the FBI involved. Shafer was raided and his equipment was seized. The case was eventually dropped, but "eventually dropped" still means FBI agents in your home and years of stress.

**Rob Graham and HD Moore** - both have faced legal threats for publishing research findings. The pattern is consistent: company receives vulnerability report, company's legal team responds with threats instead of fixes.

**Mossab Hussein (2019)** - a researcher who discovered a vulnerability in an enterprise software product and reported it through a bug bounty platform. The company initially acknowledged the report, then later alleged he had accessed customer data during his research. He was arrested at a conference. Charges were eventually dropped.

The common thread in these cases is not malicious researchers breaking things. It is companies reacting badly to vulnerability reports and weaponizing criminal statutes against the people who found their problems.

## Practical steps to protect yourself

Based on everything above, here is what I actually recommend:

### Before you start testing

1. **Only test programs with explicit safe harbor language.** If you are early in your career, stick to platforms like HackerOne, Bugcrowd, or Intigriti where the legal framework is established. See our guide on [choosing your first bug bounty program](/learn/choosing-your-first-bug-bounty-program).
2. **Read the full policy, not the summary.** Check the scope, the safe harbor clause, and any exclusions. Look for language about testing methods, rate limiting, and data access.
3. **Screenshot the policy before you start.** Policies can change. If a company narrows the scope after you start testing, you want evidence of what the scope was when you began.
4. **Know your jurisdiction.** Understand the computer crime laws where you live, where the company is headquartered, and where the servers are located.

### During testing

5. **Stay in scope.** This is the single most important legal protection you have. If the scope says `*.example.com`, do not test `admin-internal.example.com` even if you can reach it. Scope boundaries are the bright line between authorized and unauthorized access.
6. **Minimize data access.** If you find an IDOR that exposes user records, access one record to confirm the vulnerability. Do not download the entire database. The difference between "confirmed the bug exists" and "exfiltrated user data" is the difference between a report and an indictment.
7. **Do not modify production data.** Read-only testing is defensible. Creating admin accounts, deleting records, or altering configurations is much harder to justify.
8. **Keep logs of everything you do.** Your Burp Suite history, your terminal logs, your timestamps. If anyone ever questions your research, contemporaneous records are your best evidence.

### When reporting

9. **Follow [coordinated disclosure norms](/learn/coordinated-vulnerability-disclosure-guide).** Report through the designated channel. Give the vendor time to fix the issue. Do not go public prematurely.
10. **Do not threaten.** "Fix this or I'll publish" can be characterized as extortion, even if you mean it as a disclosure deadline. Frame it as "I follow a standard 90-day disclosure policy" instead. The difference is tone and phrasing, but it matters legally.
11. **Keep your communication professional and in writing.** No phone calls for initial reports. Written records protect both sides.

### If something goes wrong

12. **Do not talk to law enforcement without a lawyer.** If you are contacted by police or receive a legal threat, get an attorney immediately. The [EFF](https://www.eff.org/issues/cfaa) maintains resources for researchers facing legal issues.
13. **Do not destroy evidence.** If you are under investigation, deleting your logs makes everything worse.
14. **Document the company's authorization.** Your strongest defense is proof that the company invited this research. The bug bounty policy, your platform account, the safe harbor language - preserve all of it.

## The gap between law and practice

Here is what I think most legal guides get wrong: they either overstate the risk (scaring researchers away from legitimate work) or understate it (treating DOJ guidance and platform policies as guaranteed protection).

The reality is somewhere in between. Most good-faith bug bounty researchers will never face legal consequences. The platforms have made the legal framework much better than it was ten years ago. The DOJ policy, while non-binding, reflects a real shift in how prosecutors think about security research.

But the legal infrastructure has not caught up to the reality of how modern security research works. The CFAA is a 1986 law trying to govern 2026 behavior. The UK's CMA is similarly outdated. Safe harbor clauses are contracts, not statutes. And the gap between "authorized" and "unauthorized" access is still fuzzy at the edges.

The best protection is not any single law or policy. It is a combination of working within established programs, staying in scope, minimizing your footprint, keeping records, and understanding that legal protection is layered, not absolute. Do not let the legal risk paralyze you, but do not pretend it does not exist either.

If you are serious about a career in security research, budgeting for a consultation with a computer crime attorney is money well spent. They can give you jurisdiction-specific advice that no article can. Consider it an investment in your career, the same way you would invest in a Burp Suite Pro license or a certification.

## Further reading

- [18 U.S.C. Section 1030 - full CFAA text](https://www.law.cornell.edu/uscode/text/18/1030)
- [DOJ's 2022 CFAA charging policy](https://www.justice.gov/opa/pr/department-justice-announces-new-policy-charging-cases-under-computer-fraud-and-abuse-act)
- [UK Computer Misuse Act 1990](https://www.legislation.gov.uk/ukpga/1990/18/contents)
- [EFF's CFAA resources](https://www.eff.org/issues/cfaa)
- [Van Buren v. United States - full opinion](https://www.supremecourt.gov/opinions/20pdf/19-783_k53l.pdf)
- [Dutch NCSC coordinated vulnerability disclosure guideline](https://english.ncsc.nl/publications/publications/2019/juni/01/coordinated-vulnerability-disclosure-the-guideline)
- [Choosing your first bug bounty program](/learn/choosing-your-first-bug-bounty-program)
- [Coordinated vulnerability disclosure guide](/learn/coordinated-vulnerability-disclosure-guide)
- [Supply chain security vulnerabilities](/learn/supply-chain-security-vulnerabilities)
- [security.txt guide for researchers](/learn/security-txt-guide-for-researchers)
