---
layout: "@layouts/MarkdownLayout.astro"
title: "Race Conditions and Business Logic Bugs in Bug Bounties"
description: "How to find race conditions, time-of-check-time-of-use flaws, and business logic vulnerabilities that automated scanners cannot detect."
date: "2026-04-07"
---

Race conditions and business logic bugs are the highest-paying vulnerability class that most hunters ignore. The reason is simple: you cannot scan for them. No tool will flag a coupon code that can be redeemed twice if you send two requests at the same time. No scanner understands that a bank transfer workflow lets you spend money you do not have if you hit the endpoint fast enough.

I have reported logic bugs that paid more than any XSS or SQLi I have ever found. One double-spend vulnerability in a fintech program earned $15,000. A coupon reuse bug on an e-commerce platform paid $4,000. These are not exotic. They are common, they are easy to test for once you know the technique, and most programs have at least one.

The reason these bugs are underreported is that they require you to think. Not think harder, just think differently. You need to model the application as a state machine and ask: what happens when two things happen at once?

## Race conditions: the theory

A race condition occurs when the outcome of a computation depends on the timing or ordering of events that the developer assumed would happen sequentially. In web applications, this usually means: the server checks something, then acts on it, but between the check and the action, another request changes the state.

This is called a time-of-check-to-time-of-use (TOCTOU) flaw. The classic pattern:

1. Request A reads the user's balance: $100
2. Request B reads the user's balance: $100
3. Request A subtracts $100, sets balance to $0
4. Request B subtracts $100, sets balance to $0
5. The user spent $200 but only had $100

The developer wrote code that looks correct in isolation. `if balance >= amount, then subtract amount`. But they did not account for concurrent execution. The check and the update are not atomic.

This pattern appears everywhere. Coupon redemption, account credit transfers, rate limiting, inventory management, voting systems, follow/unfollow counts. Any operation where the application reads state, makes a decision, and then writes state is potentially vulnerable.

## The single-packet attack

Before 2023, race condition testing was unreliable. Network jitter meant your parallel requests would arrive milliseconds apart, and the server would process them sequentially. You had to send hundreds of requests and hope for a collision.

James Kettle's research, [Smashing the State Machine](https://portswigger.net/research/smashing-the-state-machine), changed everything. The technique he developed is the single-packet attack. Instead of sending multiple HTTP requests as separate packets, you send them all in a single TCP packet. This eliminates network jitter entirely because the server's TCP stack delivers all requests to the application layer at the same time.

For HTTP/1.1, this means using the last-byte synchronization technique. You send all requests except for the final byte of each, then send all the final bytes in one packet. For HTTP/2, it is even simpler. HTTP/2 multiplexes multiple requests over a single connection, so you bundle them into a single TCP frame.

The result is that your requests arrive with nanosecond-level synchronization instead of millisecond-level. This turns race conditions from a probabilistic game into a deterministic one.

## Tooling: Turbo Intruder

Turbo Intruder is a Burp Suite extension built by Kettle specifically for this kind of testing. It gives you a Python scripting interface to send requests with precise timing control.

Here is a basic Turbo Intruder script for testing a race condition on a coupon redemption endpoint:

```python
def queueRequests(target, wordlists):
    engine = RequestEngine(endpoint=target.endpoint,
                           concurrentConnections=1,
                           engine=Engine.BURP2)

    # Queue 20 identical requests
    for i in range(20):
        engine.queue(target.req, gate='race1')

    # Open the gate - all requests release simultaneously
    engine.openGate('race1')

def handleResponse(req, interesting):
    table.add(req)
```

The `gate` parameter is what makes this work. All 20 requests are queued but held at the gate. When `openGate` fires, they all release in a single burst over the same HTTP/2 connection.

For the single-packet attack specifically, use `Engine.BURP2` (which uses HTTP/2) and a single concurrent connection. This ensures all requests travel in one TCP frame.

A more targeted script that tests for double-spend:

```python
def queueRequests(target, wordlists):
    engine = RequestEngine(endpoint=target.endpoint,
                           concurrentConnections=1,
                           engine=Engine.BURP2)

    # Send the transfer request twice simultaneously
    for i in range(2):
        engine.queue(target.req, gate='double-spend')

    engine.openGate('double-spend')

def handleResponse(req, interesting):
    # Flag if both requests return 200 (both transfers succeeded)
    if req.status == 200:
        table.add(req)
```

