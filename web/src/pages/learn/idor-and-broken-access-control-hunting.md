---
layout: "@layouts/MarkdownLayout.astro"
title: "Hunting IDOR and Broken Access Control Bugs in Bounty Programs"
description: "How to systematically find insecure direct object references and access control flaws - the most rewarded vulnerability class on major platforms."
date: "2026-04-07"
---

If you want to earn consistent payouts in bug bounties, access control bugs are where you should spend most of your time. Broken Access Control has held the #1 spot on the [OWASP Top 10](https://owasp.org/Top10/A01_2021-Broken_Access_Control/) since 2021, and HackerOne's annual reports consistently show it as the most rewarded vulnerability category. There is a reason for that. Every application has authorization logic, and developers get it wrong constantly.

XSS requires finding an injection point and proving impact. SQL injection requires specific database configurations and input handling flaws. But access control bugs? They exist anywhere a developer forgot to check whether user A should be able to see or modify user B's data. That happens in nearly every API endpoint, every file download, every admin panel, every multi-tenant system. The attack surface is enormous.

I think of access control testing as the highest-ROI skill a new hunter can develop. You do not need deep knowledge of browser internals or memory corruption. You need two user accounts, a proxy, and the patience to replay every request with the wrong session token.

## What makes access control bugs so common

Most web frameworks provide authentication out of the box. You call a middleware, check a session cookie, and you know who the user is. But authorization - deciding what that user is allowed to do - is almost always implemented manually by the application developer. There is no `@authorize_object_access` decorator that magically works for every business rule.

This means every endpoint is a separate authorization decision. A developer building a document management system needs to check permissions on view, edit, delete, share, export, version history, comment, and a dozen other actions. Miss one check on one endpoint, and that is a vulnerability. Multiply this across hundreds of endpoints and you start to see why these bugs are so prevalent.

The [OWASP Top 10 for 2025](/learn/owasp-top-10-2025-for-bug-bounty-hunters) reflects this reality. Broken Access Control did not just make the list. It topped it.

## Simple IDOR: the starting point

Insecure Direct Object Reference is the most basic form of broken access control. The application uses a user-supplied identifier to fetch a resource and does not verify that the requesting user has permission to access it.

Here is what a vulnerable request looks like:

```http
GET /api/invoices/10483 HTTP/1.1
Host: app.target.com
Cookie: session=eyJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjo0NTZ9...
```

If you change `10483` to `10484` and get someone else's invoice, that is IDOR. The server authenticated you (it knows you are user 456) but never checked whether user 456 should have access to invoice 10484.

### Where to look for object references

The obvious places are URL path parameters and query strings. But object references hide in less obvious spots too:

- Request body parameters in JSON or form data
- HTTP headers (custom headers like `X-Account-Id` or `X-Org-Id`)
- Cookies that contain object IDs alongside session tokens
- GraphQL query variables
- WebSocket message payloads
- File paths in download endpoints like `/files/user_uploads/456/document.pdf`

I always start by proxying all traffic through Burp Suite while I use every feature of the application as a normal user. Then I go through the proxy history and highlight every request that contains an identifier - numeric IDs, UUIDs, slugs, email addresses, anything that points to a specific resource.

### Predictable vs. unpredictable references

Numeric sequential IDs are the easiest to exploit. If your invoice is 10483, try 10482 and 10484. But many applications use UUIDs or random tokens as identifiers, and hunters often skip these assuming they are not guessable. That is a mistake.

UUIDs are not secret. They are unique, but they leak everywhere:

- API responses that list resources often include IDs for related objects
- Notification emails contain direct links with UUIDs
- Public profiles, shared documents, or collaboration features expose them
- Browser history and referrer headers leak them
- Error messages sometimes include resource IDs

If a user's profile API returns a list of their team members with UUIDs, you have everything you need to test access control on those team member objects. The question is never "can I guess the UUID?" The question is "can I obtain the UUID through some other feature, and then use it in a request where I should not have access?"

### Testing methodology for simple IDOR

Set up two accounts. Account A and Account B, both with the lowest privilege level available. The process:

1. Log in as Account A. Perform actions and capture every request in your proxy.
2. Log in as Account B in a different browser or use Burp's session handling rules.
3. For every request captured from Account A that contains an object reference, replay it using Account B's session cookie.
4. Compare responses. If Account B gets Account A's data, you have an IDOR.

In Burp Suite, the Autorize extension automates step 3. It replays every proxied request with a different session cookie and flags responses that match the original. This saves hours of manual testing.

```http
# Original request from Account A
GET /api/users/874/payment-methods HTTP/1.1
Cookie: session=accountA_token

# Replayed with Account B's session
GET /api/users/874/payment-methods HTTP/1.1
Cookie: session=accountB_token

# If both return 200 with payment data, that's IDOR
```

## Horizontal vs. vertical privilege escalation

Not all access control bugs are the same, and the distinction matters for your report's severity rating and payout.

**Horizontal privilege escalation** means accessing resources belonging to another user at the same privilege level. User A reads User B's private messages. Both are regular users. This is the classic IDOR.

