---
layout: "@layouts/MarkdownLayout.astro"
title: "Bug Bounty Income and Taxes: What Researchers Need to Know"
description: "How bug bounty earnings are taxed in the US, UK, and EU, including self-employment obligations, platform tax forms, and record-keeping requirements."
date: "2026-04-07"
---

I am not a tax professional. Nothing in this article is tax or financial advice. Talk to an accountant who understands freelance income before making decisions based on what you read here. That said, I have filed taxes on bounty income for several years and made most of the mistakes you can make, so I know where the sharp edges are.

The number one thing new bug bounty hunters get wrong about taxes is thinking they do not apply yet. "I only made $400 this year" or "it was just a few small payouts" or "they paid me in crypto so it does not count." It all counts. Bug bounty income is taxable in virtually every jurisdiction, regardless of the amount, the payment method, or whether a platform issued you a tax form.

## Why bounty income is not like a paycheck

When you work a salaried job, your employer withholds income tax, Social Security, and Medicare from each paycheck. By the time you file your return, most of what you owe has already been paid. Bounty income works nothing like this.

Platforms like HackerOne and Bugcrowd are not your employer. They are intermediaries. They do not withhold taxes from your payouts. The full amount hits your PayPal or bank account, and it is on you to set aside money for taxes and pay them on time.

This catches people off guard. You get a $5,000 bounty, spend it, and then realize six months later that you owe $1,500 or more in taxes on that money. I have seen this happen to multiple hunters. It is an expensive lesson.

## United States tax obligations

The US is where tax rules for bounty hunters are most clearly documented, partly because the major platforms are US-based and partly because the IRS has clear rules about self-employment income.

### You are self-employed

If you earn bug bounty income in the US, the IRS considers you a self-employed individual. You are running a sole proprietorship even if you never filed any paperwork to start a business. This classification has major implications.

As a self-employed person, you owe two types of tax on your bounty income:

- **Income tax** at your marginal rate (10% to 37% depending on your total income)
- **Self-employment tax** of 15.3%, which covers Social Security (12.4%) and Medicare (2.9%)

That self-employment tax is the part that surprises people. When you work for an employer, they pay half of Social Security and Medicare. When you are self-employed, you pay both halves. On $50,000 of bounty income, that is roughly $7,065 in self-employment tax alone, before income tax.

You can deduct half of the self-employment tax from your adjusted gross income, which softens the blow slightly. But the effective tax rate on bounty income is still higher than most hunters expect.

### The $600 threshold and 1099-MISC forms