If both requests return a success status, the double-spend worked. You just proved the race condition exists.

## Tooling: curl and GNU parallel

You do not need Burp Suite. curl with HTTP/2 can achieve the same single-packet synchronization. Here is how:

```bash
# Send 10 parallel coupon redemption requests over a single HTTP/2 connection
seq 1 10 | xargs -P 10 -I {} curl -s -o /dev/null -w "%{http_code}\n" \
  -X POST https://target.com/api/redeem-coupon \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"code": "SAVE20"}' \
  --http2
```

For tighter synchronization, use a named pipe to coordinate the requests:

```bash
# Create a barrier file
barrier=$(mktemp)
rm "$barrier"

# Launch 10 curl processes that all wait for the barrier
for i in $(seq 1 10); do
  (while [ ! -f "$barrier" ]; do :; done
   curl -s -o /dev/null -w "Request $i: %{http_code}\n" \
     -X POST https://target.com/api/redeem-coupon \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"code": "SAVE20"}') &
done

# Release them all at once
touch "$barrier"
wait
```

This is less precise than Turbo Intruder's single-packet technique, but it works for many targets where the race window is wide enough.

## Common race condition patterns

### Double-spend and balance manipulation

Any endpoint that deducts from a balance is a target. Gift card redemption, credit transfers between accounts, cryptocurrency withdrawals, in-app currency purchases. The test is always the same: send two identical requests simultaneously and check if both succeed.

I look for this on every fintech or e-commerce target. The check for sufficient funds and the deduction of funds are often two separate database operations without proper locking.

### Coupon and promo code reuse

Single-use coupon codes are a textbook race condition target. The application checks whether the coupon has been used, then applies the discount, then marks the coupon as used. If two requests arrive between the check and the mark, both get the discount.

Test this by creating a fresh account, getting a single-use code, and firing 10-20 simultaneous redemption requests. Check your account afterward. If the discount was applied more than once, you have a valid bug.

### Rate limit bypass

Rate limits are often implemented as a counter. The application reads the current count, checks if it exceeds the threshold, then increments it. Race this and you can blow past rate limits.

This is particularly impactful on:

- Login endpoints (brute force OTP codes)
- SMS/email sending endpoints (cost the company money)
- API endpoints with usage quotas

Send a batch of requests simultaneously against a rate-limited endpoint and count how many succeed. If you can send 50 requests and 40 get through a limit of 10, that is a valid bypass.

### Invitation and referral abuse

Referral programs that credit both parties are vulnerable to race conditions. If you can simultaneously accept the same referral link from multiple accounts, or simultaneously send multiple referral invites that should be limited to one, the program's counters break.

### Follow/unfollow and like/unlike

Social features with counters are almost always vulnerable. Send 10 simultaneous follow requests and check if the follower count incremented by more than 1. This is usually low severity on its own, but it demonstrates the underlying concurrency issue, and if the same pattern exists in financial operations, the impact is much higher.

## Business logic testing methodology

Race conditions are a subset of a broader category: business logic bugs. These are flaws in the application's rules and workflows rather than in its code-level security controls. No scanner can find them because no scanner understands what the application is supposed to do.

### Think like a dishonest user

The core skill is adversarial thinking about business rules. For every feature, ask:

- What if I do this out of order?
- What if I do this twice?
- What if I change a value after the check but before the action?
- What if I skip a step in the workflow?
- What if I use a negative number?
- What if I apply this action to someone else's resource?

I keep a checklist of business logic patterns I test on every program. Here are the ones that pay off most often.

### Price manipulation

Add an item to cart. Go to checkout. Intercept the request and change the price, quantity, or item ID. Many applications trust client-side values for pricing. I have seen applications where changing a quantity to -1 during checkout resulted in a credit to the account instead of a charge.

Also test discount stacking. Apply multiple discount codes when only one should be allowed. Apply a percentage discount, then a fixed discount, then change the currency. Each of these transitions is a place where validation might be missing.

### Workflow skipping