**Vertical privilege escalation** means performing actions reserved for a higher privilege level. A regular user accesses admin functionality, modifies billing settings they should not touch, or approves their own requests in an approval workflow.

Vertical escalation almost always pays more. A horizontal IDOR on profile pictures might get a medium severity rating. Vertical escalation to admin panels routinely earns critical ratings.

### Finding vertical escalation

The approach is similar to IDOR testing, but you are looking for admin or elevated endpoints instead of other users' data.

First, identify admin functionality. Some ways to find it:

- Read JavaScript source files. Search for paths containing `/admin`, `/manage`, `/internal`, `/staff`, `/dashboard/settings`.
- Check the application's sitemap.xml and robots.txt for disallowed paths.
- Look at the HTML source for hidden navigation elements or commented-out links.
- If the application has API documentation (Swagger, OpenAPI), look for endpoints tagged with admin or management roles.
- Use your [recon methodology](/learn/bug-bounty-recon-methodology) to find admin subdomains like `admin.target.com` or `manage.target.com`.

Once you find admin endpoints, hit them with a regular user's session:

```http
# Admin endpoint for managing all users
GET /api/admin/users HTTP/1.1
Cookie: session=regular_user_token

# Admin endpoint for changing system settings
POST /api/admin/settings HTTP/1.1
Cookie: session=regular_user_token
Content-Type: application/json

{"feature_flags": {"maintenance_mode": true}}
```

Some applications check authorization on GET requests but forget to check it on POST, PUT, or DELETE. Always test all HTTP methods, even if the UI never shows you a form for that action.

### Role parameter manipulation

Some applications pass the user's role in the request itself. I have seen this more often than you would think:

```http
POST /api/register HTTP/1.1
Content-Type: application/json

{"username": "newuser", "email": "me@example.com", "password": "...", "role": "user"}
```

Change `"role": "user"` to `"role": "admin"` and see what happens. Variations include `is_admin: true`, `account_type: "enterprise"`, `permissions: ["read", "write", "admin"]`, and `group_id: 1` where group 1 is the admin group. Check the [API security testing](/learn/api-security-testing-for-bug-bounties) guide for more patterns like this.

## Multi-step workflows and state-dependent access

Simple IDOR is low-hanging fruit, and many programs have already had their basic ID-swap bugs reported. The more interesting access control flaws hide in workflows that span multiple requests.

### Bypassing approval flows

Consider an expense approval system:

1. Employee submits expense report (POST /api/expenses)
2. Manager reviews and approves (POST /api/expenses/123/approve)
3. Finance processes payment (POST /api/expenses/123/process)

Each step should enforce that the requesting user has the right role for that action. But what if you skip step 2 and go straight to step 3?

```http
# Skip approval, go straight to processing as the employee
POST /api/expenses/123/process HTTP/1.1
Cookie: session=employee_token
```

Some systems check the user's role but not the resource's state. The endpoint verifies you are a finance user but does not check whether the expense was actually approved. Or it checks the status but not whether the current user should be the one performing the action.

### Race conditions in access control

Access control checks that involve multiple steps can be vulnerable to race conditions. A common pattern:

1. User requests to join a private group
2. Admin approves the request
3. User gains access

If the "gain access" step is a separate API call, sometimes you can trigger it before the approval happens:

```http
# Send these simultaneously
POST /api/groups/private-group/join HTTP/1.1   # Legitimate join request
POST /api/groups/private-group/access HTTP/1.1  # Access grant, before approval
```

This is harder to exploit reliably, but it happens in systems where the authorization check and the state change are not atomic.

### Object-level vs. function-level checks

Some applications enforce authorization at the function level (can this user call this endpoint?) but not at the object level (can this user access this specific resource through this endpoint?).

Example: a project management app might correctly restrict the `/api/admin/projects` endpoint to admin users. But `/api/projects/789/settings`, which does the same thing for a single project, might only check that you are a logged-in user and not verify you belong to project 789.

Always test both the collection endpoints and the individual resource endpoints. They are often implemented by different code paths with different authorization logic.

### Tenant isolation in SaaS applications

Multi-tenant SaaS apps are goldmines for access control bugs. Each tenant (organization, company, workspace) should be completely isolated. But the tenant boundary often leaks.

Look for:

- API requests that include a tenant identifier. Switch it to another tenant's ID.
- Shared resources (file storage, CDN paths) that use predictable tenant-specific paths.
- GraphQL queries that accept a tenant parameter you can override.
- Invite or sharing features that accidentally grant cross-tenant access.

```http
# Your organization's data
GET /api/orgs/org_abc123/billing HTTP/1.1
Cookie: session=your_token

# Another org's data - switch the org ID
GET /api/orgs/org_def456/billing HTTP/1.1
Cookie: session=your_token
```

Some apps put the tenant ID in a header like `X-Tenant-Id` and trust it without validation. Others derive it from the subdomain but fail to verify it matches your session's tenant.

## Method and content-type tricks

When a straightforward access control test fails, try changing the request format. Some authorization middleware only processes certain content types or HTTP methods.