HackerOne issues a [1099-MISC form](https://docs.hackerone.com/hackers/payments/tax-information/) to US-based researchers who earn $600 or more in a calendar year through the platform. Bugcrowd does the same. This form goes to both you and the IRS, so the government already knows what you earned.

But here is what the $600 threshold does not mean: it does not mean income under $600 is tax-free. If you earned $500 on HackerOne and $400 on Bugcrowd, no platform will send you a 1099, but you still owe taxes on the full $900. The $600 number is a reporting threshold for the platform, not a tax-free allowance for you.

If you receive a 1099-MISC, the income goes on Schedule C of your federal return. If you do not receive one, the income still goes on Schedule C. The form just determines whether the IRS will automatically cross-reference what you reported.

### Quarterly estimated payments

Because nobody withholds taxes from your bounty payouts, the IRS expects you to pay estimated taxes four times a year if you expect to owe $1,000 or more. The due dates are April 15, June 15, September 15, and January 15 of the following year.

You calculate estimated payments using [Form 1040-ES](https://www.irs.gov/businesses/small-businesses-self-employed/self-employed-individuals-tax-center). The math is not complicated, but it requires you to project your annual income, which is hard when bounty earnings are unpredictable. Most hunters I know use the safe harbor rule: pay at least 100% of last year's total tax liability in estimated payments (110% if your AGI was over $150,000), and you will avoid underpayment penalties even if you end up owing more.

Miss your quarterly payments and the IRS charges an underpayment penalty. It is not enormous, but it adds up. More importantly, owing a large sum at filing time when you have already spent the money is stressful and avoidable.

### State taxes

Do not forget state income tax if you live in a state that has one. California, New York, and many other states tax self-employment income just like the feds do. Some states also require quarterly estimated payments. A few states, like Texas, Florida, and Washington, have no income tax at all, which is a meaningful advantage for full-time hunters.

## United Kingdom tax rules

In the UK, bug bounty income falls under self-employment income and is reported through [Self Assessment](https://www.gov.uk/self-assessment-tax-returns). If your total self-employment income exceeds 1,000 pounds in a tax year, you need to register as self-employed with HMRC and file a Self Assessment tax return.

That 1,000 pound threshold is the Trading Allowance. If your total bounty income for the year is under 1,000 pounds, you do not need to report it. This is one of the few cases where small earnings genuinely are tax-free.

Above that threshold, you pay income tax at your marginal rate (20% basic, 40% higher, 45% additional) plus Class 2 and Class 4 National Insurance contributions. Class 2 NICs are a flat weekly rate of around 3.45 pounds. Class 4 NICs are 9% on profits between roughly 12,570 and 50,270 pounds, then 2% above that.

HMRC's Payment on Account system is similar to US quarterly estimates. Once you owe more than 1,000 pounds in tax through Self Assessment, HMRC will require advance payments toward the next year's bill. These are due January 31 and July 31.

One practical note: if you are paid in USD (which is common since most platforms pay in dollars), you need to convert each payment to GBP using the exchange rate on the date you received it. HMRC publishes monthly exchange rates you can use instead if you prefer simplicity over precision.

## EU and other jurisdictions

Tax rules across the EU vary by country, but some patterns are common.

In Germany, freelance bug bounty income is reported as Einkuenfte aus selbstaendiger Arbeit if you qualify as a Freiberufler (freelance professional), or as trade income if the tax office considers you a Gewerbetreibender. The distinction matters because trade income triggers Gewerbesteuer (trade tax) in addition to income tax. Whether security research counts as a liberal profession or a trade is a gray area. Get local advice.

In the Netherlands, you may be able to use the small entrepreneur scheme (kleineondernemersregeling) for VAT purposes if your annual turnover is below a certain threshold. You would report bounty income through your income tax return as profit from other activities.

In France, the micro-entrepreneur (auto-entrepreneur) regime is popular with freelancers earning under 77,700 euros in services income per year. It simplifies tax filing considerably and applies a flat social contribution rate.

The common thread across EU countries: bug bounty income is almost certainly taxable, you probably need to register as some form of self-employed or freelance worker, and VAT may or may not apply depending on the nature of the service and your country's rules. The B2B nature of bounty payments (you are essentially providing a service to a company through a platform) can trigger different VAT treatment than B2C sales.

I cannot cover every country's rules in a single article. If you are earning meaningful bounty income outside the US and UK, spending a couple hundred dollars on a local accountant who understands freelance income is the best investment you can make.

## Deductions hunters commonly miss

This is where paying attention saves you real money. As a self-employed bug bounty hunter, you can deduct ordinary and necessary business expenses from your gross income, reducing the amount you owe tax on.

### Tools and subscriptions

Burp Suite Professional costs $449 per year. That is deductible. So is a Caido subscription. Your VPN, cloud hosting for recon infrastructure, domain registrations for testing, Nuclei templates, any security tool you pay for and use in your hunting. These add up.

### Training and education

Courses on web application security, conference tickets, CTF platform subscriptions, books on hacking methodology. If you can connect it to your bounty hunting work, it is likely deductible. I have deducted PortSwigger Web Security Academy courses, SANS training materials, and security conference attendance including travel.

### Hardware

The laptop you hunt on, external monitors, a mobile device for testing mobile applications, networking equipment for lab setups. If you use a device exclusively for bounty hunting, the full cost is deductible. If you use it for both personal and business purposes, you deduct the business-use percentage. Be honest about the split. An 80/20 business-personal allocation is reasonable for a laptop you also use for personal browsing. Claiming 100% for a device you also use to watch Netflix is asking for trouble in an audit.

### Home office

If you have a dedicated space in your home that you use regularly and exclusively for bounty hunting, you can deduct a portion of your rent or mortgage, utilities, and internet. The IRS offers a simplified method at $5 per square foot up to 300 square feet, or you can calculate actual expenses. Most hunters I know use the simplified method because it is easier and avoids the record-keeping burden.

The UK has a similar scheme. You can claim a flat rate for working from home (currently between 10 and 26 pounds per month depending on hours worked), or calculate actual costs.

### Internet and phone

You can deduct the business-use percentage of your internet bill. If you estimate 60% of your internet use is for bounty hunting, deduct 60% of the annual cost. Same for your phone if you use it for two-factor authentication, platform communication, or mobile testing.

### What you cannot deduct

General living expenses, your morning coffee, clothes you wear while hacking (unless it is somehow a uniform, which it is not). The IRS applies a "ordinary and necessary" test. If the expense is something you would incur regardless of your bounty hunting, it is probably not deductible.

## Record-keeping that saves you

Good records make tax time painless and protect you in an audit. Bad records make both situations miserable.

### Track every payment

Keep a spreadsheet or use accounting software. For each payout, record the date, the platform, the program, the amount, and the currency. If you were paid in a foreign currency, record the exchange rate and the converted amount. Both HackerOne and Bugcrowd provide payment history in your account settings, but do not rely on platform data alone. Platforms change, accounts get locked, and data exports are not always complete.

### Track every expense

Save receipts for every business expense. A photo of the receipt stored in a cloud folder works fine. Record the date, vendor, amount, and business purpose. "Burp Suite Pro renewal, used for web app testing on bounty programs" is a good description. "Software" is not.

### Separate your finances

Open a separate bank account for bounty income if you earn more than a trivial amount. Having bounty payments deposited into a dedicated account and paying business expenses from that account makes record-keeping dramatically simpler. It is not legally required for a sole proprietorship, but every accountant I have spoken to recommends it.

### Mileage and travel

If you drive to a coworking space to hunt, or travel to a security conference, log the miles or keep travel receipts. The IRS mileage rate for 2026 is 67 cents per mile. These small deductions add up over a year.

## Crypto bounty payments

Some programs pay in cryptocurrency. This does not change your tax obligations, but it adds complexity. In the US, crypto is treated as property. When you receive Bitcoin or Ethereum as a bounty payment, the fair market value at the time you receive it is your taxable income. If you later sell the crypto at a higher price, the gain is also taxable as a capital gain. If you sell at a loss, you can claim a capital loss.

Track the fair market value of every crypto payment on the day you receive it. Use a reputable price source like CoinGecko or the exchange rate on the platform you sell through. This is tedious but necessary.

## How much to set aside

A common rule of thumb for US-based self-employed individuals is to set aside 25-30% of gross bounty income for taxes. This covers federal income tax and self-employment tax for most people in the middle income brackets. If you are in a high-tax state like California or New York, bump that to 35-40%.

In the UK, setting aside 30% is a reasonable starting point for basic rate taxpayers when you account for income tax and NICs together.

I keep a separate savings account specifically for tax money. Every time I receive a bounty payout, I transfer 30% into that account immediately before I consider the rest available to spend. This one habit has saved me from the "I owe $4,000 and do not have it" problem that catches so many freelancers.

## When to get professional help

If your annual bounty income exceeds $10,000 or so, the cost of hiring an accountant or tax preparer who understands self-employment income is almost certainly worth it. They will catch deductions you miss, ensure you are making correct estimated payments, and keep you compliant with rules you did not know existed. Look for someone experienced with freelancers or gig workers, not just a generic tax prep chain.

If you earn bounty income in multiple countries, or if you are a non-US person earning from US-based platforms, the complexity increases significantly. International tax treaties, withholding rules, and foreign earned income exclusions can all apply. Professional help goes from "nice to have" to "genuinely necessary" at that point.

## Further reading

- [IRS Self-Employed Individuals Tax Center](https://www.irs.gov/businesses/small-businesses-self-employed/self-employed-individuals-tax-center) - the definitive US resource
- [HMRC Self Assessment guide](https://www.gov.uk/self-assessment-tax-returns) - UK self-employment tax filing
- [HackerOne tax information for hackers](https://docs.hackerone.com/hackers/payments/tax-information/) - platform-specific 1099 details
- [Bug bounty economics: what hunters actually earn](/learn/bug-bounty-economics-what-hunters-actually-earn) - context on income levels
- [Bug bounty legal guide: CFAA and beyond](/learn/bug-bounty-legal-guide-cfaa-and-beyond) - legal considerations alongside tax
- [HackerOne vs. Bugcrowd vs. Intigriti](/learn/hackerone-vs-bugcrowd-vs-intigriti) - platform comparison including payout mechanics