Multi-step processes often enforce step ordering only on the frontend. Payment flows are the big one. Can you jump from step 1 (cart) directly to step 4 (confirmation) without passing through step 2 (payment)? Send the request for the final step directly and see what happens.

Email verification is another common target. Register an account, skip the verification step, and try to access features that should require a verified email. Some applications check verification status only during login, not during subsequent API calls.

### Privilege escalation through parameter manipulation

When you perform an action, the request often includes identifiers that the application trusts. Change your user ID to an admin's. Change your role from "user" to "admin". Change the organization ID to access another tenant's data. This overlaps with [IDOR and access control testing](/learn/idor-and-broken-access-control-hunting), but the business logic angle is different: you are not just accessing someone else's data, you are making the application execute business operations under the wrong authorization context.

### State confusion

Applications maintain state across multiple requests. What happens when you manipulate that state between steps? Add a $10 item to your cart, start the checkout process, then change the cart item to a $1,000 item in another tab. Does the checkout process use the price from when you started, or the current price? Both answers can be wrong in different ways.

Another example: start a subscription cancellation, then in another session, upgrade your subscription. Which operation wins? Can you end up with a premium subscription at the cancelled price?

## Writing reports for logic bugs

Logic bugs require the best reports you will ever write. With an XSS, the impact is obvious: I can execute JavaScript in another user's browser. With a race condition that lets you redeem a coupon twice, you need to explain why that matters.

### Impact articulation

I structure every logic bug report around financial or security impact. Not "the coupon can be redeemed twice" but "an attacker can generate unlimited store credit by repeatedly exploiting this race condition, resulting in direct financial loss to the company."

Quantify it. If the coupon gives $20 off, and you can use it 10 times in a single burst, say "an attacker can generate $200 in fraudulent discounts per burst, with no limit on the number of bursts." If it is a rate limit bypass on an SMS endpoint, calculate the cost per SMS and multiply by the number you can send.

### Reproduction steps

Race conditions are inherently timing-dependent, so your reproduction steps need to be precise. Include the exact Turbo Intruder script or curl commands. Specify the number of concurrent requests. Show the before and after state. Screenshots of the account balance before the attack, the burst of requests in Burp, and the account balance afterward tell a clear story.

Here is a template I use:

1. Create account and note starting balance: $100
2. Navigate to transfer endpoint
3. Configure Turbo Intruder with the attached script (include it)
4. Send 5 simultaneous requests to transfer $100 to a second account
5. Check both account balances
6. Expected: one transfer succeeds, balance is $0 / $100
7. Actual: all 5 transfers succeed, balance is -$400 / $500

### Severity justification

Use [CVSS scoring](/learn/understanding-cvss-scoring-for-bounty-hunters) to back up your severity claim. Race conditions that affect financial operations are typically high or critical. Rate limit bypasses on [authentication endpoints](/learn/hunting-authentication-vulnerabilities) that enable brute force attacks are high. Follower count inflation is low.

When the program uses their own severity scale instead of CVSS, map your impact to their definitions. Most programs define critical as "direct financial loss" or "authentication bypass." If your race condition achieves either of those, say so explicitly.

## What to target first

If you are new to logic bug testing, start with these features on your next target:

1. Any operation that involves money, credits, or points
2. Single-use tokens, codes, or invitations
3. Rate-limited endpoints (especially OTP verification)
4. Multi-step workflows with financial impact
5. Features that increment or decrement counters

Set up Turbo Intruder, practice the single-packet attack on [PortSwigger's race condition labs](https://portswigger.net/web-security/race-conditions), and then apply it to real targets. Read Kettle's full [research paper](https://portswigger.net/research/smashing-the-state-machine) - it covers multi-endpoint race conditions and other advanced techniques I have not covered here.

The barrier to entry for these bugs is knowing the technique exists and having the patience to think through business logic. Most hunters do not. That is your advantage. While everyone else is running Nuclei templates and fighting over duplicate XSS reports, you can find the bugs that no scanner will ever catch, and get paid accordingly.

For setting up the tools mentioned in this guide, see the [toolkit setup guide](/learn/bug-bounty-toolkit-setup). For testing [API-level logic flaws](/learn/api-security-testing-for-bug-bounties), combine the techniques here with API enumeration to find race conditions on endpoints the frontend never calls. That is where the best bugs hide.