```http
# Original - blocked by access control
DELETE /api/users/874 HTTP/1.1
Cookie: session=regular_user_token

# Try with method override headers
POST /api/users/874 HTTP/1.1
X-HTTP-Method-Override: DELETE
Cookie: session=regular_user_token

# Try with _method parameter (common in Rails, Laravel)
POST /api/users/874?_method=DELETE HTTP/1.1
Cookie: session=regular_user_token

# Try changing the path format
GET /api/users/874.json HTTP/1.1
GET /api/users/874/ HTTP/1.1
GET /api/users/874%20 HTTP/1.1
GET /api/users/874;.css HTTP/1.1
```

That last one - path suffix tricks - can bypass reverse proxy rules that route based on file extensions. If the proxy only enforces auth on `/admin/*` but the backend also responds to `/admin/users;.css`, you might slip through.

## Writing reports that demonstrate real impact

The difference between a $200 payout and a $2,000 payout for the same IDOR often comes down to how you write the report. Triagers need to understand the business impact within the first 30 seconds of reading.

### Structure your report around impact

Bad: "I found an IDOR on the /api/users/:id endpoint that lets me read other users' data."

Good: "An authenticated user can read any other user's full profile data, including email, phone number, billing address, and last four digits of their payment card, by changing the user ID in GET /api/users/:id. This affects all 50,000+ users on the platform."

Lead with what an attacker gets and how many users are affected. The technical details of how to reproduce come second.

### Provide clean reproduction steps

A triager should be able to reproduce your bug in under five minutes. Format your steps like this:

1. Create two accounts (Account A and Account B) or use the provided test accounts.
2. Log in as Account A. Navigate to Settings > Billing. Note the user ID in the URL (e.g., `/settings/billing?user_id=874`).
3. Copy the full request from the proxy (provide the exact HTTP request).
4. Log in as Account B. Replace the session cookie in the copied request with Account B's cookie.
5. Send the request. Observe that Account A's billing information, including address and partial card number, is returned.

Include the full HTTP request and response in your report. Redact actual PII but keep the structure intact.

### Quantify the scope

Go beyond a single example. If you found IDOR on one endpoint, test related endpoints too. Can you also write data? Can you delete resources? Does the same flaw exist across the entire API?

A report that says "this pattern of missing authorization checks exists on 14 endpoints across the users, billing, and documents APIs" is worth far more than one that reports a single endpoint. Some programs will pay separately for each endpoint. Others will pay a single higher bounty for the comprehensive report.

Understanding how to frame severity using [CVSS scoring](/learn/understanding-cvss-scoring-for-bounty-hunters) directly affects your payout. An IDOR that reads email addresses (confidentiality: low) pays less than one that modifies billing information (integrity: high). The [report writing guide](/learn/writing-your-first-report) has more on structuring these effectively.

## Setting up your testing environment

You need the right [toolkit](/learn/bug-bounty-toolkit-setup) to test access control efficiently. The essentials:

- **Burp Suite** with the Autorize extension. Autorize replays every proxied request with a low-privilege session and flags mismatches. This automates 80% of IDOR testing.
- **Two browser profiles** with different accounts signed in. I use Firefox for Account A and Chrome for Account B.
- **A way to diff responses.** Burp Comparer works, or pipe responses through `diff` on the command line.
- **A notes file** where you track every object reference format you encounter. You will need these IDs later when testing cross-object access.

For API-heavy targets, tools like Postman or `curl` scripts let you quickly replay requests with different auth tokens without clicking through the UI.

## Common pitfalls

A few things that trip up new hunters:

**Reporting non-issues as IDOR.** If a user profile at `/users/alice` shows public information that is supposed to be visible to anyone, changing the username is not IDOR. Understand what the application intends to be public before reporting.

**Stopping at read access.** If you can read another user's data, test whether you can also write to it. Change the GET to a PUT or POST. Escalating from information disclosure to data modification bumps the severity significantly.

**Ignoring DELETE.** Sometimes an endpoint properly authorizes GET and PUT but forgets DELETE. Always test it.

**Not testing between privilege levels.** Many hunters test horizontal access (user to user) and forget vertical (user to admin, free tier to paid tier, viewer to editor). Test every role boundary.

## Resources

The [PortSwigger access control labs](https://portswigger.net/web-security/access-control) provide free, hands-on practice with both horizontal and vertical escalation scenarios. Work through all of them.

The [OWASP Authorization Testing Automation Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Testing_Automation_Cheat_Sheet.html) covers how to systematically automate access control testing, which is useful once you move beyond manual testing.

OWASP's [Broken Access Control page](https://owasp.org/Top10/A01_2021-Broken_Access_Control/) explains the defensive perspective, which helps you predict where developers are likely to make mistakes.

Access control bugs are not going away. If anything, they are getting more common as applications grow more complex, add more user roles, and expose more API endpoints. The attack surface expands with every new feature, and authorization logic has to keep up. It rarely does. Learn to test it systematically, report it with clear impact, and this vulnerability class alone will sustain a productive bug bounty career.
